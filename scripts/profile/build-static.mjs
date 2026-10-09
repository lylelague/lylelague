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
  const h = 220;
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
      text("Lyle Lague", { x: 32, y: 100, size: 64, font: "display", fill: p.fg, max: textMax }) +
      text("Full-stack developer", { x: 34, y: 148, size: 26, font: "regular", fill: p.muted, max: textMax }) +
      text("Iloilo, Philippines", { x: 34, y: 182, size: 26, font: "regular", fill: p.muted, max: textMax }) +
      cells,
  });
};

const SERVICES = [
  { icon: "browser-24", name: "Web apps", desc: "Dashboards, portals and records systems", stack: "Next.js, Laravel, Supabase" },
  { icon: "device-mobile-24", name: "Mobile apps", desc: "Android and iOS apps for teams and customers", stack: "React Native, Expo, Kotlin" },
  { icon: "server-24", name: "Backend & APIs", desc: "APIs, databases, auth and integrations", stack: "Laravel, Express, PostgreSQL" },
  { icon: "trophy-24", name: "Event tabulation systems", desc: "Scoring and results for pageants and competitions", stack: "React, Supabase" },
];

// Type sizes are set for phones: an 840-wide SVG shows at under half size there.
export const services = (p) => {
  const row = 128;
  const h = SERVICES.length * row;
  const tx = 76;
  const max = WIDTH - PAD - tx;
  const body = SERVICES.map((s, i) => {
    const y = i * row;
    return (
      (i ? line({ x1: PAD, y1: y + 0.5, x2: WIDTH - PAD, y2: y + 0.5, stroke: p.border }) : "") +
      icon(s.icon, { x: PAD, y: y + 24, size: 32, fill: p.greens[2] }) +
      text(s.name, { x: tx, y: y + 48, size: 28, font: "semibold", fill: p.fg, max }) +
      text(s.desc, { x: tx, y: y + 80, size: 22, font: "regular", fill: p.muted, max }) +
      text(s.stack, { x: tx, y: y + 110, size: 20, font: "semibold", fill: p.greens[3], max })
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
    then: { title: "Day to day", items: [["claude", "Claude Code"]], note: "Anthropic, OpenAI and Google models" },
  },
  {
    title: "Freelance",
    items: [["react", "React"], ["nextdotjs", "Next.js"], ["laravel", "Laravel"], ["inertia", "Inertia"], ["vuedotjs", "Vue"], ["react", "React Native"], ["expo", "Expo"], ["supabase", "Supabase"], ["kotlin", "Kotlin"], ["php", "PHP"]],
  },
];

export const stack = (p) => {
  const colW = (WIDTH - PAD * 2 - PAD) / 2;
  const subW = colW / 2;
  const rowH = 48;
  const headH = 52;

  // One titled group: a heading, items in two sub-columns, then an optional plain note.
  const group = (g, x0, y0) => {
    let out = text(g.title, { x: x0, y: y0 + 28, size: 22, font: "semibold", fill: p.muted, max: colW });
    g.items.forEach(([slug, name], i) => {
      const x = x0 + (i % 2) * subW;
      const y = y0 + headH + Math.floor(i / 2) * rowH;
      out += icon(slug, { x, y, size: 22, fill: p.fg }) + text(name, { x: x + 32, y: y + 18, size: 22, font: "regular", fill: p.fg, max: subW - 36 });
    });
    let bottom = y0 + headH + Math.ceil(g.items.length / 2) * rowH;
    if (g.note) {
      out += text(g.note, { x: x0, y: bottom + 12, size: 20, font: "regular", fill: p.muted, max: colW });
      bottom += 32;
    }
    return { out, bottom };
  };

  let h = 0;
  const columns = STACK.map((col, ci) => {
    const x0 = PAD + ci * (colW + PAD);
    const first = group(col, x0, PAD - 8);
    const second = col.then ? group(col.then, x0, first.bottom + 8) : { out: "", bottom: first.bottom };
    h = Math.max(h, second.bottom + PAD);
    return first.out + second.out;
  }).join("");

  const divider = line({ x1: WIDTH / 2 + 0.5, y1: PAD, x2: WIDTH / 2 + 0.5, y2: h - PAD, stroke: p.border });
  return svgDoc({
    w: WIDTH, h, title: "Tech stack at AI2Aim and for freelance work", fonts: ["semibold", "regular"],
    body: panel(p, h) + columns + divider,
  });
};

const STEPS = ["Brief", "Plan", "Build", "Test", "Launch", "Support"];

export const workflow = (p) => {
  const h = 200;
  const gap = 20;
  const nodeW = (WIDTH - PAD * 2 - gap * (STEPS.length - 1)) / STEPS.length;
  const nodeH = 64;
  const y = 28;
  const xs = STEPS.map((_, i) => PAD + i * (nodeW + gap));
  const mid = y + nodeH / 2;
  const arrow = (x, yy, dir) =>
    dir === "right"
      ? `<path d="M${x} ${yy} l-7 -4.5 v9 z" fill="${p.muted}"/>`
      : `<path d="M${x} ${yy} l-4.5 7 h9 z" fill="${p.greens[2]}"/>`;

  const nodes = STEPS.map((s, i) =>
    rect({ x: xs[i] + 0.5, y: y + 0.5, w: nodeW - 1, h: nodeH - 1, fill: p.canvas, stroke: p.border, r: RADIUS }) +
    text(s, { x: xs[i] + nodeW / 2, y: mid + 8, size: 24, font: "semibold", fill: p.fg, anchor: "middle", max: nodeW - 10 })
  ).join("");

  const links = xs.slice(0, -1).map((x, i) =>
    line({ x1: x + nodeW + 3, y1: mid, x2: xs[i + 1] - 8, y2: mid, stroke: p.muted }) + arrow(xs[i + 1] - 2, mid, "right")
  ).join("");

  // The loop back from Support to Brief: clients' feedback restarts the cycle.
  const loopY = 156;
  const fromX = xs.at(-1) + nodeW / 2;
  const toX = xs[0] + nodeW / 2;
  const loop =
    `<path d="M${fromX} ${y + nodeH} V${loopY} H${toX} V${y + nodeH + 10}" fill="none" stroke="${p.greens[2]}" stroke-width="2" stroke-dasharray="6 5"/>` +
    arrow(toX, y + nodeH + 3, "up") +
    rect({ x: WIDTH / 2 - 64, y: loopY - 16, w: 128, h: 32, fill: p.subtle }) +
    text("feedback", { x: WIDTH / 2, y: loopY + 8, size: 22, font: "regular", fill: p.muted, anchor: "middle", max: 120 });

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
