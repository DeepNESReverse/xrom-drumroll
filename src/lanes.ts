/**
 * What a noise "note" actually is, and how the lanes come out of it.
 *
 * The NES noise channel has no pitch. `$400E`'s low nibble picks one of sixteen
 * LFSR rates out of a table, and that is the whole of what the ROM stores — so
 * the period index is the fact, and everything else on screen is a reading of
 * it. Higher index, slower LFSR, lower-sounding noise.
 */

export const NOISE_PERIOD_COUNT = 16;

/**
 * What each period sounds like, in drum-kit words.
 *
 * An INTERPRETATION, not the ROM's own word — it is the same one
 * `DisAssemble/Battletoads/music/lib/midi.js` exports the noise channel to GM
 * percussion by (`NOISE_DRUM`), so the MIDI file and this view agree about what
 * a period is called. Keep the two in step if either changes.
 */
export const NOISE_DRUM_NAMES: readonly string[] = [
  'hi-hat', // 0
  'hi-hat', // 1
  'hi-hat', // 2
  'pedal hat', // 3
  'open hat', // 4
  'open hat', // 5
  'clap', // 6
  'snare', // 7
  'snare', // 8
  'side stick', // 9
  'high tom', // 10
  'mid tom', // 11
  'mid tom', // 12
  'low tom', // 13
  'floor tom', // 14
  'kick', // 15
];

/** A piece of the kit, as drawn by `DrumIcon`. */
export type DrumKind =
  'kick' | 'snare' | 'sideStick' | 'clap' | 'tom' | 'hatClosed' | 'hatPedal' | 'hatOpen';

/**
 * Which piece each period is drawn as — the same reading `NOISE_DRUM_NAMES` puts
 * into words, so the two can be checked against each other.
 *
 * The four tuned drums share `tom` on purpose: they are one drum at four sizes,
 * and four nearly-identical drawings would ask the reader to tell them apart by
 * a difference that carries no more than the label already does.
 */
export const NOISE_DRUM_KINDS: readonly DrumKind[] = [
  'hatClosed', // 0
  'hatClosed', // 1
  'hatClosed', // 2
  'hatPedal', // 3
  'hatOpen', // 4
  'hatOpen', // 5
  'clap', // 6
  'snare', // 7
  'snare', // 8
  'sideStick', // 9
  'tom', // 10
  'tom', // 11
  'tom', // 12
  'tom', // 13
  'tom', // 14
  'kick', // 15
];

/**
 * A one-hue lightness ramp, dark end first.
 *
 * The period index is ORDINAL — a position in an ordered sequence, not an
 * identity — so by the colour rules it takes one hue in monotone lightness
 * steps, never a hue per lane. The hue is the noise voice's own green, so a
 * drum lane still reads as the same voice it is beside a `PianoRoll`.
 *
 * The steps were generated in OKLCH at the hue of `#008300` and checked with
 * the ordinal validator against this app's panel colour. The dark end stops at
 * L 0.52 rather than going as deep as the band allows: a ramp that reaches the
 * bottom looks better in a swatch strip and loses its lowest lane on screen,
 * where a block is a few pixels tall on a near-black panel.
 */
export const NOISE_RAMP: readonly string[] = [
  '#058004',
  '#099007',
  '#00a100',
  '#02b201',
  '#07c406',
  '#0ed50b',
  '#14e711',
  '#01fa00',
  '#86ff7e',
];

/**
 * `count` steps spread over the ramp, darkest first.
 *
 * Up to FIVE lanes the result passes the ordinal checks outright — every
 * adjacent pair is a visibly different lightness. Past five it cannot: the
 * lightness band does not hold more distinct steps, and no re-stepping changes
 * that. It stays a monotone ramp there, so it still says "this lane is lower
 * than that one" at a glance, but the lane's identity is carried by its
 * POSITION and by the label printed on its own pad — direct labelling, which is
 * a stronger encoding than hue was ever going to be.
 */
export function rampFor(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return [NOISE_RAMP[Math.floor(NOISE_RAMP.length / 2)]];
  const last = NOISE_RAMP.length - 1;
  return Array.from({ length: count }, (_, i) => NOISE_RAMP[Math.round((i * last) / (count - 1))]);
}

/**
 * The lanes a set of hits needs, lowest-sounding first.
 *
 * Descending period index, so left-to-right runs low to high — the same
 * direction a keyboard runs, which is what lets a `DrumRoll` sit under a
 * `PianoRoll` without the reader having to flip their sense of the axis.
 *
 * Only the periods actually used get a lane: all sixteen exist across the
 * game, but one track uses a handful (Arctic Caverns uses five), and sixteen
 * mostly-empty lanes would make those five unreadable.
 */
export function lanesFromHits(hits: readonly { period: number }[]): number[] {
  const present = new Set<number>();
  for (const hit of hits) present.add(hit.period);
  return [...present].sort((a, b) => b - a);
}

/**
 * The four families of the kit, and where each sits on a real one.
 *
 * Colour is by FAMILY rather than by piece, and that is a measured choice: the
 * validator passes four categorical hues under the all-pairs rule (any two
 * lanes can end up side by side) and fails eight — no ordering of eight clears
 * it. Within a family the pieces differ by lightness, which is an ordinal
 * reading and the right one, since a floor tom really is lower than a high tom.
 *
 * Identity is not left to colour anyway: every piece has its own drawing and
 * its own place in the kit, and those are stronger than hue.
 */
export type DrumFamily = 'hats' | 'snares' | 'toms' | 'kick';

export const DRUM_FAMILY_COLORS: Record<DrumFamily, string> = {
  hats: '#008300',
  snares: '#d55181',
  toms: '#c98500',
  kick: '#3987e5',
};

const FAMILY_OF: Record<DrumKind, DrumFamily> = {
  hatClosed: 'hats',
  hatPedal: 'hats',
  hatOpen: 'hats',
  clap: 'snares',
  snare: 'snares',
  sideStick: 'snares',
  tom: 'toms',
  kick: 'kick',
};

export const familyOf = (period: number): DrumFamily =>
  FAMILY_OF[NOISE_DRUM_KINDS[period] ?? 'tom'] ?? 'toms';

/**
 * Where a piece stands when the kit is drawn as a kit.
 *
 * Two rows, as a drummer sees it: cymbals and toms behind, the drums you hit
 * hardest in front. `order` runs left to right within a row, following the
 * usual layout — hats on the left, snare beside them, toms across the middle,
 * kick in the centre front, floor tom to its right.
 *
 * `row` is only where the piece is DRAWN. A falling block still comes down the
 * lane's own column and lands on it, so the columns stay in one order and the
 * arrangement cannot pull a block away from its piece.
 */
export interface KitPlacement {
  row: 0 | 1;
  order: number;
  /** 0..1 within its family — darker for the lower-sounding pieces. */
  shade: number;
}

const PLACEMENTS: Record<number, KitPlacement> = {
  0: { row: 0, order: 0, shade: 1 },
  1: { row: 0, order: 1, shade: 0.85 },
  2: { row: 0, order: 2, shade: 0.7 },
  3: { row: 1, order: 0, shade: 0.55 },
  4: { row: 0, order: 3, shade: 0.4 },
  5: { row: 0, order: 4, shade: 0.25 },
  6: { row: 1, order: 1, shade: 1 },
  7: { row: 1, order: 2, shade: 0.6 },
  8: { row: 1, order: 3, shade: 0.4 },
  9: { row: 1, order: 4, shade: 0.8 },
  10: { row: 0, order: 5, shade: 1 },
  11: { row: 0, order: 6, shade: 0.8 },
  12: { row: 0, order: 7, shade: 0.6 },
  13: { row: 0, order: 8, shade: 0.4 },
  14: { row: 1, order: 6, shade: 0.2 },
  15: { row: 1, order: 5, shade: 0.6 },
};

export const placementOf = (period: number): KitPlacement =>
  PLACEMENTS[period] ?? { row: 1, order: 9, shade: 0.5 };

/** Lighten a family colour towards white by `shade` (1 = the family's own). */
export function shadeOf(color: string, shade: number): string {
  const clamped = Math.max(0, Math.min(1, shade));
  const mix = (1 - clamped) * 0.55;
  const channel = (at: number) => {
    const value = parseInt(color.slice(at, at + 2), 16);
    return Math.round(value + (255 - value) * mix)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The colour a lane is drawn in: its family, shaded by how low it sounds. */
export const colorOfPeriod = (period: number): string =>
  shadeOf(DRUM_FAMILY_COLORS[familyOf(period)], placementOf(period).shade);

/**
 * Which pieces of the kit are heard — mute and solo, one drum at a time.
 *
 * The same desk `MusicPlayer`'s voice mixer is, and deliberately the same rule,
 * because a reader who has learned one must not be surprised by the other:
 * **one piece is never muted and soloed at once** — pressing one releases the
 * other. If such a state is handed in anyway, solo wins.
 *
 * It lives here rather than being shared with that mixer because that one is
 * typed to voices and this one to `$400E` periods — the rule is four lines and
 * duplicating it costs less than a type that means two things.
 */
export interface KitMix {
  muted: readonly number[];
  soloed: readonly number[];
}

export const EMPTY_KIT_MIX: KitMix = { muted: [], soloed: [] };

/** Is this period heard, given the whole kit's state? */
export function isPieceAudible(period: number, mix: KitMix): boolean {
  if (mix.soloed.length > 0) return mix.soloed.includes(period);
  return !mix.muted.includes(period);
}

/**
 * Silenced by SOMEONE ELSE's solo, rather than by its own mute.
 *
 * Worth telling apart on screen: a piece the reader muted should look muted,
 * but one that went quiet because another was soloed has not been touched, and
 * showing it as muted invites them to un-mute a button they never pressed.
 */
export function isPieceSilencedByOthers(period: number, mix: KitMix): boolean {
  return mix.soloed.length > 0 && !mix.soloed.includes(period);
}

const toggle = (list: readonly number[], period: number, on: boolean): number[] =>
  on ? (list.includes(period) ? [...list] : [...list, period]) : list.filter((p) => p !== period);

/** Mute a piece; muting releases its solo. */
export const setPieceMuted = (mix: KitMix, period: number, muted: boolean): KitMix => ({
  muted: toggle(mix.muted, period, muted),
  soloed: muted ? toggle(mix.soloed, period, false) : [...mix.soloed],
});

/** Solo a piece; soloing releases its mute. */
export const setPieceSoloed = (mix: KitMix, period: number, soloed: boolean): KitMix => ({
  muted: soloed ? toggle(mix.muted, period, false) : [...mix.muted],
  soloed: toggle(mix.soloed, period, soloed),
});
