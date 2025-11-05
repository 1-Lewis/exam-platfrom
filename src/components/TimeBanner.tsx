// src/components/TimerBanner.tsx
"use client";

import { useMemo } from "react";

export function TimerBanner({ ms, locked }: { ms: number; locked: boolean }) {
  const { minutes, seconds } = useMemo(() => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { minutes: m, seconds: s };
  }, [ms]);

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="text-sm">
        Temps restant :{" "}
        <span className="font-mono">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {locked ? "Examen soumis" : "En cours"}
      </div>
    </div>
  );
}
