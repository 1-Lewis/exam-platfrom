// src/lib/serialize/tiptapJsonToHtml.ts
import type { JSONContent } from "@tiptap/react";
import katex from "katex";

/**
 * Très petit escape HTML (uniquement pour les text nodes).
 */
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type NodeLike = JSONContent & { content?: NodeLike[]; marks?: { type: string }[] };

function renderText(node: NodeLike): string {
  let out = escapeHtml(node.text ?? "");

  const marks = node.marks?.map((m) => m.type) ?? [];
  if (marks.includes("code")) out = `<code>${out}</code>`;
  if (marks.includes("bold")) out = `<strong>${out}</strong>`;
  if (marks.includes("italic")) out = `<em>${out}</em>`;
  if (marks.includes("strike")) out = `<s>${out}</s>`;

  return out;
}

function renderChildren(nodes: NodeLike[] | undefined): string {
  if (!nodes?.length) return "";
  return nodes.map(renderNode).join("");
}

function renderMathInline(latex: string): string {
  try {
    const html = katex.renderToString(latex, { displayMode: false, throwOnError: false });
    return `<span class="tiptap-math-inline">${html}</span>`;
  } catch {
    return `<span class="tiptap-math-inline">${escapeHtml(latex)}</span>`;
  }
}

function renderMathBlock(latex: string): string {
  try {
    const html = katex.renderToString(latex, { displayMode: true, throwOnError: false });
    return `<div class="tiptap-math-block">${html}</div>`;
  } catch {
    return `<div class="tiptap-math-block"><pre>${escapeHtml(latex)}</pre></div>`;
  }
}

function renderNode(node: NodeLike): string {
  switch (node.type) {
    case "text":
      return renderText(node);

    case "paragraph":
      return `<p>${renderChildren(node.content)}</p>`;

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const tag = `h${Math.min(6, Math.max(1, level))}`;
      return `<${tag}>${renderChildren(node.content)}</${tag}>`;
    }

    case "bulletList":
      return `<ul>${renderChildren(node.content)}</ul>`;

    case "orderedList":
      return `<ol>${renderChildren(node.content)}</ol>`;

    case "listItem":
      return `<li>${renderChildren(node.content)}</li>`;

    case "blockquote":
      return `<blockquote>${renderChildren(node.content)}</blockquote>`;

    case "hardBreak":
      return "<br/>";

    case "horizontalRule":
      return "<hr/>";

    // Tes extensions math perso (inline / block)
    case "mathInline":
      return renderMathInline(String(node.attrs?.content ?? ""));

    case "mathBlock":
      return renderMathBlock(String(node.attrs?.content ?? ""));

    // Fallback : on essaie quand même d’afficher le contenu
    default:
      return renderChildren(node.content);
  }
}

/**
 * Entrée : JSON TipTap (Answer.content)
 * Sortie : HTML prêt à injecter (KaTeX inclus côté serveur)
 */
export function tiptapJsonToHtml(doc: JSONContent | null | undefined): string {
  if (!doc || doc.type !== "doc") {
    return `<p></p>`;
  }
  const body = renderChildren(doc.content as NodeLike[]);
  return `<div class="prose max-w-none">${body}</div>`;
}
