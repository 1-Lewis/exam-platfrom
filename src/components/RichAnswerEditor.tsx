// src/components/RichAnswerEditor.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { MathFieldElement } from "@/types/mathlive";
import { MathInline, MathBlock } from "@/editor/extensions/math";
import SaveStatus from "@/components/SaveStatus";
import { useAutosaveAnswer } from "@/hooks/useAutosaveAnswer";

type RichAnswerEditorProps = {
  attemptId: string;
  initial?: JSONContent;
  onChange?: (doc: JSONContent) => void; // toujours supporté si tu en as besoin ailleurs
  readOnly?: boolean;
};

export default function RichAnswerEditor(props: RichAnswerEditorProps) {
  const { attemptId, initial, onChange, readOnly = false } = props;

  // 🔁 autosave robuste
  const autosave = useAutosaveAnswer({ attemptId, debounceMs: 1000 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: "Écrivez votre réponse… (tapez $...$ / $$...$$ ou utilisez la palette)",
      }),
      MathInline,
      MathBlock,
    ],
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    autofocus: "end",
    editable: !readOnly,
    onUpdate({ editor }) {
      if (readOnly) return;
      const json = editor.getJSON();
      autosave.onChange(json);
      onChange?.(json);
    },
    immediatelyRender: false,
  });

  // === (le reste de ta logique MathLive inchangée) ===

  // Basculer readOnly à chaud
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // --- Popup MathLive (facultative) ---
  const [openMath, setOpenMath] = useState(false);
  const [mfVal, setMfVal] = useState("\\frac{}{}");
  const mathRef = useRef<MathFieldElement | null>(null);

  function insertInline(latex: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "mathInline", attrs: { content: latex } })
      .run();
  }

  function insertBlock(latex: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "mathBlock", attrs: { content: latex } })
      .run();
  }

  useEffect(() => {
    let mounted = true;
    (globalThis as unknown as { mathlive?: unknown }).mathlive = {
      fontsDirectory: "/mathlive/fonts",
      options: { fontsDirectory: "/mathlive/fonts" },
    };
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

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Top bar: outils & statut */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Barre d’outils (conservée) */}
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

          <div className="mx-2 h-6 w-px bg-gray-200" />

          {/* Maths inline */}
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Fraction"
            onClick={() => insertInline("\\frac{}{}")}>a⁄b</button>
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Puissance"
            onClick={() => insertInline("x^{ }")}>x²</button>
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Racine carrée"
            onClick={() => insertInline("\\sqrt{}")}>√</button>
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Indice"
            onClick={() => insertInline("x_{ }")}>aᵢ</button>

          {/* Maths bloc */}
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Intégrale (bloc)"
            onClick={() => insertBlock("\\int")}>∫</button>
          <button type="button" className="px-2 py-1 border rounded-lg" disabled={readOnly} title="Somme (bloc)"
            onClick={() => insertBlock("\\sum")}>Σ</button>

          {/* Saisie guidée */}
          <div className="mx-2 h-6 w-px bg-gray-200" />
          <button
            type="button"
            className="px-2 py-1 border rounded-lg"
            onClick={() => { setOpenMath(true); setMfVal("\\frac{}{}"); }}
            disabled={readOnly}
            title="Éditer une formule…"
          >
            ƒx
          </button>
        </div>

        {/* Statut autosave */}
        <SaveStatus state={autosave.state} onRetry={autosave.retry} />
      </div>

      {/* Zone d'édition */}
      <div className="border rounded-2xl p-3 min-h-[220px] shadow-sm">
        <EditorContent editor={editor} />
      </div>

      {/* Popup MathLive (inchangée, juste boutons d’insertion) */}
      {openMath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[min(560px,92vw)] space-y-3 rounded-2xl bg-white p-4 shadow-lg">
            <div className="font-semibold">Insérer une formule</div>

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
                Astuce : utilisez les boutons puis “Insérer”.
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border px-3 py-1.5" onClick={() => setOpenMath(false)}>
                  Annuler
                </button>
                <button
                  className="rounded-lg border bg-gray-900 px-3 py-1.5 text-white hover:opacity-90"
                  onClick={() => { insertInline(mfVal); setOpenMath(false); }}
                >
                  Insérer (inline)
                </button>
                <button
                  className="rounded-lg border bg-gray-900 px-3 py-1.5 text-white hover:opacity-90"
                  onClick={() => { insertBlock(mfVal); setOpenMath(false); }}
                >
                  Insérer (bloc)
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Aussi : <code>$…$</code> (inline) ou <code>$$…$$</code> (bloc).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
