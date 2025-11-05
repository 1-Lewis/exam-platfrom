// src/hooks/useServerTimer.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type AttemptStatus = "PENDING" | "ONGOING" | "SUBMITTED";

type TimePayload = {
  now: string;
  remainingMs: number;
  isExpired: boolean;
  locked: boolean;
  status: AttemptStatus;
  expectedEndAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
};

export function useServerTimer(attemptId: string) {
  const [time, setTime] = useState<TimePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localMs, setLocalMs] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);

  const fetchTime = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/time`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data: TimePayload = await res.json();
      setTime(data);
      setLocalMs(data.remainingMs);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  useEffect(() => {
    if (!attemptId) return;
    fetchTime(); // initial
    // poll toutes les 20s
    pollRef.current = window.setInterval(fetchTime, 20000);
    const onVis = () => document.visibilityState === "visible" && fetchTime();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // countdown local (corrigé par le poll)
  useEffect(() => {
    if (localMs === null) return;
    if (localMs <= 0) return;
    const id = window.setInterval(() => {
      setLocalMs((prev) => (prev !== null && prev > 0 ? prev - 1000 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [localMs]);

  const displayMs = time?.locked ? 0 : Math.max(0, localMs ?? time?.remainingMs ?? 0);
  const locked = !!time?.locked || displayMs === 0;

  return { time, displayMs, locked, error, refetch: fetchTime };
}
