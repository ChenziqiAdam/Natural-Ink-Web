import shapes from "./data/symbols.json" with { type: "json" };
import { Random } from "./random.js";
export type Point = { x: number; y: number; width: number };
export type Stroke = { points: Point[]; color: string };
export const symbols = shapes as Record<string, string[]>;

function pressure(
  points: number[][],
  color: string,
  width: number,
  rng: Random,
): Stroke {
  const phase = rng.uniform(-1, 1);
  return {
    color,
    points: points.map(([x, y], i) => {
      const t = i / Math.max(1, points.length - 1);
      const taper =
        (0.65 + 0.35 * (1 - Math.exp(-t / 0.08))) *
        (0.6 + 0.4 * (1 - Math.exp(-(1 - t) / 0.08)));
      return {
        x,
        y,
        width: width * taper * (1 + 0.13 * Math.sin(t * Math.PI + phase)),
      };
    }),
  };
}
export function ruleStroke(
  x: number,
  y: number,
  length: number,
  width: number,
  color: string,
  rng: Random,
): Stroke {
  const bend = rng.sign() * Math.min(1.1, length * 0.015);
  return pressure(
    Array.from({ length: 65 }, (_, i) => [
      x + (length * i) / 64,
      y + bend * Math.sin((Math.PI * i) / 64),
    ]),
    color,
    width,
    rng,
  );
}
export function symbolStrokes(
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  rng: Random,
): Stroke[] {
  let paths = symbols[key];
  if (!paths) throw new Error(`Unsupported math symbol: ${key}`);
  if (key === "=") {
    const lengths = [rng.uniform(0.89, 0.99), rng.uniform(0.66, 0.78)];
    if (rng.range(2) === 0) lengths.reverse();
    paths = lengths.map(
      (d, i) =>
        `M ${0.5 - d / 2} ${i ? 0.9 : 0.1} L ${0.5 + d / 2} ${i ? 0.9 : 0.1}`,
    );
  }
  return paths.map((path) => {
    const tokens = path.split(/\s+/);
    const points: number[][] = [];
    let current = [0, 0];
    for (let ti = 0; ti < tokens.length;) {
      const op = tokens[ti++];
      const controls = Array.from({ length: op === "C" ? 3 : 1 }, () => [
        x + Number(tokens[ti++]) * width,
        y + Number(tokens[ti++]) * height,
      ]);
      const end = controls[controls.length - 1];
      if (op === "M") {
        current = end;
        points.push(end);
        continue;
      }
      const length = Math.hypot(end[0] - current[0], end[1] - current[1]);
      const bend =
        rng.uniform(0.012, 0.032) * Math.max(width, height) * rng.sign();
      const nx = -(end[1] - current[1]) / Math.max(length, 0.001),
        ny = (end[0] - current[0]) / Math.max(length, 0.001);
      for (let i = 1; i <= 24; i++) {
        const t = i / 24,
          s = 1 - t;
        const p = [0, 1].map((axis) =>
          op === "C"
            ? s ** 3 * current[axis] +
              3 * s * s * t * controls[0][axis] +
              3 * s * t * t * controls[1][axis] +
              t ** 3 * end[axis]
            : current[axis] + (end[axis] - current[axis]) * t,
        );
        points.push([
          p[0] + nx * bend * Math.sin(Math.PI * t),
          p[1] + ny * bend * Math.sin(Math.PI * t),
        ]);
      }
      current = end;
    }
    return pressure(
      points,
      color,
      Math.max(0.3, Math.max(width, height) * rng.uniform(0.058, 0.072)),
      rng,
    );
  });
}
