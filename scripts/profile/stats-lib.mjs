// Pure stats math, kept apart from fetching so it can be tested on fixed data.

// days: contiguous calendar days, oldest first. Today with no contributions yet
// doesn't break the current streak; the day isn't over.
export const streaks = (days, today) => {
  const counts = days.map((d) => d.count);
  let end = counts.length - 1;
  if (end >= 0 && days[end].date === today && counts[end] === 0) end -= 1;

  let current = 0;
  for (let i = end; i >= 0 && counts[i] > 0; i -= 1) current += 1;

  let longest = 0;
  let run = 0;
  for (const c of counts) {
    run = c > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current, longest };
};

// Largest-remainder rounding, so the shown percentages always add up to 100.
const percentages = (entries) => {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const raw = entries.map(([name, v]) => ({ name, exact: (v / total) * 100 }));
  const rounded = raw.map((r) => ({ name: r.name, pct: Math.floor(r.exact), rest: r.exact % 1 }));
  let left = 100 - rounded.reduce((s, r) => s + r.pct, 0);
  [...rounded].sort((a, b) => b.rest - a.rest).forEach((r) => {
    if (left > 0) {
      r.pct += 1;
      left -= 1;
    }
  });
  return rounded.map(({ name, pct }) => ({ name, pct }));
};

export const aggregateLanguages = (repos, top = 5) => {
  const bytes = new Map();
  for (const repo of repos) {
    if (repo.fork) continue;
    for (const [name, n] of Object.entries(repo.languages)) bytes.set(name, (bytes.get(name) ?? 0) + n);
  }
  const sorted = [...bytes].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return [];

  const head = sorted.slice(0, top);
  const other = sorted.slice(top).reduce((s, [, n]) => s + n, 0);
  return percentages(other ? [...head, ["Other", other]] : head);
};

// GitHub shades a day by quarters of the busiest day: 0 is empty, then 1-4.
export const levels = (counts) => {
  const max = Math.max(0, ...counts);
  return counts.map((c) => (c <= 0 || !max ? 0 : Math.min(4, Math.max(1, Math.ceil((c * 4) / max)))));
};
