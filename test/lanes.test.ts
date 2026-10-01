import { describe, expect, it } from 'vitest';
import {
  DRUM_FAMILY_COLORS,
  EMPTY_KIT_MIX,
  NOISE_DRUM_KINDS,
  NOISE_DRUM_NAMES,
  NOISE_PERIOD_COUNT,
  NOISE_RAMP,
  colorOfPeriod,
  familyOf,
  isPieceAudible,
  isPieceSilencedByOthers,
  lanesFromHits,
  placementOf,
  rampFor,
  setPieceMuted,
  setPieceSoloed,
  shadeOf,
} from '../src/lanes.js';

describe('NOISE_DRUM_NAMES', () => {
  it('names every one of the sixteen periods', () => {
    expect(NOISE_DRUM_NAMES).toHaveLength(NOISE_PERIOD_COUNT);
    expect(NOISE_DRUM_NAMES.every((name) => name.length > 0)).toBe(true);
  });

  it('runs from the top of the kit to the bottom, as the index does', () => {
    expect(NOISE_DRUM_NAMES[0]).toBe('hi-hat');
    expect(NOISE_DRUM_NAMES[15]).toBe('kick');
  });
});

describe('rampFor', () => {
  it('spans the whole ramp whatever the lane count', () => {
    for (const count of [2, 3, 5, 9, 16]) {
      const ramp = rampFor(count);
      expect(ramp).toHaveLength(count);
      expect(ramp[0]).toBe(NOISE_RAMP[0]);
      expect(ramp.at(-1)).toBe(NOISE_RAMP.at(-1));
    }
  });

  it('stays monotone — a lane is never lighter than one above it', () => {
    const indexOf = (color: string) => NOISE_RAMP.indexOf(color);
    for (const count of [2, 3, 5, 9, 16]) {
      const steps = rampFor(count).map(indexOf);
      expect(steps.every((step, i) => i === 0 || step >= steps[i - 1])).toBe(true);
    }
  });

  it('gives a single lane a middle step rather than an end of the ramp', () => {
    expect(rampFor(1)).toEqual([NOISE_RAMP[4]]);
  });

  it('has nothing to draw for no lanes', () => {
    expect(rampFor(0)).toEqual([]);
  });
});

describe('lanesFromHits', () => {
  it('keeps only the periods used, lowest-sounding first', () => {
    const hits = [{ period: 8 }, { period: 13 }, { period: 8 }, { period: 6 }, { period: 14 }];
    expect(lanesFromHits(hits)).toEqual([14, 13, 8, 6]);
  });

  it('has no lanes for no hits', () => {
    expect(lanesFromHits([])).toEqual([]);
  });
});

describe('NOISE_DRUM_KINDS', () => {
  it('draws every one of the sixteen periods', () => {
    expect(NOISE_DRUM_KINDS).toHaveLength(NOISE_PERIOD_COUNT);
  });

  it('agrees with the names — a period called a tom is drawn as one', () => {
    const expected: Record<string, string> = {
      'hi-hat': 'hatClosed',
      'pedal hat': 'hatPedal',
      'open hat': 'hatOpen',
      clap: 'clap',
      snare: 'snare',
      'side stick': 'sideStick',
      kick: 'kick',
    };
    NOISE_DRUM_NAMES.forEach((name, period) => {
      const kind = expected[name] ?? (name.endsWith('tom') ? 'tom' : null);
      expect(kind, `period ${period} (${name})`).not.toBeNull();
      expect(NOISE_DRUM_KINDS[period], `period ${period} (${name})`).toBe(kind);
    });
  });

  it('has no piece the game never reaches — no crash, no ride, no triangle', () => {
    const drawn = new Set(NOISE_DRUM_KINDS);
    expect(drawn.has('crash' as never)).toBe(false);
    expect(drawn.has('ride' as never)).toBe(false);
    expect([...drawn].sort()).toEqual([
      'clap',
      'hatClosed',
      'hatOpen',
      'hatPedal',
      'kick',
      'sideStick',
      'snare',
      'tom',
    ]);
  });
});

describe('the kit arrangement', () => {
  const periods = Array.from({ length: NOISE_PERIOD_COUNT }, (_, i) => i);

  it('puts every piece in a family, and every family has a colour', () => {
    for (const period of periods) {
      const family = familyOf(period);
      expect(DRUM_FAMILY_COLORS[family], `period ${period}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('groups the families the way the names do', () => {
    expect(familyOf(0)).toBe('hats');
    expect(familyOf(8)).toBe('snares');
    expect(familyOf(13)).toBe('toms');
    expect(familyOf(15)).toBe('kick');
  });

  it('gives every piece a place, and no two share one', () => {
    const seen = new Set<string>();
    for (const period of periods) {
      const { row, order } = placementOf(period);
      const key = `${row}:${order}`;
      expect(seen.has(key), `period ${period} collides at ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('keeps the kick and the snare in the front row, cymbals behind', () => {
    // A drummer's layout, not an arbitrary one: what you hit hardest is nearest.
    expect(placementOf(15).row).toBe(1);
    expect(placementOf(8).row).toBe(1);
    expect(placementOf(0).row).toBe(0);
    expect(placementOf(4).row).toBe(0);
  });

  it('shades a family towards white without leaving the hue', () => {
    const base = DRUM_FAMILY_COLORS.toms;
    expect(shadeOf(base, 1)).toBe(base);
    expect(shadeOf(base, 0)).not.toBe(base);
    const light = shadeOf(base, 0);
    const value = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);
    // Every channel moves towards white, so the hue survives.
    expect(value(light, 1)).toBeGreaterThanOrEqual(value(base, 1));
    expect(value(light, 3)).toBeGreaterThanOrEqual(value(base, 3));
    expect(value(light, 5)).toBeGreaterThanOrEqual(value(base, 5));
  });

  it('draws lower-sounding pieces of a family darker', () => {
    // Within the toms, the floor tom (14) is the lowest and so the darkest.
    expect(placementOf(10).shade).toBeGreaterThan(placementOf(14).shade);
    expect(colorOfPeriod(10)).not.toBe(colorOfPeriod(14));
  });
});

/**
 * The kit's own desk — M and S on one drum at a time.
 *
 * The same rule the voice mixer follows, and it is here so it cannot quietly
 * drift from it: **one piece is never muted and soloed at once**. A reader who
 * has learned one desk must not be surprised by the other.
 */
describe('the kit mixer', () => {
  it('hears everything when nothing is pressed', () => {
    for (const period of [0, 6, 15]) expect(isPieceAudible(period, EMPTY_KIT_MIX)).toBe(true);
  });

  it('silences a muted piece and leaves the rest alone', () => {
    const mix = setPieceMuted(EMPTY_KIT_MIX, 6, true);
    expect(isPieceAudible(6, mix)).toBe(false);
    expect(isPieceAudible(15, mix)).toBe(true);
  });

  it('hears only what is soloed', () => {
    const mix = setPieceSoloed(EMPTY_KIT_MIX, 15, true);
    expect(isPieceAudible(15, mix)).toBe(true);
    expect(isPieceAudible(6, mix)).toBe(false);
  });

  it('never leaves one piece muted and soloed together', () => {
    const mutedThenSoloed = setPieceSoloed(setPieceMuted(EMPTY_KIT_MIX, 6, true), 6, true);
    expect(mutedThenSoloed).toEqual({ muted: [], soloed: [6] });
    expect(isPieceAudible(6, mutedThenSoloed)).toBe(true);

    const soloedThenMuted = setPieceMuted(setPieceSoloed(EMPTY_KIT_MIX, 6, true), 6, true);
    expect(soloedThenMuted).toEqual({ muted: [6], soloed: [] });
    expect(isPieceAudible(6, soloedThenMuted)).toBe(false);
  });

  it('tells being muted apart from being silenced by someone else', () => {
    // A piece the reader muted should look muted; one that went quiet because
    // another was soloed has not been touched, and showing it as muted invites
    // them to un-mute a button they never pressed.
    const mix = setPieceSoloed(EMPTY_KIT_MIX, 15, true);
    expect(isPieceSilencedByOthers(6, mix)).toBe(true);
    expect(isPieceSilencedByOthers(15, mix)).toBe(false);
    expect(isPieceSilencedByOthers(6, setPieceMuted(EMPTY_KIT_MIX, 6, true))).toBe(false);
  });

  it('toggles off again, and never doubles an entry', () => {
    let mix = setPieceMuted(EMPTY_KIT_MIX, 6, true);
    mix = setPieceMuted(mix, 6, true);
    expect(mix.muted).toEqual([6]);
    expect(setPieceMuted(mix, 6, false).muted).toEqual([]);
  });
});
