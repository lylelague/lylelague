// Builds the SVGs that only change when the copy does: header, services, stack, workflow.
//   node scripts/profile/build-static.mjs
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { icon, line, rect, svgDoc, text } from "./svg.mjs";
import { PAD, RADIUS, THEMES, WIDTH } from "./theme.mjs";

const panel = (p, h) => rect({ x: 0.5, y: 0.5, w: WIDTH - 1, h: h - 1, fill: p.subtle, stroke: p.border, r: RADIUS });

// Small seeded PRNG so the header pattern is identical on every build.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const header = (p) => {
  const h = 200;
  const cols = 13;
  const rows = 7;
  const cell = 13;
  const step = 17;
  const gridX = WIDTH - 32 - (cols * step - (step - cell));
  const gridY = Math.round((h - (rows * step - (step - cell))) / 2);
  const rand = seeded(8);
  const colors = [p.empty, ...p.greens];

  // A fixed pattern that brightens left to right, like a graph filling up.
  let cells = "";
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const level = Math.max(0, Math.min(4, Math.round((c * 4) / (cols - 1) + (rand() - 0.5) * 1.8)));
      cells += rect({ x: gridX + c * step, y: gridY + r * step, w: cell, h: cell, fill: colors[level], r: 2 });
    }
  }

  const textMax = gridX - 32 - 40;
  return svgDoc({
    w: WIDTH, h, title: "Lyle Lague, full-stack developer in Iloilo, Philippines", fonts: ["display", "regular"],
    body:
      panel(p, h) +
      text("Lyle Lague", { x: 32, y: 104, size: 60, font: "display", fill: p.fg, max: textMax }) +
      text("Full-stack developer in Iloilo, Philippines", { x: 34, y: 144, size: 21, font: "regular", fill: p.muted, max: textMax }) +
      cells,
  });
};

const SERVICES = [
  { icon: "browser-24", name: "Web apps", desc: "Dashboards, portals and records systems", stack: "Next.js, Laravel, Supabase" },
  { icon: "device-mobile-24", name: "Mobile apps", desc: "Android and iOS apps for teams and customers", stack: "React Native, Expo, Kotlin" },
  { icon: "server-24", name: "Backend & APIs", desc: "APIs, databases, auth and integrations", stack: "Laravel, Express, PostgreSQL" },
  { icon: "trophy-24", name: "Event tabulation systems", desc: "Scoring and results for pageants and competitions", stack: "React, Supabase" },
];

export const services = (p) => {
  const row = 92;
  const h = SERVICES.length * row;
  const body = SERVICES.map((s, i) => {
    const y = i * row;
    return (
      (i ? line({ x1: PAD, y1: y + 0.5, x2: WIDTH - PAD, y2: y + 0.5, stroke: p.border }) : "") +
      icon(s.icon, { x: PAD, y: y + 30, size: 24, fill: p.greens[2] }) +
      text(s.name, { x: 64, y: y + 41, size: 22, font: "semibold", fill: p.fg, max: 420 }) +
      text(s.desc, { x: 64, y: y + 68, size: 17, font: "regular", fill: p.muted, max: 440 }) +
      text(s.stack, { x: WIDTH - PAD, y: y + 51, size: 16, font: "semibold", fill: p.muted, anchor: "end", max: 260 })
    );
  }).join("");
  return svgDoc({
    w: WIDTH, h, title: "Services: web apps, mobile apps, backend and APIs, event tabulation systems",
    fonts: ["semibold", "regular"], body: panel(p, h) + body,
  });
};

const STACK = [
  {
    title: "At AI2Aim, on AWS",
    items: [["typescript", "TypeScript"], ["express", "Express"], ["sequelize", "Sequelize"], ["postgresql", "PostgreSQL"], ["react", "React"], ["nextdotjs", "Next.js"]],
  },
  {
    title: "Freelance",
    items: [["react", "React"], ["nextdotjs", "Next.js"], ["laravel", "Laravel"], ["inertia", "Inertia"], ["vuedotjs", "Vue"], ["react", "React Native"], ["expo", "Expo"], ["supabase", "Supabase"], ["kotlin", "Kotlin"], ["php", "PHP"]],
  },
];

export const stack = (p) => {
  const colW = (WIDTH - PAD * 2 - PAD) / 2;
  const subW = colW / 2;
  const rowH = 40;
  const top = 64;
  const rows = Math.max(...STACK.map((c) => Math.ceil(c.items.length / 2)));
  const footerY = top + rows * rowH + 12;
  const h = footerY + 64;

  const columns = STACK.map((col, ci) => {
    const x0 = PAD + ci * (colW + PAD);
    const items = col.items.map(([slug, name], i) => {
      const x = x0 + (i % 2) * subW;
      const y = top + Math.floor(i / 2) * rowH;
      return icon(slug, { x, y, size: 20, fill: p.fg }) + text(name, { x: x + 30, y: y + 16, size: 18, font: "regular", fill: p.fg, max: subW - 38 });
    }).join("");
    return text(col.title, { x: x0, y: 40, size: 17, font: "semibold", fill: p.muted, max: colW }) + items;
  }).join("");

  const divider = line({ x1: WIDTH / 2 + 0.5, y1: PAD, x2: WIDTH / 2 + 0.5, y2: footerY - 12, stroke: p.border });
  const footer =
    line({ x1: PAD, y1: footerY + 0.5, x2: WIDTH - PAD, y2: footerY + 0.5, stroke: p.border }) +
    icon("claude", { x: PAD, y: footerY + 22, size: 20, fill: p.fg }) +
    text("Claude Code, with models from Anthropic, OpenAI and Google", { x: PAD + 30, y: footerY + 38, size: 17, font: "regular", fill: p.fg, max: WIDTH - PAD * 2 - 30 });

  return svgDoc({
    w: WIDTH, h, title: "Tech stack at AI2Aim and for freelance work", fonts: ["semibold", "regular"],
    body: panel(p, h) + columns + divider + footer,
  });
};

const STEPS = ["Brief", "Plan", "Build", "Test", "Launch", "Support"];

export const workflow = (p) => {
  const h = 184;
  const nodeW = 108;
  const nodeH = 56;
  const y = 28;
  const gap = (WIDTH - PAD * 2 - STEPS.length * nodeW) / (STEPS.length - 1);
  const xs = STEPS.map((_, i) => PAD + i * (nodeW + gap));
  const mid = y + nodeH / 2;
  const arrow = (x, yy, dir) =>
    dir === "right"
      ? `<path d="M${x} ${yy} l-7 -4.5 v9 z" fill="${p.muted}"/>`
      : `<path d="M${x} ${yy} l-4.5 7 h9 z" fill="${p.greens[2]}"/>`;

  const nodes = STEPS.map((s, i) =>
    rect({ x: xs[i] + 0.5, y: y + 0.5, w: nodeW - 1, h: nodeH - 1, fill: p.canvas, stroke: p.border, r: RADIUS }) +
    text(s, { x: xs[i] + nodeW / 2, y: mid + 7, size: 19, font: "semibold", fill: p.fg, anchor: "middle", max: nodeW - 16 })
  ).join("");

  const links = xs.slice(0, -1).map((x, i) =>
    line({ x1: x + nodeW + 4, y1: mid, x2: xs[i + 1] - 9, y2: mid, stroke: p.muted }) + arrow(xs[i + 1] - 3, mid, "right")
  ).join("");

  // The loop back from Support to Brief: clients' feedback restarts the cycle.
  const loopY = 142;
  const fromX = xs.at(-1) + nodeW / 2;
  const toX = xs[0] + nodeW / 2;
  const label = "feedback";
  const loop =
    `<path d="M${fromX} ${y + nodeH} V${loopY} H${toX} V${y + nodeH + 10}" fill="none" stroke="${p.greens[2]}" stroke-width="1.5" stroke-dasharray="5 4"/>` +
    arrow(toX, y + nodeH + 3, "up") +
    rect({ x: WIDTH / 2 - 48, y: loopY - 12, w: 96, h: 24, fill: p.subtle }) +
    text(label, { x: WIDTH / 2, y: loopY + 5, size: 16, font: "regular", fill: p.muted, anchor: "middle", max: 96 });

  return svgDoc({
    w: WIDTH, h, title: "How a project runs: Brief, Plan, Build, Test, Launch, Support, then feedback back to Brief",
    fonts: ["semibold", "regular"], body: panel(p, h) + links + nodes + loop,
  });
};

export const BUILDERS = { header, services, stack, workflow };

const main = () => {
  for (const [name, build] of Object.entries(BUILDERS)) {
    for (const [theme, palette] of Object.entries(THEMES)) {
      writeFileSync(new URL(`../../profile/${name}-${theme}.svg`, import.meta.url), build(palette));
    }
  }
  console.log(`wrote ${Object.keys(BUILDERS).length * 2} SVGs`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
