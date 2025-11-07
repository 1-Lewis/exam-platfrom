// src/components/RichAnswerEditor.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { MathFieldElement } from "@/types/mathlive";
import { MathInline, MathBlock } from "@/editor/extensions/math";
import { mathExtensions } from "@/editor/extensions/math";

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
      onChange?.(editor.getJSON());
    },
    immediatelyRender: false,
  });

  // Helpers d’insertion (utilisés par boutons & évènements)
  const insertInline = (latex: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "mathInline", attrs: { content: latex } })
      .run();
  };

  const insertBlock = (latex: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "mathBlock", attrs: { content: latex } })
      .run();
  };

  // ✅ Init MathLive (pour la popup facultative “ƒx” uniquement)
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

  // Basculer readOnly à chaud
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // === Écoute globale "math:insert-latex" → insère en nœud KaTeX
  useEffect(() => {
    if (!editor) return;
    const onInsert = (e: Event) => {
      const detail = (e as CustomEvent<{ latex: string; display?: "inline" | "block" }>).detail;
      if (!detail?.latex) return;
      const latex = detail.latex.trim();
      if (detail.display === "block") insertBlock(latex);
      else insertInline(latex);
    };
    window.addEventListener("math:insert-latex", onInsert);
    return () => window.removeEventListener("math:insert-latex", onInsert);
  }, [editor]);

  // --- Popup MathLive (facultative) ---
  const [openMath, setOpenMath] = useState(false);
  const [mfVal, setMfVal] = useState("\\frac{}{}");
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

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Barre d’outils — maths insérées DIRECTEMENT */}
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

        {/* Saisie guidée (facultative) */}
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

      {/* Popup MathLive (optionnelle) */}
      {openMath && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-2xl w-[min(560px,92vw)] space-y-3 shadow-lg">
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
                Astuce : utilisez les boutons ci-dessus puis “Insérer”.
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 border rounded-lg" onClick={() => setOpenMath(false)}>
                  Annuler
                </button>
                <button
                  className="px-3 py-1.5 border rounded-lg bg-gray-900 text-white hover:opacity-90"
                  onClick={() => { insertInline(mfVal); setOpenMath(false); }}
                >
                  Insérer (inline)
                </button>
                <button
                  className="px-3 py-1.5 border rounded-lg bg-gray-900 text-white hover:opacity-90"
                  onClick={() => { insertBlock(mfVal); setOpenMath(false); }}
                >
                  Insérer (bloc)
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Vous pouvez aussi saisir directement <code>$…$</code> (inline) ou <code>$$…$$</code> (bloc).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
