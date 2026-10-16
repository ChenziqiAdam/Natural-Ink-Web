import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { compose, defaultOptions } from "../.test-build/src/compose.js";
import { Typography } from "../.test-build/src/typography.js";
import { renderLayout } from "../.test-build/src/render.js";
import { mathBox } from "../.test-build/src/latex.js";
import { MathMetrics } from "../.test-build/src/boxes.js";
import { exportPdf } from "../.test-build/src/pdf.js";
import { sample } from "../.test-build/src/sample.js";
const bank = JSON.parse(
  readFileSync(new URL("../public/assets/caveat-glyphs.json", import.meta.url)),
);
const metrics = new MathMetrics(bank, 0.4);
const make = (source, options = {}) =>
  compose(
    source,
    { ...defaultOptions, ...options },
    new Typography(bank, 183, 0.4),
  );
const texts = (layout) =>
  layout.pages
    .flatMap((p) => p.items.filter((i) => i.type === "text").map((i) => i.text))
    .join("");
test("Markdown keeps words, emphasis, headings, lists and math in source order", async () => {
  const doc = await make(
    "# Notes\n\nHello **bold** and *italic* with $x_1^2$.\n\n- first\n- second\n\n> quote",
  );
  assert.match(
    texts(doc.layout),
    /NotesHello bold and italic with x12\.- first- secondquote/,
  );
  assert.ok(Object.values(doc.styles).some((s) => s.bold));
  assert.ok(Object.values(doc.styles).some((s) => s.italic));
  const heading = doc.layout.pages[0].items[0];
  assert.equal(heading.size, defaultOptions.size * 1.7);
  assert.equal(heading.color, "#035296");
  await renderLayout(doc.layout, bank, 183, 0.4, doc.styles);
});
test("math syntax survives Markdown underscores, backslashes and delimiters", async () => {
  const doc = await make(String.raw`Inline $a_1 + a_2$ and \(\alpha^2\).

\[
\frac{a+b}{\sqrt{c_1}}
\]`);
  const items = doc.layout.pages.flatMap((p) => p.items);
  assert.ok(items.some((i) => i.type === "symbol" && i.symbol === "α"));
  assert.ok(items.some((i) => i.type === "symbol" && i.symbol === "√"));
  assert.ok(items.some((i) => i.type === "rule"));
  assert.ok(!texts(doc.layout).includes("$"));
  assert.ok(!texts(doc.layout).includes("frac"));
  await renderLayout(doc.layout, bank, 183, 0.4, doc.styles);
});
test("fractions, roots, scripts, sums, integrals and pi have explicit geometry", () => {
  const box = mathBox(
    String.raw`\int_0^1 x^2 + \frac{a_1}{\sqrt{b}} + \pi \pm 1`,
    22,
    metrics,
  );
  assert.ok(box.up > 22);
  assert.ok(box.down > 10);
  const items = box.fragments.map((f) => f.item);
  for (const key of ["∫", "π", "√", "+"])
    assert.ok(
      items.some((i) => i.type === "symbol" && i.symbol === key),
      key,
    );
  assert.ok(items.filter((i) => i.type === "rule").length >= 3);
  assert.throws(
    () => mathBox(String.raw`\frac{a}{`, 20, metrics),
    /Unclosed|Missing/,
  );
  assert.throws(
    () => mathBox(String.raw`\unknown{x}`, 20, metrics),
    /Unsupported/,
  );
  assert.throws(() => mathBox("x^^2", 20, metrics), /Unexpected/);
});
test("long prose paginates without losing, duplicating or reordering text", async () => {
  const source = Array.from(
    { length: 60 },
    (_, i) => `Line ${i}: readable words in their original order.`,
  ).join("\n\n");
  const doc = await make(source);
  assert.ok(doc.layout.pages.length >= 3);
  assert.equal(
    texts(doc.layout).replace(/\s+/g, ""),
    source.replace(/\s+/g, ""),
  );
  const rendered = await renderLayout(doc.layout, bank, 183, 0.4, doc.styles);
  assert.equal(rendered.length, doc.layout.pages.length);
  for (const page of doc.layout.pages)
    for (const item of page.items) {
      assert.ok(item.x >= 48);
      assert.ok(item.y >= 48 && item.y < page.height - 48);
    }
});
test("long unbroken words wrap; plain mode preserves literal Markdown and dollars", async () => {
  const source = "abcdefghij".repeat(35),
    doc = await make(source);
  assert.equal(texts(doc.layout), source);
  assert.ok(doc.layout.pages[0].items.length > 1);
  const plain = await make("# **literal** $5 and x_1", { format: "plain" });
  assert.equal(texts(plain.layout), "# **literal** $5 and x_1");
  await renderLayout(plain.layout, bank, 183, 0.4, plain.styles);
});
test("invalid content and oversized formulas fail explicitly", async () => {
  for (const source of [
    "",
    String.raw`$\oops{x}$`,
    "$x",
    "![image](https://example.com/x.png)",
    "<script>alert(1)</script>",
    "|a|b|\n|-|-|\n|1|2|",
  ])
    await assert.rejects(make(source));
  await assert.rejects(make("a".repeat(12001)), /12,000/);
  await assert.rejects(make("a".repeat(2000), { format: "latex" }), /wider/);
});
test("vector PDF contains all pages, correct dimensions, stable bytes and metadata", async () => {
  const doc = await make(
      sample + "\n\n" + "Extra paragraph for the next page.\n\n".repeat(18),
    ),
    pages = await renderLayout(doc.layout, bank, 183, 0.4, doc.styles);
  assert.ok(pages.length >= 2);
  const bytes = await exportPdf(pages, doc.layout.title),
    pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), pages.length);
  assert.equal(pdf.getTitle(), doc.layout.title);
  for (const page of pdf.getPages()) {
    assert.equal(page.getWidth(), 595.276);
    assert.equal(page.getHeight(), 841.89);
  }
  assert.deepEqual(bytes, await exportPdf(pages, doc.layout.title));
  assert.ok(
    pages.every(
      (p) =>
        p.scene.some((d) => d.type === "glyph") &&
        p.scene.some((d) => d.type === "line"),
    ),
  );
});
test("bare LaTeX and dollar-wrapped display formula share the same layout", async () => {
  const source = String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;
  assert.deepEqual(
    await make(source, { format: "latex" }),
    await make(`$$${source}$$`, { format: "latex" }),
  );
});
