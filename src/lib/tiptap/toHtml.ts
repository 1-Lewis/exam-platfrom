// src/lib/tiptap/toHtml.ts
import katex from "katex";
import { promises as fsp } from "node:fs";
import path from "node:path";

/** Charge le CSS KaTeX depuis node_modules pour l’inliner dans la page HTML */
export async function loadKatexCss(): Promise<string> {
  try {
    const cssPath = path.resolve(process.cwd(), "node_modules/katex/dist/katex.min.css");
    return await fsp.readFile(cssPath, "utf8");
  } catch {
    return "";
  }
}

type TTMark = { type?: string } & Record<string, unknown>;
type TTNode = {
  type?: string;
  text?: string;
  content?: TTNode[];
  marks?: TTMark[];
  attrs?: Record<string, unknown>;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderText(node: TTNode): string {
  let out = esc(node.text ?? "");
  const marks = node.marks ?? [];
  for (const m of marks) {
    if (m.type === "bold") out = `<strong>${out}</strong>`;
    else if (m.type === "italic") out = `<em>${out}</em>`;
    else if (m.type === "code") out = `<code>${out}</code>`;
    else if (m.type === "strike") out = `<s>${out}</s>`;
    else if (m.type === "underline") out = `<u>${out}</u>`;
  }
  return out;
}

function renderInlineMath(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    return `<span class="katex-error">${esc(latex)}</span>`;
  }
}
function renderBlockMath(latex: string): string {
  try {
    return `<div class="math-block">${katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    })}</div>`;
  } catch {
    return `<div class="katex-error">${esc(latex)}</div>`;
  }
}

function renderChildren(content?: TTNode[]): string {
  if (!content?.length) return "";
  return content.map(renderNode).join("");
}

function renderNode(node: TTNode): string {
  const type = node.type ?? "text";

  if (type === "text") return renderText(node);
  if (type === "paragraph") return `<p>${renderChildren(node.content)}</p>`;
  if (type === "heading") {
    const level = (node.attrs?.level as number) ?? 1;
    const lv = Math.min(Math.max(Number(level) || 1, 1), 6);
    return `<h${lv}>${renderChildren(node.content)}</h${lv}>`;
  }
  if (type === "bulletList") return `<ul>${renderChildren(node.content)}</ul>`;
  if (type === "orderedList") return `<ol>${renderChildren(node.content)}</ol>`;
  if (type === "listItem") return `<li>${renderChildren(node.content)}</li>`;
  if (type === "hardBreak") return "<br/>";
  if (type === "blockquote") return `<blockquote>${renderChildren(node.content)}</blockquote>`;
  if (type === "codeBlock") {
    const inner = (node.content ?? [])
      .map((n) => (n.type === "text" ? esc(n.text ?? "") : renderNode(n)))
      .join("");
    return `<pre><code>${inner}</code></pre>`;
  }
  // Nos nœuds math perso
  if (type === "mathInline") {
    const latex = String(node.attrs?.content ?? "");
    return `<span class="tiptap-math-inline">${renderInlineMath(latex)}</span>`;
  }
  if (type === "mathBlock") {
    const latex = String(node.attrs?.content ?? "");
    return `<div class="tiptap-math-block">${renderBlockMath(latex)}</div>`;
  }

  // Fallback (doc, etc.)
  return renderChildren(node.content);
}

/** Transforme Answer.content (TipTap JSON) en HTML (sans <html>) */
export function tiptapJsonToHtml(doc: unknown): string {
  const root = (doc as { type?: string; content?: TTNode[] }) ?? {};
  const content = root.content ?? [];
  return content.map(renderNode).join("");
}

/** Page HTML complète pour impression */
export async function renderAttemptHtml(params: {
  title: string;
  studentId: string;
  attemptId: string;
  examId: string;
  bodyHtml: string;
}): Promise<string> {
  const katexCss = await loadKatexCss();

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${esc(params.title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${katexCss}
    :root { color-scheme: light; }
    body { font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; line-height: 1.5; padding: 24px; }
    header { border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; padding-bottom: 8px; }
    h1 { font-size: 18px; margin: 0; }
    .meta { color: #6b7280; font-size: 12px; }
    .content p { margin: 10px 0; }
    .content ul, .content ol { margin: 8px 0 8px 24px; }
    .content pre { background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; overflow: auto; }
    .tiptap-math-inline { background: #f6f7fb; border-radius: 4px; padding: 1px 3px; }
    .tiptap-math-block { background: #f6f7fb; border-radius: 8px; padding: 10px; margin: 12px 0; text-align: center; }
    .katex-error { color: #b91c1c; }
    @media print {
      body { padding: 18mm; }
      header { margin-bottom: 10mm; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Copie – ${esc(params.title)}</h1>
    <div class="meta">
      Étudiant: ${esc(params.studentId)} · Attempt: ${esc(params.attemptId)} · Examen: ${esc(params.examId)}
    </div>
  </header>
  <div class="content">
    ${params.bodyHtml}
  </div>
</body>
</html>`;
}
