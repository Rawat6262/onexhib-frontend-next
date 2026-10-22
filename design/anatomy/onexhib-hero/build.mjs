/**
 * OneXhib hero test - "many websites in, one catalogue out".
 *
 *   node design/anatomy/onexhib-hero/build.mjs          -> onexhib-hero.html (dark)
 *   node design/anatomy/onexhib-hero/build.mjs --light  -> onexhib-hero-light.html
 *
 * A card-collating bench, made with the Anatomy skill's kit (~/.claude/skills/anatomy).
 * Four card hoppers stand for the websites exhibitions are listed on. Each pushes
 * its bottom card through a throat onto one shared belt, edge wheels carry it on,
 * and the belt takes every card to a single catalogue cabinet. As a card goes in,
 * the drawer for its month opens, takes it, and closes.
 *
 * Standalone test page: nothing here is imported by the website.
 */
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL = join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit", "iso-kit.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts", "inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

/* ── The model: what is true ─────────────────────────────────────────────── */
// Six drawers, two months each, in calendar order: left column top to bottom,
// then the right column.
const DRAWERS = ["Jan–Feb", "Mar–Apr", "May–Jun", "Jul–Aug", "Sep–Oct", "Nov–Dec"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SOURCES = 4;

/* ── World ───────────────────────────────────────────────────────────────── */
const WIDTH = 640;
const HEIGHT = 400;
const PLATE = { x: -172, y: -78, w: 320, d: 122, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;

const HOPPERS = [-120, -82, -44, -6]; // hopper centres along x
const MAG_FRONT = -30; // front wall plane (wall spans -32..-30)
const CARD = { w: 22, d: 14, h: 0.9 }; // an exhibition card, lying flat
const CARD_REST_Y = -38; // card centre in the magazine
const THROAT_Z = 16; // hopper floor, flush with the belt top
const HANDOVER_Y = MAG_FRONT + CARD.d / 2 + 0.5; // card fully out of the magazine
const BELT_Y = 0;
const BELT = { from: -140, to: 58 };
const BELT_TOP = 16;

const CAB = { x: 60, y: -54, w: 72, d: 70, r: 2 }; // front face at y = 16
const CAB_FRONT = CAB.y + CAB.d;
const CAB_TOP = 66;
const DRAWER_W = 30;
const DRAWER_H = 14;
const COLS = [64, 98];
const ROWS = [44, 26, 8]; // top to bottom
const DRAWER_AT = [];
for (const dx of COLS) for (const z of ROWS) DRAWER_AT.push({ dx, z });
const OPEN = 15;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [CAB.x + CAB.w + 2, CAB.y - 2, CAB_TOP + 6], [HOPPERS[0] - 14, -50, 44]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const cardPlan = (cx, cy) => ({ x: cx - CARD.w / 2, y: cy - CARD.d / 2, w: CARD.w, d: CARD.d, r: 0.8 });

/* ── Base ────────────────────────────────────────────────────────────────── */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Ruler strip along the front edge, ticks hanging from its edge.
  const strip = { x: -150, y: PLATE.y + PLATE.d - 14, w: 150, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // Label plate with three rule lines (printed text), riveted.
  const label = { x: 10, y: PLATE.y + PLATE.d - 18, w: 34, d: 11, r: 1 };
  out.push(S(slab(label, 0, 0.8, 3, 0.3), { tone: "mid" }));
  for (const [i, len] of [[0, 22], [1, 16], [2, 19]]) {
    const yy = label.y + 3 + i * 2.6;
    out.push(L(k.lineOnTop([label.x + 5, yy], [label.x + 5 + len, yy], 0.8, P), { tone: "faint", free: "both" }));
  }
  out.push(D([at([label.x + 2.2, label.y + 5.5, 0.8]), at([label.x + label.w - 2.2, label.y + 5.5, 0.8])], { size: 0.45 }));
  return out.join("");
}

/* ── Hoppers (one per source website) ───────────────────────────────────── */
// The actuator and its rod, drawn first: they sit at the back.
function hopperBack(hx, i) {
  const out = [];
  const act = { x: hx - 7, y: -74, w: 14, d: 20, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(act, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(act, 0, 20, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(act, 2.5), 20, P, 3), { tone: "faint" }));
  out.push(D([at([act.x + 3, act.y + 3, 20]), at([act.x + act.w - 3, act.y + act.d - 3, 20])], { size: 0.45 }));
  // Rod from the actuator face to the pusher; rebuilt live as the pusher moves.
  out.push(`<g data-part="rod" data-hopper="${i}">${S(rodOf(hx, 0), { tone: "hi", crease: "none" })}</g>`);
  return out.join("");
}
const ROD_FACE = -54;
const PUSHER_REST = -49; // pusher plate back face
function rodOf(hx, stroke) {
  return slab({ x: hx - 1.1, y: ROD_FACE, w: 2.2, d: PUSHER_REST - ROD_FACE + stroke, r: 0.6 }, THROAT_Z + 0.1, 0.8, 2);
}

function hopperFront(hx, i) {
  const out = [];
  const ped = { x: hx - 15, y: -52, w: 30, d: 22, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(ped, 0, THROAT_Z, 3, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam(ped, 6, P, 3), { tone: "faint" }));
  // Bridge from the throat to the belt's back rail.
  out.push(S(slab({ x: hx - 12, y: -30, w: 24, d: 14, r: 0.5 }, THROAT_Z - 2, 2, 2), { tone: "lo", crease: "none" }));
  // Magazine: back, left and right walls first.
  out.push(S(slab({ x: hx - 13, y: -51, w: 26, d: 2, r: 0.5 }, THROAT_Z + 1.4, 22.6, 2), { tone: "mid" }));
  out.push(S(slab({ x: hx - 13, y: -51, w: 2, d: 21, r: 0.5 }, THROAT_Z, 24, 2), { tone: "mid" }));
  out.push(S(slab({ x: hx + 11, y: -51, w: 2, d: 21, r: 0.5 }, THROAT_Z, 24, 2), { tone: "mid" }));
  // Pusher plate and the card in the throat (both move), then the front wall.
  out.push(`<g data-part="pusher" data-hopper="${i}">${S(slab({ x: hx - 9, y: PUSHER_REST, w: 18, d: 2.5, r: 0.5 }, THROAT_Z, CARD.h, 2), { tone: "hi" })}</g>`);
  out.push(`<g data-slot="throat" data-hopper="${i}"></g>`);
  // A stack of cards sits above the throat card, seen through the window slit.
  const front = { x: hx - 13, y: MAG_FRONT - 2, w: 26, d: 2, r: 0.5 };
  out.push(S(slab(front, THROAT_Z + 1.4, 22.6, 2), { tone: "mid" }));
  const win = { x: hx - 3, z0: THROAT_Z + 6, z1: THROAT_Z + 19 };
  // Window slit on the front wall: a closed slot (two rises joined by two runs).
  out.push(L(k.pathOf([[win.x, MAG_FRONT, win.z0], [win.x, MAG_FRONT, win.z1], [win.x + 6, MAG_FRONT, win.z1], [win.x + 6, MAG_FRONT, win.z0]].map(at), true), { tone: "lo" }));
  out.push(L([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => k.segment([win.x + 0.6, MAG_FRONT, win.z0 + n], [win.x + 5.4, MAG_FRONT, win.z0 + n], P)).join(""), { tone: "faint" }));
  // Lid with a knob.
  out.push(S(slab({ x: hx - 14, y: -52, w: 28, d: 23, r: 1.5 }, THROAT_Z + 24, 2, 3, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(hx, -40.5, 3.4, THROAT_Z + 26, 3, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(hx, -40.5, 3.4, THROAT_Z + 26, THROAT_Z + 29, 22, P), { tone: "lo" }));
  out.push(D([at([hx, -40.5, THROAT_Z + 29])], { size: 0.5, tone: "hi" }));
  out.push(D([at([hx - 11.5, -32, THROAT_Z + 26]), at([hx + 11.5, -32, THROAT_Z + 26])], { size: 0.45 }));
  // Edge wheels at the throat exit, either side of the card's path.
  for (const wx of [hx - 13.6, hx + 13.6]) {
    out.push(S(k.cylinder(wx, -22, 2.2, THROAT_Z - 2, 3.6, P, 20), { tone: "mid" }));
    out.push(L(k.knurl(wx, -22, 2.2, THROAT_Z - 1, THROAT_Z + 1.4, 14, P), { tone: "lo" }));
    out.push(D([at([wx, -22, THROAT_Z + 1.6])], { size: 0.45 }));
  }
  return out.join("");
}

/* ── Conveyor ────────────────────────────────────────────────────────────── */
function conveyor() {
  const out = [];
  // Motor at the head of the belt.
  const motor = { x: -164, y: -13, w: 20, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(motor, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(motor, 0, 26, 4, 0.6), { tone: "mid", inner: k.sideSeam(motor, 20, P, 4) }));
  for (const z of [6, 9, 12]) out.push(L(k.segment([-161, motor.y + motor.d, z], [-149, motor.y + motor.d, z], P), { tone: "lo" }));
  out.push(D([6, 9, 12].flatMap((z) => [at([-161, motor.y + motor.d, z]), at([-149, motor.y + motor.d, z])]), { size: 0.4, tone: "lo" }));
  out.push(S(k.cylinder(-154, 0, 4.6, 26, 3.4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(-154, 0, 4.6, 26, 29.4, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([-154, 0], [-150, 0], 29.4, P), { tone: "hi" }));
  out.push(D([at([-154, 0, 29.4])], { size: 0.5, tone: "hi" }));
  // Legs, bed, belt and rails.
  for (const [x, y] of byDepth([[-134, -9], [-134, 9], [50, -9], [50, 9], [-40, -9], [-40, 9]])) {
    out.push(S(k.cylinder(x, y, 2.4, 0, 10, P, 16), { tone: "lo" }));
  }
  const bed = { x: BELT.from, y: -14, w: BELT.to - BELT.from, d: 28, r: 6 };
  out.push(S(slab(bed, 10, 3, 6, 0.4), { tone: "mid" }));
  const belt = { x: BELT.from + 2, y: -12, w: BELT.to - BELT.from - 4, d: 24, r: 5 };
  out.push(S(slab(belt, 13, BELT_TOP - 13, 6), { tone: "lo", crease: "none" }));
  // Belt cleats run edge to edge across the belt top.
  const cleats = [];
  for (let x = BELT.from + 8; x <= BELT.to - 14; x += 9) cleats.push(k.lineOnTop([x, -12], [x, 12], BELT_TOP, P));
  out.push(`<g data-part="cleats">${L(cleats.join(""), { tone: "faint" })}</g>`);
  for (const y of [-16, 14]) {
    out.push(S(slab({ x: BELT.from, y, w: BELT.to - BELT.from, d: 2, r: 0.6 }, 10, BELT_TOP - 10, 2, 0.3), { tone: "mid" }));
    out.push(D([BELT.from + 6, -60, 20, BELT.to - 6].map((x) => at([x, y + 1, BELT_TOP])), { size: 0.4 }));
  }
  return out.join("");
}

/* ── Cabinet: the one catalogue ─────────────────────────────────────────── */
function cabinetCase() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(CAB, 0, 4, P)}"/>`);
  out.push(S(slab(k.insetPlan(CAB, -1.5), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(CAB, 4, CAB_TOP - 4, 3, 0.6), { tone: "hi", crease: "lo", inner: k.sideSeam(CAB, 6, P, 3) }));
  // Side panel on the +x face: an inset frame and four screws.
  const sx = CAB.x + CAB.w;
  out.push(L(k.pathOf([[sx, CAB.y + 6, 10], [sx, CAB.y + 6, CAB_TOP - 6], [sx, CAB_FRONT - 6, CAB_TOP - 6], [sx, CAB_FRONT - 6, 10]].map(at), true), { tone: "faint" }));
  out.push(D([[CAB.y + 9, 13], [CAB.y + 9, CAB_TOP - 9], [CAB_FRONT - 9, 13], [CAB_FRONT - 9, CAB_TOP - 9]].map(([y, z]) => at([sx, y, z])), { size: 0.45 }));
  // Top cap and the one engraved label.
  const cap = { x: CAB.x - 2, y: CAB.y - 2, w: CAB.w + 4, d: CAB.d + 4, r: 2.5 };
  out.push(S(slab(cap, CAB_TOP, 3.4, 3, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(cap, 4), CAB_TOP + 3.4, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([CAB.x + CAB.w / 2, CAB_FRONT - 12], CAB_TOP + 3.4, P, "x"), "ONEXHIB", { size: 6, tone: "lo", anchor: "middle" }));
  out.push(D(k.corners(cap, 5).map(([x, y]) => at([x, y, CAB_TOP + 3.4])), { size: 0.45 }));
  // Drawer openings: a recessed frame line round each drawer on the case front.
  for (const { dx, z } of DRAWER_AT) {
    out.push(L(k.pathOf([[dx - 1, CAB_FRONT, z - 1], [dx - 1, CAB_FRONT, z + DRAWER_H + 1], [dx + DRAWER_W + 1, CAB_FRONT, z + DRAWER_H + 1], [dx + DRAWER_W + 1, CAB_FRONT, z - 1]].map(at), true), { tone: "lo" }));
  }
  return out.join("");
}

function drawerFront(dx, z) {
  const out = [];
  const front = { x: dx, y: CAB_FRONT, w: DRAWER_W, d: 2, r: 0.6 };
  out.push(S(slab(front, z, DRAWER_H, 2, 0.4), { tone: "mid" }));
  const fy = CAB_FRONT + 2;
  // Label holder: a brass frame with the card in it, two rivets.
  out.push(S(slab({ x: dx + 10, y: fy, w: 10, d: 0.6, r: 0.2 }, z + 8.6, 3.6, 2), { tone: "hi", crease: "lo" }));
  out.push(D([at([dx + 9.4, fy + 0.3, z + 10.4]), at([dx + 20.6, fy + 0.3, z + 10.4])], { size: 0.42 }));
  // Pull: two posts and a bar.
  for (const px of [dx + 11, dx + 19]) out.push(S(slab({ x: px - 0.7, y: fy, w: 1.4, d: 1.6, r: 0.3 }, z + 4, 1.6, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: dx + 10, y: fy + 1.6, w: 10, d: 1.1, r: 0.5 }, z + 4, 1.6, 2), { tone: "mid" }));
  return out.join("");
}

/* ── The card ────────────────────────────────────────────────────────────── */
// Built once at the origin and moved with translateAlong.
const CARD_SVG = S(slab(cardPlan(0, 0), THROAT_Z, CARD.h, 2, 0.3), { tone: "hi", lit: true });
const CARD_LINES = L(
  [[-7, -3, 12], [-7, 0, 8], [-7, 3, 10]].map(([x, y, len]) => k.lineOnTop([x, y], [x + len, y], THROAT_Z + CARD.h, P)).join(""),
  { tone: "lo", free: "both" },
);

const hoppersSorted = HOPPERS.map((hx, i) => ({ hx, i })).sort((a, b) => k.depthOf([a.hx, -40, 0], P) - k.depthOf([b.hx, -40, 0], P));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A card-collating bench. Four card hoppers along the back each push their bottom exhibition card through a throat onto one shared conveyor belt. The belt carries every card to a single card-catalogue cabinet with six drawers, two months each. As a card goes in, the drawer for its month slides open, takes the card and closes.",
  body: [
    base(),
    ...hoppersSorted.map(({ hx, i }) => hopperBack(hx, i)),
    ...hoppersSorted.map(({ hx, i }) => hopperFront(hx, i)),
    conveyor(),
    `<g data-layer="belt-cards"></g>`,
    cabinetCase(),
    ...DRAWER_AT.map(({ dx, z }, i) => `<g data-drawer="${i}"><g data-part="body"></g><g data-part="filed"></g><g data-part="front">${drawerFront(dx, z)}</g></g>`),
  ],
});

/* ── Live ────────────────────────────────────────────────────────────────── */
const live = `
const P = ${JSON.stringify(P)};
const HOPPERS = ${JSON.stringify(HOPPERS)};
const DRAWERS = ${JSON.stringify(DRAWERS)};
const MONTHS = ${JSON.stringify(MONTHS)};
const DRAWER_AT = ${JSON.stringify(DRAWER_AT)};
const C = ${JSON.stringify({ CARD, CARD_REST_Y, HANDOVER_Y, BELT_Y, BELT_TOP, THROAT_Z, CAB_X: CAB.x, CAB_FRONT, DRAWER_W, DRAWER_H, OPEN, PUSHER_REST, ROD_FACE })};
const CARD_SVG = ${JSON.stringify(CARD_SVG + CARD_LINES)};
const NS = "http://www.w3.org/2000/svg";
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const beltLayer = svg.querySelector('[data-layer="belt-cards"]');
const throats = HOPPERS.map((_, i) => svg.querySelector('[data-slot="throat"][data-hopper="' + i + '"]'));
const pushers = HOPPERS.map((_, i) => svg.querySelector('[data-part="pusher"][data-hopper="' + i + '"]'));
const rods = HOPPERS.map((_, i) => svg.querySelector('[data-part="rod"][data-hopper="' + i + '"]'));
const drawers = DRAWER_AT.map((_, i) => svg.querySelector('[data-drawer="' + i + '"]'));
const cleats = svg.querySelector('[data-part="cleats"]');

/* timings, seconds; speeds, units per second */
const PUSH = 0.7, CARRY = 1.1, BELT_SPEED = 78, OPEN_T = 0.45, HOLD = 1.1, DROP = 0.3, EVERY = 1.25;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function makeCard() {
  const g = document.createElementNS(NS, "g");
  g.innerHTML = CARD_SVG;
  return g;
}
/* the card waiting in each throat; it drops in from behind the front wall */
const waiting = HOPPERS.map((hx, i) => { const g = makeCard(); throats[i].appendChild(g); return { g, drop: 1 }; });
const place = (g, x, y, dz = 0) => g.setAttribute("transform", translateAlong(P, [x, y, dz]));

/* deterministic stream: which site feeds next, and the month on each card */
const ORDER = [0, 2, 1, 3, 2, 0, 3, 1];
let serial = 0;
const nextCard = (source) => { const month = (serial * 5 + 2) % 12; serial++; return { source, month }; };
const drawerOf = (month) => Math.floor(month / 2);

const filed = DRAWERS.map(() => 0);
let total = 0;
let flying = []; /* {g, source, month, phase, t, x, y} */
let drawerState = DRAWERS.map(() => ({ open: 0, want: 0, hold: 0, card: null }));
let pick = null; /* hopper chosen by pointer / keys */
let clock = 0, sinceFeed = EVERY, orderAt = 0, last = 0, frame = 0, visible = false, idle = 0, beltShift = 0;
let lastText = "";

/* a hopper only feeds when the belt in front of it is clear, as a real collator
   is timed: no card may arrive on top of one riding past */
const beltClear = (source) => {
  const hx = HOPPERS[source];
  /* reach: how far upstream a belt card gets in the time this card takes to
     leave the throat (push + carry), plus a card's width either side */
  const reach = BELT_SPEED * (PUSH + CARRY / 1.6) + 26;
  return !flying.some((c) => (c.phase === "belt" || c.phase === "carry") && c.x > hx - reach && c.x < hx + 28);
};
function feed(source) {
  const w = waiting[source];
  if (flying.some((c) => c.source === source && c.phase === "push")) return false;
  if (!beltClear(source)) return false;
  const card = { g: w.g, ...nextCard(source), phase: "push", t: 0, x: HOPPERS[source], y: C.CARD_REST_Y };
  flying.push(card);
  /* the next card drops into the throat from behind the wall */
  const g = makeCard(); throats[source].insertBefore(g, throats[source].firstChild);
  waiting[source] = { g, drop: 0, hidden: true };
  g.style.visibility = "hidden";
  readoutFor(card, "feeding");
  return true;
}

function readoutFor(card, verb) {
  const text = "Site " + (card.source + 1) + " · " + MONTHS[card.month] + " → " + DRAWERS[drawerOf(card.month)] + " · " + total.toLocaleString("en-US") + " filed";
  if (text !== lastText) { readout.textContent = text; lastText = text; }
}

function drawDrawer(i, d) {
  const { dx, z } = DRAWER_AT[i];
  const g = drawers[i];
  const open = d.open;
  g.querySelector('[data-part="front"]').setAttribute("transform", translateAlong(P, [0, open, 0]));
  const body = g.querySelector('[data-part="body"]');
  const filedG = g.querySelector('[data-part="filed"]');
  if (open < 0.3) { if (body.firstChild) body.innerHTML = ""; if (filedG.firstChild) filedG.innerHTML = ""; return; }
  /* the part of the drawer box that is out of the case: floor and two side walls */
  body.innerHTML = solidSvg(slabOf({ x: dx + 1, y: C.CAB_FRONT, w: C.DRAWER_W - 2, d: open, r: 0.4 }, z + 1, 9, P, 2), { tone: "mid" });
  /* filed cards stand on edge in the drawer; the new one is lit */
  const reveal = Math.min(1, Math.max(0, (open - 6) / 5));
  if (reveal <= 0) { filedG.innerHTML = ""; return; }
  const cy = C.CAB_FRONT + open - 4.5;
  let html = "";
  /* the box is drawn as one solid, so cards stand on its top (the cards' feet are
     inside it) and rise just above the front, as index cards do */
  for (let n = 0; n < 3; n++) html += solidSvg(slabOf({ x: dx + 6, y: cy - 3 - n * 2.2, w: 18, d: 0.7, r: 0.2 }, z + 10, 5.5, P, 2), { tone: "lo" });
  html += solidSvg(slabOf({ x: dx + 6, y: cy, w: 18, d: 0.7, r: 0.2 }, z + 10, 6.5, P, 2), { tone: "hi", lit: true });
  filedG.innerHTML = html;
  filedG.style.opacity = reveal.toFixed(3);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  sinceFeed += dt;
  if (!still.matches && sinceFeed >= EVERY) {
    sinceFeed = 0;
    const source = pick !== null ? pick : ORDER[orderAt % ORDER.length];
    /* a hopper that must wait keeps its turn; the tour tries again shortly */
    if (feed(source)) { if (pick === null) orderAt++; } else sinceFeed = EVERY - 0.2;
  }
  /* belt cleats creep with the belt */
  beltShift = (beltShift + BELT_SPEED * dt) % 9;
  cleats.setAttribute("transform", translateAlong(P, [beltShift, 0, 0]));

  for (const card of flying) {
    card.t += dt;
    if (card.phase === "push") {
      const s = ease(card.t / PUSH);
      const stroke = s * (C.HANDOVER_Y - C.CARD_REST_Y);
      card.y = C.CARD_REST_Y + stroke;
      place(pushers[card.source], 0, stroke);
      rods[card.source].innerHTML = solidSvg(slabOf({ x: HOPPERS[card.source] - 1.1, y: C.ROD_FACE, w: 2.2, d: C.PUSHER_REST - C.ROD_FACE + stroke, r: 0.6 }, C.THROAT_Z + 0.1, 0.8, P, 2), { tone: "hi", crease: "none" });
      if (s >= 1) { card.phase = "carry"; card.t = 0; beltLayer.appendChild(card.g); }
    } else if (card.phase === "carry") {
      /* the edge wheels carry it the rest of the way onto the belt */
      const s = ease(card.t / CARRY * 1.6);
      card.y = C.HANDOVER_Y + s * (C.BELT_Y - C.HANDOVER_Y);
      if (s >= 1) { card.phase = "belt"; card.t = 0; }
      const back = ease(1 - card.t / 0.5);
      const stroke = back * (C.HANDOVER_Y - C.CARD_REST_Y);
      place(pushers[card.source], 0, stroke);
      rods[card.source].innerHTML = solidSvg(slabOf({ x: HOPPERS[card.source] - 1.1, y: C.ROD_FACE, w: 2.2, d: C.PUSHER_REST - C.ROD_FACE + stroke, r: 0.6 }, C.THROAT_Z + 0.1, 0.8, P, 2), { tone: "hi", crease: "none" });
    } else if (card.phase === "belt") {
      card.x += BELT_SPEED * dt;
      if (card.x > C.CAB_X + 16) {
        card.phase = "in";
        total++;
        const di = drawerOf(card.month);
        filed[di]++;
        Object.assign(drawerState[di], { want: C.OPEN, hold: HOLD });
        /* closed fronts are coplanar, so their order is free; an open drawer stands
           proud of its neighbours and is painted last */
        drawers[di].parentNode.appendChild(drawers[di]);
        readoutFor(card, "filed");
      }
    }
    place(card.g, card.x, card.y);
  }
  for (const card of flying) if (card.phase === "in") card.g.remove();
  flying = flying.filter((c) => c.phase !== "in");

  /* refill each throat: the next card drops from behind the front wall */
  waiting.forEach((w, i) => {
    if (w.drop >= 1) return;
    const busy = flying.some((c) => c.source === i && c.phase === "push");
    if (busy) return;
    if (w.hidden) { w.g.style.visibility = ""; w.hidden = false; }
    w.drop = Math.min(1, w.drop + dt / DROP);
    place(w.g, HOPPERS[i], C.CARD_REST_Y, (1 - ease(w.drop)) * 1.6);
  });

  drawerState.forEach((d, i) => {
    if (d.hold > 0 && d.open >= C.OPEN - 0.2) { d.hold -= dt; if (d.hold <= 0) d.want = 0; }
    const next = still.matches ? d.want : d.open + (d.want - d.open) * (1 - Math.exp(-dt / (OPEN_T / 3)));
    d.open = Math.abs(next - d.want) < 0.05 ? d.want : next;
    drawDrawer(i, d);
  });

  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}

const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

/* pointer: the hopper nearest the pointer feeds next; keys: arrows pick, Enter feeds */
const nearest = (clientX) => {
  const box = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const sx = vb.x + ((clientX - box.left) / box.width) * vb.width;
  let best = 0, gap = Infinity;
  HOPPERS.forEach((hx, i) => { const [hxs] = iso([hx, -40, 30], P); const d = Math.abs(hxs - sx); if (d < gap) { gap = d; best = i; } });
  return best;
};
stage.addEventListener("pointermove", (event) => { pick = nearest(event.clientX); clearTimeout(idle); idle = setTimeout(() => { pick = null; }, 2500); run(); });
stage.addEventListener("pointerleave", () => { pick = null; });
stage.addEventListener("click", (event) => { pick = nearest(event.clientX); feed(pick); sinceFeed = 0; run(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") pick = Math.min(HOPPERS.length - 1, (pick ?? -1) + 1);
  else if (event.key === "ArrowLeft") pick = Math.max(0, (pick ?? HOPPERS.length) - 1);
  else if (event.key === "Enter" || event.key === " ") { feed(pick ?? 0); sinceFeed = 0; }
  else return;
  event.preventDefault();
  stage.setAttribute("aria-valuetext", "Site " + ((pick ?? 0) + 1));
  run();
});

/* the still pose: cards waiting, one card on the belt, one drawer open with its card */
waiting.forEach((w, i) => place(w.g, HOPPERS[i], C.CARD_REST_Y));
if (still.matches) {
  const g = makeCard(); beltLayer.appendChild(g); place(g, -20, C.BELT_Y);
  Object.assign(drawerState[1], { open: C.OPEN, want: C.OPEN }); drawDrawer(1, drawerState[1]);
}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Many sites, one catalogue",
  hint: "Point at a site · click to feed",
  readout: "Site 1 · Mar → Mar–Apr · 0 filed",
  keys: [
    { mark: "lit", label: "An exhibition card: one listing on its way into the catalogue" },
    { mark: "raised", label: "Four hoppers, one per source site; one belt; one cabinet" },
  ],
  caption:
    "Exhibitions are listed on many separate websites. The four hoppers stand for them: each pushes its listings onto one shared belt, and every listing lands in a single catalogue, filed by month. That catalogue is OneXhib.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Card-collating bench: left and right arrows choose a source site, Enter sends a card" aria-valuetext="Site 1">${svg}</div>`,
});

const file = theme === "light" ? "onexhib-hero-light.html" : "onexhib-hero.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "OneXhib: many sites, one catalogue", theme, body, script: kitScript() + live }));
console.log("wrote", file);
