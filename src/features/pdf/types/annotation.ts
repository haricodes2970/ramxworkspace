export type AnnotationType =
  | "highlight"
  | "underline"
  | "strikeout"
  | "draw"
  | "text"
  | "note";

export type AnnotationTool =
  | "select"
  | "highlight"
  | "underline"
  | "strikeout"
  | "pen"
  | "text"
  | "note";

export type FractionRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FractionPoint = {
  x: number;
  y: number;
};

type AnnotationBase = {
  id: string;
  type: AnnotationType;
  page: number;
  color: string;
};

export type RectAnnotation = AnnotationBase & {
  type: "highlight" | "underline" | "strikeout";
  rects: FractionRect[];
};

export type DrawAnnotation = AnnotationBase & {
  type: "draw";
  points: FractionPoint[];
  strokeWidth: number;
};

export type TextAnnotation = AnnotationBase & {
  type: "text";
  position: FractionPoint;
  content: string;
  fontSize: number;
};

export type NoteAnnotation = AnnotationBase & {
  type: "note";
  position: FractionPoint;
  content: string;
};

export type Annotation =
  | RectAnnotation
  | DrawAnnotation
  | TextAnnotation
  | NoteAnnotation;

export type AnnotationsByPage = Record<number, Annotation[]>;

export const DEFAULT_COLORS: Record<AnnotationType, string> = {
  highlight: "#f5c518",
  underline: "#1a73e8",
  strikeout: "#d93025",
  draw: "#d93025",
  text: "#111111",
  note: "#f5c518",
};
