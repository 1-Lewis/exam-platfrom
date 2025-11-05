// src/lib/ownership.ts
import { prisma } from "@/lib/prisma";

/**
 * Erreur personnalisée pour la vérification d'appartenance.
 * Évite le cast `any` et permet de transporter un code HTTP.
 */
export class ForbiddenError extends Error {
  readonly status: number;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

/**
 * Vérifie qu'un Attempt appartient bien à un utilisateur donné.
 * - Lance une ForbiddenError si ce n'est pas le cas.
 * - Ne renvoie rien si OK.
 */
export async function assertAttemptOwnershipOrThrow(attemptId: string, userId: string): Promise<void> {
  const ok = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    select: { id: true },
  });

  if (!ok) {
    throw new ForbiddenError();
  }
}
