import { FontLoader } from "./font-loader.js";
import type { FontBank } from "./glyphs.js";
import { compose, type ComposeOptions } from "./compose.js";
import { Typography } from "./typography.js";
import { renderLayout, type RenderedPage } from "./render.js";
import { parseLayout, type Layout } from "./model.js";
type Request = {
  id: number;
  layout?: unknown;
  source?: string;
  options: ComposeOptions;
  seed: number;
  variation: number;
  assetUrl: string;
};
let cjk: FontLoader | undefined;
let bank: Promise<FontBank> | undefined,
  pending: Request | undefined,
  running = false;
let last: { id: number; layout: Layout; pages: RenderedPage[] } | undefined;
async function process(): Promise<void> {
  running = true;
  while (pending) {
    const request = pending;
    pending = undefined;
    const { id, seed, variation, assetUrl } = request;
    try {
      if (!Number.isSafeInteger(seed))
        throw new Error("Seed must be a safe integer.");
      if (!Number.isFinite(variation) || variation < 0 || variation > 1)
        throw new Error("Variation must be between 0 and 1.");
      bank ??= fetch(assetUrl).then((response) => {
        if (!response.ok)
          throw new Error("Could not load the font outlines. Reload to retry.");
        return response.json();
      });
      const font = await bank;
      const raw =
        request.source === undefined ? parseLayout(request.layout) : undefined;
      const text =
        request.source ??
        raw!.pages
          .flatMap((p) =>
            p.items.filter((i) => i.type === "text").map((i) => i.text),
          )
          .join("");
      if (request.source && request.source.length > 12000)
        throw new Error("Use at most 12,000 source characters.");
      cjk ??= new FontLoader(new URL("cjk/", assetUrl).href);
      if (
        [...text].some(
          (c) => !/[\n\r\t]/.test(c) && !font.cmap[String(c.codePointAt(0))],
        )
      )
        self.postMessage({
          type: "progress",
          id,
          message: "Loading Chinese handwriting outlines…",
        });
      const fallback = await cjk.ensure(text, font);
      const typography = new Typography(font, seed, variation, fallback);
      const document =
        request.source === undefined
          ? { layout: raw!, styles: {} }
          : await compose(request.source, request.options, typography);
      const pages = await renderLayout(
        document.layout,
        font,
        seed,
        variation,
        document.styles,
        typography,
      );
      last = { id, layout: document.layout, pages };
      self.postMessage({
        id,
        layout: document.layout,
        pages: pages.map(({ scene, ...page }) => page),
      });
    } catch (error) {
      last = undefined;
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  running = false;
}
self.onmessage = async (event: MessageEvent) => {
  if (event.data.type === "pdf") {
    const { id } = event.data;
    try {
      const rendered = last;
      if (!rendered || rendered.id !== id)
        throw new Error(
          "The document changed. Wait for the latest preview, then download again.",
        );
      const { exportPdf } = await import("./pdf.js");
      const bytes = await exportPdf(rendered.pages, rendered.layout.title);
      self.postMessage(
        { type: "pdf", id, bytes },
        { transfer: [bytes.buffer] },
      );
    } catch (error) {
      self.postMessage({
        type: "pdf",
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  pending = event.data as Request;
  if (!running) void process();
};
