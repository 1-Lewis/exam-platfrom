// src/components/RichAnswerEditor.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
// ❌ on n'importe plus "mathlive" ici (sinon il démarre avant la config)
import type { MathFieldElement } from "@/types/mathlive"; // d.ts local

type RichAnswerEditorProps = {
  attemptId: string;
  initial?: JSONContent;
  onChange?: (doc: JSONContent) => void;
  readOnly?: boolean;
};

export default function RichAnswerEditor(props: RichAnswerEditorProps) {
  const { attemptId: _attemptId, initial, onChange, readOnly = false } = props;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder:
          "Écrivez votre réponse… (utilisez les boutons Math pour les formules)",
      }),
    ],
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    autofocus: "end",
    editable: !readOnly,
    onUpdate({ editor }) {
      if (readOnly) return;
      onChange?.(editor.getJSON());
    },
    immediatelyRender: false, // évite le rendu SSR initial de TipTap
  });

  // ✅ Init MathLive : définir le chemin AVANT l'import, puis setOptions si dispo
  useEffect(() => {
    let mounted = true;

    // 1) Seed global avant import (certaines versions lisent ces valeurs à l'init)
    (globalThis as unknown as { mathlive?: unknown }).mathlive = {
      fontsDirectory: "/mathlive/fonts",
      options: { fontsDirectory: "/mathlive/fonts" },
    };

    // 2) Import dynamique, puis configuration complémentaire
    import("mathlive").then((mod) => {
      if (!mounted) return;

      const maybe = mod as unknown as {
        setOptions?: (o: Record<string, unknown>) => void;
        MathfieldElement?: { setOptions?: (o: Record<string, unknown>) => void };
      };

      const setOptionsFn =
        typeof maybe.setOptions === "function"
          ? maybe.setOptions
          : typeof maybe.MathfieldElement?.setOptions === "function"
          ? maybe.MathfieldElement.setOptions
          : undefined;

      setOptionsFn?.({ fontsDirectory: "/mathlive/fonts" });
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Basculer readOnly à chaud
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // === Écoute globale "math:insert-latex" ===
  useEffect(() => {
    if (!editor) return;
    const onInsert = (e: Event) => {
      const detail = (e as CustomEvent<{ latex: string; display?: "inline" | "block" }>).detail;
      if (!detail?.latex) return;
      const latex = detail.latex.trim();
      const isBlock = detail.display === "block";
      editor
        .chain()
        .focus()
        .insertContent(isBlock ? `<p>$$${latex}$$</p>` : `$${latex}$`)
        .run();
    };
    window.addEventListener("math:insert-latex", onInsert);
    return () => window.removeEventListener("math:insert-latex", onInsert);
  }, [editor]);

  // --- Dialogue MathLive ---
  const [openMath, setOpenMath] = useState(false);
  const [mfVal, setMfVal] = useState("\\frac{}{}"); // valeur par défaut utile
  const mathRef = useRef<MathFieldElement | null>(null);

  function openMathWithTemplate(template: string) {
    setOpenMath(true);
    setTimeout(() => {
      setMfVal(template);
      try {
        if (mathRef.current) {
          mathRef.current.value = template;
          mathRef.current.executeCommand?.(["selectAll"]);
          mathRef.current.focus();
        }
      } catch {
        // noop
      }
    }, 0);
  }

  function insertLatex(latex: string, display: "inline" | "block" = "inline"): void {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(display === "block" ? `<p>$$${latex}$$</p>` : `$${latex}$`)
      .run();
    setOpenMath(false);
  }

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Barre d’outils épurée */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
          disabled={readOnly}
          title="Gras"
        >
          B
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
          disabled={readOnly}
          title="Italique"
        >
          I
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={readOnly}
          title="Liste à puces"
        >
          • Liste
        </button>

        {/* Raccourcis Math */}
        <div className="mx-2 h-6 w-px bg-gray-200" />
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("\\frac{}{}")}
          disabled={readOnly}
          title="Fraction"
        >
          a⁄b
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("x^{ }")}
          disabled={readOnly}
          title="Puissance"
        >
          x²
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("\\sqrt{}")}
          disabled={readOnly}
          title="Racine carrée"
        >
          √
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("x_{ }")}
          disabled={readOnly}
          title="Indice"
        >
          aᵢ
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("\\int")}
          disabled={readOnly}
          title="Intégrale"
        >
          ∫
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("\\sum")}
          disabled={readOnly}
          title="Somme"
        >
          Σ
        </button>

        <div className="mx-2 h-6 w-px bg-gray-200" />
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => openMathWithTemplate("\\frac{}{}")}
          disabled={readOnly}
          title="Éditer une formule…"
        >
          ƒx
        </button>
      </div>

      {/* Zone d'édition */}
      <div className="border rounded-2xl p-3 min-h-[220px] shadow-sm">
        <EditorContent editor={editor} />
      </div>

      {/* Dialogue MathLive */}
      {openMath && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-2xl w-[min(560px,92vw)] space-y-3 shadow-lg">
            <div className="font-semibold">Insérer une formule</div>

            {/* web component natif avec ref typé */}
            <math-field
              ref={mathRef}
              onInput={(e: React.FormEvent<MathFieldElement>) => {
                const el = e.currentTarget;
                try {
                  setMfVal(el.getValue("latex") ?? el.value ?? "");
                } catch {
                  setMfVal(el.value ?? "");
                }
              }}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
                display: "block",
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                Astuce : utilisez les boutons ci-dessus puis “Insérer”.
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 border rounded-lg"
                  onClick={() => setOpenMath(false)}
                >
                  Annuler
                </button>
                <button
                  className="px-3 py-1.5 border rounded-lg bg-gray-900 text-white hover:opacity-90"
                  onClick={() => insertLatex(mfVal, "inline")}
                >
                  Insérer (inline)
                </button>
                <button
                  className="px-3 py-1.5 border rounded-lg bg-gray-900 text-white hover:opacity-90"
                  onClick={() => insertLatex(mfVal, "block")}
                >
                  Insérer (bloc)
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Vous pouvez aussi saisir directement <code>$…$</code> dans
              l’éditeur pour insérer des maths inline.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
