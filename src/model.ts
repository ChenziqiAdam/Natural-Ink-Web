import { symbols } from "./math.js";
export type TextItem = {
  type: "text";
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
};
export type SymbolItem = {
  type: "symbol";
  symbol: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};
export type RuleItem = {
  type: "rule";
  x: number;
  y: number;
  length: number;
  width: number;
  color: string;
};
export type Item = TextItem | SymbolItem | RuleItem;
export type Page = {
  width: number;
  height: number;
  background: string;
  grid: boolean;
  items: Item[];
};
export type Layout = { title: string; pages: Page[] };
function record(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${context}: expected an object`);
  return value as Record<string, unknown>;
}
function keys(obj: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(obj))
    if (!allowed.includes(key)) throw new Error(`Unknown field: ${key}`);
}
function number(
  value: unknown,
  label: string,
  fallback?: number,
  positive = false,
): number {
  const v = value === undefined ? fallback : value;
  if (typeof v !== "number" || !Number.isFinite(v) || (positive && v <= 0))
    throw new Error(
      `${label}: expected a ${positive ? "positive " : ""}finite number`,
    );
  return v;
}
function text(value: unknown, label: string, fallback?: string): string {
  const v = value === undefined ? fallback : value;
  if (typeof v !== "string" || !v.length)
    throw new Error(`${label}: expected nonempty text`);
  return v;
}
function color(value: unknown, fallback: string): string {
  const v = text(value, "Color", fallback);
  if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error("Colors must use #RRGGBB");
  return v;
}
export function parseLayout(value: unknown): Layout {
  const layout = record(value, "Layout");
  keys(layout, ["title", "pages"]);
  if (
    !Array.isArray(layout.pages) ||
    !layout.pages.length ||
    layout.pages.length > 20
  )
    throw new Error("Use 1–20 pages in this browser prototype");
  let itemCount = 0,
    characterCount = 0;
  const pages = layout.pages.map((raw, pi): Page => {
    const p = record(raw, `Page ${pi + 1}`);
    keys(p, ["width", "height", "background", "grid", "items"]);
    if (!Array.isArray(p.items))
      throw new Error(`Page ${pi + 1}: items must be an array`);
    itemCount += p.items.length;
    if (itemCount > 20000)
      throw new Error("Use at most 20,000 layout items in this prototype");
    if (p.grid !== undefined && typeof p.grid !== "boolean")
      throw new Error("Grid must be true or false");
    const width = number(p.width, "Page width", 612, true),
      height = number(p.height, "Page height", 792, true);
    if (Math.max(width, height) > 5000)
      throw new Error("Page dimensions must be at most 5,000 points");
    const items = p.items.map((rawItem): Item => {
      const item = record(rawItem, "Item");
      const common = {
        x: number(item.x, "x"),
        y: number(item.y, "y"),
        color: color(item.color, "#42067a"),
      };
      if (item.type === "text") {
        keys(item, ["type", "text", "x", "y", "size", "color"]);
        const content = text(item.text, "Text");
        characterCount += [...content].length;
        if (characterCount > 12000)
          throw new Error("Use at most 12,000 characters in this prototype");
        return {
          ...common,
          type: "text",
          text: content,
          size: number(item.size, "Text size", 18, true),
        };
      }
      if (item.type === "symbol") {
        keys(item, ["type", "symbol", "x", "y", "width", "height", "color"]);
        const symbol = text(item.symbol, "Symbol");
        if (!Object.hasOwn(symbols, symbol))
          throw new Error(`Unsupported symbol: ${symbol}`);
        return {
          ...common,
          type: "symbol",
          symbol,
          width: number(item.width, "Symbol width", 16, true),
          height: number(item.height, "Symbol height", 16, true),
        };
      }
      if (item.type === "rule") {
        keys(item, ["type", "x", "y", "length", "width", "color"]);
        return {
          ...common,
          type: "rule",
          length: number(item.length, "Rule length", undefined, true),
          width: number(item.width, "Rule width", 1, true),
        };
      }
      throw new Error("Item type must be text, symbol, or rule");
    });
    return {
      width,
      height,
      background: color(p.background, "#faf9f1"),
      grid: p.grid === undefined ? true : (p.grid as boolean),
      items,
    };
  });
  return { title: text(layout.title, "Title", "Natural Ink"), pages };
}
