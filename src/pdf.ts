import {
  PDFDocument,
  rgb,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  fill,
  fillAndStroke,
  pushGraphicsState,
  popGraphicsState,
  setFillingRgbColor,
  setStrokingRgbColor,
  setLineWidth,
  setLineCap,
  setLineJoin,
  LineCapStyle,
  LineJoinStyle,
  type PDFOperator,
} from "pdf-lib";
import type { RenderedPage } from "./render.js";
import type { Draw } from "./scene.js";
const channels = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
function glyphOperators(
  glyph: Extract<Draw, { type: "glyph" }>,
  height: number,
): PDFOperator[] {
  const angle = (glyph.angle * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  function transform(x: number, y: number): [number, number] {
    const sx =
      (x + (glyph.italic ? Math.tan((-8 * Math.PI) / 180) * y : 0)) *
      glyph.scale;
    const sy = -y * glyph.scale;
    return [glyph.x + c * sx - s * sy, height - (glyph.y + s * sx + c * sy)];
  }
  const tokens = glyph.path.split(/\s+/).filter(Boolean);
  const ops: PDFOperator[] = [
    pushGraphicsState(),
    setFillingRgbColor(...channels(glyph.color)),
  ];
  if (glyph.bold)
    ops.push(
      setStrokingRgbColor(...channels(glyph.color)),
      setLineWidth(10 * glyph.scale),
      setLineJoin(LineJoinStyle.Round),
    );
  let current: [number, number] = [0, 0],
    first = current;
  for (let i = 0; i < tokens.length;) {
    const op = tokens[i++];
    if (op === "Z") {
      ops.push(closePath());
      current = first;
      continue;
    }
    const p = transform(Number(tokens[i++]), Number(tokens[i++]));
    if (op === "M") {
      ops.push(moveTo(...p));
      current = first = p;
    } else if (op === "L") {
      ops.push(lineTo(...p));
      current = p;
    } else if (op === "Q") {
      const end = transform(Number(tokens[i++]), Number(tokens[i++]));
      ops.push(
        appendBezierCurve(
          current[0] + (2 / 3) * (p[0] - current[0]),
          current[1] + (2 / 3) * (p[1] - current[1]),
          end[0] + (2 / 3) * (p[0] - end[0]),
          end[1] + (2 / 3) * (p[1] - end[1]),
          ...end,
        ),
      );
      current = end;
    } else throw new Error(`Unsupported glyph path operation: ${op}`);
  }
  if (tokens.length) ops.push(glyph.bold ? fillAndStroke() : fill());
  ops.push(popGraphicsState());
  return ops;
}
export async function exportPdf(
  pages: RenderedPage[],
  title: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!pages.length) throw new Error("Render a document before exporting PDF.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor("Natural Ink");
  pdf.setCreator("Natural Ink web");
  // Stable metadata keeps repeated same-input exports reproducible.
  pdf.setCreationDate(new Date("2000-01-01T00:00:00Z"));
  pdf.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  for (const rendered of pages) {
    const page = pdf.addPage([rendered.width, rendered.height]);
    for (const draw of rendered.scene) {
      const color = rgb(...channels(draw.color));
      if (draw.type === "rect")
        page.drawRectangle({
          x: draw.x,
          y: rendered.height - draw.y - draw.height,
          width: draw.width,
          height: draw.height,
          color,
        });
      else if (draw.type === "line")
        page.drawLine({
          start: { x: draw.x, y: rendered.height - draw.y },
          end: { x: draw.x2, y: rendered.height - draw.y2 },
          color,
          thickness: draw.width,
          lineCap: draw.round ? LineCapStyle.Round : LineCapStyle.Butt,
        });
      else page.pushOperators(...glyphOperators(draw, rendered.height));
    }
  }
  // pdf-lib's return type is broader than its owned byte buffer.
  return new Uint8Array(await pdf.save());
}
