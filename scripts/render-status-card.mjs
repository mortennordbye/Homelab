// Render the live cluster card for the README from the status payload that
// .github/workflows/status-card.yaml fetches off nordbye.it/api/v1/infra.
//
// The cluster publishes facts and nothing else; the drawing happens here so no
// GitHub credential ever has to live inside the cluster. Reads dist/status.json,
// writes dist/status.svg (light) and dist/status-dark.svg; the workflow
// publishes both to the status-data branch and the README picks a theme with
// <picture>.
//
// A payload marked unreachable renders the "can't see the cluster" card rather
// than redrawing yesterday's numbers, so the card never claims to know more
// than it does.
//
// The materials, the lamp and the one-green-point rule live in card-theme.mjs.
//
// Run locally:  node scripts/render-status-card.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { DARK, DESK_H, LIGHT, MONO, SERIF, engraved, monoW, sectionLabel, sheet, text } from "./card-theme.mjs";

const W = 840;
const M = 48;
const DOWN_H = 220;

const GB = 1000 ** 3;
const GIB = 1024 ** 3;

// Exact, with separators. Rounded-down counts read as marketing; the whole
// number reads as a measurement, which is what it is.
const fmt = (n) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

const gb = (bytes) => (bytes == null ? "—" : `${(bytes / GB).toFixed(2)} GB`);
const gib = (bytes) => (bytes == null ? "—" : `${(bytes / GIB).toFixed(1)} GiB`);

function ago(iso, now) {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const daysUntil = (iso, now) =>
  iso ? Math.round((Date.parse(iso) - now) / 86400000) : null;

const hairline = (y) => `<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="url(#hairline)"/>`;

// A horizontal meter with its own label. Brass on an oak track: this is
// hardware reading a quantity, not a progress bar, so it is a material and
// never a lit colour.
function meter(t, x, y, w, label, used, total, detail) {
  const pct = total ? Math.min(1, used / total) : 0;
  const fill = Math.max(3, w * pct);
  return `
    ${engraved(x, y, label, t, { fill: t.ink2, size: 11 })}
    ${text(x + w, y, `${(pct * 100).toFixed(1)}%`, { size: 12, fill: t.ink2, font: MONO, anchor: "end" })}
    <rect x="${x}" y="${y + 10}" width="${w}" height="6" fill="${t.wood}"/>
    <rect x="${x}" y="${y + 10}" width="${fill.toFixed(1)}" height="6" fill="${t.brass}"/>
    ${text(x, y + 38, detail, { size: 12, fill: t.ink3, font: MONO })}`;
}

// The apps KEDA is allowed to take to zero, set as a printed roster rather
// than as status pills — pills are named in the art direction's list of HUD
// chrome. Awake names take ink, sleeping names fall back to the label ramp.
function roster(t, x, y, label, names, fill) {
  const size = 12;
  const textX = x + 76;
  const maxW = W - M - textX;
  const lines = [[]];
  let w = 0;
  for (const n of names) {
    const adv = monoW(`${n} · `, size);
    if (w > 0 && w + adv > maxW) {
      lines.push([]);
      w = 0;
    }
    lines.at(-1).push(n);
    w += adv;
  }
  const svg = `
    ${engraved(x, y, label, t)}
    ${lines.map((l, i) => text(textX, y + i * 19, l.join(" · "), { size, fill, font: MONO })).join("")}`;
  return { svg, height: lines.length * 19 };
}

// 30 marks, one per day, built from the calendar rather than from the array so
// a day the publisher never ran is a gap rather than a day that vanishes. A
// short mark is a degraded day; the scale is read against its own baseline.
function strip(t, x, y, w, history, now) {
  const byDay = new Map((history ?? []).map((h) => [h.d, h]));
  const pitch = w / 30;
  const barW = 4;
  const full = 18;
  let ok = 0;
  let total = 0;
  const bars = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10);
    const e = byDay.get(d);
    const cx = x + i * pitch;
    if (!e || !e.total) return "";
    ok += e.ok;
    total += e.total;
    const ratio = e.ok / e.total;
    const h = ratio >= 0.995 ? full : Math.max(5, full * (0.35 + 0.6 * ratio));
    // A degraded day is less of the same brass, never a second colour: the
    // sage ink step reads as green, and green is spent on the lamp.
    return `<rect x="${cx.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${t.brass}" fill-opacity="${ratio >= 0.995 ? 1 : 0.45}"/>`;
  }).join("");
  const pct = total ? ((ok / total) * 100).toFixed(2) : null;
  return {
    svg: `${bars}<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="url(#hairline)"/>`,
    pct,
  };
}

function render(t, s, now) {
  const nodes = s.nodes ?? {};
  const apps = s.gitops?.applications ?? {};
  const res = s.resources ?? {};
  const sec = s.security ?? {};
  const obs = s.observability ?? {};
  const allSynced = apps.total && apps.synced === apps.total && apps.healthy === apps.total;
  const nodesOk = nodes.ready === nodes.total;
  const stale = now - Date.parse(s.generatedAt) > 30 * 60000;

  const headline = [
    ["applications", apps.total ? `${apps.synced}/${apps.total}` : "—", allSynced ? "synced · healthy" : "synced"],
    ["nodes ready", nodes.total ? `${nodes.ready}/${nodes.total}` : "—", `${res.uptimeDays ?? "—"}d since boot`],
    ["pods running", fmt(res.podsRunning), `${res.images ?? "—"} distinct images`],
    ["critical alerts", fmt(obs.alerts?.critical), `${fmt(res.restarts24h)} restarts in 24h`],
  ];

  const colW = (W - 2 * M) / headline.length;
  const measurements = headline
    .map(([label, value, sub], i) => {
      const x = M + i * colW;
      return `${text(x, 122, value, { size: 30, weight: 600, fill: t.ink, font: SERIF })}
        ${engraved(x, 144, label, t)}
        ${text(x, 161, sub, { size: 12, fill: t.ink3, font: MONO })}`;
    })
    .join("");

  const cpu = res.cpu ?? {};
  const mem = res.memory ?? {};
  const meters = `
    ${meter(t, M, 214, 340, "cpu", cpu.used, cpu.allocatable, `${(cpu.used ?? 0).toFixed(2)} of ${(cpu.allocatable ?? 0).toFixed(2)} cores`)}
    ${meter(t, 452, 214, 340, "memory", mem.usedBytes, mem.allocatableBytes, `${gib(mem.usedBytes)} of ${gib(mem.allocatableBytes)}`)}`;

  const tiles = s.apps?.tiles ?? [];
  const awake = roster(t, M, 322, "awake", tiles.filter((a) => a.state !== "asleep").map((a) => a.name), t.ink2);
  const asleepY = 322 + awake.height + 8;
  const asleep = roster(t, M, asleepY, "asleep", tiles.filter((a) => a.state === "asleep").map((a) => a.name), t.ink3);

  const factsY = asleepY + asleep.height + 42;
  const certDays = daysUntil(sec.certs?.nextExpiry, now);
  const facts = [
    [`${sec.secretsAtRuntime ?? "—"} secrets at runtime`, `${sec.secretsInGit ?? 0} in git`],
    [`${fmt(sec.syscalls24h)} syscalls`, "inspected by falco, last 24h"],
    [`${gb(obs.logBytes24h)} of logs`, "shipped to loki, last 24h"],
    [`${sec.networkPolicies ?? "—"} network policies`, sec.policyMode === "audit" ? "audit mode, not enforcing" : "enforcing"],
    [`${s.storage?.claimedGiB ?? "—"} GiB claimed`, `across ${s.storage?.volumes ?? "—"} volumes`],
    [certDays == null ? "cert —" : `cert renews in ${certDays}d`, `${s.gitops?.syncs30d ?? "—"} syncs in 30 days`],
  ];
  const factW = (W - 2 * M) / 3;
  const factRows = facts
    .map(([head, sub], i) => {
      const x = M + (i % 3) * factW;
      const y = factsY + Math.floor(i / 3) * 38;
      return `${text(x, y, head, { size: 14, fill: t.ink2, font: SERIF })}
        ${text(x, y + 17, sub, { size: 12, fill: t.ink3, font: MONO })}`;
    })
    .join("");

  const stripY = factsY + 110;
  const bars = strip(t, M, stripY, 330, s.history, now);
  const last = s.gitops?.lastSync ?? {};
  const height = stripY + 78;

  return {
    height,
    svg: `
    ${sectionLabel(M, 36, stale ? "cluster · stale" : "cluster · live", t, { lit: !stale })}
    ${text(W - M, 56, `${s.versions?.talos ?? "—"} talos · ${s.versions?.kubernetes ?? "—"} kubernetes`, { size: 12, fill: t.ink3, font: MONO, anchor: "end" })}
    ${measurements}
    ${hairline(186)}
    ${meters}
    ${hairline(288)}
    ${awake.svg}
    ${asleep.svg}
    ${text(W - M, asleepY, "keda · the next request wakes them", { size: 12, fill: t.ink3, font: MONO, anchor: "end" })}
    ${hairline(factsY - 26)}
    ${factRows}
    ${bars.svg}
    ${engraved(M, stripY + 20, `last 30 days${bars.pct ? ` · ${bars.pct}%` : ""}`, t)}
    ${text(W - M, stripY - 6, `last deploy · ${last.name ?? "—"} · ${ago(last.at, now)}`, { size: 12, fill: t.ink3, font: MONO, anchor: "end" })}`,
    desk: engraved(M, height - DESK_H + 26, `kubernetes api and prometheus · read in cluster ${(s.generatedAt ?? "").replace("T", " ")}`, t, { fill: t.copper }),
  };
}

// The cluster didn't answer. Say that, and say when it last did.
function renderUnreachable(t, s, now) {
  return {
    height: DOWN_H,
    svg: `
    ${sectionLabel(M, 36, "cluster · unreachable", t, { lit: false })}
    ${text(M, 116, "No answer from the cluster", { size: 30, weight: 600, fill: t.ink, font: SERIF })}
    ${text(M, 144, s.lastSeen ? `Last seen ${ago(s.lastSeen, now)}. The numbers below are from then.` : "No earlier reading to fall back on.", { size: 15, fill: t.ink2, font: SERIF })}
    ${s.lastSeen ? text(M, 170, `${s.gitops?.applications?.synced ?? "—"}/${s.gitops?.applications?.total ?? "—"} applications synced · ${s.nodes?.ready ?? "—"}/${s.nodes?.total ?? "—"} nodes ready`, { size: 12, fill: t.ink3, font: MONO }) : ""}`,
    desk: engraved(M, DOWN_H - DESK_H + 26, "nordbye.it/api/v1/infra · no answer", t, { fill: t.copper }),
  };
}

const src = JSON.parse(readFileSync("dist/status.json", "utf8"));
const now = Date.now();
const down = Boolean(src.unreachable);
const label = down ? "Cluster unreachable" : "Live cluster status";

for (const [name, t] of [["dist/status.svg", LIGHT], ["dist/status-dark.svg", DARK]]) {
  const { svg, height, desk } = down ? renderUnreachable(t, src, now) : render(t, src, now);
  writeFileSync(name, sheet(t, W, height, svg, label, desk));
}

console.log(
  down
    ? "✓ unreachable card → dist/status.svg, dist/status-dark.svg"
    : `✓ ${src.gitops?.applications?.synced}/${src.gitops?.applications?.total} apps, ${src.apps?.asleep} asleep → dist/status.svg, dist/status-dark.svg`,
);
