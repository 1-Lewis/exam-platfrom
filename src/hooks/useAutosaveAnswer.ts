// src/hooks/useAutosaveAnswer.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { jsonFetch } from "@/lib/net/JsonFetch";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; ts: number }
  | { kind: "queued" }
  | { kind: "error"; message: string };

type Options = {
  attemptId: string;
  /** Debounce avant envoi (ms) */
  debounceMs?: number;
  /** Endpoint autosave */
  url?: string; // défaut: /api/attempts/autosave
};

const LS_KEY = (attemptId: string) => `autosave:${attemptId}`;

/** Helper pour éviter l’appel direct à Date.now() (React 19 le considère "impure" en render-like). */
function safeNow(): number {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function" &&
    typeof performance.timeOrigin === "number"
  ) {
    // horloge monotone basée sur l’origine + now()
    return Math.round(performance.timeOrigin + performance.now());
  }
  return new Date().getTime(); // évite l’appel direct à Date.now()
}

export function useAutosaveAnswer({
  attemptId,
  debounceMs = 1000,
  url = "/api/attempts/autosave",
}: Options) {
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const latestDocRef = useRef<JSONContent | null>(null);
  const lastFlushedAtRef = useRef<number>(0);
  const inflightRef = useRef<boolean>(false);
  const backoffStepRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fonctions "function" pour bénéficier du hoisting (évite l’erreur d’ordre de déclaration).
   */

  async function doFlushQueue() {
    // si offline → on reste en "queued"
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState({ kind: "queued" });
      return;
    }

    // récupère une éventuelle sauvegarde locale
    let queued: { doc: JSONContent; queuedAt: number } | null = null;
    try {
      const raw =
        typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY(attemptId)) : null;
      if (raw) queued = JSON.parse(raw) as { doc: JSONContent; queuedAt: number };
    } catch {
      // noop
    }

    if (queued?.doc) {
      latestDocRef.current = queued.doc; // on renverra au moins ça
    }

    await doSaveNow();
  }

  async function doSaveNow() {
    const doc = latestDocRef.current;
    if (!doc) return;

    // offline → queue dans localStorage
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(
            LS_KEY(attemptId),
            JSON.stringify({ doc, queuedAt: safeNow() }),
          );
        }
      } catch {
        // noop
      }
      setState({ kind: "queued" });
      return;
    }

    // éviter les requêtes concurrentes
    if (inflightRef.current) return;
    inflightRef.current = true;
    setState({ kind: "saving" });

    const res = await jsonFetch<{ ok: boolean; savedAt?: string }>(url, {
      method: "POST",
      body: JSON.stringify({ attemptId, content: doc }),
      timeoutMs: 15000,
    });

    inflightRef.current = false;

    if (!res.ok) {
      // échec : on met en queue locale (file d'attente) + backoff
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(
            LS_KEY(attemptId),
            JSON.stringify({ doc, queuedAt: safeNow() }),
          );
        }
      } catch {
        // noop
      }

      backoffStepRef.current = Math.min(backoffStepRef.current + 1, 5);
      const delay = Math.min(1000 * 2 ** (backoffStepRef.current - 1), 30000);
      setState({ kind: "error", message: res.error || "Save failed" });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void doFlushQueue();
      }, delay);

      return;
    }

    // succès
    backoffStepRef.current = 0;
    const ts = res.data?.savedAt
      ? new Date(res.data.savedAt).getTime()
      : safeNow();
    lastFlushedAtRef.current = ts;
    setState({ kind: "saved", ts });

    // purge la queue éventuelle
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(LS_KEY(attemptId));
      }
    } catch {
      // noop
    }
  }

  // Planification debounce
  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSaveNow();
    }, debounceMs);
  }, [debounceMs]);

  // Callback à donner à l'éditeur
  const onChange = useCallback(
    (doc: JSONContent) => {
      latestDocRef.current = doc;
      schedule();
    },
    [schedule],
  );

  // visibilitychange / online → flush
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void doFlushQueue();
      }
    };
    const onOnline = () => {
      void doFlushQueue();
    };

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [attemptId, url]);

  // tentative de sync avant de quitter la page
  useEffect(() => {
    const onBeforeUnload = () => {
      const doc = latestDocRef.current;
      if (!doc) return;
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(
            LS_KEY(attemptId),
            JSON.stringify({ doc, queuedAt: safeNow() }),
          );
        }
      } catch {
        // noop
      }
      // ne tente pas de "sync blocking" : les navigateurs ignorent maintenant
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [attemptId]);

  // bouton "Retry"
  const retry = useCallback(() => {
    backoffStepRef.current = 0;
    void doFlushQueue();
  }, []);

  return useMemo(
    () => ({
      state,
      onChange,
      retry,
      lastSavedAt: state.kind === "saved" ? state.ts : null,
    }),
    [onChange, retry, state],
  );
}

export type AutosaveHook = ReturnType<typeof useAutosaveAnswer>;
