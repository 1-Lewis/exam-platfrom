// src/components/SaveStatus.tsx
"use client";

import React from "react";
import type { SaveState } from "@/hooks/useAutosaveAnswer";

type Props = {
  state: SaveState;
  onRetry?: () => void;
};

export default function SaveStatus({ state, onRetry }: Props) {
  switch (state.kind) {
    case "saving":
      return (
        <div className="text-sm text-blue-500 animate-pulse">
          💾 Sauvegarde en cours…
        </div>
      );

    case "saved":
      return (
        <div className="text-sm text-green-600">
          ✅ Sauvegardé à{" "}
          {new Date(state.ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      );

    case "queued":
      return (
        <div className="text-sm text-yellow-600">
          ⚠️ Hors ligne — sauvegarde en attente…
        </div>
      );

    case "error":
      return (
        <div className="text-sm text-red-600">
          ❌ {state.message}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-2 underline text-blue-600 hover:text-blue-800"
            >
              Réessayer
            </button>
          )}
        </div>
      );

    case "idle":
    default:
      return <div className="text-sm text-gray-400">—</div>;
  }
}
