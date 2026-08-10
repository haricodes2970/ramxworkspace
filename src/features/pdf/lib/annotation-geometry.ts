import type {
  FractionPoint,
  FractionRect,
} from "@/features/pdf/types/annotation";

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
