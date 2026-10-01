import { describe, expect, it } from 'vitest';
import {
  DRUM_MOTIONS,
  durationOf,
  keyframesFor,
  partKeyframesFor,
  stepTransform,
} from '../src/motion.js';
import { NOISE_DRUM_KINDS, type DrumKind } from '../src/lanes.js';

const KINDS = [...new Set(NOISE_DRUM_KINDS)] as DrumKind[];

describe('DRUM_MOTIONS', () => {
  it('has a motion for every piece that can be drawn', () => {
    for (const kind of KINDS) expect(DRUM_MOTIONS[kind], kind).toBeDefined();
  });

  it.each(KINDS)('%s starts and ends at rest', (kind) => {
    // The one failure this cannot show on screen: a piece hit once and left
    // crooked looks like a drawing that was always crooked.
    const { steps } = DRUM_MOTIONS[kind];
    expect(steps[0].offset).toBe(0);
    expect(steps.at(-1)!.offset).toBe(1);
    expect(stepTransform(steps[0])).toBe('none');
    expect(stepTransform(steps.at(-1)!)).toBe('none');
  });

  it.each(KINDS)('%s runs its offsets forward, 0..1', (kind) => {
    const offsets = DRUM_MOTIONS[kind].steps.map((step) => step.offset);
    expect(offsets.every((offset) => offset >= 0 && offset <= 1)).toBe(true);
    expect(offsets.every((offset, i) => i === 0 || offset > offsets[i - 1])).toBe(true);
  });

  it.each(KINDS)('%s actually moves', (kind) => {
    const moved = DRUM_MOTIONS[kind].steps.some((step) => stepTransform(step) !== 'none');
    expect(moved).toBe(true);
  });

  it.each(KINDS)('%s is over fast enough to be a hit', (kind) => {
    expect(durationOf(kind)).toBeGreaterThanOrEqual(100);
    expect(durationOf(kind)).toBeLessThanOrEqual(600);
  });

  it('rings the open hat longest and ticks the closed hats shortest', () => {
    // The whole reason the hats have three motions: open rings, closed cannot.
    expect(durationOf('hatOpen')).toBeGreaterThan(durationOf('hatClosed') * 2);
    expect(durationOf('hatPedal')).toBeLessThanOrEqual(durationOf('hatClosed'));
  });

  it('moves the kick further than the side stick, which barely moves', () => {
    const peak = (kind: DrumKind) =>
      Math.max(...DRUM_MOTIONS[kind].steps.map((step) => Math.abs((step.scale ?? 1) - 1)));
    expect(peak('kick')).toBeGreaterThan(peak('sideStick'));
  });
});

describe('keyframesFor', () => {
  it('keeps the rest frames neutral whatever the velocity', () => {
    for (const velocity of [0, 0.5, 1]) {
      const frames = keyframesFor('kick', velocity);
      expect(frames[0].transform).toBe('none');
      expect(frames.at(-1)!.transform).toBe('none');
    }
  });

  it('makes a quiet hit smaller but never still', () => {
    const amplitude = (velocity: number) => {
      const frame = keyframesFor('kick', velocity)[1].transform as string;
      return Number(/scale\(([\d.]+)/.exec(frame)![1]);
    };
    expect(amplitude(1)).toBeGreaterThan(amplitude(0.2));
    expect(amplitude(0)).toBeGreaterThan(1);
  });

  it('carries the pivot only for the motion that swings', () => {
    expect(keyframesFor('hatOpen')[0].transformOrigin).toBe('center 18%');
    expect(keyframesFor('kick')[0].transformOrigin).toBeUndefined();
  });
});

/**
 * The pieces whose drawing moves in parts rather than as one object.
 *
 * They carry every invariant the whole-piece motions do — a part left crooked
 * is worse than a piece left crooked, because the drawing then disagrees with
 * itself — plus one of their own: the parts have to meet. Two hands that travel
 * in the same direction are two hands waving.
 */
describe('DRUM_MOTIONS, parts', () => {
  it('gives the clap two hands and a transient, and nothing else parts at all', () => {
    expect(Object.keys(DRUM_MOTIONS.clap.parts ?? {})).toEqual([
      'clapLeft',
      'clapRight',
      'clapSpark',
    ]);
    for (const kind of KINDS.filter((kind) => kind !== 'clap')) {
      expect(DRUM_MOTIONS[kind].parts, kind).toBeUndefined();
    }
  });

  it.each(Object.entries(DRUM_MOTIONS.clap.parts ?? {}))(
    'clap/%s starts and ends where its still drawing is',
    (_name, part) => {
      expect(part.steps[0].offset).toBe(0);
      expect(part.steps.at(-1)!.offset).toBe(1);
      // "At rest" means indistinguishable from the drawing that is on screen
      // when nothing is happening — which is a neutral transform for a part
      // that is drawn, and invisibility for one that is not. The clap's lines
      // are the second kind: they are drawn and never shown until the contact.
      for (const step of [part.steps[0], part.steps.at(-1)!]) {
        const invisible = step.opacity === 0;
        expect(invisible || stepTransform(step) === 'none').toBe(true);
      }
      const offsets = part.steps.map((step) => step.offset);
      expect(offsets.every((offset, i) => i === 0 || offset >= offsets[i - 1])).toBe(true);
    }
  );

  it('sends the hands TOWARDS each other, and holds them at the contact', () => {
    const { clapLeft, clapRight } = DRUM_MOTIONS.clap.parts!;
    const peak = (steps: typeof clapLeft.steps) =>
      steps.reduce((best, step) => (Math.abs(step.x ?? 0) > Math.abs(best.x ?? 0) ? step : best));
    const left = peak(clapLeft.steps);
    const right = peak(clapRight.steps);
    // The left hand moves right and the right hand moves left — mirrored, and
    // inward. Same sign on both would be a wave.
    expect(left.x!).toBeGreaterThan(0);
    expect(right.x!).toBeLessThan(0);
    expect(left.x).toBe(-right.x!);
    // Held: the contact lasts more than the single frame it is reached on.
    const held = clapLeft.steps.filter((step) => step.x === left.x);
    expect(held).toHaveLength(2);
    expect(held[1].offset).toBeGreaterThan(held[0].offset);
  });

  it('holds the contact for a good part of the motion', () => {
    // The hold is what makes the eye read a clap rather than hands opening: at
    // least a quarter of the animation with the hands together, or the motion
    // is mostly outward travel.
    const { clapLeft } = DRUM_MOTIONS.clap.parts!;
    expect(clapLeft.steps[2].offset - clapLeft.steps[1].offset).toBeGreaterThanOrEqual(0.25);
  });

  it('never swings back past the rest pose', () => {
    // An overshoot outward is one more apart-going movement, at the very end,
    // where it is the last thing the eye keeps.
    const { clapLeft, clapRight } = DRUM_MOTIONS.clap.parts!;
    // The left hand travels right, so anything of its own x to the LEFT of
    // rest is an overshoot; the right hand is the mirror of that.
    expect(Math.max(...clapLeft.steps.map((step) => -(step.x ?? 0)))).toBeLessThanOrEqual(1);
    expect(Math.max(...clapRight.steps.map((step) => step.x ?? 0))).toBeLessThanOrEqual(1);
  });

  it('gets them together faster than they come apart', () => {
    // A real clap is not symmetric: in fast, out slow. Even in and out reads as
    // applause in a cartoon.
    const { clapLeft } = DRUM_MOTIONS.clap.parts!;
    const closing = clapLeft.steps[1].offset - clapLeft.steps[0].offset;
    const opening = 1 - clapLeft.steps.at(-2)!.offset;
    expect(closing).toBeLessThan(opening);
  });
});

describe('partKeyframesFor', () => {
  it('is empty for a piece that moves as one object', () => {
    expect(partKeyframesFor('kick')).toEqual([]);
  });

  it('names each part and leaves its rest frames as the drawing is', () => {
    for (const velocity of [0, 0.4, 1]) {
      const parts = partKeyframesFor('clap', velocity);
      expect(parts.map(([name]) => name)).toEqual(['clapLeft', 'clapRight', 'clapSpark']);
      for (const [name, frames] of parts) {
        for (const frame of [frames[0], frames.at(-1)!]) {
          expect(frame.opacity === 0 || frame.transform === 'none', name).toBe(true);
        }
      }
    }
  });

  it('shows the clap lines only between the contact and the end', () => {
    // The whole point of the part: a drawing of a noise that is permanently on
    // screen reads as a piece stuck on, on a kit where everything else is
    // silent until struck.
    const [, frames] = partKeyframesFor('clap').find(([name]) => name === 'clapSpark')!;
    expect(frames[0].opacity).toBe(0);
    expect(frames.at(-1)!.opacity).toBe(0);
    const lit = frames.filter((frame) => (frame.opacity as number) > 0);
    expect(lit.length).toBeGreaterThan(0);
    // Nothing before the hands have met — step 1 is where the travel inward
    // ends, and step 2 is where the hold on the contact ends.
    const contact = DRUM_MOTIONS.clap.parts!.clapLeft.steps[1].offset;
    expect(Math.min(...lit.map((frame) => frame.offset as number))).toBeGreaterThanOrEqual(contact);
  });

  it('keeps the lines at full strength however quiet the hit', () => {
    // A quiet clap is a smaller movement, not a half-visible one.
    for (const velocity of [0, 0.5, 1]) {
      const [, frames] = partKeyframesFor('clap', velocity).find(([name]) => name === 'clapSpark')!;
      expect(Math.max(...frames.map((frame) => (frame.opacity as number) ?? 0))).toBe(1);
    }
  });

  it('carries each part its own pivot — the hands turn about the wrist', () => {
    // Upright hands, so the wrist is the BOTTOM of each. About the middle is a
    // wave; about a side edge is a hinge.
    const origins = Object.fromEntries(
      partKeyframesFor('clap').map(([name, frames]) => [name, frames[0].transformOrigin])
    );
    expect(origins.clapLeft).toBe('bottom');
    expect(origins.clapRight).toBe('bottom');
    expect(origins.clapSpark).toBeUndefined();
  });

  it('makes a quiet clap smaller but never still', () => {
    const travel = (velocity: number) => {
      const frames = partKeyframesFor('clap', velocity)[0][1];
      return Number(/translate\(([\d.-]+)px/.exec(frames[1].transform as string)![1]);
    };
    expect(travel(1)).toBeGreaterThan(travel(0.2));
    expect(travel(0)).toBeGreaterThan(0);
  });
});
