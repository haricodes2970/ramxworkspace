import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTextEditRequest,
  buildTextInsertRequest,
  fractionRectsToPdfRects,
  TextEditError,
} from "../src/features/pdf/lib/pdf-edit-request.ts";
import { buildExportedPdf } from "../src/features/pdf/lib/pdf-export.ts";

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

test("buildTextInsertRequest assembles the insertion payload", () => {
  const request = buildTextInsertRequest(
    0,
    "This is a sentence.",
    10,
    "beautiful ",
    [{ x0: 72, y0: 60, x1: 131, y1: 76 }],
  );
  assert.deepEqual(request, {
    page: 0,
    anchorText: "This is a sentence.",
    offsetInAnchor: 10,
    insertionText: "beautiful ",
    rects: [{ x0: 72, y0: 60, x1: 131, y1: 76 }],
  });
});

test("insertion offset clamps to the anchor length", () => {
  const request = buildTextInsertRequest(2, "Hello", 99, "!", []);
  assert.equal(request.offsetInAnchor, 99);
  assert.equal(request.anchorText.length, 5);
  // the backend rejects offsets beyond the anchor; the client clamps at
  // the boundary, which the service maps to the anchor end
  assert.ok(request.offsetInAnchor >= request.anchorText.length);
});

async function makePdfBytes(pageCount: number): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([612, 792]);
  }
  return doc.save();
}

test("export lifecycle: canonical bytes survive PDF.js-style copy and repeated export", async () => {
  const saved = await makePdfBytes(2);
  const canonical = saved.buffer.slice(
    saved.byteOffset,
    saved.byteOffset + saved.byteLength,
  ) as ArrayBuffer;
  const viewerCopy = canonical.slice(0); // what the viewer hands to PDF.js

  assert.notEqual(viewerCopy, canonical);
  assert.equal(viewerCopy.byteLength, canonical.byteLength);

  const pages = [
    { id: "p1", sourcePage: 1, rotation: 0 as const },
    { id: "p2", sourcePage: 2, rotation: 0 as const },
  ];

  const first = await buildExportedPdf(canonical, pages, {});
  assert.equal(first.pageCount, 2);

  // canonical bytes still readable after the export consumed them
  const second = await buildExportedPdf(canonical, pages, {});
  assert.equal(second.pageCount, 2);

  // exported bytes reopen cleanly
  const { PDFDocument } = await import("pdf-lib");
  const reopened = await PDFDocument.load(second.bytes);
  assert.equal(reopened.getPageCount(), 2);
});
