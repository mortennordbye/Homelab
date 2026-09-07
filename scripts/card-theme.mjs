// The shared material system for the README's two cards, taken from the
// portfolio's own rule book (portfolio/branding/ART-DIRECTION.md, DECISIONS.md)
// and its shipped tokens (portfolio/src/styles/tokens.css).
//
// Four rules generate everything below, and breaking any one of them is what
// made the previous cards read as a spaceship HUD:
//
//   1. A card is neither an object nor a document, so there are no cards. The
//      SVG is a document lying on the oak desk: full bleed, no border.
//   2. Four materials and no others — warm near-black ground, oak, brass,
//      warm off-white paper. Green is not a material.
//   3. Green appears once per view as a lit point, and it is the dot on the
//      end of the leader label. Never a fill, a border, a line or a glow.
//   4. One lamp, upper left. Highlights on the top and left edges, the rake
//      across the desk, shadow to the lower right. Nothing else emits.
//
// No sans anywhere: serif for display and prose, mono for labels and
// measurements. The real faces are named first and picked up when installed;
// GitHub renders these through camo, where a webfont cannot be fetched, so the
// fallbacks carry the type in practice.

export const SERIF = "'Source Serif 4','Iowan Old Style',Georgia,'Times New Roman',serif";
export const MONO = "'Fragment Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

// The desk is the same oak in both themes, because it is the same desk. Only
// the light on it and the document lying on it change.
const OAK = { oak: "#4a3520", oakDeep: "#241a12", rake: "#ffca8a" };

// The room. The document is the ground itself, read by lamplight.
export const DARK = {
  ...OAK,
  ground: "#0f1410",
  ground2: "#090c0a",
  well: "#4a3520",
  brass: "#7f5a2f",
  copper: "#c09955",
  ink: "#e9ebe9",
  ink2: "#a1ada3",
  ink3: "#708373",
  lamp: "#65a16e",
  key: "#ffd49a",
  litEdge: "rgba(255,212,154,0.11)",
  keyAlpha: 0.05,
  ruling: 0.1,
  grain: 0.16,
};

// The printed version of the same brand: a sheet of paper on that desk. Warm
// off-white and never pure white, because paper in a room lit by one lamp is
// the colour of the lamp.
export const LIGHT = {
  ...OAK,
  ground: "#e8ddc9",
  ground2: "#d9cbb2",
  well: "#cabb9f",
  brass: "#7f5a2f",
  copper: "#956b23",
  ink: "#3a2e1d",
  ink2: "#574733",
  ink3: "#62523c",
  lamp: "#4d7d54",
  key: "#fff3dd",
  litEdge: "rgba(255,255,255,0.55)",
  keyAlpha: 0.5,
  ruling: 0.13,
  grain: 0.1,
};

export const DESK_H = 42;

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const text = (x, y, s, { size = 14, weight = 400, fill, font = SERIF, anchor = "start", track = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  `${anchor === "start" ? "" : ` text-anchor="${anchor}"`}${track ? ` letter-spacing="${track}"` : ""}>${esc(s)}</text>`;

// Mono, small, tracked, uppercase. Engraving: it names things and carries
// measurements, and it never carries a sentence.
export const engraved = (x, y, s, t, { fill, size = 10, anchor = "start" } = {}) =>
  text(x, y, String(s).toUpperCase(), { size, weight: 400, fill: fill ?? t.ink3, font: MONO, anchor, track: 1.5 });

// Mono advances at 0.6em; engraved() tracks every character by a further 1.5.
export const monoW = (s, size) => s.length * size * 0.6 + Math.max(0, s.length - 1) * 1.5;

// A short brass rule that fades out to the right, with a mono label under it.
// Two of these make two unrelated objects read as one instrument, which is the
// whole reason both cards open with one.
export const sectionLabel = (x, y, s, t, { width = 56 } = {}) => `
    <rect x="${x}" y="${y}" width="${width}" height="1.5" fill="url(#brassrule)"/>
    ${engraved(x, y + 20, s, t, { fill: t.ink2, size: 11 })}`;

// The house annotation device, and the only green in the view: a lit dot on
// the thing being named, a hairline leading away from it, and a mono caption
// sitting on the rule. The globe uses it for Oslo; here it names the one live
// figure on each card.
export function leader(x, y, caption, t, { dx = 34, dy = -26, size = 11 } = {}) {
  // The rule runs away from the dot and the caption sits on it, so a leader
  // anchored near the right edge has to mirror or the caption leaves the sheet.
  const dir = dx < 0 ? -1 : 1;
  const ex = x + dx;
  const ey = y + dy;
  const w = monoW(caption, size) + 10;
  return `
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="url(#halo)"/>
    <path d="M${x.toFixed(1)} ${y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} h${(dir * w).toFixed(1)}" fill="none" stroke="${t.brass}" stroke-width="1"/>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${t.lamp}"/>
    ${engraved(ex + dir * 5, ey - 7, caption, t, { fill: t.ink2, size, anchor: dir > 0 ? "start" : "end" })}`;
}

// Reveal is the only motion class the art direction allows for arriving
// content: one direction, one element, around 240ms. The sweep, the blinking
// dot and the self-drawing line that used to be here are named anti-references.
const STYLE = `.reveal{animation:rise .24s cubic-bezier(.2,.7,.3,1) both}
    @keyframes rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`;

// The oak the document rests on. It appears low in the composition, catches
// the rake light from the lamp, and it is the reason the card has a floor.
// The document's contact shadow falls on it, which is the whole difference
// between resting on a surface and hovering over a photograph.
const desk = (t, w, h) => `
  <g>
    <rect x="0" y="${h - DESK_H}" width="${w}" height="${DESK_H}" fill="url(#oak)"/>
    <rect x="0" y="${h - DESK_H}" width="${w}" height="${DESK_H}" filter="url(#woodgrain)" opacity="0.5"/>
    <rect x="0" y="${h - DESK_H}" width="${w}" height="14" fill="url(#contact)"/>
    <rect x="0" y="${h - DESK_H}" width="${w}" height="1" fill="${t.rake}" opacity="0.34"/>
  </g>`;

// The document. Full bleed with no border: depth comes from the material
// change against whatever GitHub's own ground is, from the lamp on the top and
// left edges, and from the desk it stands on.
export function sheet(t, w, h, inner, label, deskText = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <style>${STYLE}</style>
    <linearGradient id="paper" x1="0" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="${t.ground}"/><stop offset="1" stop-color="${t.ground2}"/>
    </linearGradient>
    <radialGradient id="key" cx="0.22" cy="-0.05" r="0.85">
      <stop offset="0" stop-color="${t.key}" stop-opacity="${t.keyAlpha}"/>
      <stop offset="1" stop-color="${t.key}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="oak" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="${t.oak}"/><stop offset="0.55" stop-color="${t.oakDeep}"/>
      <stop offset="1" stop-color="${t.oakDeep}"/>
    </linearGradient>
    <linearGradient id="contact" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0.6"/><stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="brassrule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.brass}"/><stop offset="1" stop-color="${t.brass}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="hairline" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.brass}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${t.brass}" stop-opacity="0.08"/>
    </linearGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="${t.lamp}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${t.lamp}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="ruling" width="14" height="14" patternUnits="userSpaceOnUse">
      <path d="M14 0 V14 M0 14 H14" fill="none" stroke="${t.brass}" stroke-width="0.5" stroke-opacity="${t.ruling}"/>
    </pattern>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0"/></filter>
    <filter id="woodgrain"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.5" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.44  0 0 0 0 0.22  0 0 0 0.11 0"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#paper)"/>
  <rect width="${w}" height="${h}" fill="url(#key)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="${t.grain}"/>
  <path d="M0 0.5 H${w} M0.5 0 V${h}" stroke="${t.litEdge}" stroke-width="1" fill="none"/>
  <g class="reveal">${inner}</g>
  ${desk(t, w, h)}
  ${deskText}
</svg>`;
}
