// src/app/api/admin/exams/[id]/subject/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/storage";
import { convertToHtml } from "mammoth";
import { requireStaff, assertTeacherOwnsExamOrAdmin } from "@/lib/acl";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Type guard strict, pas de `any`
function isAdminSession(s: unknown): s is { user: { id: string; role?: string } } {
  if (!s || typeof s !== "object") return false;
  const u = (s as { user?: unknown }).user;
  if (!u || typeof u !== "object") return false;
  const id = (u as { id?: unknown }).id;
  // adapte la règle à ton modèle (ici on exige au moins un id)
  return typeof id === "string";
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireStaff();
    const { id: examId } = await ctx.params;
    await assertTeacherOwnsExamOrAdmin(session, examId);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const contentType = file.type || "application/octet-stream";
    const filename = file.name || "subject";
    const key = `exams/${examId}/subject/${Date.now()}-${filename}`;

    // Upload binaire
    await putObject({ key, body: buf, contentType });

    // Conversion DOCX -> HTML (sinon null)
    let subjectHtml: string | null = null;
    const isDocx =
      contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.toLowerCase().endsWith(".docx");

    if (isDocx) {
      const { value } = await convertToHtml({ arrayBuffer });
      subjectHtml = value ?? "";
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        subjectKey: key,
        subjectFilename: filename,
        subjectMime: contentType,
        subjectSize: buf.length,
        subjectHtml,
      },
      select: { id: true, subjectKey: true, subjectMime: true, subjectFilename: true },
    });

    return NextResponse.json({ ok: true, exam: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
