# Natural Ink Web

[简体中文](README.zh-CN.md) | Inspired by [Natural Ink](https://github.com/LambertAlpha/natural-ink)

A static handwriting workbench for Chinese, English, Markdown, and a LaTeX formula subset. Paste text or review text extracted from a PDF, adjust page density, and download a vector PDF. Documents stay on the device.

## Run

This directory is a **standalone frontend repository**. Copy its contents (including hidden `.github/` and `.gitignore`) to the new repository root. Only Node.js 22.13+ or Node 24+ and npm are required; Node 24 is used in CI. Python, uv, the parent repository and font downloads are not required.

```sh
# From the standalone repository root:
npm ci
npm run dev
```

```sh
npm test
npm run format:check
npm run build
npm run preview
```

All runtime assets are same-origin. There are no document uploads, API keys, analytics, or external runtime font requests. `npm run assets` uses Node built-ins to verify SHA-256 checksums and unpack the committed `font-data/*.json.gz` archives into ignored `public/assets/`, then copies PDF.js CMaps, standard fonts and licenses from npm dependencies. No network is needed after `npm ci`; do not omit the font archives. These are licensed distributable outline data, not generated font caches.

About 29 MB of compressed font data is included in source control to make a clean checkout build independently. The built site expands to about 170 MB (including roughly 142 MB of Chinese outlines); browsers request only needed Chinese shards. Every archive is below GitHub's individual file size limit. Use Git to push the source repository rather than the browser's multi-file uploader.

## Chinese and English handwriting

English retains Caveat's 24 virtual variants, true alternates, composite components, and seeded contour deformation. Chinese uses **NaturalInkCJK**, an OFL outline derivative of [LXGW WenKai](https://github.com/lxgw/LxgwWenKai), itself based on Klee One. The source is pinned at revision `d582f24504099b8e6d161bdd5e8fd3ae3ab63462`, font SHA-256 `bf73f995c05f3f7baf7840b9d76d8d9678c8b150a020946a394ca63c67ed1350`.

The source font maps 46,926 Unicode characters (not all are Han characters). Its geometry is split into lazy 64-codepoint buckets; only required buckets are fetched. English-only input does not request the Chinese manifest. Chinese preserves the source advances and uses much smaller outline/size/rotation variations to keep dense strokes readable. This is a handwriting font with controlled variation, not learned personal handwriting or recovered pen history.

Chinese and English can appear in the same paragraph, and Chinese is supported in `\text{...}` in formulas. Line breaking permits CJK character boundaries, attaches closing punctuation to the previous token, and keeps opening brackets with the following token. Unsupported characters fail explicitly; there is no invisible fallback to a system font. This repository includes the browser renderer only.

## Writing

Default **Markdown + math** supports headings, paragraphs, ordered/unordered/task lists, quotes, bold, italic, code, and horizontal rules. Links retain labels; code retains the handwriting style. HTML, images, tables, and strikethrough fail explicitly.

```markdown
# 中英文笔记

A **readable** paragraph with 中文和行内公式 $E = mc^2$。

$$
\text{均值} = \frac{a+b}{2}
$$
```

Inline math also accepts `\(...\)`; display math accepts `\[...\]`. Escape currency dollars as `\$`, or choose **Plain text** to keep all markup literal. Plain-text single newlines are hard breaks; blank lines separate paragraphs and use the paragraph-gap setting. **LaTeX formula** accepts one bare formula, optionally wrapped in `$$...$$` or `\[...\]`; it is not a TeX document compiler.

The formula subset includes groups, superscripts/subscripts in either order, nested `\frac`/`\dfrac`/`\tfrac`, `\sqrt`, sums/products, integrals, pi, supported Greek letters, arrows, sets/relations, plus/minus, common named operators, `\text`, `\mathrm`, `\operatorname`, `\mathbf`, `\mathit`, `\mathbb{R}`/`\mathbb{E}`, simple `\left`/`\right` and spacing commands. Unknown commands, indexed roots, macros and matrix/aligned environments report errors. Sum/integral limits appear beside the operator.

## Density and page layout

- A4/US Letter, 6–32 pt text, grid/plain background, and body variation.
- Four independent margins in **mm** (0–35 mm in the UI), line-height multiplier (1–3), paragraph gap in **pt** (0–50), 1/2/3 columns, and column gap in **mm**.
- **Comfortable** restores roughly 17 mm margins, 18 pt text, 1.6 line height, and one column.
- **Compact reference sheet** uses roughly 4.2 mm margins, 9 pt text, 1.1 line height, 1 pt paragraph gap, and two columns. Every setting remains editable.

Text follows actual seeded advances and conservative glyph bounds. Flow fills the left column top-to-bottom, then the next column, then the next page. Lines reserve at least the actual ink height, so tall Chinese glyphs and fractions may exceed the nominal leading. Formulas remain intact within the column; over-wide formulas ask for smaller text or a split expression. Long Latin words can break at glyph boundaries. Density changes do not justify clipping or deleting content. Physical printers may not support borderless output even when the PDF margin is zero.

Seed, the original demo, and positioned-layout JSON are under **Advanced**. Editing the main text or paper/density settings returns to automatic layout. Source-layout JSON stores text and geometry in the existing schema; emphasis and formula stroke scaling are transient styles. Keep Markdown when editing rich source later. Portable `natural-ink/1` ink JSON remains separate.

## Local PDF text import

Choose **PDF text**, then review/edit the extraction before **Use this text** replaces the editor in Plain text mode. Cancel leaves the source untouched. Extraction uses Mozilla PDF.js with same-origin workers, CMaps and font data; the viewer scripting layer is not loaded, and font-face loading is disabled. PDF input is capped at 20 MB, 50 pages and 200,000 extracted characters. The review can contain up to 200,000 characters; shorten it to the editor's 12,000-character limit before accepting.

Reading order can be **Auto**, **Rows**, or **Two columns**. Auto detection is a heuristic based on repeated central gutters. It is not a general document-layout model: headers, mixed layouts, tables, vertical/RTL text, rotated text, and equations need review. It extracts text and reflows it; images, fonts, original pagination/design, tables and semantic LaTeX are not recovered.

Pages without a text layer are listed. Mixed documents require an explicit checkbox to import only the extracted text and skip those pages. Fully scanned, image-only, or outlined documents show an OCR-required message and cannot replace the editor with an empty result. **OCR is not implemented.** Natural Ink's current PDF exports contain vector outlines, so they also need OCR to extract text; retain the original source. Password-protected PDFs require an unlocked copy. Corrupt input, cancellation and font-loading errors are reported without replacing the source.

## Rendering, verification and hosting

Preview SVG and PDF use the same format-independent vector scene. Downloads include all pages, dimensions and backgrounds; SVG saves the current page. Glyphs are outlines, so PDF/SVG text is not selectable and is not editable pen centerlines. Rendering/export run in a Web Worker; pending input is coalesced and stale results are ignored. Blank source shows an empty state; failed renders label old previews as stale and disable downloads.

Tests compare committed reference fixtures from the original Python implementation (no Python execution), check Markdown/LaTeX, CJK lazy loading and punctuation, compact column reading order, zero margins/tight small text, validation, PDF export, actual PDF.js extraction, scanned-page warnings and cancellation. Development also renders PDFs and compares their geometry/appearance with SVG previews.

Editor limits: 12,000 source characters, 20 output pages, 20,000 items, individual formulas up to 2,000 characters, bounded nesting; positioned JSON imports up to 2 MB and page dimensions up to 5,000 pt.

`npm run build` produces `dist/` for a static host such as `/natural-ink/` on GitHub Pages. No backend is needed. The included workflow publishes the tested build on pushes to the repository default branch (or a manual run on that branch). Pull requests only run checks. PDF-to-centerline tracing and the experimental Goodnotes adapter are not included in this standalone web project.

Code is MIT. Caveat and WenKai/Klee derivatives retain SIL OFL 1.1, with source notices in `licenses/` and `NOTICE.md`, copied to the built site under `assets/OFL.txt`, `assets/cjk/OFL.txt` and `assets/NOTICE.md`. Marked, pdf-lib, PDF.js and their dependencies retain their licenses; see `THIRD_PARTY.md`. PDF import and export libraries are loaded only when needed.


## v1.0 interface and release

The first visit defaults to English and a light theme. The header offers English/中文 and light/dark toggles. Only these two preferences are stored locally; source text and imported documents are never persisted. Blocked local storage falls back safely. Switching language or theme preserves editor contents, page settings, the current preview and edits in PDF review. Dark mode changes the workbench, not the paper or exported PDF.

Before the first GitHub Pages deployment:

1. Create a repository and copy **the contents of this directory into its root**, not another nested `web/` folder. Include `.github/workflows/pages.yml`, `.gitignore`, `font-data/`, `licenses/`, `src/`, `tests/`, `scripts/`, `public/` if present, the HTML/config files, `package.json`, `package-lock.json`, and all license/README files. No files outside this directory are needed. Keep generated `dist/`, `public/assets/`, `.test-build/` and `node_modules/` ignored.
2. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. See [GitHub's publishing source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. Push the source using Git to the default branch, or run **checks and Pages** manually there. The workflow installs npm dependencies, audits/tests/checks/builds the app, uploads only `dist/`, and deploys using the `github-pages` environment. It uses Node 24 and does not install Python. Registry access is needed for `npm ci` and the dependency audit.
4. Open the URL shown by the deployment. Check both languages/themes, refresh persistence, Chinese rendering, PDF text import and all-page PDF download. Also check a narrow/mobile screen. GitHub settings, Actions results and the public URL can only be verified after upload.

For a new, empty GitHub repository, run from the copied project root (replace the remote URL):

```sh
git init -b main
git add .
git commit -m "Initial web release"
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

The Source link in `index.html` points to the original project; change it to your new repository URL if desired.

The relative Vite base supports both a project subpath (`/natural-ink/`) and a root domain. The static build includes font/license assets and PDF.js data; preserve the entire build directory. Source text is not saved across a reload: retain your Markdown/plain text separately. OCR and general TeX compilation remain outside this web release; Goodnotes export is not included.

PDF.js is locked to a patched 6.2.108+ release, addressing [GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j). Re-run `npm audit` before future releases.


## Included data and maintenance

- `src/data/demo.json`: neutral positioned-layout example, copied from the original project.
- `src/data/symbols.json`: mathematical stroke templates.
- `tests/fixtures/python-reference.json`: fixed independent regression values for seeds, math and glyph outlines. They are data, not a Python runtime dependency.
- `font-data/manifest.json` and `outlines-*.json.gz`: deterministic gzip archives of precomputed Caveat and NaturalInkCJK outline JSON, with per-archive SHA-256 and exact file lists. Chinese source provenance is in `NOTICE.md` and the bundled font index. Always retain the OFL licenses when redistributing these assets.
- `scripts/prepare-assets.mjs`: verifies and reconstructs local assets using Node only; used by development, tests and production builds.
- `npm run fonts:pack`: maintenance utility to repack already prepared outline banks. Normal users do not need to run it. Replacing font geometry requires updating attribution/manifest and reviewing the resulting PDFs.

The original combined repository can still run these npm commands from its `web/` directory. The nested `.github/` workflow becomes active only when copied to a standalone repository root; the combined repository has a separate root workflow with the correct working directory.
