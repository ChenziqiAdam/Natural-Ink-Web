import { rngFor } from "./random.js";
type XY = [number, number];
export type Glyph = {
  points: XY[];
  ends: number[];
  on: boolean[];
  advance: number;
  deform: boolean;
  components: { name: string; transform: number[] }[];
};
export type FontBank = {
  family?: string;
  outlineStrengthScale?: number;
  textVariationScale?: number;
  fixedPitch?: boolean;
  unitsPerEm: number;
  cmap: Record<string, string>;
  alternates: Record<string, string[]>;
  glyphs: Record<string, Glyph>;
};
export type Outline = { path: string; points: XY[]; advance: number };
// Python round() uses ties-to-even.
function round(value: number): number {
  const floor = Math.floor(value);
  return value - floor === 0.5
    ? floor % 2 === 0
      ? floor
      : floor + 1
    : Math.round(value);
}
function pathData(points: XY[], ends: number[], on: boolean[]): string {
  let start = 0;
  const parts: string[] = [];
  for (const end of ends) {
    const ring: { p: XY; on: boolean }[] = [];
    for (let i = start; i <= end; i++) {
      const next = i === end ? start : i + 1;
      ring.push({ p: points[i], on: on[i] });
      if (!on[i] && !on[next])
        ring.push({
          p: [
            (points[i][0] + points[next][0]) / 2,
            (points[i][1] + points[next][1]) / 2,
          ],
          on: true,
        });
    }
    const first = ring.findIndex((n) => n.on);
    const nodes = [...ring.slice(first), ...ring.slice(0, first)];
    nodes.push(nodes[0]);
    parts.push(`M ${nodes[0].p.join(" ")}`);
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].on) parts.push(`L ${nodes[i].p.join(" ")}`);
      else {
        parts.push(`Q ${nodes[i].p.join(" ")} ${nodes[i + 1].p.join(" ")}`);
        i++;
      }
    }
    parts.push("Z");
    start = end + 1;
  }
  return parts.join(" ");
}
export async function glyphOutline(
  bank: FontBank,
  base: string,
  variant: number,
  seed: number,
  strength: number,
): Promise<Outline> {
  const name = bank.alternates[base][variant % 3];
  const mapped = bank.fixedPitch
    ? new Set([name])
    : new Set(
        Object.values(bank.alternates).map((names) => names[variant % 3]),
      );
  const geometry = await glyphGeometry(
    bank,
    name,
    variant,
    seed,
    strength * (bank.outlineStrengthScale ?? 1),
    mapped,
  );
  const glyph = bank.glyphs[name];
  return { path: pathData(geometry.points, glyph.ends, glyph.on), ...geometry };
}
async function glyphGeometry(
  bank: FontBank,
  name: string,
  variant: number,
  seed: number,
  strength: number,
  mapped: Set<string>,
): Promise<{ points: XY[]; advance: number }> {
  const glyph = bank.glyphs[name];
  let points = glyph.points,
    advance = glyph.advance;
  if (glyph.components.length) {
    points = [];
    for (const component of glyph.components) {
      const child = await glyphGeometry(
        bank,
        component.name,
        variant,
        seed,
        strength,
        mapped,
      );
      const [a, b, c, d, e, f] = component.transform;
      points.push(
        ...child.points.map(([x, y]): XY => [
          a * x + c * y + e,
          b * x + d * y + f,
        ]),
      );
    }
  } else if (glyph.deform && mapped.has(name)) {
    const rng = await rngFor(seed, "outline", variant, name);
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const minY = Math.min(...ys),
      mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const height = Math.max(Math.max(...ys) - minY, 200),
      width = Math.max(Math.max(...xs) - Math.min(...xs), 150);
    const sx = rng.uniform(-0.21, 0.22),
      sy = rng.uniform(-0.12, 0.14);
    const shear = rng.uniform(-0.17, 0.13),
      bow = rng.uniform(-29, 29);
    const curl = rng.uniform(-22, 22),
      phase = rng.uniform(-Math.PI, Math.PI);
    points = points.map(([x, y]) => {
      const v = (y - minY) / height,
        u = (x - mid) / width;
      const dx =
        x * sx + shear * y + bow * Math.sin(v * Math.PI * 1.25 + phase);
      const dy = y * sy + curl * Math.sin(u * Math.PI * 1.25 + phase);
      return [round(x + strength * dx), round(y + strength * dy)];
    });
    if (!bank.fixedPitch) advance = round(advance * (1 + strength * sx));
  }
  return { points, advance };
}
