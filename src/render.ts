import type { FontBank } from "./glyphs.js";
import { Typography, letterBounds } from "./typography.js";
import { ruleStroke, symbolStrokes, type Stroke } from "./math.js";
import { parseLayout, type Layout, type Page } from "./model.js";
import { rngFor } from "./random.js";
import type { Draw } from "./scene.js";
export type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  strokeScale?: number;
};
export const escape = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export type RenderedPage = {
  svg: string;
  width: number;
  height: number;
  characters: number;
  strokes: number;
  scene: Draw[];
};
function strokeSvg(stroke: Stroke, page: Page, scene: Draw[]): string {
  for (const p of stroke.points)
    if (p.x < 0 || p.y < 0 || p.x > page.width || p.y > page.height)
      throw new Error("Stroke center lies outside the page");
  const parts: string[] = [];
  for (let i = 1; i < stroke.points.length; i++) {
    const a = stroke.points[i - 1],
      b = stroke.points[i];
    scene.push({
      type: "line",
      x: a.x,
      y: a.y,
      x2: b.x,
      y2: b.y,
      color: stroke.color,
      width: (a.width + b.width) / 2,
      round: true,
    });
    parts.push(
      `<path d="M ${a.x} ${a.y} L ${b.x} ${b.y}" fill="none" stroke="${stroke.color}" stroke-width="${(a.width + b.width) / 2}" stroke-linecap="round"/>`,
    );
  }
  return parts.join("");
}
export async function renderLayout(
  raw: unknown,
  bank: FontBank,
  seed: number,
  variation: number,
  styles: Record<string, TextStyle> = {},
  typography = new Typography(bank, seed, variation),
): Promise<RenderedPage[]> {
  if (!Number.isSafeInteger(seed))
    throw new Error("Seed must be a safe integer");
  if (!Number.isFinite(variation) || variation < 0 || variation > 1)
    throw new Error("Variation must be between 0 and 1");
  const layout: Layout = parseLayout(raw);
  const pages: RenderedPage[] = [];
  for (const [pi, page] of layout.pages.entries()) {
    const scene: Draw[] = [
      {
        type: "rect",
        x: 0,
        y: 0,
        width: page.width,
        height: page.height,
        color: page.background,
      },
    ];
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}pt" height="${page.height}pt" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-label="${escape(layout.title)} — page ${pi + 1}">`,
      `<title>${escape(layout.title)} — page ${pi + 1}</title>`,
      "<desc>Natural Ink vector outline preview. Caveat and WenKai/Klee-derived outlines licensed under SIL OFL 1.1.</desc>",
      `<rect width="100%" height="100%" fill="${page.background}"/>`,
    ];
    let characters = 0,
      strokes = 0;
    if (page.grid) {
      parts.push('<g stroke="#e2e2d9" stroke-width="0.3">');
      for (let x = 0; x < Math.ceil(page.width); x += 18) {
        parts.push(`<path d="M ${x} 0 V ${page.height}"/>`);
        scene.push({
          type: "line",
          x,
          y: 0,
          x2: x,
          y2: page.height,
          width: 0.3,
          color: "#e2e2d9",
        });
      }
      for (let y = 0; y < Math.ceil(page.height); y += 18) {
        parts.push(`<path d="M 0 ${y} H ${page.width}"/>`);
        scene.push({
          type: "line",
          x: 0,
          y,
          x2: page.width,
          y2: y,
          width: 0.3,
          color: "#e2e2d9",
        });
      }
      parts.push("</g>");
    }
    for (const [ii, item] of page.items.entries()) {
      if (item.type === "text") {
        const style = styles[`${pi}:${ii}`] ?? {};
        parts.push(`<g aria-label="${escape(item.text)}">`);
        const shaped = await typography.shape(item.text, item.size, pi, ii);
        for (const letter of shaped.letters) {
          const { outline, size, advance, dy, angle } = letter;
          const x = item.x + letter.x;
          const bounds = letterBounds(letter, style);
          if (
            bounds &&
            (item.x + bounds.left < 0 ||
              item.x + bounds.right > page.width ||
              item.y + bounds.top < 0 ||
              item.y + bounds.bottom > page.height)
          )
            throw new Error(
              `Text item ${ii} overflows page ${pi + 1}; adjust margins or split it into shorter lines`,
            );
          const y = item.y + dy;
          const scale = size / letter.unitsPerEm;
          scene.push({
            type: "glyph",
            path: outline.path,
            x,
            y,
            scale,
            angle,
            color: item.color,
            ...style,
          });
          const emphasis = style.bold
            ? ` stroke="${item.color}" stroke-width="10" stroke-linejoin="round"`
            : "";
          const italic = style.italic ? " skewX(-8)" : "";
          parts.push(
            `<path d="${outline.path}" fill="${item.color}"${emphasis} transform="translate(${x} ${y}) rotate(${angle}) scale(${scale} ${-scale})${italic}"/>`,
          );
          characters++;
        }
        parts.push("</g>");
      } else {
        const rng = await rngFor(seed, "item", pi, ii);
        const ink =
          item.type === "symbol"
            ? symbolStrokes(
                item.symbol,
                item.x,
                item.y,
                item.width,
                item.height,
                item.color,
                rng,
              )
            : [
                ruleStroke(
                  item.x,
                  item.y,
                  item.length,
                  item.width,
                  item.color,
                  rng,
                ),
              ];
        for (const stroke of ink) {
          const scale = styles[`${pi}:${ii}`]?.strokeScale ?? 1;
          const scaled =
            scale === 1
              ? stroke
              : {
                  ...stroke,
                  points: stroke.points.map((point) => ({
                    ...point,
                    width: point.width * scale,
                  })),
                };
          parts.push(strokeSvg(scaled, page, scene));
        }
        strokes += ink.length;
      }
    }
    parts.push("</svg>");
    pages.push({
      svg: parts.join("\n"),
      width: page.width,
      height: page.height,
      characters,
      strokes,
      scene,
    });
  }
  return pages;
}
