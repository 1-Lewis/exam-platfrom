"use client";

import { useEffect } from "react";
import { useProctoring } from "@/lib/proctoring";

export function AttemptClientProctoring({ attemptId }: { attemptId: string }) {
  const p = useProctoring(attemptId);

  useEffect(() => {
    p.start();
    return () => p.stop();
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

