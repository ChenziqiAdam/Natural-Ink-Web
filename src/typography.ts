import { glyphOutline, type FontBank, type Outline } from "./glyphs.js";
import { rngFor } from "./random.js";
export type Letter = {
  outline: Outline;
  x: number;
  size: number;
  dy: number;
  angle: number;
  advance: number;
  unitsPerEm: number;
};
export class Typography {
  private outlines = new Map<string, Promise<Outline>>();
  constructor(
    readonly bank: FontBank,
    readonly seed: number,
    readonly variation: number,
    readonly fallback?: FontBank,
  ) {}
  async shape(
    text: string,
    size: number,
    page: number,
    item: number,
  ): Promise<{ letters: Letter[]; width: number }> {
    const letters: Letter[] = [];
    let x = 0;
    for (const [ci, character] of [...text].entries()) {
      const bank = this.bank.cmap[String(character.codePointAt(0))]
        ? this.bank
        : this.fallback;
      const base = bank?.cmap[String(character.codePointAt(0))];
      if (!base || !bank)
        throw new Error(
          `The loaded fonts cannot render ${JSON.stringify(character)}. Try another character or supported math markup.`,
        );
      const rng = await rngFor(this.seed, "letter", page, item, ci);
      const variant = rng.range(24),
        key = `${bank.family ?? "Caveat"}:${base}:${variant}`;
      if (!this.outlines.has(key))
        this.outlines.set(
          key,
          glyphOutline(bank, base, variant, this.seed, this.variation),
        );
      const outline = await this.outlines.get(key)!;
      const v = this.variation * (bank.textVariationScale ?? 1);
      const actualSize = size * (1 + v * rng.uniform(-0.1, 0.1));
      const advance = (outline.advance * actualSize) / bank.unitsPerEm;
      const dy = -v * rng.uniform(-0.025, 0.025) * actualSize;
      const angle = -v * rng.uniform(-4.5, 4.5);
      letters.push({
        outline,
        x,
        size: actualSize,
        dy,
        angle,
        advance,
        unitsPerEm: bank.unitsPerEm,
      });
      x += advance * (1 + v * rng.uniform(-0.025, 0.035));
    }
    return { letters, width: x };
  }
}

// Bounds include control points, a conservative envelope of the filled glyph.
export function letterBounds(
  letter: Letter,
  style: { bold?: boolean; italic?: boolean } = {},
): { left: number; right: number; top: number; bottom: number } | undefined {
  if (!letter.outline.points.length) return;
  const scale = letter.size / letter.unitsPerEm,
    angle = (letter.angle * Math.PI) / 180;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    shear = style.italic ? Math.tan((-8 * Math.PI) / 180) : 0;
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const [x, y] of letter.outline.points) {
    const sx = (x + shear * y) * scale,
      sy = -y * scale;
    const px = letter.x + c * sx - s * sy,
      py = letter.dy + s * sx + c * sy;
    left = Math.min(left, px);
    right = Math.max(right, px);
    top = Math.min(top, py);
    bottom = Math.max(bottom, py);
  }
  const bleed = style.bold ? 5 * scale : 0;
  return {
    left: left - bleed,
    right: right + bleed,
    top: top - bleed,
    bottom: bottom + bleed,
  };
}
