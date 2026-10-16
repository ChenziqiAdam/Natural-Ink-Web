import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readPdfPages } from "./pdf-reader.js";
GlobalWorkerOptions.workerSrc = workerUrl;
export async function importPdf(
  data: Uint8Array,
  assetBase: string,
  signal: AbortSignal,
  progress: (page: number, total: number) => void,
) {
  signal.throwIfAborted();
  const task = getDocument({
    data,
    cMapUrl: new URL("cmaps/", assetBase).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("standard_fonts/", assetBase).href,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    verbosity: 0,
  });
  const cancel = () => {
    void task.destroy();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await task.promise;
    return await readPdfPages(pdf, signal, progress);
  } catch (error) {
    if (signal.aborted)
      throw new DOMException("PDF import canceled.", "AbortError");
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error(
        "Password-protected PDFs are not supported. Import an unlocked copy.",
      );
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    await task.destroy();
  }
}
