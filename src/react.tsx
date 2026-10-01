'use client';

/**
 * `@xromdev/drumroll/react` — the kit as a component.
 *
 *   <DrumRoll hits={hits} clock={() => audio.currentTime} height={300} />
 *
 * With `clock` it follows that clock on its own animation frames — no React
 * render per frame. With `time` each change draws one frame.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { DrumRollView, type DrumHit, type DrumRollOptions } from './view.js';

export interface DrumRollProps extends Omit<DrumRollOptions, 'onSoundingChange'> {
  hits: readonly DrumHit[];
  time?: number;
  clock?: () => number;
  /** Height in px, or any CSS length. Default 300. */
  height?: number | string;
  onSoundingChange?: (periods: readonly number[]) => void;
  onView?: (view: DrumRollView | null) => void;
  className?: string;
  style?: CSSProperties;
}

export function DrumRoll({
  hits,
  time,
  clock,
  height = 300,
  onSoundingChange,
  onView,
  onPieceMutedChange,
  onPieceSoloedChange,
  className,
  style,
  ...options
}: DrumRollProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<DrumRollView | null>(null);
  const sounding = useRef(onSoundingChange);
  sounding.current = onSoundingChange;
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const mute = useRef(onPieceMutedChange);
  mute.current = onPieceMutedChange;
  const solo = useRef(onPieceSoloedChange);
  solo.current = onPieceSoloedChange;
  const hasMute = !!onPieceMutedChange;
  const hasSolo = !!onPieceSoloedChange;
  const { lookAhead, tracks, releaseMs, sparks, lanes, padHeight, maxLaneWidth, showNames, showIcons, animate, iconSize, kitMix } = options;

  useEffect(() => {
    const v = new DrumRollView(host.current!, { onSoundingChange: (p) => sounding.current?.(p) });
    view.current = v;
    onViewRef.current?.(v);
    return () => {
      v.destroy();
      view.current = null;
      onViewRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    view.current?.setOptions({
      lookAhead,
      tracks,
      releaseMs,
      sparks,
      lanes,
      padHeight,
      maxLaneWidth,
      showNames,
      showIcons,
      animate,
      iconSize,
      kitMix,
      // Stable functions: the kit is rebuilt only when buttons appear or go.
      onPieceMutedChange: hasMute ? (p, m) => mute.current?.(p, m) : undefined,
      onPieceSoloedChange: hasSolo ? (p, s) => solo.current?.(p, s) : undefined,
    });
  }, [lookAhead, tracks, releaseMs, sparks, lanes, padHeight, maxLaneWidth, showNames, showIcons, animate, iconSize, kitMix, hasMute, hasSolo]);

  useEffect(() => {
    view.current?.setHits(hits);
  }, [hits]);

  useEffect(() => {
    if (!clock && time !== undefined) view.current?.render(time);
  }, [time, clock]);

  useEffect(() => {
    const v = view.current;
    if (!clock || !v) return;
    v.play(clock);
    return () => v.stop();
  }, [clock]);

  return <div ref={host} className={className} style={{ height, ...style }} />;
}

export { DrumRollView, type DrumHit, type DrumRollOptions } from './view.js';
