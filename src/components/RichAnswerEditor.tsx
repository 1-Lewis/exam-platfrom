"use client"

import React, { useEffect, useState } from "react"
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import "mathlive" // enregistre le web component <math-field>
import type { MathFieldElement } from "@/types/mathlive" // vient du fichier .d.ts

// Alias de <math-field> pour JSX sans passer par IntrinsicElements
const MathField = "math-field" as unknown as React.ComponentType<
  React.HTMLAttributes<HTMLElement>
>

type RichAnswerEditorProps = {
  attemptId: string
  initial?: JSONContent
  onChange?: (doc: JSONContent) => void
  readOnly?: boolean
}

export default function RichAnswerEditor(props: RichAnswerEditorProps) {
  const { attemptId: _attemptId, initial, onChange, readOnly = false } = props

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: "Écrivez votre réponse… ($…$ pour LaTeX inline)",
      }),
    ],
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    autofocus: "end",
    editable: !readOnly,
    onUpdate({ editor }) {
      if (readOnly) return
      onChange?.(editor.getJSON())
    },
  })

  // Permet de basculer en lecture seule à chaud
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  // --- État du dialogue MathLive ---
  const [openMath, setOpenMath] = useState(false)
  const [mfVal, setMfVal] = useState("x^2+1")

  function insertLatex(latex: string): void {
    if (!editor) return
    editor.chain().focus().insertContent(`$${latex}$`).run()
    setOpenMath(false)
  }

  // Tant que TipTap n'est pas initialisé
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
          disabled={readOnly}
        >
          B
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
          disabled={readOnly}
        >
          I
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={readOnly}
        >
          • Liste
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => setOpenMath(true)}
          title="Insérer une formule (MathLive)"
          disabled={readOnly}
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
              // Typage de l’événement pour MathLive
              // (notre alias ne connaît pas le type, on caste dans le handler)
              onInput={(e) => {
                const el = e.currentTarget as unknown as MathFieldElement
                // getValue("latex") exposé par MathLive (d.ts local)
                setMfVal(el.getValue("latex"))
              }}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
                display: "block",
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
