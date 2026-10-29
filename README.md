# connector-ui

A visual UI library for showing how things on a page relate, with as little
ink as possible. Plain DOM and SVG, no framework, no dependencies. Used by
[mambattu.com](https://mambattu.com) and [machina.so](https://machina.so).

- **Trace:** one hairline from an origin element down the page's gutter,
  branching into each card through a liquid neck. A card beside another is
  bridged across the gap, necked at both ends. It draws once as the reader
  scrolls and never undraws; hovering, focusing or tapping a card lights its
  branch and swells its neck.
- **Ink:** the selected chip, tab or link is liquid ink. When the selection
  changes, the old item gathers into a drop on the side facing the new one,
  pinches off and follows the ink in.

Both honor `prefers-reduced-motion` and are decorative only: `aria-hidden`,
never the only place information lives.

## Install

```sh
pnpm add github:mambattu-dev/connector-ui#v0.1.0
```

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
- The lit target gets a `data-lit` attribute, so its border can light too.
- Keep the root's children stacked above the trace (`position: relative`), and
  give cards a solid background.

Options: `near` (120), `draw` (160, px of scroll a branch takes to draw), `rest`
and `lit` (neck radius, 12 and 18), `reach` (0.7, how far down the viewport
the line has reached), `entry` (40, px below a card's top where its branch
enters).

## Ink

```js
import { mountInk } from "connector-ui";
const ink = mountInk(document.querySelector("[role=tablist]"), { selected: 0 });
ink.select(3); // or null to clear
ink.destroy();
```

The box's element children are the items. Options: `selected` (null),
`radius` (8), `blur` (6, the goo filter's stdDeviation). Change label colors
yourself, a beat after the selection (about 100ms), so they turn as the ink
arrives.

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
