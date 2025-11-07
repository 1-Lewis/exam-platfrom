// src/app/api/admin/exams/[id]/export-zip/route.ts
import "server-only";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";
import { tiptapJsonToHtml, renderAttemptHtml } from "@/lib/tiptap/toHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);

    const url = new URL(req.url);
    const withPdf = url.searchParams.get("withPdf") === "1";

    // Récupère toutes les attempts de cet exam
    const attempts = await prisma.attempt.findMany({
      where: { examId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        expectedEndAt: true,
        submittedAt: true,
        exam: { select: { title: true } },
      },
    });

    // Récupère la dernière answer pour chaque attempt
    const answersByAttempt = new Map<string, { content: unknown; updatedAt: Date } | null>();
    for (const a of attempts) {
      const last = await prisma.answer.findFirst({
        where: { attemptId: a.id },
        orderBy: { updatedAt: "desc" },
        select: { content: true, updatedAt: true },
      });
      answersByAttempt.set(a.id, last ? { content: last.content, updatedAt: last.updatedAt } : null);
    }

    const zip = new JSZip();

    // JSON par attempt
    for (const a of attempts) {
      const last = answersByAttempt.get(a.id);
      const payload = {
        attemptId: a.id,
        examId,
        userId: a.userId,
        status: a.status,
        startedAt: a.startedAt ? a.startedAt.toISOString() : null,
        expectedEndAt: a.expectedEndAt ? a.expectedEndAt.toISOString() : null,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        lastSavedAt: last?.updatedAt ? last.updatedAt.toISOString() : null,
        content: last?.content ?? null,
      };
      const safeUser = a.userId.replace(/[^\p{L}\p{N}_-]+/gu, "_");
      zip.file(`${safeUser}__${a.id}.json`, JSON.stringify(payload, null, 2));
    }

    // CSV récap
    const csvHeaders = [
      "attemptId",
      "userId",
      "status",
      "startedAt",
      "expectedEndAt",
      "submittedAt",
      "lastSavedAt",
    ];
    const csvRows = attempts.map((a) => {
      const last = answersByAttempt.get(a.id);
      return [
        a.id,
        a.userId,
        a.status,
        a.startedAt ? a.startedAt.toISOString() : "",
        a.expectedEndAt ? a.expectedEndAt.toISOString() : "",
        a.submittedAt ? a.submittedAt.toISOString() : "",
        last?.updatedAt ? last.updatedAt.toISOString() : "",
      ];
    });
    const csv = [csvHeaders.join(","), ...csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    zip.file(`exam-${examId}-recap.csv`, csv);

    // PDFs optionnels
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      if (withPdf) {
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--font-render-hinting=medium"],
        });
        const page = await browser.newPage();

        // petite limite simple de concurrence (1 onglet ici, séquentiel et stable)
        for (const a of attempts) {
          const last = answersByAttempt.get(a.id);
          const bodyHtml = tiptapJsonToHtml(last?.content ?? { type: "doc", content: [] });
          const html = await renderAttemptHtml({
            title: a.exam.title || `Examen ${examId}`,
            studentId: a.userId,
            attemptId: a.id,
            examId,
            bodyHtml,
          });

          await page.setContent(html, { waitUntil: "networkidle0" });
          const pdfBuf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
          });

          const safeUser = a.userId.replace(/[^\p{L}\p{N}_-]+/gu, "_");
          zip.file(`${safeUser}__${a.id}.pdf`, pdfBuf);
        }
      }
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
      }
    }

    // Génère le ZIP → Uint8Array (évite any / BlobPart)
    const buffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="exam-${examId}-copies${withPdf ? "-with-pdf" : ""}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    const status = msg.startsWith("NOT_FOUND") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
