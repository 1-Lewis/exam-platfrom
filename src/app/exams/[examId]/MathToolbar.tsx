"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  display?: "inline" | "block"; // par défaut "inline"
};

type MathfieldElement = HTMLElement & {
  getValue: () => string;
  setValue: (v: string) => void;
  executeCommand: (cmd: unknown) => void;
  focus: () => void;
};

export default function MathToolbar({ display = "inline" }: Props) {
  const [open, setOpen] = useState(false);
  const mathRef = useRef<MathfieldElement | null>(null);

  // Charger MathLive côté client uniquement
  useEffect(() => {
    let mounted = true;
    (async () => {
      const already = customElements.get("math-field");
      if (!already) {
        await import("mathlive"); // définit le custom element <math-field>
      }
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Insère une structure prédéfinie dans le champ MathLive
  const insertTemplate = (tex: string) => {
    const el = mathRef.current;
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    el.executeCommand(["insert", tex]);
    el.focus();
  };

  const onInsert = () => {
    const el = mathRef.current;
    if (!el) return;
    const latex = el.getValue();
    window.dispatchEvent(
      new CustomEvent("math:insert-latex", { detail: { latex, display } })
    );
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-3 py-2 text-sm font-medium text-gray-600">
        Math
      </div>

      <div className="p-3 space-y-3">
        {/* Ligne de raccourcis (2 clics) */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              // petite latence pour que le composant existe puis on injecte
              setTimeout(() => insertTemplate("\\frac{}{}"), 0);
            }}
            title="Fraction"
          >
            a⁄b
          </button>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              setTimeout(() => insertTemplate("^{ }"), 0);
            }}
            title="Puissance"
          >
            x²
          </button>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              setTimeout(() => insertTemplate("\\sqrt{}"), 0);
            }}
            title="Racine"
          >
            √
          </button>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              setTimeout(() => insertTemplate("_{ }"), 0);
            }}
            title="Indice"
          >
            aᵢ
          </button>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              setTimeout(() => insertTemplate("\\int"), 0);
            }}
            title="Intégrale"
          >
            ∫
          </button>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              setOpen(true);
              setTimeout(() => insertTemplate("\\sum"), 0);
            }}
            title="Somme"
          >
            Σ
          </button>

          <button
            type="button"
            className="ml-auto rounded-lg border px-2 py-1 hover:bg-gray-50"
            onClick={() => setOpen((o) => !o)}
            title="Éditer une formule"
          >
            Éditer une formule…
          </button>
        </div>

        {/* Éditeur MathLive minimal (affiché à la demande) */}
        {open && (
          <div className="rounded-xl border p-3 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="text-xs text-gray-500">
              Tapez ou utilisez les touches/raccourcis, puis “Insérer”.
            </div>

            {/* web component MathLive */}
            <math-field
              ref={(n: unknown) => {
                mathRef.current = (n as MathfieldElement) ?? null;
              }}
              style={{
                width: "100%",
                fontSize: "1.1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "0.5rem 0.75rem",
              }}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 bg-gray-900 text-white hover:opacity-90"
                onClick={onInsert}
              >
                Insérer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
