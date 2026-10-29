// connector-ui: a hairline trace with liquid necks, and liquid selection ink.
// Plain DOM and SVG, no framework, no dependencies. Colors come from CSS
// custom properties so each site keeps its own palette:
//   --trace       the trace, its nodes and necks        (default currentColor)
//   --trace-lit   a lit branch, and accent necks        (default currentColor)
//   --ink         the selection ink                     (default currentColor)

const SVG = "http://www.w3.org/2000/svg";
const n = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (t) => 1 - (1 - t) ** 4; // close to cubic-bezier(0.22, 1, 0.36, 1)

function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent?.append(e);
  return e;
}

// MARK: Geometry
// The liquid neck where a trace meets a card edge at (ex, ey): a filled
// trumpet, zero wide r from the edge and 2r wide at it. The quadratics' control
// point is the entry itself, so the sides sag inward (concave) like a pour.
// `side` is where the trace comes from: "left" enters a card's left edge,
// "right" leaves a card's right edge (a bridge to its neighbour).
export function neck(ex, ey, r, side) {
  const [x, y, a] = [n(ex), n(ey), n(side === "left" ? ex - r : ex + r)];
  return `M${a} ${y} Q${x} ${y} ${x} ${n(ey - r)} V${n(ey + r)} Q${x} ${y} ${a} ${y} Z`;
}

// A level hairline from (sx, y) to the entry at (ex, y).
export const branch = (sx, ex, y) => `M${n(sx)} ${n(y)}H${n(ex)}`;

// MARK: Motion
// one damped spring step (unit mass); false once it has settled on `to`
function spring(s, to, dt, k, c) {
  s.v += (-k * (s.x - to) - c * s.v) * dt;
  s.x += s.v * dt;
  if (Math.abs(s.v) > 0.01 || Math.abs(s.x - to) > 0.01) return true;
  s.x = to;
  s.v = 0;
  return false;
}

// keyframes of plain objects over `dur` ms; null once finished
function keyframes(a, t) {
  const p = clamp((t - a.delay) / a.dur, 0, 1);
  const i = Math.max(a.times.findIndex((x) => x >= p), 1);
  const [t0, t1] = [a.times[i - 1], a.times[i]];
  const e = ease(t1 > t0 ? (p - t0) / (t1 - t0) : 1);
  const [f0, f1] = [a.frames[i - 1], a.frames[i]];
  const v = {};
  for (const k in f1) v[k] = f0[k] + (f1[k] - f0[k]) * e;
  return { v, done: p >= 1 };
}

// a rAF loop that runs only while `tick(dt)` says something is still moving
function loop(tick) {
  let id = 0;
  let t0 = 0;
  const run = (t) => {
    const dt = Math.min((t - t0) / 1000, 1 / 30);
    t0 = t;
    id = tick(dt, t) ? requestAnimationFrame(run) : 0;
  };
  return {
    kick() {
      if (id) return;
      t0 = performance.now();
      id = requestAnimationFrame(run);
    },
    stop: () => cancelAnimationFrame(id),
  };
}

// position in `root`, ignoring transforms (an element mid-reveal is still offset)
function place(e, root) {
  let x = 0;
  let y = 0;
  for (let o = e; o && o !== root; o = o.offsetParent) {
    x += o.offsetLeft;
    y += o.offsetTop;
  }
  return { x, y, w: e.offsetWidth, h: e.offsetHeight };
}

// MARK: Trace
// One hairline from the origin element down its column, branching into every
// target with a liquid neck. A target more than `near` px right of the spine is
// bridged from the target beside it in its row instead. The line draws once,
// as far as the reader has scrolled, and never undraws. Hovering, focusing or
// tapping a target lights its branch and swells its neck, and sets `data-lit`
// on it so the site can light its border too. `root` must be positioned, and
// its children stacked above the trace. Returns a function that unmounts it.
//   [data-trace-origin]  where the spine starts (its center x)
//   [data-trace]         a target
//   [data-trace-accent]  a target whose neck is always the lit color
export function mountTrace(root, { near = 120, draw = 160, rest = 12, lit = 18, reach: ratio = 0.7, entry = 40 } = {}) {
  const svg = el("svg", { "aria-hidden": "true" });
  svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible";
  root.prepend(svg);
  const base = "var(--trace, currentColor)";
  const hot = "var(--trace-lit, currentColor)";
  let geo = null;
  let spine = null;
  let items = [];
  let reach = 0;
  let litEl = null;
  let sig = "";

  // MARK: Measure
  const measure = () => {
    const mark = root.querySelector("[data-trace-origin]");
    if (!mark) return;
    const m = place(mark, root);
    const sx = m.x + m.w / 2;
    const boxes = [...root.querySelectorAll("[data-trace]")].map((e) => ({ e, ...place(e, root) }));
    const targets = boxes
      .map((b) => {
        const accent = b.e.hasAttribute("data-trace-accent");
        const ey = b.y + (accent ? b.h / 2 : entry);
        if (b.x - sx < near) return { el: b.e, sy: ey, ex: b.x, ey, accent };
        const left = boxes.filter((o) => o.x + o.w <= b.x && o.y < ey && o.y + o.h > ey).sort((a, c) => c.x + c.w - (a.x + a.w))[0];
        return left && { el: b.e, sy: ey, from: left.x + left.w, ex: b.x, ey, accent };
      })
      .filter(Boolean)
      .sort((a, b) => a.sy - b.sy);
    const next = JSON.stringify([root.clientWidth, root.offsetHeight, sx, m.y + m.h, targets.map((t) => [t.sy, t.from, t.ex])]);
    geo = { sx, y0: m.y + m.h + 6, top: root.getBoundingClientRect().top + scrollY, targets };
    if (next !== sig) {
      sig = next;
      build();
    }
    update();
  };

  // MARK: Build
  const build = () => {
    svg.replaceChildren();
    svg.setAttribute("width", root.clientWidth);
    svg.setAttribute("height", root.offsetHeight);
    const { sx, y0, targets } = geo;
    spine = null;
    items = [];
    if (!targets.length) return;
    const line = { fill: "none", "stroke-width": 1.5, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 };
    spine = el("path", { ...line, d: `M${sx} ${y0}V${targets.at(-1).sy}`, style: `stroke:${base}` }, svg);
    items = targets.map((t) => {
      const bridge = t.from !== undefined;
      const path = el("path", { ...line, d: branch(bridge ? t.from : sx, t.ex, t.ey), style: `stroke:${base};transition:stroke .3s,stroke-width .3s` }, svg);
      const pop = "transform-box:fill-box;transform-origin:center;transform:scale(0);transition:transform .35s cubic-bezier(.22,1,.36,1)";
      const nodes = bridge
        ? []
        : [el("circle", { cx: sx, cy: t.sy, r: 5, fill: "none", "stroke-width": 0.75, style: `stroke:${base};${pop}` }, svg), el("circle", { cx: sx, cy: t.sy, r: 2.5, style: `fill:${base};${pop}` }, svg)];
      const necks = [[t.ex, "left"], ...(bridge ? [[t.from, "right"]] : [])].map(([x, side]) => ({ x, side, p: el("path", { style: `fill:${t.accent ? hot : base};transition:fill .3s` }, svg) }));
      return { t, path, nodes, necks, cap: bridge ? (t.ex - t.from) / 2 : Infinity, r: { x: 0, v: 0 }, done: false };
    });
    for (const it of items) light(it);
  };

  // MARK: Draw
  const update = () => {
    if (!spine) return;
    reach = still() ? Infinity : Math.max(reach, scrollY + innerHeight * ratio - geo.top);
    const { y0, targets } = geo;
    spine.style.strokeDashoffset = 1 - clamp((reach - y0) / (targets.at(-1).sy - y0 || 1), 0, 1);
    let moved = false;
    for (const it of items) {
      const p = clamp((reach - it.t.sy) / draw, 0, 1);
      it.path.style.strokeDashoffset = 1 - p;
      it.path.style.opacity = p > 0 ? 1 : 0; // a zero-length round cap still paints a dot
      if (p >= 1 && !it.done) {
        it.done = moved = true;
        for (const c of it.nodes) c.style.transform = "scale(1)";
      }
    }
    if (moved || still()) motion.kick();
  };

  const motion = loop((dt) => {
    let moving = false;
    for (const it of items) {
      const to = !it.done ? 0 : it.t.el === litEl ? lit : rest;
      if (still()) it.r.x = to;
      else moving = spring(it.r, to, dt, 260, 11) || moving;
      const r = clamp(it.r.x, 0, it.cap);
      for (const k of it.necks) k.p.setAttribute("d", neck(k.x, it.t.ey, r, k.side));
    }
    return moving;
  });

  // MARK: Lighting
  // decorative only: one target lit at a time
  const light = (it) => {
    const on = it.t.el === litEl;
    it.path.style.stroke = on ? hot : base;
    it.path.style.strokeWidth = on ? 2 : 1.5;
    for (const k of it.necks) k.p.style.fill = on || it.t.accent ? hot : base;
  };
  const setLit = (e) => {
    if (e === litEl) return;
    litEl?.removeAttribute("data-lit");
    litEl = e;
    litEl?.setAttribute("data-lit", "");
    items.forEach(light);
    motion.kick();
  };
  const at = (e) => e.target.closest?.("[data-trace]") ?? null;
  const leave = (e) => at(e) === (e.relatedTarget?.closest?.("[data-trace]") ?? null) || setLit(null);
  const on = {
    pointerover: (e) => setLit(at(e)),
    pointerout: (e) => e.pointerType === "mouse" && leave(e),
    focusin: (e) => setLit(at(e)),
    focusout: leave,
    click: (e) => setLit(at(e)),
  };
  for (const k in on) root.addEventListener(k, on[k]);
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);

  const ro = new ResizeObserver(measure); // fires once on observe: the first measure
  ro.observe(root);
  root.querySelectorAll("[data-trace]").forEach((e) => ro.observe(e));
  document.fonts?.ready.then(measure);

  return () => {
    ro.disconnect();
    for (const k in on) root.removeEventListener(k, on[k]);
    removeEventListener("scroll", update);
    removeEventListener("resize", update);
    motion.stop();
    litEl?.removeAttribute("data-lit");
    svg.remove();
  };
}

// MARK: Ink
// The selected item's fill as liquid ink, under the items of `box` (its element
// children). The head springs from the old choice to the new one; the tail
// gathers into a drop at the old item's edge facing the new one, then trails
// the head and is absorbed. A goo filter fuses them, so a neck stretches out
// of the old item and pinches off: the direction of the change reads at any
// distance. Labels stay above, unfiltered. Returns { select(index | null), destroy() }.
export function mountInk(box, { selected = null, radius = 8, blur = 6 } = {}) {
  if (getComputedStyle(box).position === "static") box.style.position = "relative";
  box.style.isolation = "isolate";
  const svg = el("svg", { "aria-hidden": "true" });
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:-1";
  const id = `ink-${Math.random().toString(36).slice(2)}`;
  const f = el("filter", { id, x: "-20%", y: "-20%", width: "140%", height: "140%" }, el("defs", {}, svg));
  el("feGaussianBlur", { stdDeviation: blur }, f);
  el("feColorMatrix", { type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" }, f);
  el("feComposite", { operator: "atop", in: "SourceGraphic" }, f);
  const g = el("g", { filter: `url(#${id})`, style: "fill:var(--ink, currentColor)" }, svg);
  const headEl = el("rect", { rx: radius }, g);
  const tailEl = el("rect", {}, g);
  box.prepend(svg);

  const KEYS = ["x", "y", "w", "h"];
  const head = Object.fromEntries(KEYS.map((k) => [k, { x: 0, v: 0 }]));
  let rects = [];
  let sel = selected;
  let last = selected;
  let target = null; // head springs to this rect, or…
  let retract = null; // …tweens into a dot when the selection clears
  let tail = null;

  const dot = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0, h: 0 });
  const paint = (e, v, rx) => {
    e.setAttribute("x", v.x);
    e.setAttribute("y", v.y);
    e.setAttribute("width", Math.max(v.w, 0));
    e.setAttribute("height", Math.max(v.h, 0));
    if (rx !== undefined) e.setAttribute("rx", Math.max(rx, 0));
  };
  const jump = (v) => KEYS.forEach((k) => Object.assign(head[k], { x: v[k], v: 0 }));
  const headNow = () => Object.fromEntries(KEYS.map((k) => [k, head[k].x]));

  const motion = loop((dt, t) => {
    let moving = false;
    if (target) for (const k of KEYS) moving = spring(head[k], target[k], dt, 260, 28) || moving;
    if (retract) {
      const { v, done } = keyframes(retract, t - retract.t0);
      jump(v);
      if (done) retract = null;
      else moving = true;
    }
    paint(headEl, headNow());
    if (tail) {
      const { v, done } = keyframes(tail, t - tail.t0);
      paint(tailEl, v, v.rx);
      if (done) tail = null;
      else moving = true;
    }
    if (!tail) paint(tailEl, { x: 0, y: 0, w: 0, h: 0 });
    return moving;
  });

  const measure = () => {
    rects = [...box.children].filter((e) => e !== svg).map((e) => ({ x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }));
    // a resize snaps the ink into place, no motion
    target = rects[sel] ?? null;
    retract = tail = null;
    jump(target ?? { x: 0, y: 0, w: 0, h: 0 });
    paint(headEl, headNow());
    paint(tailEl, { x: 0, y: 0, w: 0, h: 0 });
  };

  const select = (i) => {
    if (i === sel) return;
    const [A, B] = [rects[sel], rects[i]];
    sel = i;
    if (i !== null) last = i;
    if (still() || !rects.length) return measure();
    const t0 = performance.now();
    if (!B) {
      // cleared: the ink draws back into a dot where it was
      target = null;
      retract = { t0, delay: 0, dur: 550, times: [0, 1], frames: [headNow(), dot(rects[last] ?? headNow())] };
    } else {
      if (!A) jump(dot(B)); // first pick: grow from the new item's center
      target = B;
      retract = null;
    }
    if (A && B) {
      const [ax, ay, bx, by] = [A.x + A.w / 2, A.y + A.h / 2, B.x + B.w / 2, B.y + B.h / 2];
      const [fx, fy] = [ax + clamp(bx - ax, -A.w / 2, A.w / 2), ay + clamp(by - ay, -A.h / 2, A.h / 2)];
      const d = Math.min(A.h, B.h) * 0.6;
      tail = {
        t0,
        delay: 40,
        dur: 700,
        times: [0, 0.35, 1],
        frames: [
          { ...A, rx: radius },
          { x: fx - d / 2, y: fy - d / 2, w: d, h: d, rx: d / 2 },
          { x: bx - d / 4, y: by - d / 4, w: d / 2, h: d / 2, rx: d / 4 },
        ],
      };
    }
    motion.kick();
  };

  const ro = new ResizeObserver(measure); // fires once on observe: the first measure
  ro.observe(box);
  [...box.children].forEach((e) => e !== svg && ro.observe(e));

  return {
    select,
    destroy() {
      ro.disconnect();
      motion.stop();
      svg.remove();
    },
  };
}
