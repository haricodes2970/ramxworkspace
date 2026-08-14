import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTextEditRequest,
  fractionRectsToPdfRects,
  TextEditError,
} from "../src/features/pdf/lib/pdf-edit-request.ts";

const PAGE_W = 612;
const PAGE_H = 792;

test("fractionRectsToPdfRects converts rotation 0 to PDF space (y-up)", () => {
  const pdfRects = fractionRectsToPdfRects(
    [
      {
        x: 72 / PAGE_W,
        y: 40 / PAGE_H,
        w: 60 / PAGE_W,
        h: 16 / PAGE_H,
      },
    ],
    PAGE_W,
    PAGE_H,
    0,
  );
  assert.equal(pdfRects.length, 1);
  const rect = pdfRects[0];
  assert.ok(Math.abs(rect.x0 - 72) < 0.001);
  assert.ok(Math.abs(rect.y1 - 752) < 0.001);
  assert.ok(Math.abs(rect.x1 - 132) < 0.001);
  assert.ok(Math.abs(rect.y0 - 736) < 0.001);
});

test("fractionRectsToPdfRects handles a rotated page", () => {
  const pdfRects = fractionRectsToPdfRects(
    [
      {
        x: 72 / PAGE_W,
        y: 40 / PAGE_H,
        w: 60 / PAGE_W,
        h: 16 / PAGE_H,
      },
    ],
    PAGE_W,
    PAGE_H,
    90,
  );
  const rect = pdfRects[0];
  // 90°: fraction y maps to PDF x, fraction x maps to PDF y
  assert.ok(Math.abs(rect.x0 - (40 / PAGE_H) * PAGE_W) < 0.001);
  assert.ok(Math.abs(rect.x1 - (56 / PAGE_H) * PAGE_W) < 0.001);
  assert.ok(Math.abs(rect.y0 - (72 / PAGE_W) * PAGE_H) < 0.001);
  assert.ok(Math.abs(rect.y1 - (132 / PAGE_W) * PAGE_H) < 0.001);
});

test("fractionRectsToPdfRects converts multiple rectangles", () => {
  const pdfRects = fractionRectsToPdfRects(
    [
      { x: 0.1, y: 0.1, w: 0.2, h: 0.02 },
      { x: 0.1, y: 0.3, w: 0.5, h: 0.02 },
    ],
    PAGE_W,
    PAGE_H,
    0,
  );
  assert.equal(pdfRects.length, 2);
  assert.ok(Math.abs(pdfRects[1].x1 - 0.6 * PAGE_W) < 0.001);
});

test("buildTextEditRequest assembles the service payload", () => {
  const request = buildTextEditRequest(3, "Hello world", "New text", [
    { x0: 72, y0: 60, x1: 131, y1: 76 },
  ]);
  assert.deepEqual(request, {
    page: 3,
    originalText: "Hello world",
    replacementText: "New text",
    rects: [{ x0: 72, y0: 60, x1: 131, y1: 76 }],
  });
});

test("TextEditError carries status and message", () => {
  const error = new TextEditError("Text not found on page 0.", 404);
  assert.equal(error.name, "TextEditError");
  assert.equal(error.status, 404);
  assert.equal(error.message, "Text not found on page 0.");
  assert.ok(error instanceof Error);
});
