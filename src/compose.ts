import { Marked } from "marked";
import { MathMetrics, ink, shift, type Box, type Fragment } from "./boxes.js";
import { mathBox } from "./latex.js";
import { parseLayout, type Layout, type Page } from "./model.js";
import type { TextStyle } from "./render.js";
import { Typography, letterBounds } from "./typography.js";
import { validateOptions, type ComposeOptions } from "./options.js";
import { breakTokens } from "./line-breaks.js";
export { defaultOptions } from "./options.js";
export type { ComposeOptions } from "./options.js";
export type Composed = { layout: Layout; styles: Record<string, TextStyle> };
type MdToken = {
  type: string;
  raw: string;
  text?: string;
  tokens?: MdToken[];
  depth?: number;
  items?: MdToken[];
  ordered?: boolean;
  start?: number | string;
  checked?: boolean;
};
type Chunk =
  | { kind: "text"; text: string; style: TextStyle }
  | { kind: "math"; source: string }
  | { kind: "break" };
type Block =
  | {
      kind: "flow";
      chunks: Chunk[];
      size: number;
      indent: number;
      gap: number;
      color: string;
    }
  | { kind: "math"; source: string }
  | { kind: "rule" };
const firstIndex = (src: string, needles: string[]): number | undefined => {
  const found = needles.map((n) => src.indexOf(n)).filter((i) => i >= 0);
  return found.length ? Math.min(...found) : undefined;
};
const markdown = new Marked({
  gfm: true,
  extensions: [
    {
      name: "displayMath",
      level: "block",
      start: (src) => firstIndex(src, ["$$", "\\["]),
      tokenizer(src) {
        if (!src.startsWith("$$") && !src.startsWith("\\[")) return;
        const close = src.startsWith("$$") ? "$$" : "\\]",
          end = src.indexOf(close, 2);
        if (end < 0)
          throw new Error(`Unclosed display formula. Close it with ${close}.`);
        const raw = src.slice(0, end + 2);
        return { type: "displayMath", raw, text: raw.slice(2, -2) };
      },
    },
    {
      name: "inlineMath",
      level: "inline",
      start: (src) => firstIndex(src, ["$", "\\("]),
      tokenizer(src) {
        if (src.startsWith("\\(")) {
          const end = src.indexOf("\\)", 2);
          if (end < 0)
            throw new Error("Unclosed inline formula. Close it with \\).");
          return {
            type: "inlineMath",
            raw: src.slice(0, end + 2),
            text: src.slice(2, end),
          };
        }
        if (!src.startsWith("$")) return;
        let end = 1;
        while (end < src.length && (src[end] !== "$" || src[end - 1] === "\\"))
          end++;
        if (end >= src.length)
          throw new Error(
            "Unclosed inline formula. Pair $...$, or escape a currency dollar as \\$.",
          );
        return {
          type: "inlineMath",
          raw: src.slice(0, end + 1),
          text: src.slice(1, end),
        };
      },
    },
  ],
});
function inlines(tokens: MdToken[], style: TextStyle = {}): Chunk[] {
  return tokens.flatMap((token): Chunk[] => {
    switch (token.type) {
      case "strong":
        return inlines(token.tokens ?? [], { ...style, bold: true });
      case "em":
        return inlines(token.tokens ?? [], { ...style, italic: true });
      case "link":
        return inlines(token.tokens ?? [], style);
      case "br":
        return [{ kind: "break" }];
      case "inlineMath":
        return [{ kind: "math", source: token.text ?? "" }];
      case "text":
        if (token.tokens) return inlines(token.tokens, style);
      // Inline code and escaped punctuation remain handwriting, with literal content.
      case "escape":
      case "codespan":
        return [
          { kind: "text", text: (token.text ?? "").replace(/\n/g, " "), style },
        ];
      default:
        throw new Error(
          `Markdown ${token.type} is not supported yet. Use headings, paragraphs, lists, quotes, emphasis and formulas.`,
        );
    }
  });
}
function markdownBlocks(source: string, size: number): Block[] {
  const blocks: Block[] = [];
  function walk(tokens: MdToken[], indent = 0, color = ink, level = 0): void {
    if (level > 16) throw new Error("Markdown nesting is too deep.");
    for (const token of tokens) {
      if (token.type === "space" || token.type === "def") continue;
      if (token.type === "displayMath") {
        blocks.push({ kind: "math", source: token.text ?? "" });
        continue;
      }
      if (token.type === "hr") {
        blocks.push({ kind: "rule" });
        continue;
      }
      if (token.type === "blockquote") {
        walk(token.tokens ?? [], indent + 18, "#546e58", level + 1);
        continue;
      }
      if (token.type === "list") {
        for (const [i, item] of (token.items ?? []).entries()) {
          const start = blocks.length;
          walk(item.tokens ?? [], indent + 18, color, level + 1);
          const block = blocks[start];
          if (block?.kind === "flow") {
            const label = token.ordered
              ? `${Number(token.start ?? 1) + i}. `
              : "- ";
            block.chunks.unshift({
              kind: "text",
              text:
                label +
                (item.checked === undefined
                  ? ""
                  : item.checked
                    ? "[x] "
                    : "[ ] "),
              style: {},
            });
          }
        }
        continue;
      }
      if (token.type === "code") {
        for (const line of (token.text ?? "")
          .replace(/\t/g, "    ")
          .split("\n"))
          blocks.push({
            kind: "flow",
            chunks: [{ kind: "text", text: line || " ", style: {} }],
            size: size * 0.9,
            indent: indent + 12,
            gap: 2,
            color,
          });
        continue;
      }
      if (["heading", "paragraph", "text"].includes(token.type)) {
        const heading = token.type === "heading",
          depth = token.depth ?? 1;
        blocks.push({
          kind: "flow",
          chunks: inlines(
            token.tokens ?? [
              { type: "text", raw: token.raw, text: token.text },
            ],
          ),
          size: heading
            ? size * [1.7, 1.35, 1.15][Math.min(depth - 1, 2)]
            : size,
          indent,
          gap: heading ? 16 : 11,
          color: heading ? "#035296" : color,
        });
        continue;
      }
      throw new Error(
        `Markdown ${token.type} is not supported yet. Images, tables and HTML are not converted.`,
      );
    }
  }
  walk(markdown.lexer(source) as unknown as MdToken[]);
  return blocks;
}
type Flow =
  | { kind: "text"; text: string; style: TextStyle }
  | { kind: "box"; box: Box }
  | { kind: "break" };
export async function compose(
  source: string,
  options: ComposeOptions,
  typography: Typography,
): Promise<Composed> {
  if (!source.trim()) throw new Error("Paste some text or a formula to start.");
  if (source.length > 12000)
    throw new Error("Use at most 12,000 source characters.");
  validateOptions(options);
  const metrics = new MathMetrics(
    typography.bank,
    typography.variation,
    typography.fallback,
  );
  const dimensions =
    options.paper === "letter" ? [612, 792] : [595.276, 841.89];
  const top = options.paddingTop,
    bottom = options.paddingBottom,
    left = options.paddingLeft,
    right = options.paddingRight;
  const frameWidth =
    (dimensions[0] - left - right - (options.columns - 1) * options.columnGap) /
    options.columns;
  const frameHeight = dimensions[1] - top - bottom;
  if (frameWidth < options.size * 3 || frameHeight < options.size * 3)
    throw new Error(
      "These margins and columns leave too little space. Reduce margins, column count or text size.",
    );
  let column = 0;
  const frameX = () => left + column * (frameWidth + options.columnGap);
  const pages: Page[] = [],
    styles: Record<string, TextStyle> = {};
  let y = top;
  function newPage(): Page {
    if (pages.length >= 20)
      throw new Error("This document exceeds the 20-page browser limit.");
    const page: Page = {
      width: dimensions[0],
      height: dimensions[1],
      background: "#faf9f1",
      grid: options.grid,
      items: [],
    };
    pages.push(page);
    y = top;
    column = 0;
    return page;
  }
  let page = newPage();
  function nextFrame(): Page {
    if (column + 1 < options.columns) {
      column++;
      y = top;
      return page;
    }
    return newPage();
  }
  const blocks: Block[] =
    options.format === "latex"
      ? [
          {
            kind: "math",
            source: source
              .trim()
              .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
              .replace(/^\\\[([\s\S]*)\\\]$/, "$1"),
          },
        ]
      : options.format === "plain"
        ? source
            .replace(/\r\n?/g, "\n")
            .replace(/\t/g, "    ")
            .split(/\n[ \t]*\n+/)
            .filter((text) => text.trim())
            .map((text) => ({
              kind: "flow" as const,
              chunks: text
                .split("\n")
                .flatMap((line, i): Chunk[] => [
                  ...(i ? [{ kind: "break" as const }] : []),
                  { kind: "text", text: line || " ", style: {} },
                ]),
              size: options.size,
              indent: 0,
              gap: options.paragraphGap,
              color: ink,
            }))
        : markdownBlocks(source.replace(/\r\n?/g, "\n"), options.size);
  function place(fragments: Fragment[], x: number, baseline: number): void {
    for (const fragment of fragments) {
      const index = page.items.length;
      page.items.push({
        ...fragment.item,
        x: fragment.item.x + x,
        y: fragment.item.y + baseline,
      });
      if (fragment.style)
        styles[`${pages.length - 1}:${index}`] = fragment.style;
    }
  }
  async function planLine(
    elements: Flow[],
    start: number,
    size: number,
    width: number,
  ): Promise<{ box: Box; next: number }> {
    const box: Box = {
      width: 0,
      up: size * 0.8,
      down: size * 0.2,
      fragments: [],
    };
    let i = start;
    for (; i < elements.length; i++) {
      const element = elements[i];
      if (element.kind === "break") {
        i++;
        break;
      }
      let next: Box;
      if (element.kind === "box") next = element.box;
      else {
        let text = element.text;
        if (!box.fragments.length) text = text.trimStart();
        if (!text) continue;
        const shape = await typography.shape(
          text,
          size,
          pages.length - 1,
          page.items.length + box.fragments.length,
        );
        const bounds = shape.letters
          .map((letter) => letterBounds(letter, element.style))
          .filter((b) => b !== undefined);
        const inset = Math.max(0, -Math.min(0, ...bounds.map((b) => b.left)));
        const rightEdge = Math.max(shape.width, ...bounds.map((b) => b.right));
        next = {
          width: inset + rightEdge,
          up: Math.max(size * 0.8, ...bounds.map((b) => -b.top)),
          down: Math.max(size * 0.2, ...bounds.map((b) => b.bottom)),
          fragments: [
            {
              item: { type: "text", text, x: inset, y: 0, size, color: ink },
              style: element.style,
            },
          ],
        };
        if (next.width > width && !box.fragments.length) {
          // Break a long URL/word at glyph boundaries, without dropping content.
          const chars = [...text];
          let low = 1,
            high = chars.length - 1,
            fit = 0;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = await typography.shape(
              chars.slice(0, mid).join(""),
              size,
              pages.length - 1,
              page.items.length,
            );
            if (candidate.width + size * 0.2 <= width) {
              fit = mid;
              low = mid + 1;
            } else high = mid - 1;
          }
          if (!fit)
            throw new Error(
              "A character is wider than the writable page area.",
            );
          elements.splice(
            i,
            1,
            { ...element, text: chars.slice(0, fit).join("") },
            { ...element, text: chars.slice(fit).join("") },
          );
          i--;
          continue;
        }
      }
      if (box.width + next.width > width) {
        if (!box.fragments.length)
          throw new Error(
            "A formula is wider than the writable column. Shorten it, use a smaller text size, or split it into separate formulas.",
          );
        break;
      }
      box.fragments.push(...shift(next, box.width, 0));
      box.width += next.width;
      box.up = Math.max(box.up, next.up);
      box.down = Math.max(box.down, next.down);
    }
    return { box, next: i };
  }
  for (const block of blocks) {
    if (block.kind === "rule") {
      if (y + options.size > page.height - bottom) page = nextFrame();
      place(
        [
          {
            item: {
              type: "rule",
              x: 0,
              y: 0,
              length: frameWidth - 1,
              width: 0.8,
              color: "#728570",
            },
          },
        ],
        frameX() + 0.5,
        y + options.size * 0.4,
      );
      y += options.size * 0.8 + options.paragraphGap;
      continue;
    }
    if (block.kind === "math") {
      const box = mathBox(block.source, options.size * 1.12, metrics);
      if (box.width > frameWidth - 1)
        throw new Error(
          "A display formula is wider than the writable column. Reduce text size or split the formula.",
        );
      if (box.up + box.down + 1 > frameHeight)
        throw new Error("A formula is taller than the writable page area.");
      if (y + box.up + box.down + 1 > page.height - bottom) page = nextFrame();
      place(
        box.fragments,
        frameX() + (frameWidth - box.width) / 2,
        y + box.up + 0.5,
      );
      y += box.up + box.down + options.paragraphGap + options.size * 0.15 + 1;
      continue;
    }
    if (
      block.size > options.size &&
      y +
        block.size * options.lineHeight +
        options.size * options.lineHeight +
        options.paragraphGap >
        page.height - bottom
    )
      page = nextFrame();
    const elements: Flow[] = block.chunks.flatMap((chunk): Flow[] =>
      chunk.kind === "math"
        ? [{ kind: "box", box: mathBox(chunk.source, block.size, metrics) }]
        : chunk.kind === "break"
          ? [chunk]
          : breakTokens(chunk.text).map((text) => ({
              kind: "text",
              text,
              style: chunk.style,
            })),
    );
    let at = 0;
    while (at < elements.length) {
      const indent = block.indent * (options.size / 18);
      const width = frameWidth - indent - 1;
      if (width < options.size * 2)
        throw new Error(
          "List or quote nesting leaves too little space on the page.",
        );
      const { box, next } = await planLine(elements, at, block.size, width);
      if (box.up + box.down + 1 > frameHeight)
        throw new Error("An inline formula is taller than a page.");
      const lineHeight = Math.max(
        block.size * options.lineHeight,
        box.up + box.down + 0.5,
      );
      if (y + lineHeight > page.height - bottom) {
        page = nextFrame();
        continue;
      }
      const fragments = box.fragments.map((f) => ({
        ...f,
        item: { ...f.item, color: block.color },
      }));
      place(
        fragments,
        frameX() + indent + 0.5,
        y + box.up + (lineHeight - box.up - box.down) / 2,
      );
      y += lineHeight;
      at = next;
    }
    y +=
      block.gap === 2
        ? options.paragraphGap * 0.25
        : block.gap === 16
          ? options.paragraphGap * 1.4
          : options.paragraphGap;
  }
  const firstHeading =
    options.format === "markdown"
      ? /^#{1,6}\s+(.+)$/m.exec(source)?.[1]
      : undefined;
  const title = (firstHeading ?? "Natural Ink notes")
    .replace(/[*_`]/g, "")
    .slice(0, 120);
  return { layout: parseLayout({ title, pages }), styles };
}
