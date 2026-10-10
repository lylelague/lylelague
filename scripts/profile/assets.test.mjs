import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { BUILDERS } from "./build-static.mjs";
import { render, validate } from "./build-stats.mjs";
import { textWidth } from "./svg.mjs";
import { THEMES } from "./theme.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/sample.json", import.meta.url), "utf8"));
const ASSETS = {
  ...Object.fromEntries(Object.entries(BUILDERS).map(([name, build]) => [name, build])),
  stats: (p) => render(fixture, p),
};

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Minimal well-formedness check: every opened tag closes in order.
const balanced = (svg) => {
  const stack = [];
  for (const [, close, name, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z]+)\b[^>]*?(\/?)>/g)) {
    if (selfClose) continue;
    if (!close) stack.push(name);
    else if (stack.pop() !== name) return false;
  }
  return stack.length === 0;
};

for (const [name, build] of Object.entries(ASSETS)) {
  test(`${name}: both themes are well-formed, self-contained SVG`, () => {
    for (const p of Object.values(THEMES)) {
      const svg = build(p);
      assert.ok(svg.startsWith("<svg "), "starts with <svg");
      assert.ok(balanced(svg), "tags balance");
      assert.deepEqual(svg.match(/https?:\/\/[^"\s)]+/g), ["http://www.w3.org/2000/svg"], "no external URLs");
    }
  });

  test(`${name}: light and dark differ only in colors`, () => {
    const strip = (svg, p) =>
      Object.values(p).flat().reduce((s, hex) => s.split(hex).join("#COLOR"), svg);
    assert.equal(strip(build(THEMES.light), THEMES.light), strip(build(THEMES.dark), THEMES.dark));
  });

  test(`${name}: every constrained label fits its box`, () => {
    const svg = build(THEMES.light);
    for (const [, max, size, font, label] of svg.matchAll(/data-max="([\d.]+)" data-size="([\d.]+)" data-font="(\w+)">([^<]*)</g)) {
      const w = textWidth(unescape(label), Number(size), font);
      assert.ok(w <= Number(max), `"${unescape(label)}" is ${w.toFixed(0)} wide, box is ${max}`);
    }
  });
}

test("validate rejects partial data", () => {
  assert.throws(() => validate({ ...fixture, calendar: { total: 1, weeks: [] } }), /only 0 days/);
  assert.throws(() => validate({ ...fixture, repos: [] }), /no repositories/);
  assert.throws(() => validate({ ...fixture, prs: undefined }), /merged PR count/);
  assert.doesNotThrow(() => validate(fixture));
});

test("validate refuses a merged-PR count that went down", () => {
  assert.throws(() => validate({ ...fixture, prs: 4 }, { prs: 765 }), /went down from 765 to 4/);
  assert.doesNotThrow(() => validate({ ...fixture, prs: 765 }, { prs: 765 }));
  assert.doesNotThrow(() => validate(fixture, {}));
});
