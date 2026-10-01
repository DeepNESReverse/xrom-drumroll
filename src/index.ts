/**
 * @xromdev/drumroll — the drums, falling onto a kit.
 *
 * `DrumRollView` is the whole view in any DOM element; `@xromdev/drumroll/react`
 * wraps it. Import `@xromdev/drumroll/drumroll.css` once. The falling area and
 * the frame loop are `@xromdev/roll`'s.
 *
 * Built for the NES noise channel — a lane per `$400E` period, read as a piece
 * of the kit — and usable for any drums: pass `lanes` with your own names,
 * colours and drawings.
 */

export { DrumRollView, type DrumHit, type DrumLane, type DrumRollOptions } from './view.js';
export { drumIcon, drumKindOf } from './icons.js';
export {
  DRUM_FAMILY_COLORS,
  EMPTY_KIT_MIX,
  NOISE_DRUM_KINDS,
  NOISE_DRUM_NAMES,
  NOISE_PERIOD_COUNT,
  colorOfPeriod,
  familyOf,
  isPieceAudible,
  isPieceSilencedByOthers,
  lanesFromHits,
  placementOf,
  setPieceMuted,
  setPieceSoloed,
  type DrumFamily,
  type DrumKind,
  type KitMix,
  type KitPlacement,
} from './lanes.js';
export { DRUM_MOTIONS, durationOf, keyframesFor, partKeyframesFor, type DrumMotion, type MotionStep } from './motion.js';
