// Ounce — sequenza di fotogrammi Blender legata allo scroll. Il poster si vede subito; i fotogrammi arrivano a passate
// (ogni 8, poi 4, 2, 1), lo scroll funziona dal primo istante con il più vicino già caricato.
export function start(container, state, opts) {
  const { name, count, progress, observe } = opts;
  const folder = innerWidth < 700 || innerHeight > innerWidth * 1.1 ? "m" : "d";
  const url = i => new URL(`../img/seq/${name}-${folder}/${String(i).padStart(3, "0")}.webp`, import.meta.url).href;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "seq__canvas";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });

  const frames = new Array(count).fill(null);
  let drawn = -1, sized = false;

  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    sized = true; drawn = -1;
  }
  function nearest(i) {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]) return i - d;
      if (frames[i + d]) return i + d;
    }
    return -1;
  }
  function draw() {
    if (!sized) resize();
    const i = nearest(Math.round(Math.min(1, Math.max(0, state.p)) * (count - 1)));
    if (i < 0 || i === drawn) return;
    const img = frames[i], W = canvas.width, H = canvas.height;
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (drawn < 0) container.classList.add("is-live");
    const dir = i >= drawn ? 1 : -1;
    for (let d = 1; d <= 3; d++) frames[i + d * dir]?.decode?.().catch(() => {});
    drawn = i;
  }

  const order = [], seen = new Set();
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let next = 0, done = 0, resolveAll;
  const all = new Promise(r => { resolveAll = r; });
  function pump() {
    if (next >= order.length) return;
    const i = order[next++], img = new Image();
    img.decoding = "async";
    const after = ok => {
      if (ok) frames[i] = img;
      done++;
      progress?.(done / order.length);
      if (done === order.length) resolveAll(frames.filter(Boolean).length);
      pump();
    };
    img.onload = () => after(true);
    img.onerror = () => after(false);
    img.src = url(i);
  }
  for (let k = 0; k < 6; k++) pump();

  let raf = 0, inView = true;
  const loop = () => { raf = requestAnimationFrame(loop); draw(); };
  const resume = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView && !document.hidden ? resume() : pause(); }, { rootMargin: "50px" }).observe(observe || container);
  document.addEventListener("visibilitychange", () => (document.hidden || !inView ? pause() : resume()));
  let rz = 0;
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); });
  resume();
  return { all };
}
