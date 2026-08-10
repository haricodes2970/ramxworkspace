import type {
  Annotation,
  FractionPoint,
  FractionRect,
} from "@/features/pdf/types/annotation";

export type PageRotation = 0 | 90 | 180 | 270;

export function fractionRectFromClientRect(
  rect: DOMRect,
  container: DOMRect,
): FractionRect {
  return {
    x: (rect.left - container.left) / container.width,
    y: (rect.top - container.top) / container.height,
    w: rect.width / container.width,
    h: rect.height / container.height,
  };
}

export function fractionPointFromEvent(
  event: { clientX: number; clientY: number },
  container: DOMRect,
): FractionPoint {
  return {
    x: (event.clientX - container.left) / container.width,
    y: (event.clientY - container.top) / container.height,
  };
}

export function clampFraction(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function clampFractionPoint(point: FractionPoint): FractionPoint {
  return {
    x: clampFraction(point.x),
    y: clampFraction(point.y),
  };
}

export function inverseRotation(rotation: PageRotation): PageRotation {
  return ((360 - rotation) % 360) as PageRotation;
}

export function transformFractionPoint(
  point: FractionPoint,
  rotation: PageRotation,
): FractionPoint {
  if (rotation === 0) return point;
  const { x, y } = point;
  if (rotation === 90) return { x: 1 - y, y: x };
  if (rotation === 180) return { x: 1 - x, y: 1 - y };
  return { x: y, y: 1 - x };
}

export function transformFractionRect(
  rect: FractionRect,
  rotation: PageRotation,
): FractionRect {
  if (rotation === 0) return rect;
  const corners = [
    transformFractionPoint({ x: rect.x, y: rect.y }, rotation),
    transformFractionPoint({ x: rect.x + rect.w, y: rect.y }, rotation),
    transformFractionPoint({ x: rect.x, y: rect.y + rect.h }, rotation),
    transformFractionPoint(
      { x: rect.x + rect.w, y: rect.y + rect.h },
      rotation,
    ),
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const x = clampFraction(Math.min(...xs));
  const y = clampFraction(Math.min(...ys));
  return {
    x,
    y,
    w: clampFraction(Math.max(...xs)) - x,
    h: clampFraction(Math.max(...ys)) - y,
  };
}

export function transformAnnotation(
  annotation: Annotation,
  rotation: PageRotation,
): Annotation {
  if (rotation === 0) return annotation;
  if (annotation.type === "draw") {
    return {
      ...annotation,
      points: annotation.points.map((point) =>
        transformFractionPoint(point, rotation),
      ),
    };
  }
  if (annotation.type === "text" || annotation.type === "note") {
    return {
      ...annotation,
      position: transformFractionPoint(annotation.position, rotation),
    };
  }
  return {
    ...annotation,
    rects: annotation.rects.map((rect) =>
      transformFractionRect(rect, rotation),
    ),
  };
}
