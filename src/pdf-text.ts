export type ReadingOrder = "auto" | "rows" | "columns";
export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir?: string;
  hasEOL?: boolean;
};
export type PdfTextPage = {
  items: PdfTextItem[];
  transform: number[];
  width: number;
  number: number;
};
type Span = { text: string; x: number; y: number; end: number; height: number };
type Line = { y: number; height: number; spans: Span[] };
export type ExtractedPdf = {
  text: string;
  pageCount: number;
  emptyPages: number[];
  columnPages: number[];
  warnings: string[];
};
const asian =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]/u;
function spans(page: PdfTextPage): Span[] {
  const [a, b, c, d, e, f] = page.transform;
  return page.items
    .filter((item) => item.str.trim())
    .map((item) => {
      const [ta, tb, , , tx, ty] = item.transform,
        norm = Math.hypot(ta, tb) || 1;
      const ex = tx + (item.width * ta) / norm,
        ey = ty + (item.width * tb) / norm;
      const x = a * tx + c * ty + e,
        end = a * ex + c * ey + e;
      return {
        text: item.str.normalize("NFC"),
        x: Math.min(x, end),
        end: Math.max(x, end),
        y: b * tx + d * ty + f,
        height: Math.max(
          1,
          item.height,
          Math.hypot(item.transform[2], item.transform[3]),
        ),
      };
    });
}
function lines(input: Span[]): Line[] {
  const result: Line[] = [];
  for (const span of [...input].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = result[result.length - 1];
    if (
      line &&
      Math.abs(line.y - span.y) <=
        Math.max(1.5, Math.min(line.height, span.height) * 0.3)
    ) {
      line.spans.push(span);
      line.height = Math.max(line.height, span.height);
    } else result.push({ y: span.y, height: span.height, spans: [span] });
  }
  for (const line of result) line.spans.sort((a, b) => a.x - b.x);
  return result;
}
function lineText(line: Line): string {
  let text = "",
    previous: Span | undefined;
  for (const span of line.spans) {
    const gap = previous ? span.x - previous.end : 0;
    const bothAsian = asian.test(text.slice(-1)) && asian.test(span.text[0]);
    if (
      previous &&
      !/\s$/.test(text) &&
      !/^\s/.test(span.text) &&
      gap > (bothAsian ? line.height * 0.65 : line.height * 0.13)
    )
      text += " ";
    text += span.text;
    previous = span;
  }
  return text.trim();
}
function renderLines(input: Line[]): string {
  return input
    .map((line, i) => {
      const previous = input[i - 1];
      const paragraph =
        previous &&
        line.y - previous.y > Math.max(line.height, previous.height) * 1.8;
      return (i ? (paragraph ? "\n\n" : "\n") : "") + lineText(line);
    })
    .join("");
}
export function extractPdfText(
  pages: PdfTextPage[],
  order: ReadingOrder = "auto",
): ExtractedPdf {
  const emptyPages: number[] = [],
    columnPages: number[] = [],
    warnings = new Set<string>();
  const output = pages.map((page) => {
    const items = spans(page),
      rows = lines(items);
    if (!items.length) {
      emptyPages.push(page.number);
      return "";
    }
    if (page.items.some((i) => i.dir === "ttb" || i.dir === "rtl"))
      warnings.add(
        "Vertical or right-to-left text was found. Its reading order needs manual review.",
      );
    if (items.some((i) => /[\u0000\ufffd]/.test(i.text)))
      warnings.add(
        "Some PDF characters could not be decoded. Check the extracted text.",
      );
    let split = page.width / 2,
      score = 0;
    for (const ratio of [0.4, 0.45, 0.5, 0.55, 0.6]) {
      const middle = page.width * ratio;
      const votes = rows.filter((row) => {
        const left = row.spans.filter((s) => s.end < middle - 7),
          right = row.spans.filter((s) => s.x > middle + 7);
        return (
          left.length &&
          right.length &&
          !row.spans.some((s) => s.x <= middle + 7 && s.end >= middle - 7)
        );
      }).length;
      if (
        votes > score ||
        (votes === score &&
          Math.abs(ratio - 0.5) < Math.abs(split / page.width - 0.5))
      ) {
        score = votes;
        split = middle;
      }
    }
    const twoColumns =
      order === "columns" ||
      (order === "auto" && score >= 3 && score >= rows.length * 0.45);
    if (!twoColumns) return renderLines(rows);
    columnPages.push(page.number);
    const body = rows.filter(
      (row) =>
        row.spans.some((s) => s.end < split) &&
        row.spans.some((s) => s.x > split),
    );
    const first = body[0]?.y ?? -Infinity,
      last = body[body.length - 1]?.y ?? Infinity;
    const before = rows.filter(
      (row) =>
        row.y < first && row.spans.some((s) => s.x < split && s.end > split),
    );
    const after = rows.filter(
      (row) =>
        row.y > last && row.spans.some((s) => s.x < split && s.end > split),
    );
    const excluded = new Set([...before, ...after].flatMap((row) => row.spans));
    const content = items.filter((item) => !excluded.has(item));
    const left = content.filter((item) => (item.x + item.end) / 2 < split),
      right = content.filter((item) => (item.x + item.end) / 2 >= split);
    return [
      renderLines(before),
      renderLines(lines(left)),
      renderLines(lines(right)),
      renderLines(after),
    ]
      .filter(Boolean)
      .join("\n\n");
  });
  if (emptyPages.length)
    warnings.add(
      `No text layer on page(s) ${emptyPages.join(", ")}. Scans, images and outline-only PDFs need OCR and are not converted here.`,
    );
  if (columnPages.length)
    warnings.add(
      "Column order is estimated. Review headings, tables and formulas before importing.",
    );
  warnings.add(
    "Text extraction reflows the content. It does not reconstruct images, tables, LaTeX or the original page design.",
  );
  return {
    text: output.filter(Boolean).join("\n\n"),
    pageCount: pages.length,
    emptyPages,
    columnPages,
    warnings: [...warnings],
  };
}
