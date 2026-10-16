import { initPreferences, uiText, refreshTranslations } from "./preferences.js";
import "./style.css";
import demo from "./data/demo.json";
import { sample, latexSample, plainSample, chineseSample } from "./sample.js";
import {
  defaultOptions,
  compactOptions,
  type ComposeOptions,
} from "./options.js";
import {
  extractPdfText,
  type PdfTextPage,
  type ExtractedPdf,
  type ReadingOrder,
} from "./pdf-text.js";
import { parseLayout, type Layout } from "./model.js";
import type { RenderedPage } from "./render.js";
type PreviewPage = Omit<RenderedPage, "scene">;
function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}
const documentInput = el<HTMLTextAreaElement>("document"),
  json = el<HTMLTextAreaElement>("json");
const seed = el<HTMLInputElement>("seed"),
  variation = el<HTMLInputElement>("variation");
const preview = el("preview"),
  status = el("status"),
  error = el("error");
const saveSvg = el<HTMLButtonElement>("save-svg"),
  savePdf = el<HTMLButtonElement>("save-pdf");
const savePdfTop = el<HTMLButtonElement>("save-pdf-top");
let layout: Layout | undefined, positioned: Layout | undefined;
let pages: PreviewPage[] = [],
  currentPage = 0,
  requestId = 0;
let timer: ReturnType<typeof setTimeout>,
  ready = false,
  exporting = false;
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
function fail(message: string): void {
  ready = false;
  exporting = false;
  saveSvg.disabled = savePdf.disabled = savePdfTop.disabled = true;
  uiText(savePdf, "↓ Download PDF");
  preview.setAttribute("aria-busy", "false");
  uiText(error, message);
  error.hidden = false;
  uiText(
    status,
    "Preview needs attention. Any visible page is from the last successful render.",
  );
}
function options(): ComposeOptions {
  return {
    paddingTop: (Number(el<HTMLInputElement>("padding-top").value) * 72) / 25.4,
    paddingRight:
      (Number(el<HTMLInputElement>("padding-right").value) * 72) / 25.4,
    paddingBottom:
      (Number(el<HTMLInputElement>("padding-bottom").value) * 72) / 25.4,
    paddingLeft:
      (Number(el<HTMLInputElement>("padding-left").value) * 72) / 25.4,
    lineHeight: Number(el<HTMLInputElement>("line-height").value),
    paragraphGap: Number(el<HTMLInputElement>("paragraph-gap").value),
    columns: Number(el<HTMLSelectElement>("columns").value) as 1 | 2 | 3,
    columnGap: (Number(el<HTMLInputElement>("column-gap").value) * 72) / 25.4,
    format: el<HTMLSelectElement>("format").value as ComposeOptions["format"],
    paper: el<HTMLSelectElement>("paper").value as ComposeOptions["paper"],
    size: Number(el<HTMLSelectElement>("font-size").value),
    grid: el<HTMLSelectElement>("grid").value === "grid",
  };
}
function showPage(): void {
  const page = pages[currentPage];
  if (!page) return;
  preview.innerHTML = page.svg;
  uiText(
    el("dimensions"),
    `${Math.round(page.width)} × ${Math.round(page.height)} pt`,
  );
  uiText(el("page-number"), `Page ${currentPage + 1} / ${pages.length}`);
  el<HTMLButtonElement>("prev").disabled = currentPage === 0;
  el<HTMLButtonElement>("next").disabled = currentPage === pages.length - 1;
}
function schedule(): void {
  clearTimeout(timer);
  const id = ++requestId;
  ready = false;
  exporting = false;
  saveSvg.disabled = savePdf.disabled = savePdfTop.disabled = true;
  uiText(savePdf, "↓ Download PDF");
  error.hidden = true;
  preview.setAttribute("aria-busy", "true");
  uiText(status, "Composing handwritten pages…");
  uiText(el("variation-value"), Number(variation.value).toFixed(2));
  uiText(
    el("source-count"),
    `${documentInput.value.length.toLocaleString()} / 12,000`,
  );
  el("layout-mode").hidden = !positioned;
  if (!positioned && !documentInput.value.trim()) {
    pages = [];
    layout = undefined;
    currentPage = 0;
    preview.innerHTML =
      '<div class="empty-page"><p>Your page starts here.</p><span>Paste Markdown, a formula, or a few plain words.</span></div>';
    refreshTranslations();
    preview.setAttribute("aria-busy", "false");
    uiText(status, "Start writing to see your handwritten pages.");
    uiText(el("dimensions"), "");
    uiText(el("page-number"), "No pages yet");
    el<HTMLButtonElement>("prev").disabled = el<HTMLButtonElement>(
      "next",
    ).disabled = true;
    return;
  }
  timer = setTimeout(() => {
    if (seed.value.trim() === "" || !Number.isSafeInteger(Number(seed.value))) {
      fail("Seed must be a safe integer.");
      return;
    }
    worker.postMessage({
      id,
      ...(positioned
        ? { layout: positioned }
        : { source: documentInput.value }),
      options: options(),
      seed: Number(seed.value),
      variation: Number(variation.value),
      assetUrl: new URL(
        `${import.meta.env.BASE_URL}assets/caveat-glyphs.json`,
        document.baseURI,
      ).href,
    });
  }, 300);
}
function download(content: BlobPart, type: string, name: string): void {
  const url = URL.createObjectURL(new Blob([content], { type })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function basename(): string {
  const title =
    layout?.title.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") ??
    "";
  return [...title].slice(0, 80).join("") || "natural-ink";
}

worker.onmessage = (event: MessageEvent) => {
  const message = event.data;
  if (message.id !== requestId) return;
  if (message.type === "progress") {
    uiText(status, message.message);
    return;
  }
  if (message.type === "pdf") {
    exporting = false;
    savePdf.disabled = savePdfTop.disabled = !ready;
    uiText(savePdf, "↓ Download PDF");
    if (message.error) {
      uiText(error, message.error);
      error.hidden = false;
      return;
    }
    download(
      message.bytes,
      "application/pdf",
      `${basename()}-seed-${seed.value}.pdf`,
    );
    uiText(
      status,
      `${pages.length} ${pages.length === 1 ? "page" : "pages"} exported as vector PDF · Seed ${seed.value}`,
    );
    return;
  }
  if (message.error) {
    fail(message.error);
    return;
  }
  pages = message.pages;
  layout = message.layout;
  json.value = JSON.stringify(layout, null, 2);
  currentPage = Math.max(0, Math.min(currentPage, pages.length - 1));
  ready = true;
  showPage();
  preview.setAttribute("aria-busy", "false");
  saveSvg.disabled = savePdf.disabled = savePdfTop.disabled = false;
  error.hidden = true;
  uiText(
    status,
    `${pages.length} ${pages.length === 1 ? "page" : "pages"} · ${pages.reduce((n, p) => n + p.characters, 0)} characters · Seed ${seed.value}`,
  );
};
worker.onerror = () =>
  fail("The rendering worker stopped. Reload this page to retry.");
documentInput.addEventListener("input", () => {
  positioned = undefined;
  schedule();
});
for (const id of ["format", "paper", "grid"])
  el(id).addEventListener("change", () => {
    positioned = undefined;
    schedule();
  });
function applyPreset(preset: ComposeOptions): void {
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const key = `padding${side[0].toUpperCase() + side.slice(1)}` as
      "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft";
    el<HTMLInputElement>(`padding-${side}`).value = (
      (preset[key] * 25.4) /
      72
    ).toFixed(1);
  }
  el<HTMLInputElement>("font-size").value = String(preset.size);
  el<HTMLInputElement>("line-height").value = String(preset.lineHeight);
  el<HTMLInputElement>("paragraph-gap").value = String(preset.paragraphGap);
  el<HTMLSelectElement>("columns").value = String(preset.columns);
  el<HTMLInputElement>("column-gap").value = (
    (preset.columnGap * 25.4) /
    72
  ).toFixed(1);
  el<HTMLSelectElement>("grid").value = preset.grid ? "grid" : "plain";
  positioned = undefined;
  schedule();
}
el<HTMLSelectElement>("layout-preset").addEventListener("change", (event) => {
  const choice = (event.target as HTMLSelectElement).value;
  if (choice !== "custom")
    applyPreset(choice === "compact" ? compactOptions : defaultOptions);
});
for (const id of [
  "font-size",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "line-height",
  "paragraph-gap",
  "column-gap",
])
  el(id).addEventListener("input", () => {
    el<HTMLSelectElement>("layout-preset").value = "custom";
    positioned = undefined;
    schedule();
  });
el("columns").addEventListener("change", () => {
  el<HTMLSelectElement>("layout-preset").value = "custom";
  positioned = undefined;
  schedule();
});
variation.addEventListener("input", schedule);
seed.addEventListener("input", schedule);
el("shuffle").addEventListener("click", () => {
  seed.value = String(crypto.getRandomValues(new Uint32Array(1))[0]);
  schedule();
});
el("prev").addEventListener("click", () => {
  currentPage--;
  showPage();
});
el("next").addEventListener("click", () => {
  currentPage++;
  showPage();
});
el("reset").addEventListener("click", () => {
  const format = options().format;
  documentInput.value =
    format === "latex"
      ? latexSample
      : format === "plain"
        ? plainSample
        : sample;
  positioned = undefined;
  currentPage = 0;
  schedule();
});
el("chinese-example").addEventListener("click", () => {
  documentInput.value = chineseSample;
  el<HTMLSelectElement>("format").value = "markdown";
  positioned = undefined;
  currentPage = 0;
  schedule();
});
function load(value: unknown): void {
  positioned = parseLayout(value);
  currentPage = 0;
  schedule();
}
function invalidate(e: unknown): void {
  clearTimeout(timer);
  requestId++;
  fail(e instanceof Error ? e.message : String(e));
}
el("legacy-demo").addEventListener("click", () => load(demo));
el("apply").addEventListener("click", () => {
  try {
    load(JSON.parse(json.value));
  } catch (e) {
    invalidate(e);
  }
});
el("import").addEventListener("click", () =>
  el<HTMLInputElement>("file").click(),
);
el<HTMLInputElement>("file").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000)
      throw new Error("Use a JSON layout smaller than 2 MB.");
    load(JSON.parse(await file.text()));
  } catch (e) {
    invalidate(e);
  }
  input.value = "";
});
el("save-json").addEventListener("click", () => {
  if (ready && layout)
    download(
      JSON.stringify(layout, null, 2),
      "application/json",
      `${basename()}.json`,
    );
});
saveSvg.addEventListener("click", () => {
  if (ready)
    download(
      pages[currentPage].svg,
      "image/svg+xml",
      `${basename()}-page-${currentPage + 1}-seed-${seed.value}.svg`,
    );
});
function downloadPdf(): void {
  if (!ready || exporting) return;
  exporting = true;
  savePdf.disabled = savePdfTop.disabled = true;
  uiText(savePdf, "Preparing PDF…");
  error.hidden = true;
  worker.postMessage({ type: "pdf", id: requestId });
}
savePdf.addEventListener("click", downloadPdf);
savePdfTop.addEventListener("click", downloadPdf);
const pdfDialog = el<HTMLDialogElement>("pdf-dialog"),
  pdfText = el<HTMLTextAreaElement>("pdf-text"),
  pdfUse = el<HTMLButtonElement>("pdf-use");
let pdfPages: PdfTextPage[] = [],
  pdfResult: ExtractedPdf | undefined,
  pdfController: AbortController | undefined,
  pdfBusy = false,
  importRevision = 0;
function updateImportButton(): void {
  const count = pdfText.value.length;
  uiText(el("pdf-count"), `${count.toLocaleString()} / 12,000`);
  pdfUse.disabled =
    pdfBusy ||
    !pdfText.value.trim() ||
    count > 12000 ||
    Boolean(
      pdfResult?.emptyPages.length &&
      !el<HTMLInputElement>("skip-pages").checked,
    );
}
function rebuildPdfPreview(): void {
  pdfResult = extractPdfText(
    pdfPages,
    el<HTMLSelectElement>("reading-order").value as ReadingOrder,
  );
  pdfText.value = pdfResult.text;
  pdfText.readOnly = false;
  const warnings = el("pdf-warnings");
  warnings.replaceChildren();
  for (const message of pdfResult.warnings) {
    const item = document.createElement("li");
    uiText(item, message);
    warnings.append(item);
  }
  el("skip-pages-label").hidden =
    !pdfResult.emptyPages.length || !pdfResult.text;
  el<HTMLInputElement>("skip-pages").checked = false;
  uiText(
    el("pdf-status"),
    `${pdfResult.pageCount} PDF pages · ${pdfResult.columnPages.length} detected as columns. Review the text below.`,
  );
  if (!pdfResult.text.trim()) {
    uiText(
      el("pdf-error"),
      "No selectable text found. Scans and outline-only PDFs need OCR, which is not included in this import.",
    );
    el("pdf-error").hidden = false;
  }
  updateImportButton();
}
el("import-pdf").addEventListener("click", () =>
  el<HTMLInputElement>("pdf-file").click(),
);
el<HTMLInputElement>("pdf-file").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  input.value = "";
  pdfController?.abort();
  pdfController = new AbortController();
  const controller = pdfController,
    revision = ++importRevision;
  pdfPages = [];
  pdfResult = undefined;
  pdfBusy = true;
  pdfText.value = "";
  pdfText.readOnly = true;
  pdfUse.disabled = true;
  el("pdf-warnings").replaceChildren();
  el("pdf-error").hidden = true;
  el("skip-pages-label").hidden = true;
  el<HTMLSelectElement>("reading-order").value = "auto";
  el<HTMLSelectElement>("reading-order").disabled = true;
  uiText(el("pdf-status"), "Loading the local PDF reader…");
  updateImportButton();
  pdfDialog.showModal();
  try {
    if (file.size > 20_000_000)
      throw new Error("Use a PDF smaller than 20 MB.");
    const data = new Uint8Array(await file.arrayBuffer());
    controller.signal.throwIfAborted();
    const { importPdf } = await import("./pdf-browser.js");
    const result = await importPdf(
      data,
      new URL(`${import.meta.env.BASE_URL}assets/pdfjs/`, document.baseURI)
        .href,
      controller.signal,
      (page, total) => {
        if (revision === importRevision)
          uiText(el("pdf-status"), `Extracting page ${page} / ${total}…`);
      },
    );
    if (revision !== importRevision || controller.signal.aborted) return;
    pdfPages = result;
    pdfBusy = false;
    el<HTMLSelectElement>("reading-order").disabled = false;
    rebuildPdfPreview();
  } catch (e) {
    if (revision !== importRevision || controller.signal.aborted) return;
    pdfBusy = false;
    uiText(el("pdf-status"), "PDF could not be imported.");
    uiText(el("pdf-error"), e instanceof Error ? e.message : String(e));
    el("pdf-error").hidden = false;
    updateImportButton();
  }
});
el("pdf-cancel").addEventListener("click", () => pdfDialog.close());
pdfDialog.addEventListener("close", () => {
  importRevision++;
  pdfController?.abort();
  pdfBusy = false;
  pdfPages = [];
  pdfResult = undefined;
});
el("reading-order").addEventListener("change", () => {
  if (pdfPages.length) rebuildPdfPreview();
});
pdfText.addEventListener("input", updateImportButton);
el("skip-pages").addEventListener("change", updateImportButton);
pdfUse.addEventListener("click", () => {
  if (pdfUse.disabled) return;
  documentInput.value = pdfText.value;
  el<HTMLSelectElement>("format").value = "plain";
  positioned = undefined;
  currentPage = 0;
  schedule();
  pdfDialog.close();
});
initPreferences();
documentInput.value = sample;
schedule();
