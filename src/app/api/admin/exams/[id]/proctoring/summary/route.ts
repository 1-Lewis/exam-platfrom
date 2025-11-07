// src/app/api/admin/exams/[examId]/proctoring/summary/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ examId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);

    // Attempts de l'examen (on prend tout ; filtre côté UI)
    const attempts = await prisma.attempt.findMany({
      where: { examId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        expectedEndAt: true,
        submittedAt: true,
        focusLossCount: true,
      },
      orderBy: [{ startedAt: "asc" }],
    });

    if (attempts.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const attemptIds = attempts.map((a) => a.id);

    // Comptes par type (Event)
    const pasteByAttempt = await prisma.event.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds }, type: "PASTE" },
      _count: { _all: true },
    });

    const focusLostByAttempt = await prisma.event.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds }, type: "FOCUS_LOST" },
      _count: { _all: true },
    });

    // Comptes/derniers événements proctor (ProctorEvent)
    const multiTabByAttempt = await prisma.proctorEvent.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds }, type: "MULTITAB" },
      _count: { _all: true },
    });

    const heartbeatMaxByAttempt = await prisma.proctorEvent.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds }, type: "HEARTBEAT" },
      _max: { createdAt: true },
    });

    // Dernier event (Event) & dernier proctor (ProctorEvent) pour chaque attempt
    const lastEventMax = await prisma.event.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds } },
      _max: { createdAt: true },
    });
    const lastProctorMax = await prisma.proctorEvent.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds } },
      _max: { createdAt: true },
    });

    // Maps rapides
    const mPaste = new Map(pasteByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mFocusLost = new Map(focusLostByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mMultiTab = new Map(multiTabByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mHeartbeat = new Map(
      heartbeatMaxByAttempt.map((r) => [r.attemptId, r._max.createdAt ?? null]),
    );
    const mLastEvent = new Map(lastEventMax.map((r) => [r.attemptId, r._max.createdAt ?? null]));
    const mLastProctor = new Map(
      lastProctorMax.map((r) => [r.attemptId, r._max.createdAt ?? null]),
    );

    const items = attempts.map((a) => {
      const lastEvt = mLastEvent.get(a.id) ?? null;
      const lastPro = mLastProctor.get(a.id) ?? null;
      const lastActivity = [lastEvt, lastPro].filter(Boolean).sort((x, y) =>
        (y as Date).getTime() - (x as Date).getTime(),
      )[0] as Date | undefined;

      return {
        attemptId: a.id,
        userId: a.userId,
        status: a.status,
        startedAt: a.startedAt ? a.startedAt.toISOString() : null,
        expectedEndAt: a.expectedEndAt ? a.expectedEndAt.toISOString() : null,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,

        // métriques
        focusLossCountDb: a.focusLossCount ?? 0,         // champ Attempt
        focusLostEvents: mFocusLost.get(a.id) ?? 0,      // via Event
        pasteCount: mPaste.get(a.id) ?? 0,               // via Event (clipboard)
        multiTabCount: mMultiTab.get(a.id) ?? 0,         // via ProctorEvent
        lastHeartbeatAt: mHeartbeat.get(a.id)?.toISOString() ?? null,
        lastActivityAt: lastActivity ? lastActivity.toISOString() : null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
