# connector-ui

A visual UI library for showing how things on a page relate, with as little
ink as possible. Plain DOM and SVG, no framework, no dependencies. Used by
[mambattu.com](https://mambattu.com) and [machina.so](https://machina.so).

- **Trace:** one hairline from an origin element down the page's gutter,
  branching into each card through a liquid neck. A card beside another is
  bridged across the gap, necked at both ends. It draws once as the reader
  scrolls and never undraws; hovering, focusing or tapping a card lights the
  whole connected trace by distance: the connections it touches in full, each
  hop further with less hue, saturation and neck swell. Each neck takes the
  color of the card it meets, so a bridge pours out of the lit card and into
  its neighbour's fainter color. Everything ripples: each hop's lines,
  junctions, necks and card borders start `ripple` ms after the hop before,
  and the fade back on leaving ripples out from the same card.
- **Ink:** the selected chip, tab or link is liquid ink. When the selection
  changes, the old item gathers into a drop on the side facing the new one,
  pinches off and follows the ink in.

Both honor `prefers-reduced-motion` and are decorative only: `aria-hidden`,
never the only place information lives.

## Install

```sh
pnpm add https://codeload.github.com/mambattu-dev/connector-ui/tar.gz/v0.7.0
```

The release tarball needs no `git` at install time (slim Docker images have
none), and the lockfile pins its integrity hash.

## Trace

```html
<main style="position: relative">
  <img src="/mark.svg" alt="" data-trace-origin />
  <article data-trace>…</article>
  <article data-trace>…</article>
  <a href="#contact" data-trace data-trace-accent>Start a conversation</a>
</main>
<script type="module">
  import { mountTrace } from "connector-ui";
  const unmount = mountTrace(document.querySelector("main"));
</script>
```

- `[data-trace-origin]`: the spine runs down from this element's center.
- `[data-trace]`: a target. Targets within `near` px of the spine are entered
  from their left edge; ones further right are bridged from the target beside
  them.
- `[data-trace-accent]`: the neck is always the lit color.
- The lit target gets a `data-lit` attribute. Every target gets
  `--trace-tone` (the color for its distance from the lit one) and
  `--trace-delay` (when its hop's fade starts), so borders can fade in step:
  `border-color: var(--trace-tone, var(--trace)); transition: border-color 300ms var(--trace-delay, 0ms);`
- Keep the root's children stacked above the trace (`position: relative`), and
  give cards a solid background. If sections have opaque backgrounds instead,
  lift the trace above them with `.connector-trace { z-index: 1 }`; it only
  draws in gutters and gaps, and ignores the pointer.

Options: `near` (120), `draw` (160, px of scroll a branch takes to draw), `rest`
and `lit` (neck radius, 12 and 18), `fade` (0.5, the share of lit color and
swell each hop keeps), `color` (300, ms a color change takes), `ripple` (60,
ms each hop waits after the one before), `reach` (0.7, how far down the viewport
the line has reached), `entry` (40, px below a card's top where its branch
enters), `scroll` (true; false draws the whole trace at once), `tween` (0; in
ms, swaps the springs for an eased tween that never overshoots, for the necks
and nodes).

## Ink

```js
import { mountInk } from "connector-ui";
const ink = mountInk(document.querySelector("[role=tablist]"), { selected: 0 });
ink.select(3); // or null to clear
ink.destroy();
```

The box's element children are the items. Options: `selected` (null),
`radius` (8), `blur` (6, the goo filter's stdDeviation), `tween` (0; in ms, an
eased tween instead of a spring for the ink), `pour` (700, ms the old item's
drop takes to follow). Change label colors
yourself, a beat after the selection (about 100ms), so they turn as the ink
arrives.

## Strict motion

For a design system that allows no overshoot and caps durations, for example
200ms:

```js
mountTrace(root, { scroll: false, tween: 120, color: 200, ripple: 0 });
mountInk(box, { tween: 160, pour: 200 });
```

## Colors

Set these custom properties on an ancestor; each defaults to `currentColor`.

| Property | Colors |
|---|---|
| `--trace` | the line, nodes and necks |
| `--trace-lit` | a lit branch and accent necks |
| `--ink` | the selection ink |

## Check

```sh
node check.mjs
```
