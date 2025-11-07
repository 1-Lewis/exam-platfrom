// src/app/api/admin/exams/[id]/export-zip/route.ts
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function isSession(obj: unknown): obj is { user: { id: string; role?: string | null } } {
  if (!obj || typeof obj !== "object") return false;
  const user = (obj as { user?: unknown }).user;
  if (!user || typeof user !== "object") return false;
  return typeof (user as { id?: unknown }).id === "string";
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);
    // … reste du handler inchangé (construction du ZIP)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id: examId } = await ctx.params;

  const attempts = await prisma.attempt.findMany({
    where: { examId },
    orderBy: { submittedAt: "desc" },
    select: { id: true, userId: true, status: true, startedAt: true, expectedEndAt: true, submittedAt: true },
  });

  // Récupère la dernière answer de chaque attempt
  const byAttempt = new Map<string, string | null>(); // attemptId -> JSON string
  for (const a of attempts) {
    const last = await prisma.answer.findFirst({
      where: { attemptId: a.id },
      orderBy: { updatedAt: "desc" },
      select: { content: true, updatedAt: true },
    });
    const payload = {
      attemptId: a.id,
      userId: a.userId,
      status: a.status,
      startedAt: a.startedAt ? a.startedAt.toISOString() : null,
      expectedEndAt: a.expectedEndAt ? a.expectedEndAt.toISOString() : null,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      lastSavedAt: last?.updatedAt ? last.updatedAt.toISOString() : null,
      content: last?.content ?? null,
    };
    byAttempt.set(a.id, JSON.stringify(payload, null, 2));
  }

  const zip = new JSZip();

  // Un JSON par copie
  for (const a of attempts) {
    const filename = `${a.userId}__${a.id}.json`;
    zip.file(filename, byAttempt.get(a.id) ?? "{}");
  }

  // CSV récap
  const headers = [
    "attemptId",
    "userId",
    "status",
    "startedAt",
    "expectedEndAt",
    "submittedAt",
    "lastSavedAt",
  ];
  const rows = attempts.map((a) => {
    const parsed = byAttempt.get(a.id) ? JSON.parse(byAttempt.get(a.id) as string) as { lastSavedAt: string | null } : { lastSavedAt: null };
    return [
      a.id,
      a.userId,
      a.status,
      a.startedAt ? a.startedAt.toISOString() : "",
      a.expectedEndAt ? a.expectedEndAt.toISOString() : "",
      a.submittedAt ? a.submittedAt.toISOString() : "",
      parsed.lastSavedAt ?? "",
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  zip.file(`exam-${examId}-recap.csv`, csv);

  const ab = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  return new NextResponse(ab, {
  status: 200,
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="exam-${examId}-copies.zip"`,
    "Cache-Control": "no-store",
  },
})}
