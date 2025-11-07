// src/app/admin/attempts/[attemptId]/viewer-editor.tsx
"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MathInline, MathBlock } from "@/editor/extensions/math";

type Props = {
  initial: JSONContent;
};

export default function ViewerEditor({ initial }: Props) {
  const editor = useEditor({
    extensions: [
      // StarterKit sans codeBlock si tu n’enregistres pas ce node dans tes copies;
      // garde-le à true si tu peux avoir des blocks de code.
      StarterKit.configure({ codeBlock: false }),
      // 👉 Active nos nœuds KaTeX
      MathInline,
      MathBlock,
    ],
    content: initial,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
