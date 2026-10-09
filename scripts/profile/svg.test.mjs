import assert from "node:assert/strict";
import test from "node:test";

import { fontFaces } from "./font.mjs";
import { esc, icon, svgDoc, text, textWidth } from "./svg.mjs";
import { THEMES } from "./theme.mjs";

test("esc escapes XML specials", () => {
  assert.equal(esc(`<a&"b'>`), "&lt;a&amp;&quot;b&apos;&gt;");
});

test("svgDoc sets the viewBox and carries no external URLs", () => {
  const doc = svgDoc({ w: 840, h: 100, title: "T", fonts: ["regular"], body: "" });
  assert.match(doc, /^<svg /);
  assert.match(doc, /viewBox="0 0 840 100"/);
  assert.deepEqual(doc.match(/https?:\/\/[^"\s)]+/g), ["http://www.w3.org/2000/svg"]);
});

test("fontFaces embeds only the requested faces", () => {
  const css = fontFaces(["semibold"]);
  assert.match(css, /font-family:MonaS/);
  assert.match(css, /data:font\/woff2;base64,/);
  assert.doesNotMatch(css, /MonaR|MonaD/);
});

test("icon scales a vendored path to the requested size", () => {
  const svg = icon("react", { x: 10, y: 20, size: 48, fill: "#000" });
  assert.match(svg, /<path /);
  assert.match(svg, /translate\(10 20\) scale\(2\)/);
});

test("icon rejects unknown names", () => {
  assert.throws(() => icon("nope", { x: 0, y: 0, size: 24, fill: "#000" }), /unknown icon/);
});

test("textWidth grows with size and length", () => {
  const a = textWidth("Lyle", 20, "regular");
  assert.ok(a > 0);
  assert.ok(textWidth("Lyle", 40, "regular") > a * 1.9);
  assert.ok(textWidth("Lyle Lague", 20, "regular") > a);
});

test("text records its width budget for the overflow check", () => {
  const t = text("Hello", { x: 0, y: 0, size: 16, font: "semibold", fill: "#000", max: 100 });
  assert.match(t, /data-max="100"/);
  assert.match(t, /class="s"/);
});

test("both themes define the same tokens", () => {
  assert.deepEqual(Object.keys(THEMES.light).sort(), Object.keys(THEMES.dark).sort());
  assert.equal(THEMES.light.greens.length, 4);
});
