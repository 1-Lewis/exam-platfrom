// src/lib/attempt-timer.ts
import { prisma } from "./prisma";

/**
 * Petit utilitaire: nombre de millisecondes restantes jusqu'à `date`.
 * Retourne 0 si la date est passée.
 */
export function msUntil(date: Date, now: Date = new Date()): number {
  const ms = date.getTime() - now.getTime();
  return ms > 0 ? ms : 0;
}

/** Statuts possibles d'un Attempt (garde en phase avec Prisma) */
export type AttemptStatus = "PENDING" | "ONGOING" | "SUBMITTED";

/** Sélection minimale d'un Attempt utilisée par le timer */
export interface AttemptLite {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  durationSec: number;
  startedAt: Date | null;
  expectedEndAt: Date | null;
  submittedAt: Date | null;
}

/** État enrichi côté serveur avec le temps restant */
export interface AttemptTimeState {
  attempt: AttemptLite;
  now: Date;
  isStarted: boolean;
  isSubmitted: boolean;
  isExpired: boolean;
  /** Temps restant côté serveur (ms). Si non démarré, équivaut à durationSec * 1000. */
  remainingMs: number;
}

/**
 * Récupère un Attempt et calcule son état temporel côté serveur.
 * Retourne `null` si l'Attempt n'existe pas.
 */
export async function getAttemptWithTime(
  attemptId: string
): Promise<AttemptTimeState | null> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      durationSec: true,
      startedAt: true,
      expectedEndAt: true,
      submittedAt: true,
      examId: true,
      userId: true,
    },
  });

  if (!attempt) return null;

  const now = new Date();
  const isStarted = Boolean(attempt.startedAt && attempt.expectedEndAt);
  const isSubmitted = attempt.status === "SUBMITTED";
  const isExpired = isStarted && !!attempt.expectedEndAt && attempt.expectedEndAt <= now && !isSubmitted;

  const remainingMs = isStarted && attempt.expectedEndAt
    ? msUntil(attempt.expectedEndAt, now)
    : attempt.durationSec * 1000;

  return {
    attempt: {
      id: attempt.id,
      examId: attempt.examId,
      userId: attempt.userId,
      status: attempt.status as AttemptStatus,
      durationSec: attempt.durationSec,
      startedAt: attempt.startedAt,
      expectedEndAt: attempt.expectedEndAt,
      submittedAt: attempt.submittedAt,
    },
    now,
    isStarted,
    isSubmitted,
    isExpired,
    remainingMs,
  };
}

/**
 * Soumet un Attempt côté serveur (idempotent si déjà SUBMITTED avec un `UPDATE` simple).
 * Retourne un subset de l'Attempt mis à jour.
 */
export async function submitAttemptServerSide(
  attemptId: string
): Promise<{ id: string; status: AttemptStatus; submittedAt: Date }> {
  const updated = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    select: { id: true, status: true, submittedAt: true },
  });

  // Cast sûr car status renvoyé vient de Prisma (enum)
  return {
    id: updated.id,
    status: updated.status as AttemptStatus,
    submittedAt: updated.submittedAt as Date,
  };
}

/**
 * Erreur typée levée lorsqu'un Attempt est verrouillé (expiré ou déjà soumis).
 * Permet de retourner proprement un 409 sans utiliser `any`.
 */
export class AttemptLockedError extends Error {
  readonly status: number;
  readonly locked: boolean;

  constructor(message = "Attempt is locked", status = 409) {
    super(message);
    this.name = "AttemptLockedError";
    this.status = status;
    this.locked = true;
  }
}

/**
 * À appeler tout en haut des routes qui MODIFIENT des réponses.
 * - Si Attempt inexistant → lève `Error("Attempt not found")`
 * - Si expiré ou déjà soumis → auto-soumet si nécessaire puis lève `AttemptLockedError`
 * - Sinon → retourne l'état temporel (pour un éventuel usage)
 */
export async function ensureAttemptIsWritableOrAutoSubmit(
  attemptId: string
): Promise<AttemptTimeState> {
  const state = await getAttemptWithTime(attemptId);
  if (!state) {
    // Pas de statut custom ici: la route consommatrice choisira comment mapper en HTTP
    throw new Error("Attempt not found");
  }

  if (state.isExpired || state.isSubmitted) {
    // Auto-submit si non encore soumis
    if (!state.isSubmitted) {
      await submitAttemptServerSide(attemptId);
    }
    throw new AttemptLockedError();
  }

  return state;
}
