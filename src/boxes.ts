import type { FontBank } from "./glyphs.js";
import type { Item } from "./model.js";
import type { TextStyle } from "./render.js";
export type Fragment = { item: Item; style?: TextStyle };
export type Box = {
  width: number;
  up: number;
  down: number;
  fragments: Fragment[];
};
export const ink = "#42067a";
export function shift(box: Box, x: number, y: number): Fragment[] {
  return box.fragments.map((fragment) => ({
    ...fragment,
    item: { ...fragment.item, x: fragment.item.x + x, y: fragment.item.y + y },
  }));
}
export function row(boxes: Box[], gap = 0): Box {
  const result: Box = { width: 0, up: 0, down: 0, fragments: [] };
  for (const [i, box] of boxes.entries()) {
    if (i) result.width += gap;
    result.fragments.push(...shift(box, result.width, 0));
    result.width += box.width;
    result.up = Math.max(result.up, box.up);
    result.down = Math.max(result.down, box.down);
  }
  return result;
}
export class MathMetrics {
  constructor(
    readonly bank: FontBank,
    readonly variation: number,
    readonly fallback?: FontBank,
  ) {}
  text(text: string, size: number): Box {
    let advance = 0;
    for (const char of text) {
      const bank = this.bank.cmap[String(char.codePointAt(0))]
        ? this.bank
        : this.fallback;
      const name = bank?.cmap[String(char.codePointAt(0))];
      if (!name || !bank)
        throw new Error(
          `Caveat cannot render ${JSON.stringify(char)} in this formula.`,
        );
      advance +=
        Math.max(...bank.alternates[name].map((n) => bank.glyphs[n].advance)) /
        bank.unitsPerEm;
    }
    // Math boxes reserve alternate/variation room; prose uses exact seeded advances.
    const width =
      advance *
      size *
      (1 + 0.22 * this.variation) *
      (1 + 0.1 * this.variation) *
      (1 + 0.035 * this.variation);
    return {
      width: width + size * 0.08,
      up: size * 1.08,
      down: size * 0.32,
      fragments: [
        { item: { type: "text", text, x: 0, y: 0, size, color: ink } },
      ],
    };
  }
}
