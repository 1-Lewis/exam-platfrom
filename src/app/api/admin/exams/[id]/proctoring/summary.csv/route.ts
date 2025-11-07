// src/app/api/admin/exams/[examId]/proctoring/summary.csv/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ examId: string }> };

function csvEscape(v: unknown): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return `"${(s ?? "").replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);

    // On réutilise la logique de la route JSON (copie locale pour rester simple)
    const attempts = await prisma.attempt.findMany({
      where: { examId },
      select: {
        id: true, userId: true, status: true,
        startedAt: true, expectedEndAt: true, submittedAt: true,
        focusLossCount: true,
      },
      orderBy: [{ startedAt: "asc" }],
    });

    if (attempts.length === 0) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="exam-${examId}-proctoring.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const ids = attempts.map((a) => a.id);

    const [pasteByAttempt, focusLostByAttempt, multiTabByAttempt, heartbeatMaxByAttempt, lastEventMax, lastProctorMax] =
      await Promise.all([
        prisma.event.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids }, type: "PASTE" }, _count: { _all: true } }),
        prisma.event.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids }, type: "FOCUS_LOST" }, _count: { _all: true } }),
        prisma.proctorEvent.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids }, type: "MULTITAB" }, _count: { _all: true } }),
        prisma.proctorEvent.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids }, type: "HEARTBEAT" }, _max: { createdAt: true } }),
        prisma.event.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids } }, _max: { createdAt: true } }),
        prisma.proctorEvent.groupBy({ by: ["attemptId"], where: { attemptId: { in: ids } }, _max: { createdAt: true } }),
      ]);

    const mPaste = new Map(pasteByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mFocusLost = new Map(focusLostByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mMultiTab = new Map(multiTabByAttempt.map((r) => [r.attemptId, r._count._all]));
    const mHeartbeat = new Map(heartbeatMaxByAttempt.map((r) => [r.attemptId, r._max.createdAt ?? null]));
    const mLastEvent = new Map(lastEventMax.map((r) => [r.attemptId, r._max.createdAt ?? null]));
    const mLastProctor = new Map(lastProctorMax.map((r) => [r.attemptId, r._max.createdAt ?? null]));

    const headers = [
      "attemptId","userId","status","startedAt","expectedEndAt","submittedAt",
      "focusLossCountDb","focusLostEvents","pasteCount","multiTabCount",
      "lastHeartbeatAt","lastActivityAt"
    ];

    const lines = [headers.join(",")];

    for (const a of attempts) {
      const lastEvt = mLastEvent.get(a.id) ?? null;
      const lastPro = mLastProctor.get(a.id) ?? null;
      const lastActivity = [lastEvt, lastPro].filter(Boolean).sort((x, y) =>
        (y as Date).getTime() - (x as Date).getTime(),
      )[0] as Date | undefined;

      const row = [
        csvEscape(a.id),
        csvEscape(a.userId),
        csvEscape(a.status),
        csvEscape(a.startedAt ? a.startedAt.toISOString() : ""),
        csvEscape(a.expectedEndAt ? a.expectedEndAt.toISOString() : ""),
        csvEscape(a.submittedAt ? a.submittedAt.toISOString() : ""),
        csvEscape(a.focusLossCount ?? 0),
        csvEscape(mFocusLost.get(a.id) ?? 0),
        csvEscape(mPaste.get(a.id) ?? 0),
        csvEscape(mMultiTab.get(a.id) ?? 0),
        csvEscape(mHeartbeat.get(a.id)?.toISOString() ?? ""),
        csvEscape(lastActivity ? lastActivity.toISOString() : ""),
      ];
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-${examId}-proctoring.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
