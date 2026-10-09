import { readFileSync } from "node:fs";

import { FACE_CLASS, FACE_FILE, fontFaces } from "./font.mjs";

const readJson = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const ICONS = readJson("./icons.json");
const METRICS = readJson("./fonts/metrics.json");

export const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

export const svgDoc = ({ w, h, title, fonts, body }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">` +
  `<title>${esc(title)}</title>` +
  `<style>${fontFaces(fonts)}</style>` +
  body +
  `</svg>\n`;

// Measured from the embedded font's advance widths, so layout and the overflow test agree.
export const textWidth = (s, size, font) => {
  const { upm, widths } = METRICS[FACE_FILE[font]];
  const units = [...String(s)].reduce((sum, ch) => sum + (widths[ch] ?? widths["M"]), 0);
  return (units / upm) * size;
};

export const text = (s, { x, y, size, font, fill, anchor = "start", max }) =>
  `<text x="${x}" y="${y}" class="${FACE_CLASS[font]}" font-size="${size}" fill="${fill}"` +
  (anchor === "start" ? "" : ` text-anchor="${anchor}"`) +
  (max ? ` data-max="${max}" data-size="${size}" data-font="${font}"` : "") +
  `>${esc(s)}</text>`;

export const rect = ({ x, y, w, h, fill = "none", stroke, r = 0 }) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"` +
  (r ? ` rx="${r}"` : "") +
  ` fill="${fill}"` +
  (stroke ? ` stroke="${stroke}"` : "") +
  `/>`;

export const line = ({ x1, y1, x2, y2, stroke }) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}"/>`;

export const icon = (name, { x, y, size, fill }) => {
  const glyph = ICONS[name];
  if (!glyph) throw new Error(`unknown icon: ${name}`);
  const box = Number(glyph.viewBox.split(" ")[2]);
  return `<g transform="translate(${x} ${y}) scale(${+(size / box).toFixed(4)})"><path d="${glyph.d}" fill="${fill}"/></g>`;
};
