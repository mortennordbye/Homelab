// Render the star history chart for the README from the stargazer days that
// .github/workflows/star-history.yaml collects.
//
// star-history.com stopped serving this repo's chart ("GitHub restricted access
// to star data"), so the chart is drawn here from our own token's read of our
// own stargazers. Reads dist/stars.json, writes dist/stars.svg (light) and
// dist/stars-dark.svg; the workflow publishes both to the stars-data branch and
// the README picks a theme with <picture>.
//
// The materials, the desk, the lamp and the one-green-point rule live in
// card-theme.mjs.
//
// Run locally:  node scripts/render-star-history.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { DARK, DESK_H, LIGHT, MONO, SERIF, engraved, leader, sectionLabel, sheet, text } from "./card-theme.mjs";

const W = 840;
const H = 360;
const M = 48;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Round the y scale up to a step that reads as a round number, aiming for
// three or four intervals: 289 stars gives 0/100/200/300 rather than a top
// tick of 289.
function niceStep(target) {
  const mag = 10 ** Math.floor(Math.log10(Math.max(target, 1)));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= target) ?? mag * 10;
}

function chart(t, days, total, now) {
  const day = 86400000;
  // Left margin holds the y labels, so the field starts inside the gutter.
  const x0 = 96, chartW = W - x0 - M, base = 278, chartH = 72;
  const t0 = Date.parse(days[0][0]);
  const span = Math.max(now - t0, day);
  const step = niceStep(total / 3);
  const top = Math.ceil(total / step) * step;
  const px = (ts) => x0 + ((ts - t0) / span) * chartW;
  const py = (n) => base - (n / top) * chartH;

  // The ruling is the grid. Drawing gridlines on top of it as well is what
  // turns a plotted sheet back into a dashboard.
  const yLabels = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
    .map((v) => engraved(x0 - 14, py(v) + 3.5, v, t, { anchor: "end" }))
    .join("");

  // One point per day, sampled so the path stays small as the repo ages. The
  // first and last day and the flat run to now always survive.
  const stride = Math.ceil(days.length / 220);
  const pts = [[x0, base]];
  let run = 0;
  days.forEach(([d, c], i) => {
    run += c;
    if (i % stride === 0 || i === days.length - 1) pts.push([px(Date.parse(d)), py(run)]);
  });
  pts.push([x0 + chartW, py(total)]);
  const r = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const line = pts.map(r).join(" ");
  const area = `M${r(pts[0])} L${pts.map(r).join(" L")} L${(x0 + chartW).toFixed(1)},${base} Z`;
  const last = pts.at(-1);

  // Month ticks on the baseline, thinned so the labels never collide.
  const marks = [];
  let m = new Date(t0);
  m = Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1);
  while (m < now) {
    marks.push(m);
    const d = new Date(m);
    m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  const every = Math.ceil(marks.length / 8);
  const axis = marks
    .filter((_, i) => i % every === 0)
    .map((ms) => {
      const d = new Date(ms);
      const x = px(ms);
      const label = d.getUTCMonth() === 0 ? `${MONTHS[0]} ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()];
      return `<line x1="${x.toFixed(1)}" y1="${base}" x2="${x.toFixed(1)}" y2="${base + 5}" stroke="${t.brass}" stroke-opacity="0.5"/>
        ${engraved(x, base + 20, label, t, { anchor: "middle" })}`;
    })
    .join("");

  return `
    ${engraved(M, 190, "cumulative stars", t, { fill: t.ink2, size: 11 })}
    <rect x="${x0}" y="${base - chartH}" width="${chartW}" height="${chartH}" fill="url(#ruling)"/>
    ${yLabels}
    ${axis}
    <line x1="${x0}" y1="${base}" x2="${x0 + chartW}" y2="${base}" stroke="url(#hairline)"/>
    <path d="${area}" fill="url(#area)"/>
    <polyline points="${line}" fill="none" stroke="${t.copper}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${leader(last[0], last[1], `${total} stars today`, t, { dx: -44, dy: -34 })}`;
}

const src = JSON.parse(readFileSync("dist/stars.json", "utf8"));
const days = Object.entries(src.days ?? {}).sort(([a], [b]) => a.localeCompare(b));
if (!days.length) {
  console.error("no star days in dist/stars.json");
  process.exit(1);
}
const total = src.total ?? days.reduce((a, [, n]) => a + n, 0);
const now = Date.parse(src.generatedAt ?? new Date().toISOString());
const day = 86400000;
const first = new Date(Date.parse(days[0][0]));

const since = (n) => {
  const cutoff = new Date(now - n * day).toISOString().slice(0, 10);
  return days.reduce((a, [d, c]) => (d >= cutoff ? a + c : a), 0);
};
const peak = days.reduce((best, e) => (e[1] > best[1] ? e : best));

const measurements = [
  ["total stars", `${total}`],
  ["last 30 days", `+${since(30)}`],
  ["last 7 days", `+${since(7)}`],
  [`peak day · ${Number(peak[0].slice(8, 10))} ${MONTHS[Number(peak[0].slice(5, 7)) - 1]}`, `${peak[1]}`],
];

for (const [name, t] of [["dist/stars.svg", LIGHT], ["dist/stars-dark.svg", DARK]]) {
  const colW = (W - 2 * M) / measurements.length;
  const row = measurements
    .map(([label, val], i) => {
      const x = M + i * colW;
      return `${text(x, 118, val, { size: 32, weight: 600, fill: t.ink, font: SERIF })}
        ${engraved(x, 140, label, t)}`;
    })
    .join("");
  const inner = `
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.well}" stop-opacity="0.55"/><stop offset="1" stop-color="${t.well}" stop-opacity="0"/>
    </linearGradient>
    ${sectionLabel(M, 36, "star history", t)}
    ${text(W - M, 56, `${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()} to today`, { size: 12, fill: t.ink3, font: MONO, anchor: "end" })}
    ${row}
    <line x1="${M}" y1="164" x2="${W - M}" y2="164" stroke="url(#hairline)"/>
    ${chart(t, days, total, now)}`;
  const provenance = engraved(M, H - DESK_H + 26, "github stargazer api · drawn in this repo", t, { fill: t.copper });
  writeFileSync(name, sheet(t, W, H, inner, "Star history", provenance));
}

console.log(`✓ ${total} stars over ${days.length} days → dist/stars.svg, dist/stars-dark.svg`);
