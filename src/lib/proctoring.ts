// src/lib/proctoring.ts
"use client";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

type ProctorEventInput = {
  type: string;
  meta?: JsonValue;
  clientTs?: string;
};

type QueueItem = ProctorEventInput;

const MAX_BATCH = 20;
const FLUSH_INTERVAL_MS = 5000;
const STORAGE_HEARTBEAT_KEY = (attemptId: string) =>
  `attempt:${attemptId}:heartbeat`;

// --- Copy/Paste intelligence (interne vs externe) ---
const COPY_TOKEN_KEY = "exam:lastCopyToken";
const COPY_TOKEN_TTL_MS = 30_000; // 30s pour considérer le paste comme "interne" après un copy

// Petit hash non-crypto pour comparer du texte rapidement
function hashText(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0; // uint32
}

function setLastCopyToken(text: string) {
  const token = { h: hashText(text), ts: Date.now() };
  try {
    sessionStorage.setItem(COPY_TOKEN_KEY, JSON.stringify(token));
  } catch {
    // ignore
  }
}

function checkIsInternalPaste(text: string): boolean {
  try {
    const raw = sessionStorage.getItem(COPY_TOKEN_KEY);
    if (!raw) return false;
    const token = JSON.parse(raw) as { h: number; ts: number };
    if (Date.now() - token.ts > COPY_TOKEN_TTL_MS) return false;
    return token.h === hashText(text);
  } catch {
    return false;
  }
}

function selectionText(): string {
  const sel = window.getSelection?.();
  return sel?.toString() ?? "";
}

function clipboardTypes(e: ClipboardEvent): string[] {
  try {
    return Array.from(e.clipboardData?.types ?? []);
  } catch {
    return [];
  }
}
// -----------------------------------------------------

export function useProctoring(attemptId: string) {
  // queue en module scope pour rester partagée
  let queue: QueueItem[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastVisibility: DocumentVisibilityState | null = null;
  let lastFocus = false;

  const endpoint = `/api/attempts/${attemptId}/events`;

  const push = (ev: ProctorEventInput) => {
    queue.push({ ...ev, clientTs: new Date().toISOString() });
    if (queue.length >= MAX_BATCH) flush();
  };

  const flush = () => {
    if (queue.length === 0) return;
    const payload = { events: queue.splice(0, queue.length) };

    // sendBeacon si possible (fire-and-forget)
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        const ok = navigator.sendBeacon(endpoint, blob);
        if (ok) return;
      } catch {
        // fallback below
      }
    }

    // fallback fetch
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // utile au unload
    }).catch(() => {
      // en cas d’échec, on réinsère en tête (simple)
      queue = payload.events.concat(queue);
    });
  };

  const onFocus = () => {
    if (!lastFocus) {
      lastFocus = true;
      push({ type: "focus-gained" });
    }
  };
  const onBlur = () => {
    if (lastFocus) {
      lastFocus = false;
      push({ type: "focus-lost" });
    }
  };
  const onVisibility = () => {
    if (document.visibilityState !== lastVisibility) {
      lastVisibility = document.visibilityState;
      push({
        type:
          document.visibilityState === "hidden"
            ? "visibility-hidden"
            : "visibility-visible",
      });
    }
  };

  const onCopy = (e: ClipboardEvent) => {
    const txt = selectionText();
    if (txt) setLastCopyToken(txt);
    push({
      type: "copy",
      meta: { length: txt.length, clipboardTypes: clipboardTypes(e) },
    });
  };
  const onCut = (e: ClipboardEvent) => {
    const txt = selectionText();
    if (txt) setLastCopyToken(txt);
    push({
      type: "cut",
      meta: { length: txt.length, clipboardTypes: clipboardTypes(e) },
    });
  };
  const onPaste = (e: ClipboardEvent) => {
    let pastedText = "";
    try {
      pastedText = e.clipboardData?.getData("text/plain") ?? "";
    } catch {
      // ignore
    }
    const isInternal = pastedText ? checkIsInternalPaste(pastedText) : false;

    push({
      type: "paste",
      meta: {
        length: pastedText.length,
        clipboardTypes: clipboardTypes(e),
        isInternal,
      },
    });
  };

  // multi-onglets : on envoie un ping localStorage, et on écoute les pings des autres onglets
  const heartbeat = () => {
    localStorage.setItem(STORAGE_HEARTBEAT_KEY(attemptId), String(Date.now()));
  };
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_HEARTBEAT_KEY(attemptId) && ev.newValue) {
      // autre onglet actif de la même tentative
      push({
        type: "multi-tab-other-active",
        meta: { at: Number(ev.newValue) },
      });
    }
  };

  const start = () => {
    if (typeof window === "undefined") return; // garde SSR

    // listeners
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    window.addEventListener("storage", onStorage);

    // init states
    lastFocus = typeof document !== "undefined" ? document.hasFocus() : false;
    lastVisibility = typeof document !== "undefined" ? document.visibilityState : null;
    
    push({ type: "session-start" });

    // timers
    timer = setInterval(() => {
      // heartbeat + flush
      heartbeat();
      push({ type: "heartbeat" });
      flush();
    }, FLUSH_INTERVAL_MS);

    // flush on unload
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
  };

  const stop = () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("copy", onCopy);
    document.removeEventListener("cut", onCut);
    document.removeEventListener("paste", onPaste);
    window.removeEventListener("storage", onStorage);

    if (timer) clearInterval(timer);
    flush();
  };

  return { start, stop };
}
