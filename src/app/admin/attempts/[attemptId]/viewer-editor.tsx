"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// Si tu utilises tes extensions math personnalisées, importe-les ici :
// import { mathExtensions } from "@/editor/extensions/math";

export default function ViewerEditor({ initial }: { initial: JSONContent }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      // ...mathExtensions, // active si tu enregistres des nœuds math
    ],
    content: initial,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
