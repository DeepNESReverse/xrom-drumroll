/**
 * A picture for each piece of the kit the noise channel reaches, as SVG markup.
 *
 * Drawn as the instrument rather than a pictogram of it: shells with a finish,
 * mesh heads, chrome hoops, cymbals in bronze — a kit standing in a room
 * rather than a row of symbols. Markup rather than components, so the kit
 * needs no framework: a surface writes each drawing once and only animates it
 * after that.
 *
 * There is no crash, no ride and no percussion triangle: the noise channel is
 * read as hats, snare, side stick, clap, four toms and a kick, and drawing a
 * cymbal the game never plays would be inventing an instrument.
 */

import { NOISE_DRUM_KINDS, type DrumKind } from './lanes.js';

/*
 * The materials, in one place, because a kit is only convincing if every piece
 * is made of the same four things: a stained maple shell, a coated mesh head
 * (never white — white heads on a dark panel glare), chrome, and the cymbal
 * bronze, lighter at the bell than at the edge.
 */
const SHELL_LIT = '#6b3a34';
const SHELL_DARK = '#2a1513';
const HEAD_LIT = '#e6e7ea';
const HEAD_DARK = '#b9bcc5';
const CHROME_LIT = '#e3e5ea';
const CHROME_DARK = '#7d818c';
const BRONZE_LIT = '#f0cf84';
const BRONZE_MID = '#c9963c';
const BRONZE_DARK = '#7c5719';
const HARDWARE = '#9ea2ad';
const WOOD = '#c9a06a';

/** Every gradient the pieces draw with, defined once per drawing. */
const materials = (id: string) => `<defs><linearGradient id="${id}-shell" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${SHELL_DARK}"/><stop offset="0.32" stop-color="${SHELL_LIT}"/><stop offset="0.7" stop-color="#40201c"/><stop offset="1" stop-color="${SHELL_DARK}"/></linearGradient><linearGradient id="${id}-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${HEAD_LIT}"/><stop offset="0.55" stop-color="${HEAD_DARK}"/><stop offset="1" stop-color="#9da1ab"/></linearGradient><linearGradient id="${id}-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${CHROME_LIT}"/><stop offset="0.5" stop-color="${CHROME_DARK}"/><stop offset="1" stop-color="${CHROME_LIT}"/></linearGradient><radialGradient id="${id}-bronze" cx="0.42" cy="0.4" r="0.72"><stop offset="0" stop-color="${BRONZE_LIT}"/><stop offset="0.45" stop-color="${BRONZE_MID}"/><stop offset="1" stop-color="${BRONZE_DARK}"/></radialGradient></defs>`;

/**
 * A drum seen from just above: the head as an ellipse, the shell falling away
 * under it, a hoop and lugs. One drawing for toms, snare and side stick —
 * they are one drum at different depths.
 */
function drum(id: string, cx: number, top: number, rx: number, ry: number, depth: number) {
  const bottom = top + depth;
  const lugs = [-0.62, 0, 0.62]
    .map((at) => `<rect x="${cx + at * rx - 1.1}" y="${top + depth * 0.18}" width="2.2" height="${depth * 0.6}" rx="0.8" fill="url(#${id}-chrome)" opacity="0.75"/>`)
    .join('');
  return (
    `<path d="M${cx - rx},${top} v${depth} a${rx},${ry} 0 0 0 ${rx * 2},0 v${-depth} z" fill="url(#${id}-shell)"/>` +
    lugs +
    `<path d="M${cx - rx},${bottom} a${rx},${ry} 0 0 0 ${rx * 2},0" fill="none" stroke="${CHROME_DARK}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="url(#${id}-head)"/>` +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#${id}-chrome)" stroke-width="1.8"/>`
  );
}

/** A cymbal, seen edge-on-ish, with the bell raised; `tilt` leans it, as a hat's top cymbal sits. */
function cymbal(id: string, cx: number, cy: number, rx: number, tilt = 0, bell = true) {
  const ry = Math.max(1.6, rx * 0.2);
  return (
    `<g${tilt ? ` transform="rotate(${tilt} ${cx} ${cy})"` : ''}>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id}-bronze)"/>` +
    `<path d="M${cx - rx * 0.72},${cy - ry * 0.15} a${rx * 0.72},${ry * 0.8} 0 0 1 ${rx * 1.44},0" fill="none" stroke="${BRONZE_LIT}" stroke-width="0.7" opacity="0.55"/>` +
    (bell ? `<ellipse cx="${cx}" cy="${cy - ry * 0.25}" rx="${rx * 0.2}" ry="${ry * 0.5}" fill="${BRONZE_LIT}"/>` : '') +
    `</g>`
  );
}

/** The rod a hat stands on, with its foot. */
const stand = (id: string, cx: number, from: number, to: number) =>
  `<rect x="${cx - 1}" y="${from}" width="2" height="${to - from}" fill="url(#${id}-chrome)"/>` +
  `<path d="M${cx - 6},${to} h12" stroke="${HARDWARE}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;

/* ---- The clap: two hands meeting, in skin — the one piece that is not a drum. ---- */

const SKIN_BACK = '#e8a294';
const SKIN_BACK_SHADE = '#d98e7f';
const SKIN_FRONT = '#f7d6cb';
const SKIN_FRONT_SHADE = '#eec0b2';
const OUTLINE = '#17121a';
const INK = '#e7e9f0';

/** A finger as a tapered, slightly bent capsule, from the knuckle line at y 9 up `length`. */
function fingerPath(length: number, base: number, tip: number, curve: number): string {
  const b = base / 2;
  const t = tip / 2;
  const top = -length + t;
  const mid = (9 + top) / 2;
  return [
    `M${-b} 9`,
    `C${-b + curve} ${mid} ${-t + curve} ${top + t * 1.2} ${-t + curve} ${top}`,
    `A${t} ${t} 0 0 1 ${t + curve} ${top}`,
    `C${t + curve} ${top + t * 1.2} ${b} ${mid} ${b} 9`,
    'Z',
  ].join(' ');
}

/** Two joint creases across a finger. */
function creases(length: number, base: number, tip: number, curve: number): string[] {
  const knuckle = -5;
  return [0.3, 0.58].map((share) => {
    const width = (base + (tip - base) * share) * 0.5;
    const y = knuckle - (length + knuckle) * share;
    const x = curve * share;
    return `M${x - width / 2} ${y} q ${width / 2} 0.4 ${width} 0`;
  });
}

const PALM = 'M-7.6 -4.5 a5 5 0 0 1 5 -4.5 h5.2 a5 5 0 0 1 5 4.5 v8.5 a5.5 5.5 0 0 1 -5.5 5.5 h-4.4 a5.5 5.5 0 0 1 -5.3 -4 z';

function hand(x: number, y: number, angle: number, scale: number, skin: string, shade: string) {
  const fingers = [
    { at: -4.9, length: 18.5, lean: -10, base: 5, tip: 4, curve: -0.6 },
    { at: -1.7, length: 21, lean: -3, base: 5.2, tip: 4.1, curve: -0.2 },
    { at: 1.7, length: 19.5, lean: 4, base: 5.1, tip: 4, curve: 0.3 },
    { at: 4.9, length: 16, lean: 12, base: 4.6, tip: 3.7, curve: 0.7 },
  ];
  const thin = 0.6 / scale;
  const crease = (d: string) => `<path d="${d}" fill="none" stroke-width="${thin}" opacity="0.42"/>`;
  return (
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" fill="${skin}" stroke="${OUTLINE}" stroke-width="${1.4 / scale}" stroke-linejoin="round" stroke-linecap="round">` +
    `<rect x="-4.6" y="6" width="9.2" height="13" rx="3.4"/>` +
    `<g transform="translate(-4.4 2.5) rotate(-52)"><path d="${fingerPath(13.5, 7.2, 5.8, -1.3)}"/>${crease(creases(13.5, 7.2, 5.8, -1.3)[1])}</g>` +
    fingers
      .map(({ at, length, lean, base, tip, curve }) => `<g transform="translate(${at} 0) rotate(${lean})"><path d="${fingerPath(length, base, tip, curve)}"/>${creases(length, base, tip, curve).map(crease).join('')}</g>`)
      .join('') +
    `<path d="${PALM}" stroke-linejoin="round"/>` +
    `<path d="M-7.6 -1.5 a7.5 7.5 0 0 0 4.4 9.5 h-1 a5.5 5.5 0 0 1 -5.3 -4 z" fill="${shade}" stroke="none"/>` +
    `<path d="${PALM}" fill="none"/>` +
    fingers
      .slice(1)
      .map(({ at, lean }, i) => `<path d="M${(at + fingers[i].at) / 2} -7 v4.5" transform="rotate(${(lean + fingers[i].lean) / 2})" fill="none"/>`)
      .join('') +
    `<path d="M-6.6 -2 a7 7 0 0 0 3.6 8.6" fill="none"/>` +
    `</g>`
  );
}

/**
 * The clap's drawing in parts (`data-part`), so its motion can bring the hands
 * together and the lines of the sound in and out; the lines are not there at
 * rest — a permanent picture of a noise reads as a piece stuck on.
 */
const clapShape = () =>
  `<g data-part="clapLeft" style="transform-box:fill-box;transform-origin:bottom">${hand(17, 23.5, 34, 0.72, SKIN_BACK, SKIN_BACK_SHADE)}</g>` +
  `<g data-part="clapRight" style="transform-box:fill-box;transform-origin:bottom">${hand(29, 30.5, -22, 0.78, SKIN_FRONT, SKIN_FRONT_SHADE)}</g>` +
  `<g data-part="clapSpark" style="opacity:0;transform-box:fill-box;transform-origin:center">` +
  (
    [
      [35, 7, -50],
      [40, 13, -20],
      [41, 21, 6],
      [12, 6, -130],
      [7, 12, -160],
      [6, 20, 174],
    ] as const
  )
    .map(([x, y, angle]) => `<path d="M0 0 5 0" transform="translate(${x} ${y}) rotate(${angle})" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`)
    .join('') +
  `</g>`;

const SHAPES: Record<DrumKind, (id: string) => string> = {
  // The front of a bass drum, port hole and pedal: what makes a kick not a big tom.
  kick: (id) =>
    `<circle cx="24" cy="24" r="16" fill="url(#${id}-shell)"/>` +
    `<circle cx="24" cy="24" r="13.4" fill="url(#${id}-head)"/>` +
    `<circle cx="24" cy="24" r="13.4" fill="none" stroke="url(#${id}-chrome)" stroke-width="2.2"/>` +
    `<ellipse cx="24" cy="28.5" rx="4.2" ry="3.6" fill="#120a09" opacity="0.85"/>` +
    `<path d="M9 34 4 42M39 34l5 8" stroke="${HARDWARE}" stroke-width="1.8" stroke-linecap="round" fill="none"/>` +
    `<path d="M20 41h9l2-3" stroke="${HARDWARE}" stroke-width="1.8" stroke-linecap="round" fill="none"/>` +
    `<rect x="18" y="40" width="11" height="3" rx="1.2" fill="url(#${id}-chrome)"/>`,
  // The shallow drum with its wires — the wires are what tell it from a tom.
  snare: (id) =>
    drum(id, 24, 17, 16, 5.4, 11) +
    `<path d="M10 29.5q14 5 28 0" fill="none" stroke="${CHROME_LIT}" stroke-width="0.9" opacity="0.85"/>` +
    `<path d="M10 27.5q14 5 28 0" fill="none" stroke="${CHROME_LIT}" stroke-width="0.9" opacity="0.6"/>` +
    `<rect x="5.5" y="22" width="4" height="6" rx="1.2" fill="url(#${id}-chrome)"/>`,
  // The same drum, deeper, nothing under it.
  tom: (id) => drum(id, 24, 13, 15, 5, 19),
  // A stick laid across the hoop, tip on the head — never a stick in the air.
  sideStick: (id) =>
    drum(id, 24, 20, 15, 5.2, 10) +
    `<path d="M6 11 33 22.5" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
    `<circle cx="34" cy="23" r="1.9" fill="${WOOD}"/>`,
  clap: () => clapShape(),
  // Closed: the two cymbals meet into one thick edge.
  hatClosed: (id) =>
    stand(id, 24, 6, 42) + cymbal(id, 24, 22, 15, 0, false) + cymbal(id, 24, 19.4, 15) +
    `<rect x="22.4" y="12" width="3.2" height="5" rx="1" fill="url(#${id}-chrome)"/>`,
  // Held shut by the foot, so the pedal is drawn.
  hatPedal: (id) =>
    stand(id, 24, 6, 36) + cymbal(id, 24, 19, 14, 0, false) + cymbal(id, 24, 16.6, 14) +
    `<rect x="22.4" y="9.6" width="3.2" height="5" rx="1" fill="url(#${id}-chrome)"/>` +
    `<path d="M14 42h13l3-4" stroke="${HARDWARE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<rect x="13" y="40.6" width="15" height="3" rx="1.3" fill="url(#${id}-chrome)"/>`,
  // Open: a gap, and the top cymbal leaning off true.
  hatOpen: (id) =>
    stand(id, 24, 6, 42) + cymbal(id, 24, 26, 15, 0, false) + cymbal(id, 24, 15, 15, -7) +
    `<rect x="22.4" y="7.5" width="3.2" height="5" rx="1" fill="url(#${id}-chrome)"/>`,
};

let serial = 0;

/**
 * One piece's drawing as an `<svg>` string, `size` px square. Every call gets
 * gradient ids of its own: a page can show a kit several times, and duplicate
 * ids resolve to whichever came first.
 */
export function drumIcon(kind: DrumKind, size = 44): string {
  const id = `xdr${(serial++).toString(36)}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${materials(id)}${SHAPES[kind](id)}</svg>`;
}

/** The piece a `$400E` period is drawn as; `null` outside 0..15. */
export const drumKindOf = (period: number): DrumKind | null => NOISE_DRUM_KINDS[period] ?? null;
