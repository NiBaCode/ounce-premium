// Ounce premium — regia della pagina (GSAP 3.15 + ScrollTrigger + Lenis 1.3, locali).
const { gsap, ScrollTrigger, Lenis } = window;
const params = new URLSearchParams(location.search);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
if (!reduce && Lenis) {
  lenis = new Lenis({ lerp: 0.1 });   // i link # li gestisce questo file (vedi in fondo): con anchors Lenis rifaceva lo scroll dopo il nostro
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;   // per le prove
}

const still = reduce || navigator.connection?.saveData || params.has("still");
const A = { p: 0 }, C = { p: 0 };

// ---------- sequenze: la prima parte subito, la seconda quando il caveau si avvicina
if (!still) {
  const load = $("[data-seq-load]"), bar = load.firstElementChild;
  import("./seq.js").then(m => {
    m.start($('[data-seq="a"]'), A, { name: "a", count: 120, observe: $(".film"), progress: k => { bar.style.transform = "scaleX(" + k + ")"; } })
      .all.then(() => load.classList.add("is-done"));
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      m.start($('[data-seq="c"]'), C, { name: "c", count: 60, observe: $(".vault") });
    }, { rootMargin: "150% 0px" }).observe($(".vault"));
  }).catch(err => { console.warn("Sequence off, poster kept:", err); load.classList.add("is-done"); });
} else {
  $("[data-seq-load]").classList.add("is-done");
}

if (!reduce) {
  // ---------- 1-2 · film: l'apertura esce, poi un importo alla volta. Le tappe sono ai fotogrammi 0, 24, 48, 72, 96 su 120.
  gsap.to(A, { p: 1, ease: "none", scrollTrigger: { trigger: "[data-film-run]", start: "top top", end: "bottom bottom", scrub: .5 } });
  const steps = $$(".scale__step"), scale = $("[data-scale]"), hero = $("[data-hero]");
  gsap.set(steps, { autoAlpha: 0, y: 14 });
  const STOP = [.2, .4, .6, .8].map(x => x * 119 / 120);   // quota dello scroll a cui il cubo è in scena
  const tl = gsap.timeline({ defaults: { ease: "none" } });
  tl.to(hero, { autoAlpha: 0, y: -28, duration: .05 }, .045)
    .set(scale, { visibility: "visible" }, .09)
    .fromTo(scale, { autoAlpha: 0 }, { autoAlpha: 1, duration: .04 }, .1);
  steps.forEach((s, i) => {
    tl.to(s, { autoAlpha: 1, y: 0, duration: .035 }, STOP[i] - .06);
    if (i < steps.length - 1) tl.to(s, { autoAlpha: 0, y: -14, duration: .03 }, STOP[i] + .1);
  });
  tl.to(scale, { autoAlpha: 0, duration: .04 }, .86).to({}, { duration: .01 }, .99);
  ScrollTrigger.create({ trigger: "[data-film-run]", start: "top top", end: "bottom bottom", scrub: .3, animation: tl, invalidateOnRefresh: true });

  // ---------- 3 · app: l'oro pieno del film si stringe fino a diventare lo schermo, poi un passo alla volta
  const items = $$("[data-step]"), screens = $$("[data-screen]");
  gsap.set(items.slice(1), { autoAlpha: 0, y: 16 });
  const at = gsap.timeline({ defaults: { ease: "none" } });
  let T0 = .3;
  if (!still) {
    document.documentElement.classList.add("js-gold");
    const gold = $("[data-app-gold]"), stage = $(".app__stage"), scr = $(".phone__screen");
    gold.querySelector("img").loading = "eager"; $(".phone__bezel").loading = "eager";
    // ritaglio che coincide con lo schermo del telefono, misurato a ogni refresh (anche dopo un resize)
    const screenClip = () => {
      const g = stage.getBoundingClientRect(), s = scr.getBoundingClientRect(), r = parseFloat(getComputedStyle(scr).borderTopLeftRadius) || 0;
      return `inset(${s.top - g.top}px ${g.right - s.right}px ${g.bottom - s.bottom}px ${s.left - g.left}px round ${r}px)`;
    };
    const count = $("[data-count]"), N = { v: 0 }, to = parseFloat(count.dataset.count);
    const show = () => { count.textContent = N.v.toFixed(1).replace(".", ","); };
    gsap.set([".phone", "[data-app-copy] > *", screens[0]], { autoAlpha: 0 });   // > *: su desktop il contenitore è display: contents
    at.fromTo(gold, { clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: screenClip, duration: .17, ease: "power2.inOut", immediateRender: true }, .02)
      .to(".phone", { autoAlpha: 1, duration: .05 }, .14)
      .to(screens[0], { autoAlpha: 1, duration: .04 }, .19)
      .to("[data-app-copy] > *", { autoAlpha: 1, duration: .05, stagger: .015 }, .2)
      .fromTo(N, { v: 0 }, { v: to, duration: .1, ease: "power1.out", onUpdate: show, immediateRender: false }, .2);
    // la sezione resta invisibile mentre si sovrappone alla fine del film, appare quando si ferma in alto (stesso oro, nessuno stacco)
    ScrollTrigger.create({ trigger: ".app", start: "top top", onEnter: () => $(".app").classList.add("is-on"), onLeaveBack: () => $(".app").classList.remove("is-on") });
    show();
    T0 = .44;
  }
  [0, 1].forEach(i => {
    const t = T0 + i * (.88 - T0) / 2;
    at.to(items[i], { autoAlpha: 0, y: -14, duration: .05 }, t).to(items[i + 1], { autoAlpha: 1, y: 0, duration: .06 }, t + .05)
      .to(screens[i], { opacity: 0, duration: .05 }, t).to(screens[i + 1], { opacity: 1, duration: .06 }, t + .03);
  });
  at.to({}, { duration: .01 }, .99);
  ScrollTrigger.create({ trigger: "[data-app-run]", start: "top top", end: "bottom bottom", scrub: .3, animation: at, invalidateOnRefresh: true });

  // ---------- 5 · caveau: si cammina fino al lingotto, il modulo entra alla fine
  gsap.to(C, { p: 1, ease: "none", scrollTrigger: { trigger: "[data-vault-run]", start: "top bottom", end: "bottom bottom", scrub: .5 } });
  gsap.from("[data-vault-copy]", { autoAlpha: 0, y: 26, ease: "none", scrollTrigger: { trigger: "[data-vault-run]", start: "45% top", end: "62% top", scrub: .3 } });
}

// ---------- modulo: solo front-end, invio simulato
(function form() {
  const f = $("[data-form]"); if (!f) return;
  const input = $("input", f), msg = $(".form__msg", f), label = $("[data-btn-label]", f), btn = $("button", f);
  const idle = msg.textContent;
  input.addEventListener("input", () => { if (btn.disabled) return; input.removeAttribute("aria-invalid"); msg.classList.remove("is-error"); msg.textContent = idle; });
  f.addEventListener("submit", e => {
    e.preventDefault();
    if (!input.value.trim() || !input.checkValidity()) {
      input.setAttribute("aria-invalid", "true"); msg.className = "form__msg is-error";
      msg.textContent = "Escribe un correo válido, por ejemplo nombre@correo.com."; input.focus(); return;
    }
    btn.disabled = true; label.textContent = "Guardando tu lugar…";
    setTimeout(() => {
      label.textContent = "Ya estás en la lista"; msg.className = "form__msg is-ok";
      msg.textContent = "Listo. Te escribiremos una sola vez, cuando la app esté lista.";
    }, 900);
  });
})();

// Link interni. #lista: fine del caveau, dove il modulo è visibile, poi cursore nel campo.
// #escala: il punto della corsa in cui appare la prima tappa (100 €). Gli altri: inizio della sezione.
const runEnd = (sel, k) => { const r = $(sel), top = r.getBoundingClientRect().top + scrollY; return top + (r.offsetHeight - innerHeight) * k; };
$$('a[href^="#"]:not(.skip)').forEach(a => a.addEventListener("click", e => {
  const id = a.getAttribute("href"), focusMail = () => $("#email")?.focus({ preventScroll: true });
  if (!lenis) { if (id === "#lista") setTimeout(focusMail, 50); return; }
  e.preventDefault();
  if (id === "#lista") lenis.scrollTo(runEnd("[data-vault-run]", 1), { duration: 2.2, onComplete: focusMail });
  else if (id === "#escala") lenis.scrollTo(runEnd("[data-film-run]", .2), { duration: 1.6 });
  else if (id === "#top") lenis.scrollTo(0, { duration: 1.6 });
  else if (id === "#app" && document.documentElement.classList.contains("js-gold")) lenis.scrollTo(runEnd("[data-app-run]", .3), { duration: 1.6 });   // a telefono già formato
  else if ($(id)) lenis.scrollTo($(id).getBoundingClientRect().top + scrollY, { duration: 1.6 });
}));
