import { MathMetrics, ink, row, shift, type Box } from "./boxes.js";
import { symbols } from "./math.js";
const commands: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  mu: "µ",
  epsilon: "ϵ",
  varepsilon: "ϵ",
  lambda: "λ",
  sigma: "σ",
  tau: "τ",
  theta: "θ",
  phi: "ϕ",
  varphi: "ϕ",
  ell: "ℓ",
  partial: "∂",
  pi: "π",
  Delta: "Δ",
  Omega: "Ω",
  nabla: "∇",
  int: "∫",
  sum: "∑",
  Sigma: "Σ",
  prod: "∏",
  infty: "∞",
  times: "×",
  cdot: "·",
  pm: "±",
  le: "⩽",
  leq: "⩽",
  ge: "⩾",
  geq: "⩾",
  approx: "≈",
  propto: "∝",
  in: "∈",
  cap: "∩",
  cup: "∪",
  subseteq: "⊆",
  nsubseteq: "⊈",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  forall: "∀",
  exists: "∃",
  emptyset: "∅",
  parallel: "∥",
  perp: "⊤",
  lbrace: "{",
  rbrace: "}",
  lvert: "|",
  rvert: "|",
  langle: "<",
  rangle: ">",
};
const operators = new Set([
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "exp",
  "lim",
  "max",
  "min",
  "det",
  "arcsin",
  "arccos",
]);
const empty = (): Box => ({ width: 0, up: 0, down: 0, fragments: [] });
export function mathBox(
  source: string,
  size: number,
  metrics: MathMetrics,
): Box {
  if (source.length > 2000)
    throw new Error("Keep each formula below 2,000 characters.");
  let pos = 0,
    depth = 0;
  function spaces(): void {
    while (/\s/.test(source[pos] ?? "") && pos < source.length) pos++;
  }
  function symbol(key: string, s: number): Box {
    const ratios: Record<string, number[]> = {
      "=": [0.7, 0.22, 0.44],
      "−": [0.65, 0.18, 0.38],
      "→": [1.1, 0.55, 0.65],
      "←": [1.1, 0.55, 0.65],
      "⇒": [1.1, 0.65, 0.72],
      "∑": [0.8, 1.05, 0.92],
      "∏": [0.85, 1.05, 0.92],
      "∫": [0.5, 1.65, 1.2],
      "(": [0.32, 1.1, 0.88],
      ")": [0.32, 1.1, 0.88],
      "[": [0.3, 1.1, 0.88],
      "]": [0.3, 1.1, 0.88],
      "∂": [0.55, 1.05, 0.92],
    };
    const [w, h, u] = ratios[key] ?? [0.72, 0.83, 0.76];
    return {
      width: (w + 0.18) * s,
      up: u * s + 0.08 * s,
      down: Math.max(0, h - u) * s + 0.08 * s,
      fragments: [
        {
          style: { strokeScale: Math.min(1, 1 / Math.max(w, h)) },
          item: {
            type: "symbol",
            symbol: key,
            x: s * 0.04,
            y: -u * s,
            width: w * s,
            height: h * s,
            color: ink,
          },
        },
      ],
    };
  }
  function character(c: string, s: number): Box {
    if (c === "-") c = "−";
    if (c === "≤") c = "⩽";
    if (c === "≥") c = "⩾";
    if (c === "≠") {
      const box = symbol("=", s),
        slash = symbol("̸", s);
      box.fragments.push(...slash.fragments);
      box.up = Math.max(box.up, slash.up);
      box.down = Math.max(box.down, slash.down);
      return box;
    }
    if (c === "±")
      return {
        width: s * 0.9,
        up: s * 0.88,
        down: s * 0.16,
        fragments: [
          {
            item: {
              type: "symbol",
              symbol: "+",
              x: s * 0.04,
              y: -s * 0.8,
              width: s * 0.7,
              height: s * 0.6,
              color: ink,
            },
          },
          {
            item: {
              type: "rule",
              x: s * 0.04,
              y: s * 0.06,
              length: s * 0.7,
              width: Math.max(0.6, s * 0.06),
              color: ink,
            },
          },
        ],
      };
    if (Object.hasOwn(symbols, c)) return symbol(c, s);
    return metrics.text(c, s);
  }
  function argument(s: number): Box {
    spaces();
    if (pos >= source.length)
      throw new Error(
        "Missing LaTeX argument. Use braces, for example \\frac{a}{b}.",
      );
    return atom(s);
  }
  function rawGroup(): string {
    spaces();
    if (source[pos++] !== "{")
      throw new Error("This LaTeX command needs a {text} argument.");
    let count = 1,
      start = pos;
    while (pos < source.length && count) {
      if (source[pos] === "{") count++;
      if (source[pos] === "}") count--;
      pos++;
    }
    if (count) throw new Error("Unclosed LaTeX group.");
    return source.slice(start, pos - 1);
  }
  function atom(s: number): Box {
    spaces();
    const c = source[pos++];
    if (!c) throw new Error("Missing LaTeX expression.");
    if (c === "{") return expression(s, "}");
    if (c === "}" || c === "^" || c === "_")
      throw new Error(`Unexpected ${c} in formula.`);
    if (c !== "\\") return character(c, s);
    const match = /^[A-Za-z]+/.exec(source.slice(pos));
    if (!match) {
      const escaped = source[pos++];
      if (
        escaped === "," ||
        escaped === ";" ||
        escaped === " " ||
        escaped === ":"
      )
        return { ...empty(), width: s * 0.2 };
      if (escaped === "!") return empty();
      if (escaped && "{}%$&#_|".includes(escaped)) return character(escaped, s);
      throw new Error(`Unsupported LaTeX escape: \\${escaped ?? ""}`);
    }
    const command = match[0];
    pos += command.length;
    if (command === "left" || command === "right") {
      spaces();
      if (source[pos] === ".") {
        pos++;
        return empty();
      }
      return atom(s);
    }
    if (command === "quad" || command === "qquad")
      return { ...empty(), width: s * (command === "quad" ? 1 : 2) };
    if (command === "frac" || command === "dfrac" || command === "tfrac") {
      const top = argument(s * 0.8),
        bottom = argument(s * 0.8),
        width = Math.max(top.width, bottom.width) + s * 0.45;
      const bar = -s * 0.28,
        gap = s * 0.19,
        ty = bar - gap - top.down,
        by = bar + gap + bottom.up;
      return {
        width,
        up: top.up - ty,
        down: bottom.down + by,
        fragments: [
          ...shift(top, (width - top.width) / 2, ty),
          {
            item: {
              type: "rule",
              x: 0,
              y: bar,
              length: width,
              width: Math.max(0.6, s * 0.045),
              color: ink,
            },
          },
          ...shift(bottom, (width - bottom.width) / 2, by),
        ],
      };
    }
    if (command === "sqrt") {
      spaces();
      if (source[pos] === "[")
        throw new Error(
          "Indexed roots are not supported yet. Use \\sqrt{...} or a fractional exponent.",
        );
      const inner = argument(s),
        width = s * 0.65,
        top = -inner.up - s * 0.14;
      return {
        width: width + inner.width + s * 0.2,
        up: -top + s * 0.08,
        down: inner.down + s * 0.12,
        fragments: [
          {
            style: {
              strokeScale: Math.min(1, s / (inner.up + inner.down + s * 0.2)),
            },
            item: {
              type: "symbol",
              symbol: "√",
              x: 0,
              y: top,
              width,
              height: inner.up + inner.down + s * 0.2,
              color: ink,
            },
          },
          {
            item: {
              type: "rule",
              x: width * 0.96,
              y: top + 0.025 * (inner.up + inner.down + s * 0.2),
              length: inner.width + s * 0.2,
              width: Math.max(0.6, s * 0.045),
              color: ink,
            },
          },
          ...shift(inner, width, 0),
        ],
      };
    }
    if (
      command === "text" ||
      command === "mathrm" ||
      command === "operatorname"
    )
      return metrics.text(rawGroup(), s);
    if (command === "mathbf" || command === "mathit") {
      const box = argument(s);
      box.fragments = box.fragments.map((f) => ({
        ...f,
        style: { ...f.style, [command === "mathbf" ? "bold" : "italic"]: true },
      }));
      return box;
    }
    if (command === "mathbb") {
      const letter = rawGroup();
      if (letter !== "R" && letter !== "E")
        throw new Error(
          "Supported blackboard letters: \\mathbb{R}, \\mathbb{E}.",
        );
      return symbol(`bb${letter}`, s);
    }
    if (command === "neq" || command === "ne") return character("≠", s);
    if (commands[command]) return character(commands[command], s);
    if (operators.has(command)) return metrics.text(command, s);
    throw new Error(
      `Unsupported LaTeX command: \\${command}. Open Syntax help for the supported subset.`,
    );
  }
  function expression(s: number, stop?: string): Box {
    if (++depth > 24)
      throw new Error("Formula nesting is too deep (maximum 24 groups).");
    const boxes: Box[] = [];
    while (pos < source.length) {
      spaces();
      if (pos >= source.length) break;
      if (source[pos] === stop) {
        pos++;
        depth--;
        return row(boxes, s * 0.045);
      }
      let base = atom(s),
        sup: Box | undefined,
        sub: Box | undefined;
      const scriptOrder: string[] = [];
      spaces();
      while (source[pos] === "^" || source[pos] === "_") {
        const marker = source[pos++],
          child = argument(s * 0.65);
        scriptOrder.push(marker);
        if (marker === "^") {
          if (sup) throw new Error("Duplicate superscript.");
          sup = child;
        } else {
          if (sub) throw new Error("Duplicate subscript.");
          sub = child;
        }
        spaces();
      }
      if (sup || sub) {
        const fragments = [...base.fragments];
        let up = base.up,
          down = base.down;
        for (const marker of scriptOrder) {
          if (marker === "^" && sup) {
            const y = -Math.max(base.up * 0.66, s * 0.55) - sup.down;
            fragments.push(...shift(sup, base.width, y));
            up = Math.max(up, sup.up - y);
          }
          if (marker === "_" && sub) {
            const y = Math.max(base.down, s * 0.1) + sub.up * 0.72;
            fragments.push(...shift(sub, base.width, y));
            down = Math.max(down, y + sub.down);
          }
        }
        base = {
          width: base.width + Math.max(sup?.width ?? 0, sub?.width ?? 0),
          up,
          down,
          fragments,
        };
      }
      boxes.push(base);
    }
    depth--;
    if (stop) throw new Error(`Unclosed LaTeX group: expected ${stop}.`);
    return row(boxes, s * 0.045);
  }
  const result = expression(size);
  if (!result.fragments.length) throw new Error("The formula is empty.");
  return result;
}
