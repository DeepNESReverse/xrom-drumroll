# @xromdev/drumroll

The drums, falling onto a kit — **the NES noise channel read as a drum kit**,
hits falling onto pieces that move when struck. Built on
[@xromdev/roll](https://github.com/DeepNESReverse/xrom-roll), the same core as
[@xromdev/pianoroll](https://github.com/DeepNESReverse/xrom-pianoroll), so the
two stack and follow one clock.

- The NES has no drums: it has a noise channel and sixteen rates for it
  (`$400E`, 0 fastest … 15 slowest). Each rate is a lane, read as a piece:
  closed, pedal and open hats, clap, snares, side stick, four toms, the kick.
- The pieces stand in a kit, in two rows, and each moves its own way when
  struck — the kick swells and rebounds, an open hat swings, a clap claps.
  Motion follows the hit's velocity, and `prefers-reduced-motion` stops it.
- M and S under every piece, if you want them: mute or solo one drum at a
  time. A silenced piece is dimmed and its hits keep falling, faded.
- Any drums, not only the NES: pass `lanes` with your own names, colours and
  drawings.
- No framework in the frame loop; ~6 KB minified and gzipped on top of
  `@xromdev/roll`. React component included.

**Try it: [xrom.dev/utils/drumroll](https://xrom.dev/utils/drumroll)** — every
drum in a groove, any NSF's drums, and the kit to play pad by pad.

## Install

```sh
npm install @xromdev/drumroll
```

## Use

```ts
import { DrumRollView } from '@xromdev/drumroll';
import '@xromdev/drumroll/drumroll.css';

const kit = new DrumRollView(document.querySelector('#drums')!);
kit.setHits([
  { period: 15, start: 0, duration: 0.1 },                   // kick
  { period: 1, start: 0.25, duration: 0.05, velocity: 0.5 }, // hi-hat
  { period: 7, start: 0.5, duration: 0.1 },                  // snare
]);
kit.play(() => audioContext.currentTime - startedAt); // or kit.render(seconds)
```

The element must have a height; the view fills it.

### React

```tsx
import { DrumRoll } from '@xromdev/drumroll/react';
import '@xromdev/drumroll/drumroll.css';
import { EMPTY_KIT_MIX, setPieceMuted, setPieceSoloed } from '@xromdev/drumroll';

const [mix, setMix] = useState(EMPTY_KIT_MIX);

<DrumRoll
  hits={hits}
  clock={() => audio.currentTime}
  height={360}
  kitMix={mix}
  onPieceMutedChange={(period, on) => setMix((m) => setPieceMuted(m, period, on))}
  onPieceSoloedChange={(period, on) => setMix((m) => setPieceSoloed(m, period, on))}
/>
```

The view never changes the mix itself — you hold it, and silence the sound with
`isPieceAudible(period, mix)`.

## Options

Everything `@xromdev/roll` takes (`lookAhead`, `tracks`, `releaseMs`, `sparks`,
`onSoundingChange`), and:

| option | default | |
|---|---|---|
| `lanes` | the hits' rates | `{ period, label?, color?, icon? }[]` — `icon` is SVG markup or `null`. |
| `padHeight` | 92 | Px of kit under the falling area; under 62 the drawings are dropped. |
| `maxLaneWidth` | 104 | Widest a lane may get. |
| `iconSize` | 44 | Size of a piece's drawing. |
| `showNames` | true | Name each piece. |
| `showIcons` | true | Draw the pieces. |
| `animate` | true | Move a piece when it is struck. |
| `kitMix` | none | `{ muted, soloed }` periods; silenced pieces are dimmed. |
| `onPieceMutedChange` / `onPieceSoloedChange` | — | Given, they draw M and S under every piece. |

Also exported: `NOISE_DRUM_NAMES`, `NOISE_DRUM_KINDS`, `drumIcon(kind, size)`
(the drawings as SVG strings), `colorOfPeriod`, `familyOf`, `placementOf`, and
the motions (`keyframesFor`, `partKeyframesFor`, `durationOf`) to strike a
piece of your own with the Web Animations API.

## Development

```sh
npm install
npm test   # lanes, motions, and the view in jsdom
```

## License

MIT © Oleksandr Maksymov
