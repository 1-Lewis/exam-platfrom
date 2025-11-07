import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type SessionLike = {
  user?: {
    id?: string;
    role?: Role | null;
  } | null;
} | null;

/** Récupère la session, lance si pas connecté */
export async function requireSession(): Promise<NonNullable<SessionLike>> {
  const session = (await getServerSession(authOptions)) as SessionLike;
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session;
}

/** Staff = ADMIN ou TEACHER (utile pour /admin en général) */
export async function requireStaff(): Promise<NonNullable<SessionLike>> {
  const session = await requireSession();
  const role = session.user!.role ?? null;
  if (role !== "ADMIN" && role !== "TEACHER") throw new Error("FORBIDDEN_STAFF_ONLY");
  return session;
}

/** ADMIN = accès total */
export function isAdmin(session: SessionLike): boolean {
  return !!session?.user?.id && session.user.role === "ADMIN";
}

/** Vérifie qu’un TEACHER est bien propriétaire de l’exam */
export async function assertTeacherOwnsExamOrAdmin(
  session: NonNullable<SessionLike>,
  examId: string,
): Promise<void> {
  if (isAdmin(session)) return; // ADMIN: OK
  if (session.user?.role !== "TEACHER") throw new Error("FORBIDDEN_NOT_TEACHER");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { createdById: true },
  });
  if (!exam) throw new Error("NOT_FOUND_EXAM");
  if (exam.createdById !== session.user!.id) throw new Error("FORBIDDEN_NOT_OWNER");
}

/** À partir d'une attempt, vérifie l’accès en remontant à l’exam */
export async function assertTeacherOwnsAttemptOrAdmin(
  session: NonNullable<SessionLike>,
  attemptId: string,
): Promise<{ examId: string }> {
  if (isAdmin(session)) return { examId: "" };
  if (session.user?.role !== "TEACHER") throw new Error("FORBIDDEN_NOT_TEACHER");

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { examId: true, exam: { select: { createdById: true } } },
  });
  if (!attempt) throw new Error("NOT_FOUND_ATTEMPT");
  if (attempt.exam.createdById !== session.user!.id) throw new Error("FORBIDDEN_NOT_OWNER");

  return { examId: attempt.examId };
}
