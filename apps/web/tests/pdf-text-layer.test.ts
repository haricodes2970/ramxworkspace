import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeScaleX,
  computeTextBox,
  fontAscentRatio,
  resolveFontFamily,
  toPdfTextItem,
  type PdfTextItem,
} from "../src/features/pdf/lib/pdf-text-layer.ts";

const PROBE = {
  str: "Hello world",
  transform: [12, 0, 0, 12, 72, 720],
  width: 59.34,
  height: 12,
  fontName: "g_d0_f1",
} satisfies PdfTextItem;

function viewportFor(
  scale: number,
  rotation: 0 | 90 | 180 | 270,
): {
  transform: number[];
} {
  switch (rotation) {
    case 0:
      return { transform: [scale, 0, 0, -scale, 0, 792 * scale] };
    case 90:
      return { transform: [0, scale, scale, 0, 0, 0] };
    case 180:
      return { transform: [-scale, 0, 0, scale, 612 * scale, 0] };
    case 270:
      return { transform: [0, -scale, -scale, 0, 792 * scale, 612 * scale] };
  }
}

test("12pt horizontal text has font height 12px at scale 1, not 144", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  assert.equal(box.fontHeight, 12);
  assert.notEqual(box.fontHeight, 144);
});

test("probe: PDF 612x792, text at (72,720), visual box left=72 top~62 height~12", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  assert.equal(box.left, 72);
  assert.ok(box.top >= 60 && box.top <= 66, `top was ${box.top}`);
  assert.ok(box.fontHeight >= 11 && box.fontHeight <= 13);
});

test("regression: text box never lands above the page (no negative top)", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  assert.ok(box.top >= 0, `top was ${box.top}`);
});

test("regression: 12pt text span is a small fraction of page height (<20%)", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  const fraction = box.fontHeight / 792;
  assert.ok(fraction < 0.03, `fraction was ${fraction}`);
});

test("regression: TextItem.height is never multiplied through the text matrix", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  const brokenFontHeight = Math.abs(
    PROBE.height * PROBE.transform[0] * 1, // old behavior effective scale factor
  );
  assert.equal(box.fontHeight, 12);
  assert.notEqual(box.fontHeight, brokenFontHeight);
});

test("scaleX is derived from target PDF width / measured CSS width", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 0));
  assert.equal(box.textWidth, PROBE.width);
  const measured = 66.7;
  const scaleX = computeScaleX(box.textWidth, measured);
  assert.ok(Math.abs(scaleX - 59.34 / measured) < 1e-9);
  assert.ok(scaleX < 1, `scaleX was ${scaleX}`);
});

test("scaleX guards against zero/garbage measurements", () => {
  assert.equal(computeScaleX(0, 66.7), 1);
  assert.equal(computeScaleX(59.34, 0), 1);
});

test("font height scales linearly with zoom", () => {
  for (const scale of [0.5, 0.75, 1, 1.25, 2]) {
    const box = computeTextBox(PROBE, viewportFor(scale, 0));
    assert.ok(Math.abs(box.fontHeight - 12 * scale) < 0.0001);
    assert.ok(Math.abs(box.left - 72 * scale) < 0.0001);
  }
});

test("axis-aligned width preserved under 180 rotation", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 180));
  assert.equal(box.fontHeight, 12);
  assert.ok(Math.abs(box.textWidth - PROBE.width) < 0.0001);
  assert.ok(box.top >= 0);
});

test("90 rotation: rotated text run keeps font height and swaps bbox axes", () => {
  const box = computeTextBox(PROBE, viewportFor(1, 90));
  assert.equal(box.fontHeight, 12);
  assert.ok(box.textWidth > 0, "rotated text still has horizontal extent");
});

test("fontName is preserved from PDF.js text items", () => {
  const mapped = toPdfTextItem(PROBE, {
    g_d0_f1: { fontFamily: "sans-serif", ascent: 0.718 },
  });
  assert.equal(mapped.fontName, "g_d0_f1");
  assert.equal(mapped.fontFamily, "sans-serif");
  assert.equal(mapped.ascent, 0.718);
});

test("font family falls back to sans-serif when styles are missing", () => {
  const mapped = toPdfTextItem(PROBE, null);
  assert.equal(mapped.fontName, "g_d0_f1");
  assert.equal(mapped.fontFamily, undefined);
  assert.equal(resolveFontFamily(mapped), "sans-serif");
});

test("ascent ratio uses measured style ascent, else default 0.8", () => {
  const styled = toPdfTextItem(PROBE, {
    g_d0_f1: { ascent: 0.718 },
  });
  assert.equal(fontAscentRatio(styled), 0.718);
  assert.equal(fontAscentRatio(toPdfTextItem(PROBE, null)), 0.8);
});

test("ascent-based top: 720 -> ~62-63 for 12pt text at scale 1", () => {
  const styled = toPdfTextItem(PROBE, {
    g_d0_f1: { ascent: 0.718 },
  });
  const box = computeTextBox(styled, viewportFor(1, 0));
  assert.ok(Math.abs(box.top - (72 - 12 * 0.718)) < 0.0001);
});
