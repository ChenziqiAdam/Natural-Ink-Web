import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FontLoader } from "../.test-build/src/font-loader.js";
import { Typography } from "../.test-build/src/typography.js";
import { compose } from "../.test-build/src/compose.js";
import { defaultOptions, compactOptions } from "../.test-build/src/options.js";
import { renderLayout } from "../.test-build/src/render.js";
import { breakTokens } from "../.test-build/src/line-breaks.js";
import { chineseSample } from "../.test-build/src/sample.js";
import { glyphOutline } from "../.test-build/src/glyphs.js";
import { exportPdf } from "../.test-build/src/pdf.js";
import { PDFDocument } from "pdf-lib";
const bank = JSON.parse(
  readFileSync(new URL("../public/assets/caveat-glyphs.json", import.meta.url)),
);
const base = new URL("../public/assets/cjk/", import.meta.url);
const load = async (url) => JSON.parse(readFileSync(new URL(url)));
const plain = (doc) =>
  doc.layout.pages
    .flatMap((p) => p.items.filter((i) => i.type === "text").map((i) => i.text))
    .join("");
async function typeset(source, options = defaultOptions) {
  const loader = new FontLoader(base.href, load),
    fallback = await loader.ensure(source, bank),
    ty = new Typography(bank, 183, 0.4, fallback);
  const doc = await compose(source, options, ty),
    pages = await renderLayout(doc.layout, bank, 183, 0.4, doc.styles, ty);
  return { doc, pages, fallback };
}
test("Chinese outlines load lazily, are cached, and retain deterministic fixed advances", async () => {
  let requests = 0;
  const loader = new FontLoader(base.href, async (url) => {
    requests++;
    return load(url);
  });
  await loader.ensure("English only", bank);
  assert.equal(requests, 0);
  const fallback = await loader.ensure("中文手写", bank);
  const count = requests;
  assert.ok(count > 1);
  await loader.ensure("中文", bank);
  assert.equal(requests, count);
  const name = fallback.cmap["20013"];
  assert.ok(name);
  const a = await glyphOutline(fallback, name, 0, 183, 0.4),
    b = await glyphOutline(fallback, name, 0, 183, 0.4),
    c = await glyphOutline(fallback, name, 0, 42, 0.4);
  assert.deepEqual(a, b);
  assert.notEqual(a.path, c.path);
  assert.equal(a.advance, fallback.glyphs[name].advance);
});
test("Chinese font manifest requests can recover after a failed load", async () => {
  let calls = 0;
  const loader = new FontLoader(base.href, async (url) => {
    if (++calls === 1) throw new Error("offline");
    return load(url);
  });
  await assert.rejects(loader.ensure("中", bank), /offline/);
  assert.ok((await loader.ensure("中", bank)).cmap["20013"]);
});
test("Chinese punctuation stays with neighbours and content is preserved", async () => {
  const source = "中文（括号）和 English，一起排版。".repeat(40);
  assert.equal(breakTokens(source).join(""), source);
  const { doc } = await typeset(source, {
    ...defaultOptions,
    format: "plain",
    columns: 2,
    size: 14,
  });
  assert.equal(plain(doc), source);
  const rows = new Map();
  for (const page of doc.layout.pages)
    for (const i of page.items)
      if (i.type === "text") {
        const key = `${doc.layout.pages.indexOf(page)}:${i.y}`;
        rows.set(key, (rows.get(key) ?? "") + i.text);
      }
  for (const text of rows.values()) {
    assert.ok(!/^[，。！？）》」』】]/u.test(text));
    assert.ok(!/[（《「『【]$/u.test(text));
  }
});
test("Chinese/English/math, including text inside formulas, export as vector PDF", async () => {
  const { doc, pages } = await typeset(chineseSample);
  assert.match(plain(doc), /中英文手写笔记/);
  assert.match(plain(doc), /均值/);
  assert.ok(pages.flatMap((p) => p.scene).some((d) => d.type === "glyph"));
  const pdf = await PDFDocument.load(await exportPdf(pages, doc.layout.title));
  assert.equal(pdf.getPageCount(), pages.length);
});
test("compact columns reduce pages while preserving every source word and reading order", async () => {
  const source = Array.from(
    { length: 90 },
    (_, i) =>
      `Note ${i}: preserve these readable words and their original order.`,
  ).join("\n\n");
  const normal = await typeset(source, { ...defaultOptions, format: "plain" }),
    compact = await typeset(source, { ...compactOptions, format: "plain" });
  assert.ok(compact.pages.length < normal.pages.length);
  assert.equal(
    plain(compact.doc).replace(/\s+/g, ""),
    source.replace(/\s+/g, ""),
  );
  const middle = compact.doc.layout.pages[0].width / 2;
  assert.ok(compact.doc.layout.pages[0].items.some((i) => i.x > middle));
  for (const page of compact.doc.layout.pages) {
    let right = false;
    for (const i of page.items) {
      if (i.x > middle) right = true;
      else
        assert.ok(!right, "column reading order cannot jump back to the left");
    }
  }
});
test("zero asymmetric margins, 6pt text and tight leading stay inside the page", async () => {
  const source = "Tiny readable Chinese 中文，and descenders gjpq. ".repeat(60);
  const settings = {
    ...compactOptions,
    format: "plain",
    size: 6,
    columns: 3,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    lineHeight: 1,
    paragraphGap: 0,
    columnGap: 4,
  };
  const { doc, pages } = await typeset(source, settings);
  assert.ok(pages.length);
  assert.equal(plain(doc), source);
  // renderLayout validates the conservative bounds of every actual glyph.
  for (const page of doc.layout.pages)
    for (const item of page.items) {
      assert.ok(item.x >= 0);
      assert.ok(item.y >= 0);
    }
});
test("invalid or impossible density settings are rejected", async () => {
  for (const settings of [
    { paddingLeft: -1 },
    { lineHeight: 0.5 },
    { size: 5 },
    { columns: 4 },
    { columnGap: Infinity },
    { paddingTop: NaN },
  ])
    await assert.rejects(typeset("hello", { ...defaultOptions, ...settings }));
  await assert.rejects(
    typeset("hello", {
      ...defaultOptions,
      size: 32,
      columns: 3,
      paddingLeft: 100,
      paddingRight: 100,
      columnGap: 72,
    }),
    /too little/,
  );
});
