// Builds the stats SVG from live GitHub data. Run daily by .github/workflows/grs.yml.
//   GH_TOKEN=... node scripts/profile/build-stats.mjs [--fixture file.json] [--save-fixture file.json]
// Any fetch or validation failure exits non-zero before writing, so the last good SVG stays.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { aggregateLanguages, streaks } from "./stats-lib.mjs";
import { line, rect, svgDoc, text, textWidth } from "./svg.mjs";
import { PAD, RADIUS, THEMES, WIDTH } from "./theme.mjs";

const LOGIN = process.env.GH_LOGIN || "lylelague";
const API = "https://api.github.com";

const request = async (path, init = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": `${LOGIN}-profile-stats`,
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

const fetchCalendar = async () => {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const body = await request("/graphql", { method: "POST", body: JSON.stringify({ query, variables: { login: LOGIN } }) });
  if (body.errors) throw new Error(`graphql: ${JSON.stringify(body.errors)}`);
  const cal = body.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("graphql: no contribution calendar");
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
};

const fetchRepos = async () => {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await request(`/user/repos?affiliation=owner&per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return Promise.all(
    repos.map(async (r) => ({ fork: r.fork, languages: r.fork ? {} : await request(`/repos/${r.full_name}/languages`) }))
  );
};

const fetchAll = async () => {
  if (!process.env.GH_TOKEN) throw new Error("GH_TOKEN is not set");
  const [calendar, prs, repos] = await Promise.all([
    fetchCalendar(),
    request(`/search/issues?q=${encodeURIComponent(`author:${LOGIN} is:pr is:merged`)}&per_page=1`).then((r) => r.total_count),
    fetchRepos(),
  ]);
  return { calendar, prs, repos };
};

export const validate = ({ calendar, prs, repos }) => {
  const days = calendar?.weeks?.flat() ?? [];
  if (days.length < 300) throw new Error(`calendar has only ${days.length} days`);
  if (!Number.isInteger(calendar.total) || calendar.total < 0) throw new Error("calendar total is invalid");
  if (!Number.isInteger(prs) || prs < 0) throw new Error("merged PR count is invalid");
  if (!repos?.length) throw new Error("no repositories returned");
};

const fmt = (n) => n.toLocaleString("en-US");

export const render = ({ calendar, prs, repos }, p) => {
  const days = calendar.weeks.flat();
  const today = days.at(-1).date;
  const { current, longest } = streaks(days, today);
  const langs = aggregateLanguages(repos, 5);
  const inner = WIDTH - PAD * 2;

  // Sizes are set for phones, where the 840-wide card shows at under half size.
  // The period ("in the last year") lives in the README heading above the card.
  // Row 1: four equal cells, numbers at one size.
  const cellW = inner / 4;
  const cells = [
    { n: fmt(calendar.total), label: "contributions" },
    { n: fmt(current), unit: current === 1 ? "day" : "days", label: "current streak" },
    { n: fmt(longest), unit: longest === 1 ? "day" : "days", label: "longest streak" },
    { n: fmt(prs), label: "PRs merged" },
  ].map((c, i) => {
    const x = PAD + i * cellW + (i ? 16 : 0);
    const nw = textWidth(c.n, 34, "display");
    return (
      (i ? line({ x1: PAD + i * cellW + 0.5, y1: 28, x2: PAD + i * cellW + 0.5, y2: 94, stroke: p.border }) : "") +
      text(c.n, { x, y: 62, size: 34, font: "display", fill: p.fg, max: cellW - 20 - (c.unit ? 6 + textWidth(c.unit, 20, "regular") : 0) }) +
      (c.unit ? text(c.unit, { x: x + nw + 6, y: 62, size: 20, font: "regular", fill: p.muted }) : "") +
      text(c.label, { x, y: 92, size: 22, font: "regular", fill: p.muted, max: cellW - 20 })
    );
  }).join("");

  // Row 2: languages as one bar plus a legend. The year itself is drawn by the snake below.
  // Gaps between segments and outlined swatches keep the light greens distinguishable.
  const barY = 124;
  const swatch = [p.greens[3], p.greens[2], p.greens[1], p.greens[0], p.muted, p.border];
  let bx = PAD;
  const segments = langs.map((l, i) => {
    const w = (l.pct / 100) * inner;
    const seg = rect({ x: +bx.toFixed(2), y: barY, w: +Math.max(0, w - 2).toFixed(2), h: 12, fill: swatch[i] });
    bx += w;
    return seg;
  }).join("");
  const bar =
    `<clipPath id="bar"><rect x="${PAD}" y="${barY}" width="${inner}" height="12" rx="6"/></clipPath>` +
    `<g clip-path="url(#bar)">${segments}</g>`;

  // Legend items flow left to right and wrap onto a new row when the next one won't fit.
  let lx = PAD;
  let ly = barY + 50;
  const legend = langs.map((l, i) => {
    const label = `${l.name} ${l.pct}%`;
    const w = 24 + textWidth(label, 21, "semibold");
    if (lx > PAD && lx + w > WIDTH - PAD) {
      lx = PAD;
      ly += 36;
    }
    const item =
      `<rect x="${lx + 0.5}" y="${ly - 15.5}" width="15" height="15" rx="3" fill="${swatch[i]}" stroke="${p.muted}"/>` +
      text(label, { x: lx + 24, y: ly, size: 21, font: "semibold", fill: p.fg, max: WIDTH - PAD - lx - 24 });
    lx += w + 28;
    return item;
  }).join("");

  const h = ly + 30;
  return svgDoc({
    w: WIDTH, h,
    title: `${fmt(calendar.total)} contributions in the last year, ${current}-day current streak, ${longest}-day longest streak, ${fmt(prs)} pull requests merged`,
    fonts: ["display", "regular", "semibold"],
    body:
      rect({ x: 0.5, y: 0.5, w: WIDTH - 1, h: h - 1, fill: p.subtle, stroke: p.border, r: RADIUS }) +
      cells + bar + legend,
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

  const payload = flag("--fixture") ? JSON.parse(readFileSync(flag("--fixture"), "utf8")) : await fetchAll();
  validate(payload);
  if (flag("--save-fixture")) writeFileSync(flag("--save-fixture"), JSON.stringify(payload) + "\n");

  // Render both before writing either, so a failure never leaves the pair out of sync.
  const out = Object.entries(THEMES).map(([theme, palette]) => [theme, render(payload, palette)]);
  for (const [theme, svg] of out) writeFileSync(new URL(`../../profile/stats-${theme}.svg`, import.meta.url), svg);
  console.log(`stats: ${payload.calendar.total} contributions, ${payload.prs} PRs, ${payload.repos.length} repos`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
