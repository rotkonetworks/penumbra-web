export type DrawingKind = 'horizontal-line' | 'trend-line' | 'rectangle' | 'text';

export interface HorizontalLineDrawing {
  id: string;
  kind: 'horizontal-line';
  price: number;
  color: string;
  createdAt: number;
}

export interface TrendLineDrawing {
  id: string;
  kind: 'trend-line';
  /** Anchor 1 in (time, price) — time is unix seconds. */
  time1: number;
  price1: number;
  /** Anchor 2 in (time, price). */
  time2: number;
  price2: number;
  color: string;
  createdAt: number;
}

export interface RectangleDrawing {
  id: string;
  kind: 'rectangle';
  time1: number;
  price1: number;
  time2: number;
  price2: number;
  color: string;
  createdAt: number;
}

export interface TextDrawing {
  id: string;
  kind: 'text';
  time: number;
  price: number;
  text: string;
  color: string;
  createdAt: number;
}

export type Drawing =
  | HorizontalLineDrawing
  | TrendLineDrawing
  | RectangleDrawing
  | TextDrawing;

export type ToolMode = 'none' | DrawingKind;
