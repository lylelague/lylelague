import { readFileSync } from "node:fs";

// SVGs shown through <img> can't fetch fonts, so the subset WOFF2s are inlined.
const FACES = {
  regular: { family: "MonaR", file: "mona-regular", cls: "r" },
  semibold: { family: "MonaS", file: "mona-semibold", cls: "s" },
  display: { family: "MonaD", file: "mona-expanded-extrabold", cls: "d" },
};

const FALLBACK = `-apple-system,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;

const base64 = (file) =>
  readFileSync(new URL(`./fonts/${file}.woff2`, import.meta.url)).toString("base64");

export const fontFaces = (names) =>
  names
    .map((name) => {
      const { family, file, cls } = FACES[name];
      return (
        `@font-face{font-family:${family};src:url(data:font/woff2;base64,${base64(file)}) format("woff2")}` +
        `.${cls}{font-family:${family},${FALLBACK}}`
      );
    })
    .join("");

export const FACE_CLASS = Object.fromEntries(Object.entries(FACES).map(([k, v]) => [k, v.cls]));
export const FACE_FILE = Object.fromEntries(Object.entries(FACES).map(([k, v]) => [k, v.file]));
