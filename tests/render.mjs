import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rngFor } from "../.test-build/src/random.js";
import { ruleStroke, symbolStrokes } from "../.test-build/src/math.js";
import { glyphOutline } from "../.test-build/src/glyphs.js";
import { parseLayout } from "../.test-build/src/model.js";
import { renderLayout } from "../.test-build/src/render.js";
const reference = JSON.parse(
  readFileSync(new URL("./fixtures/python-reference.json", import.meta.url)),
);
const bank = JSON.parse(
  readFileSync(new URL("../public/assets/caveat-glyphs.json", import.meta.url)),
);
const demo = JSON.parse(
  readFileSync(new URL("../src/data/demo.json", import.meta.url)),
);
function close(actual, expected, path = "") {
  if (typeof expected === "number")
    assert.ok(
      Math.abs(actual - expected) < 1e-10,
      `${path}: ${actual} != ${expected}`,
    );
  else if (expected && typeof expected === "object") {
    assert.deepEqual(
      Object.keys(actual).sort(),
      Object.keys(expected).sort(),
      path,
    );
    for (const key of Object.keys(expected))
      close(actual[key], expected[key], `${path}.${key}`);
  } else assert.equal(actual, expected, path);
}
test("SHA-256 streams and MT19937 choices agree with Python", async () => {
  assert.equal(
    (await rngFor(183, "letter", 0, 1, 2)).random(),
    reference.random[0],
  );
  assert.deepEqual(
    await Promise.all(
      [0, 42, 183, -7].map(async (s) => (await rngFor(s, "test")).range(24)),
    ),
    reference.choices,
  );
});
test("math curves, widths and equals-sign shuffle agree with Python", async () => {
  for (const [i, key] of Object.keys(reference.symbols).entries())
    close(
      symbolStrokes(
        key,
        40,
        50,
        28,
        20,
        "#035296",
        await rngFor(183, "item", 0, i),
      ),
      reference.symbols[key],
      key,
    );
  close(
    ruleStroke(30, 90, 54, 1.2, "#42067a", await rngFor(42, "item", 0, 0)),
    reference.rule,
  );
});
test("demo is deterministic and responds to seed and variation", async () => {
  const first = await renderLayout(demo, bank, 183, 0.4);
  assert.deepEqual(first, await renderLayout(demo, bank, 183, 0.4));
  assert.notEqual(
    first[0].svg,
    (await renderLayout(demo, bank, 42, 0.4))[0].svg,
  );
  assert.notEqual(
    first[0].svg,
    (await renderLayout(demo, bank, 183, 0))[0].svg,
  );
  assert.equal(first.length, 1);
  assert.equal(
    first[0].characters,
    demo.pages[0].items
      .filter((i) => i.type === "text")
      .reduce((n, i) => n + [...i.text].length, 0),
  );
  assert.equal(first[0].strokes, 13);
  const svg = first[0].svg;
  let offset = 0;
  for (const item of demo.pages[0].items)
    if (item.type === "text") {
      const escaped = item.text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const found = svg.indexOf(`aria-label="${escaped}"`, offset);
      assert.ok(found >= offset, "text reading order preserved");
      offset = found + 1;
    }
});
test("input validation and render failures are explicit", async () => {
  assert.throws(() => parseLayout({ pages: [] }));
  assert.throws(() => parseLayout({ pages: [{ items: [], grid: "yes" }] }));
  assert.throws(() => parseLayout({ pages: [{ items: [], surprise: 1 }] }));
  assert.throws(() =>
    parseLayout({
      pages: [{ items: [{ type: "rule", x: 0, y: 0, length: -1 }] }],
    }),
  );
  await assert.rejects(renderLayout(demo, bank, 183, NaN), /Variation/);
  await assert.rejects(renderLayout(demo, bank, 0.5, 0.4), /Seed/);
  const unsupported = {
    pages: [{ items: [{ type: "text", text: "中文", x: 40, y: 60 }] }],
  };
  await assert.rejects(
    renderLayout(unsupported, bank, 183, 0.4),
    /cannot render/,
  );
  await assert.rejects(
    renderLayout(
      { pages: [{ items: [{ type: "text", text: "hello", x: 610, y: 60 }] }] },
      bank,
      183,
      0.4,
    ),
    /overflows/,
  );
});
test("markup in titles and text cannot inject SVG elements", async () => {
  const pages = await renderLayout(
    {
      title: "<script>bad</script>",
      pages: [{ items: [{ type: "text", text: "<a>", x: 40, y: 60 }] }],
    },
    bank,
    183,
    0.4,
  );
  assert.ok(!pages[0].svg.includes("<script>"));
  assert.ok(pages[0].svg.includes("&lt;script&gt;"));
  assert.ok(pages[0].svg.includes('aria-label="&lt;a&gt;"'));
});

test("glyph alternates, deformed coordinates and composite accents agree with Python fonts", async () => {
  for (const referenceGlyph of reference.outlines) {
    const actual = await glyphOutline(
      bank,
      referenceGlyph.base,
      referenceGlyph.variant,
      183,
      0.4,
    );
    close(actual.points, referenceGlyph.points);
    assert.equal(actual.advance, referenceGlyph.advance);
  }
});
