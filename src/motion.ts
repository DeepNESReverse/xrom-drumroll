/**
 * How each piece of the kit moves when it is struck.
 *
 * A drum roll where every lane does the same thing on impact is a row of
 * blinking lights. A kick is a membrane taking a beater — it swells and
 * recovers; an open hi-hat is two cymbals hanging on a rod — it swings and
 * rings out; a closed hat is clamped, so it can only tick. Giving each piece
 * its own motion means the movement carries the same fact the drawing does,
 * which is what makes it worth animating at all rather than decoration.
 *
 * Plain data, so the shapes are checkable without a browser: every animation
 * must START and END neutral, or a piece hit once sits crooked for the rest of
 * the piece — the one failure this cannot show, since a still frame of a
 * lopsided hi-hat looks like a drawing that was always lopsided.
 */

import type { DrumKind } from './lanes.js';

/** One step of a motion. `offset` is 0..1 through the animation. */
export interface MotionStep {
  offset: number;
  /** Multiplier on the piece's size. 1 is its resting size. */
  scale?: number;
  /** Extra horizontal squash, multiplied onto `scale`. */
  scaleX?: number;
  /** Extra vertical squash, multiplied onto `scale`. */
  scaleY?: number;
  /** Degrees. Positive tips clockwise. */
  rotate?: number;
  /** Px, positive is down. */
  y?: number;
  /** Px, positive is right. */
  x?: number;
  /**
   * 0..1, for a part that is not there until it happens.
   *
   * Only the clap's lines use it, and they are the reason it exists: a drawing
   * of a noise, permanently on a kit where every other piece is silent until
   * struck, reads as this one being stuck on. Written on a step it is emitted
   * as-is; left out the property is not emitted at all, so a motion that does
   * not care about opacity cannot accidentally pin it.
   */
  opacity?: number;
}

export interface DrumMotion {
  /** Milliseconds at full strength. */
  duration: number;
  steps: MotionStep[];
  /** Where the piece pivots. Default `center`. */
  origin?: string;
  /**
   * Motions for named pieces INSIDE the drawing, keyed by `data-part`.
   *
   * Most of the kit moves as one object, because that is what it is: a drum is
   * struck and the whole drum answers. A clap is not — it is two hands, and two
   * hands meeting is the entire event. Squashing the drawing of them sideways
   * (which is what this used to do) makes a picture of two hands get narrower,
   * not a picture of two hands meeting.
   *
   * Each entry is animated the same way the piece is, on its own element, so a
   * part can travel while the whole barely moves.
   */
  parts?: Record<string, { steps: MotionStep[]; origin?: string }>;
}

/**
 * The motions, at full strength.
 *
 * Read them as physical descriptions, because that is what they are meant to
 * be: the numbers were chosen to say what the piece DOES, not to be lively.
 */
export const DRUM_MOTIONS: Record<DrumKind, DrumMotion> = {
  // The beater goes in: the head swells, flattens slightly against the blow,
  // then rebounds past its rest and settles. Biggest travel of the set.
  kick: {
    duration: 260,
    steps: [
      { offset: 0, scale: 1 },
      { offset: 0.18, scale: 1.22, scaleY: 0.94 },
      { offset: 0.45, scale: 0.97 },
      { offset: 0.72, scale: 1.04 },
      { offset: 1, scale: 1 },
    ],
  },

  // A crack, not a swell: a short hard shake sideways over a tight body.
  snare: {
    duration: 200,
    steps: [
      { offset: 0, x: 0, scale: 1 },
      { offset: 0.12, x: -1.6, scale: 1.1 },
      { offset: 0.3, x: 1.4 },
      { offset: 0.48, x: -0.9 },
      { offset: 0.66, x: 0.5 },
      { offset: 1, x: 0, scale: 1 },
    ],
  },

  // Struck on the hoop with the stick laid down — the drum barely moves, the
  // click is all in the attack. The smallest motion here, deliberately.
  sideStick: {
    duration: 150,
    steps: [
      { offset: 0, scale: 1, rotate: 0 },
      { offset: 0.16, scale: 1.08, rotate: -3 },
      { offset: 0.5, rotate: 1.5 },
      { offset: 1, scale: 1, rotate: 0 },
    ],
  },

  // Two hands meeting, and the whole event is the meeting.
  //
  // The hands travel; the drawing as a whole does almost nothing, which is the
  // opposite of every other piece here and is right for the same reason they
  // are: a clap has no body being struck. What little the piece does is the
  // recoil that goes through the arms after contact.
  //
  // The timing is a real clap's, not an even one. Hands come together FAST —
  // all of the travel is gone by a sixth of the way in — STAY together for
  // about a third of the motion, and only then drift apart. The hold is what
  // makes the eye read a clap: without it the hands spend most of the
  // animation moving outward, and a drawing that is mostly travelling apart
  // looks like hands opening, whichever direction they set off in.
  //
  // Nothing overshoots the rest pose on the way back out, for the same reason:
  // an overshoot is one more outward movement, at the end, where it is the
  // last thing seen.
  clap: {
    duration: 260,
    steps: [
      { offset: 0, scale: 1 },
      { offset: 0.16, scale: 1.06 },
      { offset: 0.5, scale: 0.99 },
      { offset: 1, scale: 1 },
    ],
    parts: {
      // Wide apart, in hard, held for a frame at the contact, then drifting
      // back out past rest and settling — the give in the wrists.
      //
      // Pivoting at the BOTTOM, because the hands stand upright and the wrist
      // is the bottom of each: a hand turning about its middle is a hand
      // waving, and turning about a side edge is a hand on a hinge.
      clapLeft: {
        origin: 'bottom',
        steps: [
          { offset: 0, x: 0, rotate: 0 },
          { offset: 0.16, x: 5, rotate: 5 },
          { offset: 0.46, x: 5, rotate: 5 },
          { offset: 0.8, x: -0.6, rotate: -1 },
          { offset: 1, x: 0, rotate: 0 },
        ],
      },
      clapRight: {
        origin: 'bottom',
        steps: [
          { offset: 0, x: 0, rotate: 0 },
          { offset: 0.16, x: -5, rotate: -5 },
          { offset: 0.46, x: -5, rotate: -5 },
          { offset: 0.8, x: 0.6, rotate: 1 },
          { offset: 1, x: 0, rotate: 0 },
        ],
      },
      // The lines, which do not exist until the hands meet.
      //
      // Nothing until the contact — not faint, NOTHING — then out in a frame
      // and gone. The invariant this file opens with is that a motion begins
      // and ends where the still drawing is, and the still drawing here is
      // `opacity: 0`: these lines are the only part of the kit that is drawn
      // and not shown.
      clapSpark: {
        steps: [
          { offset: 0, opacity: 0, scale: 0.62 },
          { offset: 0.16, opacity: 0, scale: 0.62 },
          { offset: 0.24, opacity: 1, scale: 1.1 },
          { offset: 0.5, opacity: 0.9, scale: 1.16 },
          { offset: 1, opacity: 0, scale: 1.24 },
        ],
      },
    },
  },

  // A big head with a long skin: it takes the hit downward and comes back
  // slowly. Lower and softer than the kick, and the only one that travels.
  tom: {
    duration: 280,
    steps: [
      { offset: 0, y: 0, scale: 1 },
      { offset: 0.16, y: 2.4, scale: 1.12, scaleY: 0.92 },
      { offset: 0.48, y: -1, scale: 0.99 },
      { offset: 0.76, y: 0.4 },
      { offset: 1, y: 0, scale: 1 },
    ],
  },

  // Clamped shut, so it cannot ring: one tick and it is over.
  hatClosed: {
    duration: 130,
    steps: [
      { offset: 0, scaleY: 1, scale: 1 },
      { offset: 0.2, scaleY: 0.82, scale: 1.06 },
      { offset: 1, scaleY: 1, scale: 1 },
    ],
  },

  // Held shut by the foot — the same tick, shorter still, and pressed down.
  hatPedal: {
    duration: 110,
    steps: [
      { offset: 0, scaleY: 1, y: 0 },
      { offset: 0.22, scaleY: 0.78, y: 1 },
      { offset: 1, scaleY: 1, y: 0 },
    ],
  },

  // Free to ring: it swings on the rod and the swing decays. Much the longest
  // motion, because that IS the difference between an open hat and a closed one.
  hatOpen: {
    duration: 520,
    origin: 'center 18%',
    steps: [
      { offset: 0, rotate: 0, scale: 1 },
      { offset: 0.1, rotate: -7, scale: 1.06 },
      { offset: 0.3, rotate: 5 },
      { offset: 0.5, rotate: -3.2 },
      { offset: 0.7, rotate: 1.8 },
      { offset: 0.86, rotate: -0.8 },
      { offset: 1, rotate: 0, scale: 1 },
    ],
  },
};

/**
 * A step as a CSS `transform`, with every amplitude scaled by `strength`.
 *
 * A component that works out to its neutral value is left OUT rather than
 * written as `translate(0px, 0px)`. That keeps "at rest" a single spelling —
 * `none` — so the rest frames are comparable, which is what lets a test state
 * the invariant that matters here at all.
 */
export function stepTransform(step: MotionStep, strength = 1): string {
  const ease = (value: number, rest: number) => rest + (value - rest) * strength;
  const parts: string[] = [];

  const x = ease(step.x ?? 0, 0);
  const y = ease(step.y ?? 0, 0);
  if (x !== 0 || y !== 0) parts.push(`translate(${x.toFixed(3)}px, ${y.toFixed(3)}px)`);

  const rotate = ease(step.rotate ?? 0, 0);
  if (rotate !== 0) parts.push(`rotate(${rotate.toFixed(3)}deg)`);

  const scale = ease(step.scale ?? 1, 1);
  const sx = scale * ease(step.scaleX ?? 1, 1);
  const sy = scale * ease(step.scaleY ?? 1, 1);
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`);

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * A motion as Web Animations keyframes.
 *
 * The Web Animations API rather than a CSS class, because a drum is hit again
 * before it has finished moving: restarting a CSS animation means removing the
 * class, forcing a reflow and putting it back, on every hit. `element.animate`
 * restarts by definition and costs no layout.
 *
 * `velocity` only ever makes the motion SMALLER (floor 0.55): a quiet hit that
 * does not move at all reads as a dropped note.
 */
export function keyframesFor(kind: DrumKind, velocity = 1): Keyframe[] {
  const motion = DRUM_MOTIONS[kind];
  const strength = 0.55 + 0.45 * Math.max(0, Math.min(1, velocity));
  return motion.steps.map((step) => ({
    offset: step.offset,
    transform: stepTransform(step, strength),
    ...(step.opacity === undefined ? null : { opacity: step.opacity }),
    ...(motion.origin ? { transformOrigin: motion.origin } : null),
  }));
}

export const durationOf = (kind: DrumKind): number => DRUM_MOTIONS[kind].duration;

/** The named parts of this piece's drawing that move on their own, if any. */
export function partKeyframesFor(kind: DrumKind, velocity = 1): [string, Keyframe[]][] {
  const parts = DRUM_MOTIONS[kind].parts;
  if (!parts) return [];
  const strength = 0.55 + 0.45 * Math.max(0, Math.min(1, velocity));
  return Object.entries(parts).map(([name, part]) => [
    name,
    part.steps.map((step) => ({
      offset: step.offset,
      transform: stepTransform(step, strength),
      // Straight through, never scaled by velocity: a quiet clap is a smaller
      // movement, not a half-visible one.
      ...(step.opacity === undefined ? null : { opacity: step.opacity }),
      ...(part.origin ? { transformOrigin: part.origin } : null),
    })),
  ]);
}
