import test from "node:test";
import assert from "node:assert/strict";
import { preference, translate } from "../.test-build/src/preferences.js";

test("first visit and invalid preferences use English and light", () => {
  for (const value of [null, "", "browser-default", "ZH", "invalid"]) {
    assert.equal(preference(value, "language"), "en");
    assert.equal(preference(value, "theme"), "light");
  }
  assert.equal(preference("zh", "language"), "zh");
  assert.equal(preference("dark", "theme"), "dark");
});
test("language translates status, import warnings and errors without losing values", () => {
  assert.equal(translate("Page 2 / 7", "zh"), "第 2 / 7 页");
  assert.equal(
    translate("7 pages · 2711 characters · Seed 183", "zh"),
    "7 页 · 2711 个字符 · 随机种子 183",
  );
  assert.equal(
    translate("1 page exported as vector PDF · Seed 183", "zh"),
    "已导出 1 页矢量 PDF · 随机种子 183",
  );
  assert.equal(
    translate("Extracting page 3 / 5…", "zh"),
    "正在提取第 3 / 5 页…",
  );
  assert.match(
    translate(
      "No text layer on page(s) 2, 4. Scans, images and outline-only PDFs need OCR and are not converted here.",
      "zh",
    ),
    /第 2, 4 页没有文本层/,
  );
  assert.match(
    translate(
      "Unsupported LaTeX command: \\unknown. Open Syntax help for the supported subset.",
      "zh",
    ),
    /不支持 LaTeX 命令：\\unknown/,
  );
  assert.equal(
    translate("  Download every page as a crisp,\n vector PDF.  ", "zh"),
    "  将所有页面下载为清晰的矢量 PDF。  ",
  );
  for (const source of [
    "用户原文",
    "\\frac{a}{b}",
    "123 / 12,000",
    "# My notes",
  ]) {
    assert.equal(translate(source, "zh"), source);
    assert.equal(translate(source, "en"), source);
  }
});

test("formula delimiters remain literal in translated diagnostics", () => {
  assert.equal(
    translate("Unclosed display formula. Close it with $$.", "zh"),
    "独立公式未闭合，请用 $$ 结束。",
  );
});
