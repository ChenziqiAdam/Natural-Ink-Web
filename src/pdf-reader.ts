import type { PdfTextItem, PdfTextPage } from "./pdf-text.js";
// A small interface permits testing the same extraction path with PDF.js in Node.
export type PdfHandle = {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(options: { scale: number }): {
      transform: number[];
      width: number;
    };
    getTextContent(): Promise<{ items: unknown[] }>;
    cleanup(): void;
  }>;
};
export async function readPdfPages(
  pdf: PdfHandle,
  signal: AbortSignal,
  progress: (page: number, total: number) => void,
): Promise<PdfTextPage[]> {
  if (pdf.numPages > 50)
    throw new Error(
      "Use a PDF of 50 pages or fewer. Split longer documents before importing.",
    );
  const pages: PdfTextPage[] = [];
  let characters = 0;
  for (let number = 1; number <= pdf.numPages; number++) {
    signal.throwIfAborted();
    progress(number, pdf.numPages);
    const page = await pdf.getPage(number);
    try {
      const viewport = page.getViewport({ scale: 1 }),
        content = await page.getTextContent();
      const items = content.items.filter((item): item is PdfTextItem => {
        if (
          !item ||
          typeof item !== "object" ||
          !("str" in item) ||
          !("transform" in item)
        )
          return false;
        const text = item as PdfTextItem;
        return (
          typeof text.str === "string" &&
          Array.isArray(text.transform) &&
          text.transform.length === 6 &&
          text.transform.every(Number.isFinite) &&
          Number.isFinite(text.width) &&
          Number.isFinite(text.height)
        );
      });
      characters += items.reduce((n, item) => n + item.str.length, 0);
      if (characters > 200000)
        throw new Error(
          "The PDF contains over 200,000 extracted characters. Import a shorter document.",
        );
      pages.push({
        items,
        transform: viewport.transform,
        width: viewport.width,
        number,
      });
    } finally {
      page.cleanup();
    }
  }
  signal.throwIfAborted();
  return pages;
}
