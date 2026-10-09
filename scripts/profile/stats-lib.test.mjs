import assert from "node:assert/strict";
import test from "node:test";

import { aggregateLanguages, levels, streaks } from "./stats-lib.mjs";

const run = (counts, end = "2026-10-10") => {
  const last = new Date(`${end}T00:00:00Z`);
  return counts.map((count, i) => {
    const d = new Date(last);
    d.setUTCDate(last.getUTCDate() - (counts.length - 1 - i));
    return { date: d.toISOString().slice(0, 10), count };
  });
};

test("streaks counts the run ending today and the longest run", () => {
  assert.deepEqual(streaks(run([1, 1, 0, 1, 1, 1]), "2026-10-10"), { current: 3, longest: 3 });
  assert.deepEqual(streaks(run([1, 1, 1, 1, 0, 1]), "2026-10-10"), { current: 1, longest: 4 });
});

test("a quiet today does not break the streak until the day is over", () => {
  assert.deepEqual(streaks(run([0, 1, 1, 0]), "2026-10-10"), { current: 2, longest: 2 });
});

test("a missed yesterday ends the current streak", () => {
  assert.deepEqual(streaks(run([1, 1, 0, 0]), "2026-10-10"), { current: 0, longest: 2 });
});

test("streaks of nothing", () => {
  assert.deepEqual(streaks([], "2026-10-10"), { current: 0, longest: 0 });
});

test("aggregateLanguages skips forks and empty repos, keeps top N plus Other", () => {
  const repos = [
    { fork: false, languages: { TypeScript: 600, PHP: 200, CSS: 100 } },
    { fork: false, languages: { TypeScript: 100, Python: 50, Kotlin: 30, Vue: 20, Blade: 10 } },
    { fork: true, languages: { JavaScript: 99999 } },
    { fork: false, languages: {} },
  ];
  const langs = aggregateLanguages(repos, 5);
  assert.deepEqual(langs.map((l) => l.name), ["TypeScript", "PHP", "CSS", "Python", "Kotlin", "Other"]);
  assert.equal(langs.reduce((s, l) => s + l.pct, 0), 100);
});

test("aggregateLanguages with no data", () => {
  assert.deepEqual(aggregateLanguages([{ fork: false, languages: {} }]), []);
});

test("aggregateLanguages omits Other when everything fits", () => {
  const langs = aggregateLanguages([{ fork: false, languages: { TypeScript: 1, PHP: 1, CSS: 1 } }], 5);
  assert.deepEqual(langs.map((l) => l.name).sort(), ["CSS", "PHP", "TypeScript"]);
  assert.equal(langs.reduce((s, l) => s + l.pct, 0), 100);
});

test("levels follow GitHub's quarter-of-max shading", () => {
  assert.deepEqual(levels([0, 1, 25, 26, 50, 51, 75, 76, 100]), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(levels([0, 0]), [0, 0]);
});
