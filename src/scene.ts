// A shared, format-independent vector scene. Coordinates use points, origin top-left.
export type Draw =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }
  | {
      type: "line";
      x: number;
      y: number;
      x2: number;
      y2: number;
      width: number;
      color: string;
      round?: boolean;
    }
  | {
      type: "glyph";
      path: string;
      x: number;
      y: number;
      scale: number;
      angle: number;
      color: string;
      bold?: boolean;
      italic?: boolean;
    };
