import "server-only";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

type Ctx = { params: Promise<{ examId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/exams/[examId]/export/pdf-zip
 * -> ZIP contenant un PDF par attempt SUBMITTED
 */
export async function GET(_req: Request, ctx: Ctx) {
  // 🔐 ACL
  const session = await requireStaff();
  const { examId } = await ctx.params;
  await assertTeacherOwnsExamOrAdmin(session, examId);

  // Attempts soumis uniquement (change si tu veux tous)
  const attempts = await prisma.attempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      id: true,
      submittedAt: true,
      student: { select: { name: true, email: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  if (attempts.length === 0) {
    return NextResponse.json(
      { error: "Aucune copie soumise pour cet examen." },
      { status: 404 }
    );
  }

  const base =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const browser = await puppeteer.launch({
    // Si Alpine (rootless), décommente :
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const zip = new JSZip();
    const page = await browser.newPage();

    // Séquentiel (robuste). Je peux te fournir une version "pool" si besoin.
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const url = `${base}/admin/attempts/${a.id}/print`;

      await page.goto(url, { waitUntil: "networkidle0" });

      const pdf: Uint8Array = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
      });

      const idx = String(i + 1).padStart(3, "0");
      const student =
        a.student?.name?.trim() ||
        a.student?.email?.split("@")[0] ||
        "etudiant";
      const safe = student.replace(/[^\p{L}\p{N}_-]+/gu, "_");

      zip.file(`${idx}_${safe}_attempt-${a.id}.pdf`, pdf);
    }

    // Génère un Buffer Node (évite les soucis de typage BodyInit)
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="exam-${examId}-pdfs.zip"`,
        "Cache-Control": "no-store",
    },
    });
  } finally {
    await browser.close();
  }
}
