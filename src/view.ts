/**
 * The drums, falling onto a kit — a roll for the voice that has no pitch.
 *
 *   const roll = new DrumRollView(element);
 *   roll.setHits([{ period: 15, start: 0, duration: 0.1 }, …]);
 *   roll.play(() => audio.currentTime);
 *
 * The NES noise channel is a game's whole drum kit, and a keyboard under it
 * would be a lie: `$400E` stores an LFSR RATE, not a note. So a lane is the
 * period index itself, the piece under it is what that rate is read as (a
 * reading, not the ROM's word — see `NOISE_DRUM_NAMES`), and the pieces stand
 * as a kit: cymbals and toms behind, snare and kick in front. A block still
 * falls down its lane's own column onto its piece, wherever that piece stands.
 *
 * A struck piece MOVES, each in its own way (`motion.ts`): the kick swells and
 * rebounds, an open hat swings, a closed one can only tick.
 *
 * The falling area, the frame loop and the sparks are `@xromdev/roll`'s.
 */

import { RollView, type LitLane, type RollNote, type RollOptions, type RollSurface, type SurfaceLayout } from '@xromdev/roll';
import { drumIcon, drumKindOf } from './icons.js';
import {
  EMPTY_KIT_MIX,
  NOISE_DRUM_NAMES,
  colorOfPeriod,
  isPieceAudible,
  isPieceSilencedByOthers,
  lanesFromHits,
  placementOf,
  type KitMix,
} from './lanes.js';
import { durationOf, keyframesFor, partKeyframesFor } from './motion.js';

export interface DrumHit {
  /** `$400E` low nibble: the LFSR period index, 0 (fastest) .. 15 (slowest). */
  period: number;
  /** When it sounds, in seconds from the start of the piece. */
  start: number;
  /** How long it sounds, in seconds. */
  duration: number;
  /** 0..1. Sets the block's weight and the flash's strength. Default 1. */
  velocity?: number;
  /** Shown but not heard — muted. Faded, and it lights no piece. */
  dimmed?: boolean;
}

export interface DrumLane {
  period: number;
  /** Overrides the name from `NOISE_DRUM_NAMES`. */
  label?: string;
  /** Overrides the colour its family would give this lane. */
  color?: string;
  /** Overrides the drawing: SVG markup, or `null` for none. */
  icon?: string | null;
}

export interface DrumRollOptions extends RollOptions {
  /** Lanes to draw. Left out, one per period the hits use. */
  lanes?: readonly DrumLane[] | null;
  /** Px the kit takes under the falling area. Default 92; under 62 the drawings are dropped. */
  padHeight?: number;
  /** Widest a lane may get, in px — a two-piece kit should not span the screen. Default 104. */
  maxLaneWidth?: number;
  /** Print each piece's name under it. Default true. */
  showNames?: boolean;
  /** Draw the pieces. Default true. */
  showIcons?: boolean;
  /** Move a piece when it is struck. Default true; reduced motion overrides it. */
  animate?: boolean;
  /** Size of a piece's drawing, in px. Default 44. */
  iconSize?: number;
  /**
   * Pieces silenced one drum at a time, by period. Silenced, not hidden: their
   * blocks keep falling faded, and the pieces are drawn dimmed.
   */
  kitMix?: KitMix;
}

/** How much of a lane a falling block takes. A hit is an instant, not a slab. */
const BLOCK_SHARE = 0.34;
/** How much of a lane its backdrop column takes. */
const BACKDROP_SHARE = 0.62;
/** How much of the kit's height is floor, so the front row stands on something. */
const FLOOR_SHARE = 0.12;

interface Resolved {
  period: number;
  label: string;
  color: string;
  icon: string | null;
}

function resolveLanes(o: DrumRollOptions, periods: readonly number[]): Resolved[] {
  const list: readonly DrumLane[] = o.lanes ?? periods.map((period) => ({ period }));
  return list
    .map((lane) => {
      const kind = drumKindOf(lane.period);
      return {
        period: lane.period,
        label: lane.label ?? NOISE_DRUM_NAMES[lane.period] ?? '?',
        color: lane.color ?? colorOfPeriod(lane.period),
        icon: lane.icon !== undefined ? lane.icon : kind ? drumIcon(kind, o.iconSize ?? 44) : null,
      };
    })
    .sort((a, b) => {
      const left = placementOf(a.period);
      const right = placementOf(b.period);
      return left.order - right.order || left.row - right.row;
    });
}

/** The kit, as a roll's surface. */
class Kit implements RollSurface<DrumRollOptions> {
  readonly element: HTMLDivElement;
  readonly rootClass = 'xdr-roll';
  private nodes = new Map<number, HTMLElement>();
  private built = '';
  private readonly running = new Map<number, Animation[]>();
  private animate = true;

  constructor(doc: Document) {
    this.element = doc.createElement('div');
    this.element.className = 'xdr-kit';
  }

  layout(width: number, height: number, notes: readonly RollNote[], o: DrumRollOptions): SurfaceLayout {
    const padHeight = o.padHeight ?? 92;
    const lanes = resolveLanes(o, lanesFromHits(notes.map((n) => ({ period: n.lane }))));
    const mix = o.kitMix ?? EMPTY_KIT_MIX;
    const laneWidth = lanes.length > 0 ? Math.min(width / lanes.length, o.maxLaneWidth ?? 104) : 0;
    const left = Math.max(0, (width - laneWidth * lanes.length) / 2);
    this.animate = o.animate !== false;
    this.element.style.height = `${padHeight}px`;

    const showPiece = o.showIcons !== false && padHeight >= 62;
    const showNames = o.showNames !== false;
    // Rebuilt only when what it draws changes — never per frame.
    const key = JSON.stringify([lanes.map((l) => [l.period, l.label, l.color, l.icon !== null]), laneWidth, left, padHeight, showPiece, showNames, o.iconSize, mix]);
    if (key !== this.built) {
      this.build(lanes, laneWidth, left, padHeight, showPiece, showNames, mix);
      this.built = key;
    }

    const columns = new Map<number, { x: number; width: number }>();
    const blockWidth = Math.max(10, laneWidth * BLOCK_SHARE);
    const inset = (laneWidth - blockWidth) / 2;
    lanes.forEach((lane, i) => columns.set(lane.period, { x: left + i * laneWidth + inset, width: blockWidth }));
    return {
      fallHeight: Math.max(0, height - padHeight),
      columns,
      nodes: this.nodes,
      // A column behind each lane, and a rule between lanes: unlike a keyboard,
      // nothing else here says where one lane stops and the next starts.
      backdrops: lanes.map((lane, i) => ({
        x: left + i * laneWidth + laneWidth * (1 - BACKDROP_SHARE) * 0.5,
        width: laneWidth * BACKDROP_SHARE,
        color: lane.color,
      })),
      guides: lanes.slice(1).map((_, i) => ({ x: left + (i + 1) * laneWidth })),
    };
  }

  private build(lanes: Resolved[], laneWidth: number, left: number, height: number, showPiece: boolean, showNames: boolean, mix: KitMix) {
    const doc = this.element.ownerDocument;
    const usable = height * (1 - FLOOR_SHARE);
    const nodes = new Map<number, HTMLElement>();
    const elements = lanes.map((lane, i) => {
      // Two rows: the back one sits higher and a little smaller — the whole of
      // the perspective, enough to read as a kit and cheap enough to stay legible.
      const back = placementOf(lane.period).row === 0;
      const node = doc.createElement('div');
      node.className = 'xdr-lane';
      node.dataset.lit = '0';
      node.dataset.muted = !isPieceAudible(lane.period, mix) || isPieceSilencedByOthers(lane.period, mix) ? '1' : '0';
      const s = node.style;
      s.left = `${left + i * laneWidth}px`;
      s.width = `${Math.max(1, laneWidth)}px`;
      s.top = `${back ? 0 : usable * 0.3}px`;
      s.height = `${back ? usable * 0.72 : usable * 0.7}px`;
      s.zIndex = back ? '1' : '2';
      s.setProperty('--lane', lane.color);
      if (showPiece && lane.icon) {
        const piece = doc.createElement('span');
        piece.className = 'xdr-piece';
        piece.dataset.piece = '';
        if (back) piece.style.transform = 'scale(0.86)';
        piece.title = lane.label;
        piece.innerHTML = lane.icon;
        node.append(piece);
      }
      if (showNames && laneWidth >= 46) {
        const label = doc.createElement('span');
        label.className = 'xdr-label';
        label.textContent = lane.label;
        node.append(label);
      }
      nodes.set(lane.period, node);
      return node;
    });
    this.element.replaceChildren(...elements);
    this.nodes = nodes;
  }

  /**
   * Run the struck piece's own motion — Web Animations, because a drum is hit
   * again before it has stopped moving, and `animate` restarts by definition
   * where a CSS class would need a reflow. Everything the last hit started is
   * cancelled first: a part left running against a restarted body is a hand
   * clapping out of time with its own arm.
   */
  strike(lane: number, node: HTMLElement, note: LitLane) {
    if (!this.animate) return;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const kind = drumKindOf(lane);
    const piece = node.querySelector<HTMLElement>('[data-piece]');
    if (!kind || !piece || typeof piece.animate !== 'function') return;
    const options = { duration: durationOf(kind), easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'none' } as const;
    this.running.get(lane)?.forEach((animation) => animation.cancel());
    const started = [piece.animate(keyframesFor(kind, note.velocity), options)];
    for (const [part, frames] of partKeyframesFor(kind, note.velocity)) {
      const el = piece.querySelector<SVGElement>(`[data-part="${part}"]`);
      if (el && typeof el.animate === 'function') started.push(el.animate(frames, options));
    }
    this.running.set(lane, started);
  }

  destroy() {
    for (const list of this.running.values()) list.forEach((a) => a.cancel());
  }
}

export class DrumRollView extends RollView<DrumRollOptions> {
  private hits: readonly DrumHit[] = [];

  constructor(host: HTMLElement, options: DrumRollOptions = {}) {
    super(host, new Kit(host.ownerDocument), options);
  }

  /** The hits of the piece, in any order. */
  setHits(hits: readonly DrumHit[]) {
    this.hits = hits;
    const mix = this.options.kitMix ?? EMPTY_KIT_MIX;
    const color = new Map((this.options.lanes ?? []).filter((l) => l.color).map((l) => [l.period, l.color!]));
    super.setNotes(
      hits.map((hit) => ({
        lane: hit.period,
        start: hit.start,
        duration: hit.duration,
        velocity: hit.velocity,
        color: color.get(hit.period) ?? colorOfPeriod(hit.period),
        dimmed: hit.dimmed || !isPieceAudible(hit.period, mix),
      }))
    );
  }

  override setOptions(options: Partial<DrumRollOptions>) {
    super.setOptions(options);
    // Who is silenced, or a lane's colour, changes how the hits are painted.
    if ('kitMix' in options || 'lanes' in options) this.setHits(this.hits);
  }
}
