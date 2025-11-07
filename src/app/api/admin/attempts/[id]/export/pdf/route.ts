// src/app/api/admin/attempts/[id]/export/pdf/route.ts
import "server-only";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsAttemptOrAdmin } from "@/lib/acl";
import { tiptapJsonToHtml, renderAttemptHtml } from "@/lib/tiptap/toHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    // Auth + ACL
    const session = await requireStaff();
    const { id: attemptId } = await ctx.params;
    await assertTeacherOwnsAttemptOrAdmin(session, attemptId);

    // Attempt + dernière answer
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examId: true,
        userId: true,
        exam: { select: { title: true } },
      },
    });
    if (!attempt) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND_ATTEMPT" }, { status: 404 });
    }

    const last = await prisma.answer.findFirst({
      where: { attemptId },
      orderBy: { updatedAt: "desc" },
      select: { content: true },
    });

    // TipTap JSON -> HTML (KaTeX)
    const bodyHtml = tiptapJsonToHtml(last?.content ?? { type: "doc", content: [] });
    const fullHtml = await renderAttemptHtml({
      title: attempt.exam.title || `Examen ${attempt.examId}`,
      studentId: attempt.userId,
      attemptId: attempt.id,
      examId: attempt.examId,
      bodyHtml,
    });

    // Puppeteer (typage compatible : boolean | "shell")
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--font-render-hinting=medium"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      // Buffer Node.js → Uint8Array (ArrayBufferView accepté par NextResponse)
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
      });
      const u8 = new Uint8Array(pdfBuffer);

      return new NextResponse(u8, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="attempt-${attempt.id}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json(
      { ok: false, error: msg },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
