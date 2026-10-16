import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdfText } from "../.test-build/src/pdf-text.js";
import { readPdfPages } from "../.test-build/src/pdf-reader.js";
const item = (str, x, y, width = 100) => ({
  str,
  transform: [12, 0, 0, 12, x, 800 - y],
  width,
  height: 12,
  dir: "ltr",
});
const page = (items) => ({
  items,
  transform: [1, 0, 0, -1, 0, 800],
  width: 600,
  number: 1,
});
test("PDF text groups rows and joins Chinese glyphs without invented spaces", () => {
  const result = extractPdfText([
    page([
      item("world", 100, 60, 30),
      item("Hello", 40, 60, 35),
      item("中", 40, 90, 12),
      item("文", 52, 90, 12),
    ]),
  ]);
  assert.match(result.text, /Hello world/);
  assert.match(result.text, /中文/);
  assert.equal(result.emptyPages.length, 0);
});
test("PDF auto/rows/columns preserve text while exposing different reading orders", () => {
  const items = [item("A centered heading", 240, 25, 125)];
  for (let i = 0; i < 4; i++)
    items.push(
      item(`Left ${i}`, 40, 80 + i * 20, 100),
      item(`Right ${i}`, 340, 80 + i * 20, 100),
    );
  const auto = extractPdfText([page(items)]),
    rows = extractPdfText([page(items)], "rows");
  assert.equal(auto.columnPages.length, 1);
  assert.ok(auto.text.indexOf("Left 3") < auto.text.indexOf("Right 0"));
  assert.ok(auto.text.startsWith("A centered heading"));
  assert.ok(rows.text.indexOf("Right 0") < rows.text.indexOf("Left 1"));
  for (const text of [
    "A centered heading",
    ...Array.from({ length: 4 }, (_, i) => `Left ${i}`),
    ...Array.from({ length: 4 }, (_, i) => `Right ${i}`),
  ])
    assert.equal(auto.text.split(text).length - 1, 1);
});
test("empty/scanned pages and undecodable/vertical text are explicit warnings", () => {
  const result = extractPdfText([
    page([]),
    { ...page([item("Visible text", 40, 80)]), number: 2 },
  ]);
  assert.deepEqual(result.emptyPages, [1]);
  assert.equal(result.text, "Visible text");
  assert.ok(result.warnings.some((s) => s.includes("OCR")));
  const vertical = extractPdfText([
    page([{ ...item("replacement \ufffd", 40, 80), dir: "ttb" }]),
  ]);
  assert.ok(vertical.warnings.some((s) => s.includes("Vertical")));
  assert.ok(vertical.warnings.some((s) => s.includes("decoded")));
});
test("real PDF.js extraction reads all pages and identifies an outline-only page", async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([600, 800])
    .drawText("First PDF page", { x: 40, y: 740, font, size: 16 });
  doc
    .addPage([600, 800])
    .drawText("Second PDF page", { x: 40, y: 740, font, size: 16 });
  doc
    .addPage([600, 800])
    .drawLine({ start: { x: 40, y: 740 }, end: { x: 140, y: 740 } });
  const task = getDocument({
    data: await doc.save(),
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise,
      seen = [];
    const pages = await readPdfPages(
      pdf,
      new AbortController().signal,
      (n, total) => seen.push([n, total]),
    );
    const result = extractPdfText(pages);
    assert.match(result.text, /First PDF page[\s\S]*Second PDF page/);
    assert.deepEqual(result.emptyPages, [3]);
    assert.equal(seen.length, 3);
  } finally {
    await task.destroy();
  }
});
test("PDF reader enforces page/character limits and cancellation", async () => {
  await assert.rejects(
    readPdfPages({ numPages: 51 }, new AbortController().signal, () => {}),
    /50 pages/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    readPdfPages({ numPages: 1 }, controller.signal, () => {}),
    /abort/i,
  );
  const huge = {
    numPages: 1,
    getPage: async () => ({
      getViewport: () => ({ width: 600, transform: [1, 0, 0, -1, 0, 800] }),
      getTextContent: async () => ({
        items: [item("x".repeat(200001), 40, 80)],
      }),
      cleanup() {},
    }),
  };
  await assert.rejects(
    readPdfPages(huge, new AbortController().signal, () => {}),
    /200,000/,
  );
});
