// src/editor/extensions/math.ts
import {
  Node,
  mergeAttributes,
  nodeInputRule,
  nodePasteRule,
  type CommandProps,
  type NodeViewRendererProps,
  type AnyExtension,
} from "@tiptap/core";
import katex from "katex";

/** Délimiteurs supportés */
const INLINE_DOLLAR = /\$(.+?)\$/;
const INLINE_PARENS = /\\\((.+?)\\\)/;
const BLOCK_DOLLAR = /^\$\$([\s\S]+?)\$\$$/m;
const BLOCK_BRACKETS = /^\\\[(.+?)\\\]$/m;

export type MathAttrs = { content: string };

/** Rendu KaTeX robuste */
function renderKatex(el: HTMLElement, latex: string, displayMode: boolean) {
  try {
    katex.render(latex, el, { displayMode, throwOnError: false });
  } catch {
    el.textContent = latex;
  }
}

/* ========= INLINE ========= */
const MathInlineNode = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (el: HTMLElement): string =>
          el.getAttribute("data-content") ?? "",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-content": String((attrs as MathAttrs).content ?? ""),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-inline",
        class: "tiptap-math-inline",
      }),
    ];
  },

  addNodeView() {
    return ({ node }: NodeViewRendererProps) => {
      const wrapper = document.createElement("span");
      wrapper.className = "tiptap-math-inline";
      const renderEl = document.createElement("span");
      renderEl.className = "katex-render";
      wrapper.appendChild(renderEl);

      const updateView = (latex: string) => renderKatex(renderEl, latex, false);
      updateView((node.attrs as MathAttrs).content ?? "");

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          updateView((updatedNode.attrs as MathAttrs).content ?? "");
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertMathInline:
        (latex: string) =>
        ({ chain }: CommandProps) =>
          chain()
            .insertContent({ type: this.name, attrs: { content: latex } })
            .run(),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: INLINE_DOLLAR,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: m[1] ?? "" }),
      }),
      nodeInputRule({
        find: INLINE_PARENS,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: m[1] ?? "" }),
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: INLINE_DOLLAR,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: m[1] ?? "" }),
      }),
      nodePasteRule({
        find: INLINE_PARENS,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: m[1] ?? "" }),
      }),
    ];
  },
});

/* ========= BLOCK ========= */
const MathBlockNode = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (el: HTMLElement): string =>
          el.getAttribute("data-content") ?? "",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-content": String((attrs as MathAttrs).content ?? ""),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-block",
        class: "tiptap-math-block",
      }),
    ];
  },

  addNodeView() {
    return ({ node }: NodeViewRendererProps) => {
      const wrapper = document.createElement("div");
      wrapper.className = "tiptap-math-block";
      const renderEl = document.createElement("div");
      renderEl.className = "katex-render";
      wrapper.appendChild(renderEl);

      const updateView = (latex: string) => renderKatex(renderEl, latex, true);
      updateView((node.attrs as MathAttrs).content ?? "");

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          updateView((updatedNode.attrs as MathAttrs).content ?? "");
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex: string) =>
        ({ chain }: CommandProps) =>
          chain()
            .insertContent({ type: this.name, attrs: { content: latex } })
            .run(),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: BLOCK_DOLLAR,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: (m[1] ?? "").trim() }),
      }),
      nodeInputRule({
        find: BLOCK_BRACKETS,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: (m[1] ?? "").trim() }),
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: BLOCK_DOLLAR,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: (m[1] ?? "").trim() }),
      }),
      nodePasteRule({
        find: BLOCK_BRACKETS,
        type: this.type,
        getAttributes: (m: RegExpMatchArray): MathAttrs => ({ content: (m[1] ?? "").trim() }),
      }),
    ];
  },
});

/* === Déclarations de commandes pour TipTap (typage) === */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      /** Insère un nœud KaTeX inline */
      insertMathInline: (latex: string) => ReturnType;
    };
    mathBlock: {
      /** Insère un nœud KaTeX block */
      insertMathBlock: (latex: string) => ReturnType;
    };
  }
}

/* === Exports typés pour usage dans useEditor([...]) === */
export const MathInline: AnyExtension = MathInlineNode as unknown as AnyExtension;
export const MathBlock: AnyExtension = MathBlockNode as unknown as AnyExtension;
export const mathExtensions: AnyExtension[] = [MathInline, MathBlock];
