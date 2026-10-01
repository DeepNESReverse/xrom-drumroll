// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { DrumRollView, placementOf, type DrumHit } from '../src/index.js';

beforeAll(() => {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx: Record<string | symbol, unknown> = new Proxy({}, {
    get: (t: Record<string | symbol, unknown>, k) => (k in t ? t[k] : k === 'createLinearGradient' || k === 'createPattern' ? () => gradient : noop),
    set: (t, k, v) => ((t[k] = v), true),
  });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

function kit(hits: DrumHit[], options = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const view = new DrumRollView(host, { sparks: false, ...options });
  (view as unknown as { resize(w: number, h: number): void }).resize(800, 300);
  view.setHits(hits);
  const lanes = [...view.element.querySelectorAll<HTMLElement>('.xdr-lane')];
  return { view, lanes };
}

const beat: DrumHit[] = [
  { period: 15, start: 0, duration: 0.1 }, // kick
  { period: 1, start: 0.25, duration: 0.05 }, // hi-hat
  { period: 7, start: 0.5, duration: 0.1 }, // snare
];

describe('DrumRollView', () => {
  it('gives every period the hits use a piece, in the kit’s own order', () => {
    const { lanes } = kit(beat);
    expect(lanes).toHaveLength(3);
    const order = lanes.map((l) => l.querySelector('.xdr-label')?.textContent);
    const expected = [15, 1, 7].sort((a, b) => placementOf(a).order - placementOf(b).order || placementOf(a).row - placementOf(b).row);
    expect(order).toEqual(expected.map((p) => ({ 15: 'kick', 1: 'hi-hat', 7: 'snare' })[p]));
    for (const lane of lanes) expect(lane.querySelector('svg')).not.toBeNull();
  });

  it('lights the piece that is struck, and only that one', () => {
    const { view, lanes } = kit(beat);
    view.render(0.05);
    const name = (l: HTMLElement) => l.querySelector('.xdr-label')?.textContent;
    const lit = lanes.filter((l) => l.dataset.lit === '1').map(name);
    expect(lit).toEqual(['kick']);
    view.render(0.27);
    expect(lanes.filter((l) => l.dataset.lit === '1').map(name)).toEqual(['hi-hat']);
  });

  it('dims a silenced piece, and its hits light nothing', () => {
    const { view, lanes } = kit(beat, { kitMix: { muted: [15], soloed: [] } });
    const kick = lanes.find((l) => l.querySelector('.xdr-label')?.textContent === 'kick')!;
    expect(kick.dataset.muted).toBe('1');
    view.render(0.05);
    expect(kick.dataset.lit).not.toBe('1');
  });

  it('drops the drawings when the kit is too short for them', () => {
    const { lanes } = kit(beat, { padHeight: 40 });
    expect(lanes[0].querySelector('svg')).toBeNull();
  });
});
