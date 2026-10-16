export type ComposeOptions = {
  format: "markdown" | "latex" | "plain";
  paper: "a4" | "letter";
  size: number;
  grid: boolean;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  lineHeight: number;
  paragraphGap: number;
  columns: 1 | 2 | 3;
  columnGap: number;
};
export const defaultOptions: ComposeOptions = {
  format: "markdown",
  paper: "a4",
  size: 18,
  grid: true,
  paddingTop: 48,
  paddingRight: 48,
  paddingBottom: 48,
  paddingLeft: 48,
  lineHeight: 1.6,
  paragraphGap: 11,
  columns: 1,
  columnGap: 18,
};
export const compactOptions: ComposeOptions = {
  ...defaultOptions,
  size: 9,
  grid: false,
  paddingTop: 12,
  paddingRight: 12,
  paddingBottom: 12,
  paddingLeft: 12,
  lineHeight: 1.1,
  paragraphGap: 1,
  columns: 2,
  columnGap: 9,
};
export function validateOptions(value: ComposeOptions): void {
  for (const key of [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ] as const) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 100)
      throw new Error("Margins must be between 0 and 100 points.");
  }
  if (!Number.isFinite(value.size) || value.size < 6 || value.size > 32)
    throw new Error("Text size must be between 6 and 32 points.");
  if (
    !Number.isFinite(value.lineHeight) ||
    value.lineHeight < 1 ||
    value.lineHeight > 3
  )
    throw new Error("Line height must be between 1 and 3.");
  if (
    !Number.isFinite(value.paragraphGap) ||
    value.paragraphGap < 0 ||
    value.paragraphGap > 50
  )
    throw new Error("Paragraph spacing must be between 0 and 50 points.");
  if (![1, 2, 3].includes(value.columns))
    throw new Error("Choose 1, 2 or 3 columns.");
  if (
    !Number.isFinite(value.columnGap) ||
    value.columnGap < 0 ||
    value.columnGap > 72
  )
    throw new Error("Column gap must be between 0 and 72 points.");
}
