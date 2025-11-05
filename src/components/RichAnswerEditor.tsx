"use client"

import { useState } from "react"
import { EditorContent, useEditor, JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import "mathlive" // enregistre le web component <math-field>
import type { MathFieldElement } from "@/types/mathlive" // vient du fichier .d.ts
import type React from "react"

// Alias de <math-field> pour JSX sans passer par IntrinsicElements
const MathField = 'math-field' as unknown as React.ComponentType<
  React.HTMLAttributes<HTMLElement>
>

export default function RichAnswerEditor({
  initial,
  onChange,
}: {
  initial?: JSONContent
  onChange: (doc: JSONContent) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: "Écrivez votre réponse… ($…$ pour LaTeX inline)",
      }),
    ],
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    autofocus: "end",
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  const [openMath, setOpenMath] = useState(false)
  const [mfVal, setMfVal] = useState("x^2+1")

  function insertLatex(latex: string): void {
    if (!editor) return
    editor.chain().focus().insertContent(`$${latex}$`).run()
    setOpenMath(false)
  }

  if (!editor) return null

  return (
    <div className="space-y-2">
      {/* Barre d’outils */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
        >
          B
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
        >
          I
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Liste
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => setOpenMath(true)}
          title="Insérer une formule (MathLive)"
        >
          ƒx
        </button>
      </div>

      {/* Zone d'édition */}
      <div className="border rounded p-3 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>

      {/* Dialogue MathLive */}
      {openMath && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-2xl w-[min(520px,92vw)] space-y-3">
            <div className="font-semibold">Insérer une formule</div>

           <MathField
  style={{
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 8,
  }}
  onInput={(e) => {
    const el = e.currentTarget as unknown as { getValue: (m?: "latex"|"mathml") => string }
    setMfVal(el.getValue("latex"))
  }}
/>


            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setOpenMath(false)}
              >
                Annuler
              </button>
              <button
                className="px-3 py-1 border rounded bg-black text-white"
                onClick={() => insertLatex(mfVal)}
              >
                Insérer
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Astuce : tape directement <code>$ … $</code> dans l’éditeur
              pour une formule inline.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
