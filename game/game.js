// กิลด์ยามดึก: idle fantasy adventure gacha with daily quests.
// Sim runs in fixed logical pixels (LW x LH); the canvas is scaled by a whole number so pixels stay crisp.
"use strict";
const $ = s => document.querySelector(s);
const LW = 160, LH = 150;
const SAVE_KEY = "nightguild-save-v1";
const OFFLINE_CAP = 8 * 3600;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const today = () => new Date().toLocaleDateString("en-CA");

function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  const units = ["K", "M", "B", "T", "aa", "ab", "ac", "ad"];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + units[u];
}
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (h) return `${h} ชม. ${m} น.`;
  if (m) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s} วิ`;
}

// ---------- Optional art from assets/ (falls back to code-drawn pixels) ----------
const ART = {};
let artRefresh = 0;
function loadArt(key, path) {
  const img = new Image();
  img.onload = () => { ART[key] = img; clearTimeout(artRefresh); artRefresh = setTimeout(() => { renderParty(true); renderPanel(); }, 120); };
  img.src = path;
}
function loadAllArt() {
  Object.keys(HEROES).forEach(id => { loadArt("hero:" + id, `assets/heroes/${id}.png`); loadArt("portrait:" + id, `assets/portraits/${id}.png`); });
  Object.keys(MONSTERS).forEach(id => loadArt("mob:" + id, `assets/monsters/${id}.png`));
  BOSSES.forEach((_, i) => loadArt("boss:" + i, `assets/monsters/boss${i + 1}.png`));
  WORLDS.forEach(w => loadArt("bg:" + w.theme, `assets/bg/${w.theme}.png`));
  Object.keys(GEAR).forEach(id => loadArt("gear:" + id, `assets/gear/${id}.png`));
  loadArt("portrait:master", "assets/portraits/master.png");
}

// ---------- Sprite cache ----------
const SPR = {};
function build(g, pal) {
  const s = { w: g.w, h: g.h, img: Pix.toCanvas(g, pal), white: Pix.toCanvas(g, pal, 1, false, true) };
  s.flip = Pix.toCanvas(g, pal, 1, true); s.whiteFlip = Pix.toCanvas(g, pal, 1, true, true);
  s.url = Pix.toCanvas(g, pal, 4).toDataURL();
  return s;
}
function sprite(key) {
  if (SPR[key]) return SPR[key];
  const [kind, id] = key.split(":");
  let s;
  if (kind === "hero") { const L = HEROES[id].look; s = build(Pix.chibi(L), Pix.palette(L)); }
  else if (kind === "rear") { const L = HEROES[id].look; s = build(Pix.humanoid(L, true), Pix.palette(L)); }
  else if (kind === "master") { const L = { skin: "#e0b090", hair: "#3a2a2a", style: "long", outfit: "#2a2a2a", accent: "#e8e0cc", weapon: "none" }; s = build(Pix.chibi(L), Pix.palette(L)); }
  else if (kind === "gear") { const d = GEAR[id], c = GEAR_COLORS[d.rarity]; s = build(Pix.icon(d.icon), Pix.palette({ outfit: c.o, accent: c.a, wood: c.w, metal: c.metal })); }
  else {
    const d = kind === "boss" ? BOSSES[id] : MONSTERS[id];
    if (d.humanoid) s = build(Pix.chibi(d.humanoid), Pix.palette(d.humanoid));
    else s = build(Pix.monster({ kind: d.kind, extras: kind === "boss" ? ["crown"] : [] }), Pix.palette(d.look));
  }
  return (SPR[key] = s);
}
// Picture for DOM: prefer the bust portrait, then the pixel sprite.
function heroPic(id) {
  const a = ART["portrait:" + id];
  return a ? { src: a.src, art: true } : { src: sprite("hero:" + id).url, art: false };
}
function gearPic(id) {
  const a = ART["gear:" + id];
  return a ? { src: a.src, art: true } : { src: sprite("gear:" + id).url, art: false };
}
const imgTag = (p, cls = "") => `<img class="${cls} ${p.art ? "art" : "pix"}" src="${p.src}" alt="">`;

// ---------- Save ----------
let S;
function freshState() {
  const heroes = {};
  STARTER_TEAM.forEach(id => heroes[id] = { lv: 1, star: 1 });
  return {
    v: 1, gold: 50, beans: 3000, stage: 1, best: 1, autoNext: true, auto: true, speed: 1,
    heroes, team: [...STARTER_TEAM], gear: [], uid: 1,
    pity: { hero: 0, gear: 0 }, free: { hero: "", gear: "" },
    daily: null,
    last: Date.now(), introDone: false, tapTip: false, seen: {}, autoSalvageR: false, kills: 0, pulls: 0,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = Object.assign(freshState(), JSON.parse(raw)); delete S.farm; delete S.harvests; migrate(); return true; }
  } catch (e) { /* private mode or broken save: start fresh */ }
  S = freshState();
  return false;
}
function migrate() {
  S.seen = S.seen || {};
  // gear used to level 1-30 with gold; it now enhances +0 to +10 and carries rolled extra stats
  S.gear.forEach(g => {
    if (g.plus === undefined) g.plus = Math.min(PLUS_MAX, Math.floor(((g.lv || 1) - 1) / 2));
    if (!g.subs) g.subs = rollSubs(GEAR[g.id].rarity);
    delete g.lv;
  });
  Object.entries(RENAMED).forEach(([from, to]) => {
    if (S.heroes[from]) { S.heroes[to] = S.heroes[from]; delete S.heroes[from]; }
    S.team = S.team.map(id => id === from ? to : id);
    S.gear.forEach(g => { if (g.by === from) g.by = to; });
  });
}
function save() {
  S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}

// ---------- Stats ----------
const heroLvCost = lv => Math.round(15 * Math.pow(1.14, lv - 1));
const gearRm = r => ({ R: 1, SR: 1.6, SSR: 2.4 })[r];
const plusCost = g => Math.round(killGold(S.best) * 20 * gearRm(GEAR[g.id].rarity) * Math.pow(1.5, g.plus));
const gearSalvage = g => Math.round(killGold(S.best) * 5 * gearRm(GEAR[g.id].rarity) * (1 + g.plus));
const DUPE_BEANS = { R: 15, SR: 50, SSR: 200 };

function rollSubs(rarity) {
  const pool = [...SUB_POOL], subs = [];
  for (let i = 0; i < SUB_COUNT[rarity]; i++) {
    const s = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    subs.push({ k: s.k, v: +(rand(s.min, s.max) * gearRm(rarity)).toFixed(s.k === "crit" ? 3 : 1) });
  }
  return subs;
}
function newGear(id) { return { uid: S.uid++, id, plus: 0, subs: rollSubs(GEAR[id].rarity), by: null }; }
function gearStats(g) {
  const d = GEAR[g.id], f = 1 + .12 * g.plus, o = {};
  ["atk", "hp", "def"].forEach(k => { if (d[k]) o[k] = d[k] * f; });
  if (d.crit) o.crit = d.crit * (1 + .04 * g.plus);
  if (d.spd) o.spd = d.spd * (1 + .04 * g.plus);
  (g.subs || []).forEach(s => { o[s.k] = (o[s.k] || 0) + s.v; });
  return o;
}
function passiveOf(id) { return S.heroes[id] && S.heroes[id].lv >= PASSIVE_LV ? HEROES[id].passive : null; }
const teamAura = () => S.team.reduce((a, id) => { const p = id && passiveOf(id); return a + (p && p.kind === "aura" ? p.spd : 0); }, 0);
function heroStats(id) {
  const d = HEROES[id], o = S.heroes[id], r = ROLE[d.role];
  const m = RARITY[d.rarity].mult * Math.pow(1.1, o.lv - 1) * (1 + .22 * (o.star - 1));
  const pct = { atk: 0, hp: 0, def: 0 };
  let crit = r.crit, spd = r.spd + (S.team.includes(id) ? teamAura() : 0);
  S.gear.forEach(g => {
    if (g.by !== id) return;
    const gs = gearStats(g);
    pct.atk += gs.atk || 0; pct.hp += gs.hp || 0; pct.def += gs.def || 0;
    crit += gs.crit || 0; spd += gs.spd || 0;
  });
  return {
    hp: 110 * r.hp * m * (1 + pct.hp / 100), atk: 12 * r.atk * m * (1 + pct.atk / 100),
    def: 6 * r.def * m * (1 + pct.def / 100), crit: Math.min(crit, .75), spd,
  };
}
const power = st => Math.round(st.atk * 4 * (1 + st.crit * .6) * st.spd / 100 + st.hp * .5 + st.def * 2);
const heroPower = id => power(heroStats(id));
const teamPower = () => S.team.reduce((a, id) => a + (id ? heroPower(id) : 0), 0);
const skillUnlocked = (id, i) => i === 0 || S.heroes[id].lv >= SKILL2_LV;

function stageScale(n) { return Math.pow(1.115, n - 1); }
function worldOf(n) { return Math.floor((n - 1) / STAGES_PER_WORLD) % WORLDS.length; }
function stageName(n) { return `${Math.floor((n - 1) / STAGES_PER_WORLD) + 1}-${(n - 1) % STAGES_PER_WORLD + 1}`; }
const killGold = n => 3 * Math.pow(1.13, n - 1);
const stageQuota = n => 12 + Math.min(10, Math.floor(n / 3));

// ---------- Battle ----------
// Top-down map. The party walks the map on its own, monster packs wait around it, and the boss turns up once
// enough monsters are down. Tap a monster to focus it, tap the ground to walk the team there (that is also how
// you step out of a boss's red circle), tap a charging boss to break its attack.
const B = {
  heroes: [], foes: [], proj: [], fx: [], nums: [], later: [], zones: [],
  state: "fight", timer: 0, cutin: null, banner: null, shake: 0, t: 0, paused: false,
  focus: null, moveTo: null, kills: 0, quota: 12, boss: null, map: null, cam: { x: 0, y: 0 },
};
const MELEE_RANGE = 12, RANGED_RANGE = 56, AGGRO = 58;
const FORM = [[0, 0], [-14, 10], [14, 10]];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makeHeroUnit(id, slot) {
  const st = heroStats(id), d = HEROES[id];
  return {
    side: "hero", id, slot, name: d.name, sprite: "hero:" + id, art: "hero:" + id, scale: 1,
    maxHp: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit,
    ranged: ROLE[d.role].ranged, color: d.color, face: 1, moving: 0,
    cd: .4 + slot * .25, skillCd: [3 + slot, 8 + slot], swings: 0,
    x: 0, y: 0, lunge: 0, flash: 0, dead: false, dying: 0, shield: 0, buffs: [], taunt: 0, clone: null,
  };
}
function makeFoe(key, n, boss, x, y) {
  const d = boss ? BOSSES[key] : MONSTERS[key], sc = stageScale(n);
  const trait = boss ? null : d.trait || null;
  const hp = 55 * sc * (boss ? 10 : d.hp);
  const f = {
    side: "foe", key, name: d.name, sprite: (boss ? "boss:" : "mob:") + key, art: (boss ? "boss:" : "mob:") + key,
    scale: boss ? 2 : 1, boss, trait, slot: Math.floor(Math.random() * 3),
    maxHp: hp, hp, atk: 8 * sc * (boss ? 1.5 : d.atk), def: 5 * sc,
    spd: boss ? 80 : trait === "fast" ? 170 : 88, crit: .05, ranged: key === "imp", face: -1,
    cd: rand(.5, 1.2), x, y, homeX: x, homeY: y, wander: null, aggro: false, pack: null,
    lunge: 0, flash: 0, dead: false, dying: 0, shield: 0, burn: null, chill: 0, frozen: 0, stun: 0, mark: 0,
    gold: killGold(n) * (boss ? 8 : 1),
  };
  if (trait === "shield") f.shield = f.shieldMax = hp * .6;
  if (trait === "healer") f.healCd = 3;
  if (boss) Object.assign(f, { move: d.move, chargeCd: 6, charge: null, summoned: 0, enraged: false, aggro: true });
  return f;
}
const lift = u => u.trait === "flyer" ? 10 + Math.round(Math.sin(B.t * 3 + u.homeX) * 2) : 0;
function unitBox(u) {
  const s = sprite(u.sprite), w = (ART[u.art] ? 26 : s.w) * u.scale, h = (ART[u.art] ? 26 : s.h) * u.scale;
  return { x: u.x - w / 2, y: u.y - h - lift(u), w, h };
}

// ---- Map: one generated area per stage, drawn once into an offscreen canvas ----
const MAP_W = 480, MAP_H = 480, EDGE = 28;
function buildMap(theme, seed) {
  const c = document.createElement("canvas"); c.width = MAP_W; c.height = MAP_H;
  const x = c.getContext("2d");
  let s = seed % 233280 || 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), w, h); };
  const P = {
    alley:  { g: ["#34343e", "#3a3a44", "#30303a"], path: "#4a2c2a", edge: "#1a1216", edge2: "#43282a" },
    forest: { g: ["#1e3a26", "#22422a", "#1a3422"], path: "#4a3a2a", edge: "#0e1e16", edge2: "#16302a" },
    cave:   { g: ["#2a1e3a", "#2e2240", "#261a34"], path: "#3a2e4a", edge: "#120c1c", edge2: "#22183a" },
    tower:  { g: ["#2a2450", "#26204a", "#2e2858"], path: "#4a3a70", edge: "#120e2a", edge2: "#1e1840" },
  }[theme];
  for (let ty = 0; ty < MAP_H; ty += 8) for (let tx = 0; tx < MAP_W; tx += 8) {
    R(tx, ty, 8, 8, theme === "tower" ? P.g[((tx + ty) / 8) % 2] : P.g[Math.floor(rnd() * 3)]);
    if (theme === "alley" && rnd() < .5) R(tx + 1, ty + 1, 6, 1, "#2a2a32");
  }
  // a winding path from the start at the bottom toward the top
  let px = MAP_W / 2;
  for (let py = MAP_H; py > 0; py -= 4) { px += rand(-3, 3); px = Math.max(80, Math.min(MAP_W - 80, px)); R(px - 10, py, 20, 4, P.path); if (rnd() < .2) R(px - 8 + rnd() * 16, py, 2, 2, P.g[0]); }
  // scattered decoration
  for (let i = 0; i < 90; i++) {
    const a = EDGE + rnd() * (MAP_W - EDGE * 2), b = EDGE + rnd() * (MAP_H - EDGE * 2), k = rnd();
    if (theme === "forest") {
      if (k < .5) { R(a, b, 1, 2, "#4a8a5a"); R(a + 2, b + 1, 1, 2, "#3a7a4a"); }
      else if (k < .7) { R(a, b, 3, 2, ["#ff7ab0", "#ffd84a", "#c9a8ff"][i % 3]); R(a + 1, b + 2, 1, 1, "#3a7a4a"); }
      else if (k < .85) { R(a - 4, b - 3, 9, 6, "#1a4a2a"); R(a - 3, b - 4, 7, 2, "#2a5a36"); }
      else { R(a, b, 4, 2, "#b04a5a"); R(a + 1, b + 2, 2, 2, "#e8dcc8"); }
    } else if (theme === "cave") {
      if (k < .4) { R(a, b, 2, 5, "#7a4ad0"); R(a, b, 1, 5, "#b98cff"); R(a + 3, b + 2, 2, 3, "#9af0ff"); }
      else if (k < .8) R(a, b, 5, 3, "#3a2e4a");
      else R(a, b, 2, 2, "#c9a8ff");
    } else if (theme === "alley") {
      if (k < .25) { R(a, b, 8, 7, "#5a3a22"); R(a, b, 8, 1, "#7a5a32"); R(a + 3, b, 1, 7, "#4a2e1a"); }
      else if (k < .45) { R(a - 4, b, 10, 3, "#1c3a2a"); R(a - 3, b + 1, 8, 1, "#7affb0"); }
      else if (k < .6) { R(a, b - 8, 1, 9, "#1a1216"); R(a - 2, b - 10, 5, 3, "#f2d16b"); R(a - 6, b - 1, 13, 3, "rgba(242,209,107,.12)"); }
      else R(a, b, 3, 1, "#2a2a32");
    } else {
      if (k < .3) { R(a, b, 5, 5, "#3a3470"); R(a + 2, b + 1, 1, 3, "#ffd76a"); R(a + 1, b + 2, 3, 1, "#ffd76a"); }
      else if (k < .5) { R(a - 3, b - 10, 7, 12, "#1e1840"); R(a - 2, b - 10, 5, 2, "#3a3470"); }
      else R(a, b, 1, 1, "#8a8ac8");
    }
  }
  // dense border so the area reads as a clearing
  for (let i = 0; i < 260; i++) {
    const side = i % 4, t = rnd() * MAP_W, d = rnd() * EDGE;
    const a = side === 0 ? t : side === 1 ? t : side === 2 ? d : MAP_W - d, b = side === 0 ? d : side === 1 ? MAP_H - d : t;
    if (theme === "forest") { R(a - 8, b - 8, 16, 14, P.edge2); R(a - 6, b - 10, 12, 4, "#1c3a30"); R(a - 1, b + 4, 3, 5, "#2a1e16"); }
    else if (theme === "cave") { R(a - 8, b - 6, 16, 14, P.edge2); R(a - 6, b - 7, 12, 2, "#3a2e4a"); }
    else if (theme === "alley") { R(a - 8, b - 6, 16, 12, P.edge2); R(a - 8, b - 6, 16, 1, "#512f2c"); }
    else { R(a - 6, b - 12, 12, 16, P.edge2); R(a - 5, b - 12, 10, 2, "#3a3470"); }
  }
  R(0, 0, MAP_W, 6, P.edge); R(0, MAP_H - 6, MAP_W, 6, P.edge); R(0, 0, 6, MAP_H, P.edge); R(MAP_W - 6, 0, 6, MAP_H, P.edge);
  return c;
}

function startStage(msg) {
  const theme = WORLDS[worldOf(S.stage)].theme;
  B.map = { theme, canvas: ART["bg:" + theme] ? null : buildMap(theme, S.stage * 7919) };
  const sx = MAP_W / 2, sy = MAP_H - 60;
  B.heroes = S.team.map((id, i) => id ? makeHeroUnit(id, i) : null).filter(Boolean);
  B.heroes.forEach((h, i) => { h.x = sx + FORM[i][0]; h.y = sy + FORM[i][1]; });
  B.foes = []; B.proj = []; B.later = []; B.zones = []; B.focus = null; B.moveTo = null; B.boss = null;
  B.kills = 0; B.quota = stageQuota(S.stage);
  spawnPacks(sx, sy);
  B.cam.x = sx - LW / 2; B.cam.y = sy - LH / 2 - 20;
  B.state = "fight";
  B.banner = { text: msg || `ด่าน ${stageName(S.stage)}`, sub: WORLDS[worldOf(S.stage)].name, t: 1.6 };
  renderParty(true); renderStageInfo();
}
function spawnPacks(sx, sy) {
  const w = WORLDS[worldOf(S.stage)];
  const packs = Math.ceil(B.quota / 3) + 2;
  for (let p = 0; p < packs; p++) {
    let px, py, tries = 0;
    do { px = rand(EDGE + 30, MAP_W - EDGE - 30); py = rand(EDGE + 30, MAP_H - EDGE - 30); } while (Math.hypot(px - sx, py - sy) < 110 && tries++ < 30);
    const pack = [];
    const size = S.stage < 3 ? 2 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < size; i++) {
      const f = makeFoe(pick(w.mobs), S.stage, false, px + rand(-14, 14), py + rand(-10, 10));
      f.pack = pack; pack.push(f); B.foes.push(f);
    }
  }
}
function spawnBoss() {
  const bi = worldOf(S.stage), lead = leader();
  let bx = MAP_W / 2, by = EDGE + 70;
  if (lead) { const a = Math.atan2(MAP_H / 2 - lead.y, MAP_W / 2 - lead.x); bx = Math.max(EDGE + 40, Math.min(MAP_W - EDGE - 40, lead.x + Math.cos(a) * 120)); by = Math.max(EDGE + 50, Math.min(MAP_H - EDGE - 30, lead.y + Math.sin(a) * 120)); }
  B.boss = makeFoe(bi, S.stage, true, bx, by);
  B.foes.push(B.boss);
  B.banner = { text: "บอสปรากฏตัว!", sub: BOSSES[bi].name, t: 1.8, boss: true };
  burst(bx, by - 20, "#ff5a7a", 30, 2);
}
function summon(boss) {
  const w = WORLDS[worldOf(S.stage)];
  for (let i = 0; i < 2; i++) {
    const f = makeFoe(pick(w.mobs), S.stage, false, boss.x + rand(-30, 30), boss.y + rand(-20, 20));
    f.aggro = true; f.gold *= .5; f.summoned = true;
    B.foes.push(f);
    burst(f.x, f.y - 8, "#c9a8ff", 10, 1.2);
  }
  addNum(boss.x, unitBox(boss).y - 6, "เรียกลูกน้อง!", "#c9a8ff", true);
}
// Re-read stats after an upgrade without healing the team back to full.
function refreshParty() {
  if (B.heroes.map(u => u.id).join() !== S.team.filter(Boolean).join()) { startStage(); return; }
  B.heroes.forEach(u => {
    const st = heroStats(u.id), r = u.hp / u.maxHp;
    Object.assign(u, { maxHp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit });
    if (!u.dead) u.hp = st.hp * r;
  });
  renderParty(true);
}

const alive = list => list.filter(u => !u.dead);
const atkOf = u => u.atk * (1 + (u.buffs || []).reduce((a, b) => a + (b.atk || 0), 0));
const spdOf = u => u.spd + (u.buffs || []).reduce((a, b) => a + (b.spd || 0), 0);
const leader = () => B.heroes.find(h => !h.dead);
const nearest = (from, list, max = Infinity) => list.reduce((best, u) => { const d = dist(from, u); return d < max && (!best || d < dist(from, best)) ? u : best; }, null);
function foesNear(p, r) { return alive(B.foes).filter(f => dist(p, f) <= r); }

function heroTarget(h) {
  if (B.focus && !B.focus.dead) return B.focus;
  const f = alive(B.foes);
  const bomber = S.auto && f.find(x => x.trait === "bomber" && x.aggro && dist(x, h) < 40);
  if (bomber) return bomber;
  const lead = leader();
  const near = nearest(h, f.filter(x => x.aggro || dist(x, lead) < 90));
  if (near) return near;
  return h === lead ? nearest(h, f) : null; // the leader goes looking, the rest follow
}
function foeTarget(f) {
  const h = alive(B.heroes);
  return h.find(x => x.taunt > 0 && dist(x, f) < 120) || nearest(f, h);
}
function foeAt(x, y) {
  let best = null;
  alive(B.foes).forEach(f => { const b = unitBox(f); if (x >= b.x - 5 && x <= b.x + b.w + 5 && y >= b.y - 5 && y <= b.y + b.h + 5 && (!best || b.w < unitBox(best).w)) best = f; });
  return best;
}

function addNum(x, y, text, color, big) { B.nums.push({ x: x + rand(-3, 3), y, text, color, t: 0, big }); }
function burst(x, y, color, n = 6, spread = 1) {
  for (let i = 0; i < n; i++) B.fx.push({ x, y, vx: rand(-30, 30) * spread, vy: rand(-45, -10) * spread, t: 0, life: rand(.3, .55), color, size: Math.random() < .3 ? 2 : 1 });
}
function ring(x, y, r, color, life = .4) { B.zones.push({ x, y, r, color, t: 0, life, ring: true }); }
function combo(f, text) { addNum(f.x, unitBox(f).y - 14, text, "#ff9af0", true); B.shake = Math.max(B.shake, .15); }

// ---- Damage ----
function damage(att, tgt, mult, opts = {}) {
  if (!tgt || tgt.dead) return 0;
  const b = unitBox(tgt);
  if (tgt.trait === "flyer" && !att.ranged && !opts.skill && Math.random() < .5) { addNum(tgt.x, b.y - 2, "MISS", "#a898b0"); return 0; }
  const a = atkOf(att);
  let dmg = a * mult * a / (a + tgt.def);
  const pa = att.side === "hero" ? passiveOf(att.id) : null;
  let crit = opts.crit || Math.random() < att.crit;
  if (pa && pa.kind === "everyN" && opts.basic && att.swings % pa.n === 0) crit = true;
  if (crit) dmg *= 1.6;
  if (tgt.stun > 0 || tgt.frozen > 0) dmg *= 1.5;
  if (tgt.mark > 0) dmg *= 1.3 + (pa && pa.kind === "markbonus" ? pa.pct : 0);
  if (opts.el === "fire" && (tgt.chill > 0 || tgt.frozen > 0)) { dmg *= 2; tgt.chill = 0; tgt.frozen = 0; combo(tgt, "ละลาย! ×2"); }
  dmg = Math.max(1, Math.round(dmg * rand(.92, 1.08)));
  if (tgt.charge) tgt.charge.gauge += dmg * (opts.skill ? 2 : 1);
  if (tgt.trait === "shield" && tgt.shield > 0) {
    const hit = Math.min(tgt.shield, dmg * (opts.skill ? 2 : 1));
    tgt.shield -= hit;
    addNum(tgt.x, b.y - 2, fmt(hit), "#9fdcff", crit);
    burst(tgt.x, b.y + b.h / 2, "#9fdcff", 4);
    if (tgt.shield <= 0) { addNum(tgt.x, b.y - 10, "โล่แตก!", "#9fdcff", true); burst(tgt.x, b.y + b.h / 2, "#9fdcff", 14, 1.4); }
    aggroFoe(tgt);
    return hit;
  }
  let taken = dmg;
  if (tgt.shield > 0) { const s = Math.min(tgt.shield, taken); tgt.shield -= s; taken -= s; }
  tgt.hp -= taken;
  tgt.flash = .1;
  addNum(tgt.x, b.y - 2, fmt(dmg) + (crit ? "!" : ""), crit ? "#ffd84a" : tgt.side === "hero" ? "#ff8a8a" : "#ffffff", crit || opts.big);
  burst(tgt.x, b.y + b.h / 2, crit ? "#ffd84a" : "#fff2d8", crit ? 8 : 3);
  if (crit && mult > 1) B.shake = Math.max(B.shake, .1);
  if (att.side === "hero") {
    const ls = (opts.lifesteal || 0) + (pa && pa.kind === "lifesteal" ? pa.pct : 0);
    if (ls) healHero(att, dmg * ls, true);
    if (pa && pa.kind === "onhit" && opts.basic && Math.random() < pa.chance) applyEffect(att, tgt, pa.effect, pa);
    if (opts.el) applyEffect(att, tgt, opts.el, opts);
    if (opts.mark) tgt.mark = 6;
    aggroFoe(tgt);
  } else {
    const tp = passiveOf(tgt.id);
    if (tp && tp.kind === "thorns" && !att.dead) { const r = Math.round(dmg * tp.pct); att.hp -= r; addNum(att.x, unitBox(att).y, fmt(r), "#d6b25a"); if (att.hp <= 0) kill(att); }
  }
  if (tgt.hp <= 0) kill(tgt);
  return dmg;
}
function applyEffect(att, f, el, opts = {}) {
  if (f.dead) return;
  if (el === "mark") { f.mark = 6; return; }
  if (el === "ice") {
    if (f.burn) {
      f.burn = null;
      combo(f, "ไอน้ำระเบิด!");
      ring(f.x, f.y - 4, 20, "#e8f4ff", .45); burst(f.x, f.y - 8, "#e8f4ff", 18, 1.6);
      foesNear(f, 20).forEach(o => damage(att, o, 1.5, { skill: true }));
    }
    f.chill = 4;
    if (opts.freeze) f.frozen = opts.freeze;
  }
  if (el === "fire") {
    const p = passiveOf(att.id);
    f.burn = { dps: atkOf(att) * .35 * (1 + (p && p.burnPlus || 0)), t: 4 };
  }
}
function healHero(u, amt, quiet) {
  if (u.dead) return;
  amt = Math.round(amt);
  u.hp = Math.min(u.maxHp, u.hp + amt);
  if (amt > 0 && !quiet) addNum(u.x, unitBox(u).y - 2, "+" + fmt(amt), "#8affb8");
}
function hurtHero(h, raw, from) {
  if (h.dead) return;
  let taken = Math.max(1, Math.round(raw * raw / (raw + h.def)));
  if (h.shield > 0) { const s = Math.min(h.shield, taken); h.shield -= s; taken -= s; if (!taken) return; }
  h.hp -= taken; h.flash = .12;
  addNum(h.x, unitBox(h).y - 2, fmt(taken), "#ff8a8a");
  const tp = passiveOf(h.id);
  if (from && tp && tp.kind === "thorns") { const r = Math.round(taken * tp.pct); from.hp -= r; if (from.hp <= 0) kill(from); }
  if (h.hp <= 0) kill(h);
}
function aggroFoe(f) {
  if (f.aggro) return;
  f.aggro = true;
  (f.pack || []).forEach(o => { o.aggro = true; });
}
function kill(u) {
  u.hp = 0; u.dead = true; u.dying = .5;
  if (B.focus === u) B.focus = null;
  if (u.side !== "foe") { burst(u.x, u.y - 8, "#9a8aa8", 8); return; }
  S.gold += u.gold; S.kills++; bump("kills");
  const b = unitBox(u);
  addNum(u.x, b.y - 4, "+" + fmt(u.gold) + "G", "#ffcb52");
  burst(u.x, b.y + b.h / 2, "#ffcb52", u.boss ? 24 : 8, u.boss ? 1.8 : 1);
  if (!u.boss) B.kills++;
  // passives that trigger on any kill
  let heal = 0;
  B.heroes.forEach(h => { const p = !h.dead && passiveOf(h.id); if (p && p.kind === "onkill") heal += p.heal; });
  if (heal) alive(B.heroes).forEach(h => healHero(h, h.maxHp * heal, true));
  if (Math.random() < (u.boss ? 1 : .05)) {
    const beans = u.boss ? 40 : Math.round(rand(8, 20));
    S.beans += beans;
    B.fx.push({ x: u.x, y: b.y, vx: 0, vy: -12, t: 0, life: 1.2, color: "chest", size: 0 });
    addNum(u.x, b.y - 14, `หีบ! +${beans} เมล็ด`, "#ffcb52", true);
  }
  maybeDrop(u);
  if (B.kills >= B.quota && !B.boss) spawnBoss();
  if (u.boss) { B.state = "clear"; B.timer = 1.4; B.banner = { text: "ผ่านด่าน!", sub: "", t: 1.4 }; }
  updateWallet(); renderStageInfo();
}

// ---- Movement ----
function moveToward(u, tx, ty, speed, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  u.x += dx / d * step; u.y += dy / d * step;
  if (Math.abs(dx) > .5) u.face = dx > 0 ? 1 : -1;
  u.moving = .15;
  u.x = Math.max(EDGE, Math.min(MAP_W - EDGE, u.x)); u.y = Math.max(EDGE + 10, Math.min(MAP_H - EDGE, u.y));
  return false;
}
function separate(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, min = (a.side === "hero" ? 12 : 9) * Math.max(a.scale, b.scale);
    if (d < min) { const p = (min - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  }
}

function heroUpdate(h, dt) {
  if (h.lunge > 0) h.lunge -= dt;
  if (h.flash > 0) h.flash -= dt;
  if (h.moving > 0) h.moving -= dt;
  if (h.dead) { if (h.dying > 0) h.dying -= dt; return; }
  h.buffs = h.buffs.filter(b => (b.t -= dt) > 0);
  if (h.taunt > 0) h.taunt -= dt;
  if (h.clone) { h.clone.t -= dt; if (h.clone.t <= 0) h.clone = null; }
  h.skillCd = h.skillCd.map(c => Math.max(0, c - dt));
  const lead = leader();
  if (B.moveTo) {
    const f = FORM[B.heroes.indexOf(h)] || [0, 0];
    moveToward(h, B.moveTo.x + f[0], B.moveTo.y + f[1], 52, dt);
    return;
  }
  const tgt = heroTarget(h);
  if (tgt) {
    const range = (h.ranged ? RANGED_RANGE : MELEE_RANGE) + (tgt.boss ? 8 : 0);
    if (dist(h, tgt) > range) moveToward(h, tgt.x, tgt.y, 38, dt);
    else {
      h.face = tgt.x > h.x ? 1 : -1;
      h.cd -= dt;
      if (h.cd <= 0) { basicAttack(h, tgt); h.cd = 100 / spdOf(h); }
    }
  } else if (h !== lead && lead) {
    const f = FORM[B.heroes.indexOf(h)] || [0, 0];
    if (dist(h, { x: lead.x + f[0], y: lead.y + f[1] }) > 4) moveToward(h, lead.x + f[0], lead.y + f[1], 40, dt);
  }
  if (S.auto) autoSkill(h);
}
function basicAttack(h, tgt) {
  h.swings++;
  const hit = () => {
    damage(h, tgt, 1, { basic: true });
    if (h.clone && !tgt.dead) damage(h, tgt, h.clone.power, {});
  };
  if (h.ranged) {
    const b = unitBox(tgt);
    B.proj.push({ x: h.x + h.face * 6, y: h.y - 12, tx: tgt.x, ty: b.y + b.h / 2, t: 0, dur: .22, color: h.color, fn: hit });
  } else { h.lunge = .18; B.later.push({ t: .08, fn: hit }); }
}

function foeUpdate(f, dt) {
  if (f.lunge > 0) f.lunge -= dt;
  if (f.flash > 0) f.flash -= dt;
  if (f.moving > 0) f.moving -= dt;
  if (f.dead) { if (f.dying > 0) f.dying -= dt; return; }
  if (f.mark > 0) f.mark -= dt;
  if (f.chill > 0) f.chill -= dt;
  if (f.burn) {
    f.burn.t -= dt; f.burn.acc = (f.burn.acc || 0) + dt;
    if (f.burn.acc >= .5) { f.burn.acc = 0; const d = Math.max(1, Math.round(f.burn.dps * .5)); f.hp -= d; addNum(f.x, unitBox(f).y, fmt(d), "#ff9a4a"); if (f.hp <= 0) return kill(f); }
    if (f.burn && f.burn.t <= 0) f.burn = null;
  }
  if (f.frozen > 0) { f.frozen -= dt; return; }
  if (f.stun > 0) { f.stun -= dt; return; }
  const slow = f.chill > 0 ? .5 : 1;
  const tgt = foeTarget(f);
  if (!f.aggro && tgt && dist(f, tgt) < AGGRO) aggroFoe(f);
  if (!f.aggro || !tgt) {
    // idle: amble around home
    if (!f.wander || dist(f, f.wander) < 2) f.wander = { x: f.homeX + rand(-16, 16), y: f.homeY + rand(-12, 12) };
    moveToward(f, f.wander.x, f.wander.y, 8, dt);
    return;
  }
  if (f.trait === "healer") {
    f.healCd -= dt;
    if (f.healCd <= 0) {
      f.healCd = 4.5;
      const hurt = alive(B.foes).filter(x => x !== f && x.hp < x.maxHp && dist(x, f) < 70).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) { const amt = Math.round(hurt.maxHp * .15); hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt); addNum(hurt.x, unitBox(hurt).y - 2, "+" + fmt(amt), "#8affb8"); burst(hurt.x, hurt.y - 10, "#8affb8", 8); ring(f.x, f.y - 4, 10, "#8affb8", .4); }
    }
  }
  if (f.trait === "bomber") {
    if (moveToward(f, tgt.x, tgt.y, 30 * slow, dt) || dist(f, tgt) < 9) {
      alive(B.heroes).forEach(h => { const d = dist(h, f); if (d < 26) hurtHero(h, f.atk * (d < 10 ? 4 : 1.5)); });
      ring(f.x, f.y - 4, 26, "#ffb04a", .45); burst(f.x, f.y - 8, "#ffb04a", 24, 1.8);
      B.shake = .3;
      f.hp = 0; f.dead = true; f.dying = .1; f.gold = 0; B.kills++;
      if (B.focus === f) B.focus = null;
      if (B.kills >= B.quota && !B.boss) spawnBoss();
      renderStageInfo();
    }
    return;
  }
  if (f.boss && bossUpdate(f, tgt, dt)) return;
  const range = f.ranged ? 48 : MELEE_RANGE + (f.boss ? 10 : 0);
  if (dist(f, tgt) > range) { moveToward(f, tgt.x, tgt.y, (f.boss ? 16 : 22) * slow, dt); return; }
  f.face = tgt.x > f.x ? 1 : -1;
  f.cd -= dt * slow;
  if (f.cd > 0) return;
  f.cd = 100 / f.spd * 1.2;
  if (f.ranged) {
    const b = unitBox(f);
    B.proj.push({ x: f.x, y: b.y + b.h / 2, tx: tgt.x, ty: tgt.y - 10, t: 0, dur: .45, color: "#ff5a9a", orb: true, fn: () => hurtHero(tgt, f.atk, f) });
  } else { f.lunge = .15; hurtHero(tgt, f.atk, f); }
}
// The boss's big attack: a red circle on the ground. Step out of it or break it with taps and skills.
function bossUpdate(f, tgt, dt) {
  if (!f.enraged && f.hp < f.maxHp * .3) { f.enraged = true; f.spd *= 1.5; addNum(f.x, unitBox(f).y - 8, "โกรธแล้ว!", "#ff5a7a", true); B.shake = .25; }
  if (f.summoned < 1 && f.hp < f.maxHp * .66 || f.summoned < 2 && f.hp < f.maxHp * .33) { f.summoned++; summon(f); }
  if (f.charge) {
    const c = f.charge;
    c.t += dt;
    if (c.gauge >= c.need) {
      f.charge = null; f.stun = 3; f.chargeCd = 9;
      addNum(f.x, unitBox(f).y - 10, "BREAK!", "#ffd84a", true);
      burst(f.x, f.y - 20, "#ffd84a", 30, 2); B.shake = .3;
    } else if (c.t >= c.dur) {
      f.charge = null; f.chargeCd = 9;
      B.banner = { text: f.move, sub: "", t: .9, boss: true };
      ring(c.x, c.y, c.r, "#ff5a7a", .5); burst(c.x, c.y, "#ff5a7a", 30, 2.2);
      alive(B.heroes).forEach(h => { if (dist(h, c) < c.r) hurtHero(h, atkOf(f) * 3.6); else addNum(h.x, unitBox(h).y - 4, "หลบได้!", "#7affb0"); });
      B.shake = .4;
    }
    return true;
  }
  f.chargeCd -= dt;
  // normal hits alone rarely fill the break gauge in time; taps and skills are what break it
  if (f.chargeCd <= 0) f.charge = { t: 0, dur: 3.4, gauge: 0, need: f.maxHp * .3, x: f.x, y: f.y, r: 46 };
  return false;
}

// ---- Skills ----
function skillReady(h, i) { return !h.dead && skillUnlocked(h.id, i) && h.skillCd[i] <= 0; }
function skillUsable(h, sk) {
  if (["heal"].includes(sk.kind)) return alive(B.heroes).some(x => x.hp < x.maxHp * .7);
  if (sk.kind === "revive") return B.heroes.some(x => x.dead);
  const near = foesNear(h, 90);
  if (sk.kind === "guard" || sk.kind === "buff" || sk.kind === "clone") return near.some(f => f.aggro);
  return near.length > 0;
}
function autoSkill(h) {
  if (B.cutin || B.state !== "fight") return;
  for (let i = 1; i >= 0; i--) if (skillReady(h, i) && skillUsable(h, HEROES[h.id].skills[i])) return castSkill(h, i);
}
function castSkill(h, i) {
  const sk = HEROES[h.id].skills[i];
  if (!skillReady(h, i) || B.cutin || B.state !== "fight") return false;
  if (!skillUsable(h, sk)) { toast(`${sk.name}: ยังไม่มีเป้าหมายใกล้ๆ`); return false; }
  h.skillCd[i] = sk.cd;
  bump("bursts");
  if (i === 1) B.cutin = { t: 0, dur: .6, u: h, sk };
  else { addNum(h.x, unitBox(h).y - 8, sk.name, h.color, true); applySkill(h, sk); }
  renderParty();
  return true;
}
function applySkill(u, sk) {
  const team = alive(B.heroes);
  const tgt = (B.focus && !B.focus.dead && dist(u, B.focus) < 110 ? B.focus : null) || nearest(u, alive(B.foes), 110);
  const opt = { skill: true, el: sk.el, freeze: sk.freeze, crit: sk.crit, lifesteal: sk.lifesteal, mark: sk.mark, big: true };
  const slash = f => { const b = unitBox(f); B.fx.push({ x: f.x, y: b.y + b.h / 2, vx: 0, vy: 0, t: 0, life: .18, color: "slash", size: 0, c: u.color }); };
  const area = (cx, cy, r) => alive(B.foes).filter(f => Math.hypot(f.x - cx, f.y - cy) <= r);
  if (sk.kind === "strike" && tgt) {
    for (let i = 0; i < sk.hits; i++) B.later.push({ t: i * .09, fn: () => { if (!tgt.dead) { slash(tgt); damage(u, tgt, sk.mult, opt); } } });
    u.lunge = .25;
  } else if (sk.kind === "multi" || sk.kind === "lowest") {
    for (let i = 0; i < sk.hits; i++) B.later.push({ t: i * .08, fn: () => {
      const pool = foesNear(u, 110);
      const f = sk.kind === "lowest" ? pool.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] : pick(pool);
      if (f) { slash(f); damage(u, f, sk.mult, opt); }
    } });
  } else if ((sk.kind === "blast" || sk.kind === "rain" || sk.kind === "leap") && tgt) {
    const cx = tgt.x, cy = tgt.y;
    if (sk.kind === "leap") { burst(u.x, u.y - 8, u.color, 10, 1.2); u.x = cx - u.face * 10; u.y = cy + 4; }
    const ticks = sk.ticks || 1;
    B.zones.push({ x: cx, y: cy, r: sk.r, color: u.color, t: 0, life: .3 + ticks * .3, fill: true });
    for (let i = 0; i < ticks; i++) B.later.push({ t: .15 + i * .3, fn: () => {
      ring(cx, cy, sk.r, sk.el === "fire" ? "#ffb04a" : u.color, .35);
      burst(cx, cy - 4, sk.el === "fire" ? "#ffb04a" : u.color, sk.big ? 28 : 12, sk.big ? 2 : 1.3);
      area(cx, cy, sk.r).forEach(f => damage(u, f, sk.mult, opt));
      if (sk.big || sk.kind === "leap") B.shake = .3;
    } });
  } else if (sk.kind === "nova") {
    const c = sk.at === "target" && tgt ? tgt : u;
    const cx = c.x, cy = c.y;
    for (let i = 0; i < sk.ticks; i++) B.later.push({ t: i * .35, fn: () => {
      ring(cx, cy - 2, sk.r, sk.el === "ice" ? "#d9f3ff" : sk.el === "fire" ? "#ff7a4a" : u.color, .4);
      burst(cx, cy - 4, sk.el === "ice" ? "#d9f3ff" : u.color, 14, 1.6);
      area(cx, cy, sk.r).forEach(f => { damage(u, f, sk.mult, opt); if (sk.stun) f.stun = sk.stun; });
    } });
    B.shake = .2;
  } else if (sk.kind === "heal") {
    team.forEach(h => { healHero(h, h.maxHp * sk.pct); if (sk.shield) h.shield += h.maxHp * sk.shield; ring(h.x, h.y - 2, 8, "#8affb8", .5); burst(h.x, h.y - 12, "#8affb8", 8); });
  } else if (sk.kind === "guard") {
    team.forEach(h => { h.shield += u.maxHp * sk.pct; burst(h.x, h.y - 12, "#9fdcff", 6); });
    u.taunt = sk.taunt; ring(u.x, u.y - 2, 30, "#ffd84a", .5);
  } else if (sk.kind === "revive") {
    B.heroes.forEach(h => { if (h.dead) { h.dead = false; h.hp = h.maxHp * sk.pct; h.dying = 0; ring(h.x, h.y - 2, 14, "#fff0a0", .7); burst(h.x, h.y - 12, "#fff0a0", 20, 1.5); addNum(h.x, h.y - 26, "ฟื้นคืนชีพ!", "#fff0a0", true); } });
  } else if (sk.kind === "clone") {
    u.clone = { t: sk.dur, power: sk.power };
    burst(u.x, u.y - 10, "#5a4a8a", 16, 1.4);
  }
  if (sk.kind === "buff" || sk.atk) {
    team.forEach(h => { h.buffs.push({ atk: sk.atk || 0, spd: sk.spd || 0, t: sk.dur }); burst(h.x, h.y - 16, "#ffd84a", 5); });
    if (sk.cdr) team.forEach(h => { h.skillCd = h.skillCd.map(c => Math.max(0, c - sk.cdr)); });
    ring(u.x, u.y - 2, 36, "#ffd84a", .5);
  }
}

// ---- Loot ----
function rollRarityFrom(table) { const r = Math.random(); return r < table.SSR ? "SSR" : r < table.SSR + table.SR ? "SR" : "R"; }
function maybeDrop(u) {
  const kind = u.boss ? "boss" : "mob";
  if (Math.random() >= DROP_RATE[kind]) return;
  const rarity = rollRarityFrom(DROP_RARITY[kind]);
  const id = pick(Object.keys(GEAR).filter(x => GEAR[x].rarity === rarity));
  if (rarity === "R" && S.autoSalvageR) {
    const g = { id, plus: 0 }; const gold = gearSalvage(g);
    S.gold += gold; addNum(u.x, u.y - 30, `ย่อย ${GEAR[id].name} +${fmt(gold)}G`, "#9fb3c8");
    return;
  }
  const g = newGear(id);
  S.gear.push(g);
  addNum(u.x, u.y - 30, `ได้ ${GEAR[id].name}!`, RARITY[rarity].color, true);
  if (rarity !== "R") showDrop(g);
}

function step(dt) {
  B.t += dt;
  if (B.banner) { B.banner.t -= dt; if (B.banner.t <= 0) B.banner = null; }
  if (B.shake > 0) B.shake -= dt;
  updateFx(dt);
  if (B.paused) return;
  if (B.cutin) {
    B.cutin.t += dt;
    if (B.cutin.t >= B.cutin.dur) { const c = B.cutin; B.cutin = null; applySkill(c.u, c.sk); }
    return;
  }
  B.later = B.later.filter(l => { l.t -= dt; if (l.t <= 0) { l.fn(); return false; } return true; });
  B.proj = B.proj.filter(p => { p.t += dt; if (p.t >= p.dur) { p.fn(); return false; } return true; });
  if (B.state === "clear" || B.state === "fail") {
    B.timer -= dt;
    if (B.timer <= 0) B.state === "clear" ? afterClear() : afterFail();
    return;
  }
  if (B.moveTo) { B.moveTo.t -= dt; const l = leader(); if (B.moveTo.t <= 0 || (l && dist(l, B.moveTo) < 3)) B.moveTo = null; }
  B.heroes.forEach(h => heroUpdate(h, dt));
  B.foes.forEach(f => foeUpdate(f, dt));
  separate(alive(B.heroes)); separate(alive(B.foes));
  B.foes = B.foes.filter(f => !f.dead || f.dying > 0);
  // if the map runs dry before the quota (bombers, small packs), bring the boss anyway
  if (!B.boss && !alive(B.foes).length) spawnBoss();
  // camera follows the leader
  const l = leader();
  if (l) {
    const tx = Math.max(0, Math.min(MAP_W - LW, l.x - LW / 2)), ty = Math.max(0, Math.min(MAP_H - LH, l.y - LH / 2 - 10));
    B.cam.x += (tx - B.cam.x) * Math.min(1, dt * 4); B.cam.y += (ty - B.cam.y) * Math.min(1, dt * 4);
  }
  if (!alive(B.heroes).length) {
    B.state = "fail"; B.timer = 1.6; B.banner = { text: "ถอยก่อน…", sub: "อัพเกรดทีมแล้วค่อยลุยใหม่", t: 1.6, bad: true };
  }
}

function afterClear() {
  const n = S.stage;
  const bonus = killGold(n) * 6;
  S.gold += bonus;
  bump("clears");
  let beans = 5;
  if (n >= S.best) {
    beans = n % 10 === 0 ? 300 : n % 5 === 0 ? 120 : 50;
    S.best = n + 1;
  }
  S.beans += beans;
  toast(`ผ่านด่าน ${stageName(n)} · +${fmt(bonus)} ทอง · +${beans} เมล็ดกาแฟ`);
  if (S.autoNext) S.stage = n + 1;
  save();
  updateWallet(); renderPanel();
  startStage();
}
function afterFail() {
  if (S.stage > 1) S.stage--;
  S.autoNext = false;
  save();
  renderPanel();
  startStage();
}

function updateFx(dt) {
  B.fx = B.fx.filter(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.color !== "chest") p.vy += 120 * dt; return p.t < p.life; });
  B.nums = B.nums.filter(n => { n.t += dt; return n.t < .9; });
  B.zones = B.zones.filter(z => (z.t += dt) < z.life);
}

// ---------- Drawing ----------
const cv = $("#cv"), ctx = cv.getContext("2d");
let SCALE = 1;
function resize() {
  const wrap = $("#battle"), dpr = window.devicePixelRatio || 1;
  SCALE = Math.max(1, Math.floor(Math.min(wrap.clientWidth * dpr / LW, wrap.clientHeight * dpr / LH)));
  cv.width = LW * SCALE; cv.height = LH * SCALE;
  cv.style.width = (LW * SCALE / dpr) + "px"; cv.style.height = (LH * SCALE / dpr) + "px";
}

function drawMap() {
  const art = ART["bg:" + B.map.theme];
  const cx = Math.round(B.cam.x), cy = Math.round(B.cam.y);
  if (art) {
    // a generated picture covers the whole map, so the camera shows one part of it
    ctx.imageSmoothingEnabled = true;
    const sx = art.width / MAP_W, sy = art.height / MAP_H;
    ctx.drawImage(art, cx * sx, cy * sy, LW * sx, LH * sy, 0, 0, LW, LH);
    ctx.imageSmoothingEnabled = false;
  } else ctx.drawImage(B.map.canvas, cx, cy, LW, LH, 0, 0, LW, LH);
  if (B.map.theme === "forest") for (let i = 0; i < 12; i++) {
    const fx = (i * 37 + Math.sin(B.t * .7 + i) * 10 + LW) % LW, fy = (i * 23 + Math.sin(B.t * 1.3 + i * 2) * 4) % LH;
    ctx.fillStyle = `rgba(220,255,140,${.4 + .6 * Math.abs(Math.sin(B.t * 2 + i))})`; ctx.fillRect(fx | 0, fy | 0, 1, 1);
  }
}

function drawUnit(u) {
  if (u.dead && u.dying <= 0 && u.side === "foe") return;
  const s = sprite(u.sprite), art = ART[u.art], flip = u.face < 0;
  const walk = u.moving > 0 ? Math.round(Math.abs(Math.sin(B.t * 12 + u.x)) * -1.5) : Math.round(Math.sin(B.t * 3 + (u.slot || 0) * 1.7) * .6);
  const lungeOff = u.lunge > 0 ? Math.round(Math.sin((1 - u.lunge / .18) * Math.PI) * 5) * u.face : 0;
  const b = unitBox(u), w = b.w, h = b.h;
  const jitter = u.charge ? Math.round(rand(-1, 1)) : 0;
  const x = Math.round(b.x + lungeOff + jitter - B.cam.x), y = Math.round(b.y + walk - B.cam.y);
  const fx = Math.round(u.x - B.cam.x), fy = Math.round(u.y - B.cam.y);
  if (x > LW + 20 || x + w < -20 || y > LH + 20 || y + h < -30) return;
  ctx.globalAlpha = u.dead ? (u.side === "hero" ? .35 : Math.max(0, u.dying / .5)) : 1;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(fx - Math.round(w * .3), fy, Math.round(w * .6), 2);
  if (u.side === "hero" && u.taunt > 0) { ctx.strokeStyle = "rgba(255,216,74,.6)"; ctx.beginPath(); ctx.ellipse(fx, fy, 9, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (u.clone && !u.dead) { ctx.globalAlpha = .45; ctx.drawImage(flip ? sprite(u.sprite).flip || s.img : s.img, x - u.face * 10, y + 2, w, h); ctx.globalAlpha = 1; }
  ctx.save();
  if (u.enraged) ctx.filter = "sepia(1) saturate(4) hue-rotate(-30deg)";
  if (u.stun > 0 || u.dead && u.side === "hero") ctx.filter = "grayscale(.9)";
  if (u.frozen > 0) ctx.filter = "hue-rotate(160deg) brightness(1.4)";
  if (art) {
    ctx.imageSmoothingEnabled = true;
    if (flip) { ctx.translate(fx + lungeOff, 0); ctx.scale(-1, 1); ctx.translate(-(fx + lungeOff), 0); }
    if (u.flash > 0) ctx.filter = "brightness(3)";
    const sc = Math.min(w / art.width, h / art.height), aw = art.width * sc, ah = art.height * sc;
    ctx.drawImage(art, fx + lungeOff - aw / 2, y + h - ah, aw, ah);
    ctx.imageSmoothingEnabled = false;
  } else {
    const img = u.flash > 0 ? (flip ? s.whiteFlip || s.white : s.white) : (flip ? s.flip || s.img : s.img);
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (u.dead) return;
  if (u.shield > 0 && u.trait !== "shield") { ctx.fillStyle = "rgba(159,220,255,.25)"; ctx.fillRect(x - 1, y + 2, w + 2, h - 2); }
  if (u.trait === "shield" && u.shield > 0) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(x - 2, y + 3, 2, h - 5); }
  if (u.trait === "bomber") { ctx.fillStyle = B.t % .25 < .12 ? "#ff5a3a" : "#ffd84a"; ctx.fillRect(x + w - 4, y - 1, 2, 2); }
  if (u.trait === "healer") { ctx.fillStyle = "#8affb8"; ctx.fillRect(fx - 1, y - 7, 3, 1); ctx.fillRect(fx, y - 8, 1, 3); }
  if (u.burn) { ctx.fillStyle = B.t % .3 < .15 ? "#ff9a4a" : "#ffd84a"; ctx.fillRect(x + w - 3, y + 3, 2, 2); }
  if (u.chill > 0) { ctx.fillStyle = "#d9f3ff"; ctx.fillRect(x + 1, y + 3, 2, 2); }
  if (u.mark > 0) { ctx.fillStyle = "#ff5a7a"; ctx.fillRect(fx - 2, y - 3, 5, 1); ctx.fillRect(fx, y - 5, 1, 5); }
  // health bars
  const bw = u.boss ? 34 : u.side === "hero" ? 12 : 14, bx = fx - Math.round(bw / 2), by = y - 4;
  if (u.side === "hero" || u.hp < u.maxHp || u.boss || u.shieldMax) {
    ctx.fillStyle = "#160f1c"; ctx.fillRect(bx - 1, by - 1, bw + 2, u.shieldMax ? 6 : 4);
    ctx.fillStyle = "#4a2030"; ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = u.side === "hero" ? "#7affb0" : u.boss ? "#ff5a7a" : "#ff7a6a"; ctx.fillRect(bx, by, Math.ceil(bw * u.hp / u.maxHp), 2);
    if (u.shieldMax) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(bx, by + 3, Math.ceil(bw * Math.max(0, u.shield) / u.shieldMax), 1); }
  }
  if (B.focus === u) { const ay = by - 6 + Math.round(Math.sin(B.t * 6)); ctx.fillStyle = "#7affb0"; ctx.fillRect(fx - 2, ay, 5, 1); ctx.fillRect(fx - 1, ay + 1, 3, 1); ctx.fillRect(fx, ay + 2, 1, 1); }
  if (u.charge) { const c = u.charge; ctx.fillStyle = "#160f1c"; ctx.fillRect(bx - 1, by - 8, bw + 2, 4); ctx.fillStyle = "#ffd84a"; ctx.fillRect(bx, by - 7, Math.ceil(bw * Math.min(1, c.gauge / c.need)), 2); }
  if (u.stun > 0) pixText("STUN", fx, by - 6, 5, "#ffd84a", "center", 400);
}

function drawZones() {
  B.zones.forEach(z => {
    const k = z.t / z.life, x = z.x - B.cam.x, y = z.y - B.cam.y;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = z.color; ctx.lineWidth = z.ring ? 1.5 : 1;
    ctx.beginPath(); ctx.ellipse(x, y, z.r * (z.ring ? .4 + k * .6 : 1), z.r * .55 * (z.ring ? .4 + k * .6 : 1), 0, 0, Math.PI * 2); ctx.stroke();
    if (z.fill) { ctx.globalAlpha = .18 * (1 - k); ctx.fillStyle = z.color; ctx.fill(); }
    ctx.restore();
  });
  // boss red circle: fills up as the attack gets closer
  if (B.boss && B.boss.charge && !B.boss.dead) {
    const c = B.boss.charge, x = c.x - B.cam.x, y = c.y - B.cam.y, k = c.t / c.dur;
    ctx.save();
    ctx.fillStyle = `rgba(255,60,90,${.12 + .1 * Math.sin(B.t * 14)})`;
    ctx.beginPath(); ctx.ellipse(x, y, c.r, c.r * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,60,90,.28)";
    ctx.beginPath(); ctx.ellipse(x, y, c.r * k, c.r * .55 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ff5a7a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, c.r, c.r * .55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// a pulsing arrow at the screen edge toward the nearest monster when none are in view
function drawPointer() {
  const l = leader();
  if (!l) return;
  const inView = f => f.x > B.cam.x && f.x < B.cam.x + LW && f.y > B.cam.y && f.y < B.cam.y + LH;
  const tgt = B.boss && !B.boss.dead ? B.boss : nearest(l, alive(B.foes));
  if (!tgt || inView(tgt) || (!tgt.boss && alive(B.foes).some(inView))) return;
  const cx = LW / 2, cy = LH / 2, a = Math.atan2(tgt.y - B.cam.y - cy, tgt.x - B.cam.x - cx);
  const r = 62 + Math.sin(B.t * 6) * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .85;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = tgt.boss ? "#ff5a7a" : "#7affb0";
  ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-1, 0); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawHud() {
  const boss = B.boss && !B.boss.dead ? B.boss : null;
  ctx.fillStyle = "rgba(10,6,14,.6)"; ctx.fillRect(40, 3, 80, boss ? 11 : 5);
  if (boss) {
    ctx.fillStyle = "#4a2030"; ctx.fillRect(42, 9, 76, 3);
    ctx.fillStyle = "#ff5a7a"; ctx.fillRect(42, 9, Math.ceil(76 * boss.hp / boss.maxHp), 3);
    thaiText(boss.name, 80, 5.5, 5, "#ff9ab0");
  } else {
    ctx.fillStyle = "#2a2438"; ctx.fillRect(42, 5, 76, 2);
    ctx.fillStyle = "#7affb0"; ctx.fillRect(42, 5, Math.ceil(76 * Math.min(1, B.kills / B.quota)), 2);
  }
  if (boss && boss.charge) {
    if (B.t % .5 < .3) thaiText("แตะพื้นหนีวงแดง หรือแตะบอสรัวๆ!", LW / 2, LH - 8, 6, "#ffd84a");
    ctx.strokeStyle = `rgba(255,90,122,${.4 + .3 * Math.sin(B.t * 12)})`; ctx.lineWidth = 1; ctx.strokeRect(1.5, 1.5, LW - 3, LH - 3);
  }
  if (B.moveTo) { const x = B.moveTo.x - B.cam.x, y = B.moveTo.y - B.cam.y; ctx.strokeStyle = "#7affb0"; ctx.beginPath(); ctx.ellipse(x, y, 5, 2.5, 0, 0, Math.PI * 2); ctx.stroke(); }
}

function pixText(text, x, y, size, color, align = "center", weight = 700) {
  ctx.font = `${weight} ${size}px "Silkscreen", "Chakra Petch", monospace`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillStyle = "#160f1c";
  ctx.fillText(text, x + .6, y + .6); ctx.fillText(text, x - .6, y + .6);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function thaiText(text, x, y, size, color, align = "center") {
  ctx.font = `700 ${size}px "Chakra Petch", sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillStyle = "#160f1c"; ctx.fillText(text, x + .7, y + .7);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawCutin(c) {
  const p = c.t / c.dur, ease = p < .2 ? p / .2 : p > .8 ? (1 - p) / .2 : 1;
  ctx.fillStyle = `rgba(10,6,14,${.5 * ease})`; ctx.fillRect(0, 0, LW, LH);
  const bandY = 52, bandH = 46;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, bandY + 10); ctx.lineTo(LW, bandY - 4); ctx.lineTo(LW, bandY + bandH - 6); ctx.lineTo(0, bandY + bandH + 8); ctx.closePath();
  ctx.globalAlpha = ease;
  ctx.fillStyle = "#0c0810"; ctx.fill();
  ctx.clip();
  ctx.fillStyle = c.u.color; ctx.globalAlpha = ease * .25;
  for (let i = 0; i < 9; i++) ctx.fillRect(((i * 31 + c.t * 260) % (LW + 40)) - 20, bandY + i * 6, 18, 1);
  ctx.globalAlpha = ease;
  const slide = (1 - Math.min(1, p / .25)) * -40;
  const art = ART["portrait:" + c.u.id];
  if (art) {
    ctx.imageSmoothingEnabled = true;
    const h = 70, w = art.width * h / art.height;
    ctx.drawImage(art, 4 + slide, bandY - 10, w, h);
    ctx.imageSmoothingEnabled = false;
  } else {
    const s = sprite("hero:" + c.u.id);
    ctx.drawImage(s.img, 0, 0, s.w, 15, 6 + slide, bandY - 2, s.w * 3, 45);
  }
  ctx.restore();
  ctx.globalAlpha = ease;
  pixText("SKILL", 116 - slide / 2, bandY + 6, 6, c.u.color, "center", 400);
  thaiText(c.sk.name, 116 - slide / 2, bandY + 19, 11, "#fff2d8");
  thaiText(c.u.name, 116 - slide / 2, bandY + 32, 7, c.u.color);
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const sx = B.shake > 0 ? Math.round(rand(-1, 1)) : 0, sy = B.shake > 0 ? Math.round(rand(-1, 1)) : 0;
  ctx.save(); ctx.translate(sx, sy);
  drawMap();
  drawZones();
  [...B.heroes, ...B.foes].sort((a, b) => a.y - b.y).forEach(drawUnit);
  const cx = B.cam.x, cy = B.cam.y;
  B.proj.forEach(p => {
    const k = p.t / p.dur, x = p.x + (p.tx - p.x) * k - cx, y = p.y + (p.ty - p.y) * k - Math.sin(k * Math.PI) * 6 - cy;
    if (p.orb) { ctx.fillStyle = "#160f1c"; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); ctx.fillStyle = p.color; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    else { ctx.fillStyle = p.color; ctx.fillRect(Math.round(x) - 2, Math.round(y), 4, 1); ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1); }
  });
  B.fx.forEach(p => {
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
    ctx.globalAlpha = 1 - p.t / p.life;
    if (p.color === "chest") { ctx.fillStyle = "#160f1c"; ctx.fillRect(x - 5, y - 1, 10, 8); ctx.fillStyle = "#a8743a"; ctx.fillRect(x - 4, y, 8, 6); ctx.fillStyle = "#ffcb52"; ctx.fillRect(x - 4, y + 2, 8, 1); ctx.fillRect(x - 1, y + 2, 2, 2); }
    else if (p.color === "slash") { ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.lineTo(x + 7, y + 6); ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = .6; ctx.stroke(); }
    else { ctx.fillStyle = p.color; ctx.fillRect(x, y, p.size, p.size); }
  });
  ctx.globalAlpha = 1;
  B.nums.forEach(n => { ctx.globalAlpha = n.t < .7 ? 1 : 1 - (n.t - .7) / .2; (/[ก-๙]/.test(n.text) ? thaiText : pixText)(n.text, n.x - cx, n.y - n.t * 14 - cy, n.big ? 8 : 6, n.color); });
  ctx.globalAlpha = 1;
  ctx.restore();
  drawPointer();
  drawHud();
  if (B.cutin) drawCutin(B.cutin);
  if (B.banner && !B.cutin) {
    const b = B.banner, a = Math.min(1, b.t * 3), y0 = 56;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(10,6,14,.7)"; ctx.fillRect(0, y0, LW, b.sub ? 28 : 18);
    ctx.fillStyle = b.boss ? "#ff5a7a" : b.bad ? "#9a8aa8" : "#7affb0"; ctx.fillRect(0, y0, LW, 1); ctx.fillRect(0, y0 + (b.sub ? 28 : 18) - 1, LW, 1);
    thaiText(b.text, LW / 2, y0 + 9, 10, b.boss ? "#ff9ab0" : "#fff2d8");
    if (b.sub) thaiText(b.sub, LW / 2, y0 + 21, 7, "#c8b8d8");
    ctx.globalAlpha = 1;
  }
}

// ---------- Taps on the scene ----------
cv.addEventListener("pointerdown", e => {
  if (B.paused || B.state !== "fight") return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * LW + B.cam.x, y = (e.clientY - r.top) / r.height * LH + B.cam.y;
  const f = foeAt(x, y);
  if (f) {
    if (f.charge) { f.charge.gauge += f.charge.need * .12; burst(x, y, "#ffd84a", 6, 1.2); addNum(x, y - 4, "ตุ้บ!", "#ffd84a"); }
    B.focus = f; B.moveTo = null;
    ring(f.x, f.y, 8, "#7affb0", .3);
  } else {
    B.moveTo = { x: Math.max(EDGE, Math.min(MAP_W - EDGE, x)), y: Math.max(EDGE + 10, Math.min(MAP_H - EDGE, y)), t: 3 };
    B.focus = null;
  }
  if (!S.tapTip) { S.tapTip = true; save(); renderPanel(); }
});

let lastT = 0, uiAcc = 0, questAcc = 0;
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000 || 0);
  lastT = now;
  const sdt = dt * S.speed;
  // two half steps at x2 keep timers as smooth as x1
  if (S.speed > 1) { step(sdt / 2); step(sdt / 2); } else step(sdt);
  draw();
  uiAcc += dt; questAcc += dt;
  if (uiAcc > .1) { uiAcc = 0; renderParty(); }
  if (questAcc > 1) { questAcc = 0; questDot(); }
  requestAnimationFrame(frame);
}

// ---------- UI: top + party ----------
function updateWallet() {
  $("#gold").textContent = fmt(S.gold);
  $("#beans").textContent = fmt(S.beans);
}
function renderStageInfo() {
  $("#stageLabel").textContent = stageName(S.stage);
  $("#worldName").textContent = WORLDS[worldOf(S.stage)].name;
  $("#waveDots").textContent = B.boss && !B.boss.dead ? "บอส!" : `${Math.min(B.kills, B.quota)}/${B.quota}`;
}

let partyKey = "";
function renderParty(force) {
  const el = $("#party");
  const key = B.heroes.map(u => u.id).join() + Object.keys(ART).length;
  if (force || key !== partyKey) {
    partyKey = key;
    el.innerHTML = B.heroes.map((u, i) => `
      <button class="pcard" data-i="${i}" style="--c:${u.color}">
        <span class="pic">${imgTag(heroPic(u.id))}</span>
        <span class="pinfo">
          <span class="pname">${u.name}<em>${ROLE[HEROES[u.id].role].th}</em></span>
          <span class="bar hp"><i></i></span>
          <span class="sk"><span class="bar en"><i></i></span><span class="bar en en2"><i></i></span></span>
        </span>
      </button>`).join("");
    el.querySelectorAll(".pcard").forEach(b => b.onclick = () => {
      const i = +b.dataset.i, u = B.heroes[i];
      if (u.dead) return toast(`${u.name} หมดแรง รอด่านหน้า`);
      if ([1, 0].some(k => skillReady(u, k) && castSkill(u, k))) return;
      const next = Math.min(...[0, 1].filter(k => skillUnlocked(u.id, k)).map(k => u.skillCd[k]));
      toast(`สกิลพร้อมอีก ${Math.ceil(next)} วิ`);
    });
  }
  el.querySelectorAll(".pcard").forEach((b, i) => {
    const u = B.heroes[i];
    if (!u) return;
    b.querySelector(".hp i").style.width = (100 * u.hp / u.maxHp) + "%";
    const sks = HEROES[u.id].skills;
    b.querySelectorAll(".en").forEach((bar, k) => {
      bar.classList.toggle("locked", !skillUnlocked(u.id, k));
      bar.querySelector("i").style.width = (100 * (1 - u.skillCd[k] / sks[k].cd)) + "%";
    });
    b.classList.toggle("ready", !u.dead && [0, 1].some(k => skillReady(u, k)));
    b.classList.toggle("down", u.dead);
  });
}

// ---------- UI: panels ----------
let TAB = "adv";
function renderPanel() {
  const p = $("#panel");
  if (TAB === "adv") p.innerHTML = advPanel();
  else if (TAB === "team") p.innerHTML = teamPanel();
  else if (TAB === "gear") p.innerHTML = gearPanel();
  else p.innerHTML = gachaPanel();
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === TAB));
  updateWallet();
}

function lvButton(id) {
  const c = heroLvCost(S.heroes[id].lv);
  return `<button class="btn sm" data-act="lv" data-id="${id}" ${S.gold < c ? "disabled" : ""}>Lv+ <span class="coin"></span>${fmt(c)}</button>`;
}
function stars(n) { return `<span class="stars">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`; }
function rar(r) { return `<span class="rar r-${r}">${r}</span>`; }
function roleTag(role) { return `<span class="gun">${ROLE[role].th}</span>`; }

function advPanel() {
  const w = WORLDS[worldOf(S.stage)];
  const rows = S.team.filter(Boolean).map(id => {
    const h = HEROES[id], o = S.heroes[id];
    return `<div class="row">
      <span class="thumb" style="--c:${h.color}">${imgTag(heroPic(id))}</span>
      <span class="grow"><b>${h.name}</b> ${rar(h.rarity)} ${roleTag(h.role)}<br><small>Lv ${o.lv} · พลัง ${fmt(heroPower(id))}</small></span>
      ${lvButton(id)}
    </div>`;
  }).join("");
  return `
    ${S.tapTip ? "" : `<div class="tip"><b>แตะมอน</b>เพื่อสั่งรุม <b>แตะพื้น</b>เพื่อพาทีมเดินไปตรงนั้น ตอนบอสชาร์จ<b>หนีออกจากวงแดง</b> หรือแตะบอสรัวๆ ให้มึน</div>`}
    <div class="card">
      <div class="card-h"><span>${w.name}</span><span class="pill">ด่าน ${stageName(S.stage)}</span></div>
      <div class="kv"><span>ด่านไกลสุดที่ไปได้</span><b>${stageName(S.best)}</b></div>
      <div class="kv"><span>ทองต่อมอนหนึ่งตัว</span><b><span class="coin"></span>${fmt(killGold(S.stage))}</b></div>
      <div class="kv"><span>พลังทีม</span><b>${fmt(teamPower())}</b></div>
      <label class="switch"><input type="checkbox" data-act="autoNext" ${S.autoNext ? "checked" : ""}><span></span>ผ่านแล้วไปด่านถัดไปเอง</label>
      ${S.stage < S.best ? `<button class="btn wide" data-act="goBest">ลุยด่าน ${stageName(S.best)} ต่อ</button>` : ""}
    </div>
    ${questCard()}
    <div class="card">
      <div class="card-h"><span>อัพเลเวลทีม</span><button class="btn sm ghost" data-act="lvAll">อัพทุกคน</button></div>
      ${rows}
    </div>
    <p class="hint">ปิดแอปไปได้เลย ทีมจะสู้ต่อเอง กลับมาเก็บทองกับเมล็ดกาแฟได้ (สูงสุด 8 ชั่วโมง)</p>`;
}

function teamPanel() {
  const slots = [0, 1, 2].map(i => {
    const id = S.team[i];
    if (!id) return `<button class="slot empty" data-act="slot" data-i="${i}">+<small>ว่าง</small></button>`;
    const h = HEROES[id];
    return `<button class="slot r-${h.rarity}b" data-act="hero" data-id="${id}" style="--c:${h.color}">
      <span class="slot-n">${["หน้า", "กลาง", "หลัง"][i]}</span>
      ${imgTag(heroPic(id))}<b>${h.name}</b><small>${ROLE[h.role].th} · Lv ${S.heroes[id].lv}</small></button>`;
  }).join("");
  const owned = Object.keys(HEROES).filter(id => S.heroes[id]);
  const order = { SSR: 0, SR: 1, R: 2 };
  owned.sort((a, b) => order[HEROES[a].rarity] - order[HEROES[b].rarity] || S.heroes[b].lv - S.heroes[a].lv);
  const list = owned.map(id => {
    const h = HEROES[id], o = S.heroes[id], inTeam = S.team.includes(id);
    return `<button class="hcard r-${h.rarity}b" data-act="hero" data-id="${id}" style="--c:${h.color}">
      ${imgTag(heroPic(id))}
      <span class="hc-top">${rar(h.rarity)}${inTeam ? '<span class="tag">ในทีม</span>' : ""}</span>
      <b>${h.name}</b><small>${ROLE[h.role].th} · Lv ${o.lv}</small>${stars(o.star)}
    </button>`;
  }).join("");
  const missing = Object.keys(HEROES).length - owned.length;
  return `
    <div class="card"><div class="card-h"><span>ทีมผจญภัย</span><small>ช่องหน้าโดนตีบ่อยสุด</small></div><div class="slots">${slots}</div></div>
    <div class="card"><div class="card-h"><span>ฮีโร่ของฉัน</span><small>${owned.length}/${Object.keys(HEROES).length}${missing ? " · ที่เหลือไปชงเรียกนะ" : ""}</small></div><div class="hgrid">${list}</div></div>`;
}

function gearRow(g, act = "gearItem", extra = "") {
  const d = GEAR[g.id];
  return `<button class="row btnrow" data-act="${act}" data-uid="${g.uid}" ${extra}>
    <span class="thumb icon r-${d.rarity}b">${imgTag(gearPic(g.id))}</span>
    <span class="grow"><b>${g.plus ? `+${g.plus} ` : ""}${d.name}</b> ${rar(d.rarity)}<br><small>${SLOT_TH[d.slot]} · ${statText(gearStats(g))}</small></span>
    ${g.by ? `<span class="tag" style="--c:${HEROES[g.by].color}">${HEROES[g.by].name}</span>` : ""}
  </button>`;
}
function statText(o) {
  const parts = [];
  if (o.atk) parts.push(`โจมตี +${Math.round(o.atk)}%`);
  if (o.hp) parts.push(`HP +${Math.round(o.hp)}%`);
  if (o.def) parts.push(`ป้องกัน +${Math.round(o.def)}%`);
  if (o.crit) parts.push(`คริ +${Math.round(o.crit * 100)}%`);
  if (o.spd) parts.push(`ความเร็ว +${Math.round(o.spd)}`);
  return parts.join(" · ");
}
let gearFilter = "all";
function gearPanel() {
  const order = { SSR: 0, SR: 1, R: 2 };
  const items = S.gear.filter(g => gearFilter === "all" || GEAR[g.id].slot === gearFilter)
    .sort((a, b) => order[GEAR[a.id].rarity] - order[GEAR[b.id].rarity] || b.plus - a.plus);
  const chips = ["all", "weapon", "armor", "charm"].map(k => `<button class="chip ${gearFilter === k ? "on" : ""}" data-act="gf" data-k="${k}">${k === "all" ? "ทั้งหมด" : SLOT_TH[k]}</button>`).join("");
  const spare = S.gear.filter(g => !g.by && GEAR[g.id].rarity === "R").length;
  return `
    <div class="chips">${chips}</div>
    <label class="switch tight"><input type="checkbox" data-act="autoR" ${S.autoSalvageR ? "checked" : ""}><span></span>ของ R ที่ดรอปจากมอน ย่อยเป็นทองทันที</label>
    <div class="card">
      <div class="card-h"><span>อุปกรณ์ ${S.gear.length} ชิ้น</span>${spare ? `<button class="btn sm ghost" data-act="salvageR">ย่อย R ที่ไม่ได้ใส่ (${spare})</button>` : ""}</div>
      ${items.length ? items.map(g => gearRow(g)).join("") : `<p class="empty-note">ยังไม่มีอุปกรณ์ ไปสุ่มที่แท็บ "ชงเรียก" ได้เลย</p>`}
    </div>`;
}

function gachaPanel() {
  const free = k => S.free[k] !== today();
  const banner = (k, title, desc, c1, c10, icon) => `
    <div class="banner b-${k}">
      <div class="banner-art">${icon}</div>
      <div class="banner-body">
        <b>${title}</b><small>${desc}</small>
        <small class="rates">SSR 3% · SR 18% · R 79% · การันตี SSR ใน <b>${COST.pity - S.pity[k]}</b> ครั้ง</small>
        <div class="banner-btns">
          ${free(k) ? `<button class="btn gold" data-act="pull" data-k="${k}" data-n="1" data-free="1">ฟรีวันนี้ ×1</button>`
                    : `<button class="btn" data-act="pull" data-k="${k}" data-n="1"><span class="bean"></span>${c1} ×1</button>`}
          <button class="btn gold" data-act="pull" data-k="${k}" data-n="10"><span class="bean"></span>${c10} ×10</button>
        </div>
      </div>
    </div>`;
  const heroIcons = ["ruby", "mochi", "kaida"].map(id => imgTag(heroPic(id))).join("");
  const gearIcons = ["fang", "dragonmail", "eclipse"].map(id => imgTag(gearPic(id))).join("");
  return `
    ${banner("hero", "ชงเรียกนักผจญภัย", "ชงกาแฟหนึ่งแก้ว เรียกฮีโร่หนึ่งคน ได้ซ้ำ = ดาวเพิ่ม", COST.heroPull, COST.heroPull10, heroIcons)}
    ${banner("gear", "กล่องของช่างตีเหล็ก", "อาวุธเสริม เกราะ เครื่องราง อัพเลเวลด้วยทอง", COST.gearPull, COST.gearPull10, gearIcons)}
    <p class="hint">สุ่ม ×10 การันตีอย่างน้อย SR 1 ชิ้น · เมล็ดกาแฟได้จากภารกิจวันนี้ การผ่านด่าน หีบสมบัติจากมอน และตอนปิดแอปไว้</p>`;
}

// ---------- Daily quests: the steady source of coffee beans ----------
const QUESTS = [
  { k: "kills",  need: 150, beans: 100, text: n => `ปราบมอน ${n} ตัว` },
  { k: "clears", need: 5,   beans: 100, text: n => `ผ่านด่าน ${n} ครั้ง` },
  { k: "bursts", need: 15,  beans: 60, text: n => `ใช้สกิล ${n} ครั้ง` },
  { k: "pulls",  need: 1,   beans: 40, text: () => "ชงเรียก 1 ครั้ง (ใช้สุ่มฟรีก็ได้)" },
];
const ALL_DONE_BEANS = 100;
function daily() {
  if (!S.daily || S.daily.day !== today()) S.daily = { day: today(), kills: 0, clears: 0, bursts: 0, pulls: 0, claimed: {} };
  return S.daily;
}
function bump(k, n = 1) { daily()[k] += n; }
const questClaimable = () => { const d = daily(); return QUESTS.some((q, i) => d[q.k] >= q.need && !d.claimed[i]) || (QUESTS.every((q, i) => d.claimed[i]) && !d.claimed.all); };
function questDot() { document.querySelector('.tabs [data-tab="adv"]').classList.toggle("dot", questClaimable()); }
function questCard() {
  const d = daily();
  const rows = QUESTS.map((q, i) => {
    const v = Math.min(d[q.k], q.need), done = v >= q.need;
    return `<div class="quest ${d.claimed[i] ? "claimed" : ""}">
      <span class="grow">${q.text(q.need)}<span class="qbar"><i style="width:${100 * v / q.need}%"></i></span></span>
      ${d.claimed[i] ? `<span class="qdone">รับแล้ว</span>`
        : `<button class="btn sm ${done ? "gold" : ""}" data-act="claim" data-q="${i}" ${done ? "" : "disabled"}>${done ? "รับ" : `${v}/${q.need}`} <span class="bean"></span>${q.beans}</button>`}
    </div>`;
  }).join("");
  const all = QUESTS.every((q, i) => d.claimed[i]);
  return `<div class="card">
    <div class="card-h"><span>ภารกิจวันนี้</span><small>รีเซ็ตเที่ยงคืน</small></div>
    ${rows}
    <div class="quest"><span class="grow"><b>ทำครบทุกข้อ</b></span>${d.claimed.all ? `<span class="qdone">รับแล้ว</span>` : `<button class="btn sm ${all ? "gold" : ""}" data-act="claim" data-q="all" ${all ? "" : "disabled"}>รับ <span class="bean"></span>${ALL_DONE_BEANS}</button>`}</div>
  </div>`;
}

// ---------- Sheets (bottom modals) ----------
function openSheet(html) {
  const s = $("#sheet");
  s.innerHTML = `<div class="sheet-bg" data-act="close"></div><div class="sheet-body">${html}</div>`;
  s.classList.remove("hidden");
}
function closeSheet() { $("#sheet").classList.add("hidden"); $("#sheet").innerHTML = ""; }

function heroSheet(id) {
  const h = HEROES[id], o = S.heroes[id], st = heroStats(id);
  const slots = ["weapon", "armor", "charm"].map(slot => {
    const it = S.gear.find(x => x.by === id && GEAR[x.id].slot === slot);
    return it ? `<button class="eq" data-act="pickGear" data-id="${id}" data-slot="${slot}">${imgTag(gearPic(it.id))}<small>${it.plus ? `+${it.plus} ` : ""}${GEAR[it.id].name}</small></button>`
              : `<button class="eq empty" data-act="pickGear" data-id="${id}" data-slot="${slot}">+<small>${SLOT_TH[slot]}</small></button>`;
  }).join("");
  const inTeam = S.team.indexOf(id);
  openSheet(`
    <div class="hero-head" style="--c:${h.color}">
      <span class="big-pic">${imgTag(heroPic(id))}</span>
      <div><b class="hname">${h.name}</b> ${rar(h.rarity)}<br><small>${ROLE[h.role].th} · Lv ${o.lv}</small><br>${stars(o.star)}</div>
    </div>
    <p class="quote">“${h.line}”</p>
    <div class="stats">
      <span>HP<b>${fmt(st.hp)}</b></span><span>โจมตี<b>${fmt(st.atk)}</b></span><span>ป้องกัน<b>${fmt(st.def)}</b></span>
      <span>คริ<b>${Math.round(st.crit * 100)}%</b></span><span>ความเร็ว<b>${Math.round(st.spd)}</b></span><span>พลัง<b>${fmt(heroPower(id))}</b></span>
    </div>
    ${h.skills.map((sk, i) => `<div class="skill ${skillUnlocked(id, i) ? "" : "locked"}"><b>สกิล ${i + 1}: ${sk.name} <em>คูลดาวน์ ${sk.cd} วิ</em></b><small>${skillText(sk)}${skillUnlocked(id, i) ? "" : ` · ปลดล็อกที่ Lv ${SKILL2_LV}`}</small></div>`).join("")}
    <div class="skill passive ${o.lv >= PASSIVE_LV ? "" : "locked"}"><b>ติดตัว: ${h.passive.name}</b><small>${h.passive.text}${o.lv >= PASSIVE_LV ? "" : ` · ปลดล็อกที่ Lv ${PASSIVE_LV}`}</small></div>
    <div class="eqs">${slots}</div>
    <div class="sheet-btns">
      ${lvButton(id)}
      ${inTeam >= 0 ? `<button class="btn ghost" data-act="unteam" data-id="${id}" ${S.team.filter(Boolean).length <= 1 ? "disabled" : ""}>ออกจากทีม</button>`
                    : [0, 1, 2].map(i => `<button class="btn ghost" data-act="toTeam" data-id="${id}" data-i="${i}">ใส่ช่อง${["หน้า", "กลาง", "หลัง"][i]}</button>`).join("")}
    </div>
    <p class="hint">ได้ตัวซ้ำจากกาชา = ดาวเพิ่ม (สูงสุด 5) แต่ละดาวเพิ่มพลัง 22%</p>`);
}
function skillText(sk) {
  const pct = v => Math.round(v * 100) + "%";
  const el = sk.el === "fire" ? " ไฟ" : sk.el === "ice" ? " น้ำแข็ง" : "";
  const each = sk.hits > 1 ? `${sk.hits} ครั้ง ครั้งละ ` : "";
  let t = {
    strike: () => `โจมตี${el}เป้าหมาย ${each}${pct(sk.mult)}`,
    multi: () => `โจมตีศัตรูสุ่มรอบตัว ${each}${pct(sk.mult)}`,
    lowest: () => `โจมตีศัตรูที่เลือดน้อยสุด ${each}${pct(sk.mult)}`,
    blast: () => `ระเบิด${el}เป็นวงที่เป้าหมาย ${pct(sk.mult)}`,
    rain: () => `ห่าฝนโจมตีเป็นวง ${sk.ticks} ครั้ง ครั้งละ ${pct(sk.mult)}`,
    leap: () => `กระโดดใส่เป้าหมาย ระเบิด${el}เป็นวง ${pct(sk.mult)}`,
    nova: () => `คลื่น${el}เป็นวงรอบ${sk.at === "target" ? "เป้าหมาย" : "ตัว"} ${sk.ticks > 1 ? sk.ticks + " ครั้ง ครั้งละ " : ""}${pct(sk.mult)}`,
    heal: () => `ฟื้น HP ทั้งทีม ${pct(sk.pct)}${sk.shield ? ` และให้โล่ ${pct(sk.shield)}` : ""}`,
    guard: () => `ให้โล่ทั้งทีม ${pct(sk.pct)} ของ HP ตัวเอง และยั่วศัตรูให้ตีตัวเอง ${sk.taunt} วิ`,
    buff: () => "ปลุกใจทั้งทีม",
    revive: () => `ชุบชีวิตเพื่อนที่ล้ม ฟื้น HP ${pct(sk.pct)}`,
    clone: () => `เรียกร่างเงา ${sk.dur} วิ ตีซ้ำทุกครั้งแรง ${pct(sk.power)}`,
  }[sk.kind]();
  if (sk.atk) t += ` · พลังโจมตีทั้งทีม +${pct(sk.atk)} ${sk.dur} วิ`;
  if (sk.spd) t += ` · ตีเร็วขึ้น +${sk.spd} ${sk.dur} วิ`;
  if (sk.cdr) t += ` · ลดคูลดาวน์สกิลทั้งทีม ${sk.cdr} วิ`;
  if (sk.freeze) t += ` · แช่แข็ง ${sk.freeze} วิ`;
  if (sk.stun) t += ` · มึนงง ${sk.stun} วิ`;
  if (sk.mark) t += " · ทำเครื่องหมายล่า (โดนแรงขึ้น 30%)";
  if (sk.lifesteal) t += ` · ดูดเลือด ${pct(sk.lifesteal)}`;
  if (sk.crit) t += " · คริติคอลทุกครั้ง";
  if (sk.el === "fire") t += " · ติดไฟ (ใส่ศัตรูที่แข็ง = ละลาย ×2)";
  if (sk.el === "ice") t += " · หนาวสั่น (ใส่ศัตรูที่ติดไฟ = ไอน้ำระเบิด)";
  return t;
}

function gearSheet(uid) {
  const g = S.gear.find(x => x.uid === uid);
  if (!g) return closeSheet();
  const d = GEAR[g.id], cost = plusCost(g), rate = PLUS_RATE[g.plus];
  const owners = Object.keys(S.heroes).map(id => `<button class="chip ${g.by === id ? "on" : ""}" data-act="equipTo" data-uid="${uid}" data-id="${id}">${HEROES[id].name}</button>`).join("");
  openSheet(`
    <div class="hero-head">
      <span class="big-pic icon r-${d.rarity}b">${imgTag(gearPic(g.id))}</span>
      <div><b class="hname">${g.plus ? `+${g.plus} ` : ""}${d.name}</b> ${rar(d.rarity)}<br><small>${SLOT_TH[d.slot]} · ตีบวก ${g.plus}/${PLUS_MAX}</small></div>
    </div>
    <div class="skill"><b>ค่าพลังหลัก</b><small>${statText(gearStats({ ...g, subs: [] }))}</small>
      ${g.plus < PLUS_MAX ? `<small class="next">ถ้าตีบวกผ่าน: ${statText(gearStats({ ...g, plus: g.plus + 1, subs: [] }))}</small>` : ""}</div>
    <div class="skill subs"><b>ค่าพลังเสริม (สุ่มตอนได้ของ)</b><small>${statText(Object.fromEntries(g.subs.map(s => [s.k, s.v])))}</small></div>
    <div class="card-h"><span>ใส่ให้</span></div>
    <div class="chips wrap">${owners}${g.by ? `<button class="chip" data-act="unequip" data-uid="${uid}">ถอดออก</button>` : ""}</div>
    <div class="sheet-btns">
      ${g.plus < PLUS_MAX ? `<button class="btn gold" data-act="enhance" data-uid="${uid}" ${S.gold < cost ? "disabled" : ""}>ตีบวก +${g.plus + 1} · โอกาส ${Math.round(rate * 100)}% · <span class="coin"></span>${fmt(cost)}</button>` : `<button class="btn" disabled>ตีบวกเต็มแล้ว</button>`}
      <button class="btn ghost" data-act="salvage" data-uid="${uid}">ย่อยเป็นทอง ${fmt(gearSalvage(g))}</button>
    </div>
    <p class="hint">ตีบวกพลาดแล้วค่าบวกไม่ลด แค่เสียทอง</p>`);
}

function pickGearSheet(heroId, slot) {
  const items = S.gear.filter(g => GEAR[g.id].slot === slot).sort((a, b) => (b.by === heroId) - (a.by === heroId) || RARITY[GEAR[b.id].rarity].mult - RARITY[GEAR[a.id].rarity].mult || b.plus - a.plus);
  openSheet(`
    <div class="card-h"><span>เลือก${SLOT_TH[slot]}ให้ ${HEROES[heroId].name}</span><button class="btn sm ghost" data-act="hero" data-id="${heroId}">กลับ</button></div>
    ${items.length ? items.map(g => gearRow(g, "equipPick", `data-hero="${heroId}"`)).join("") : `<p class="empty-note">ยังไม่มี${SLOT_TH[slot]} ไปสุ่มที่ "กล่องของช่างตีเหล็ก" ได้เลย</p>`}`);
}

function menuSheet() {
  openSheet(`
    <div class="card-h"><span>กิลด์ยามดึก</span></div>
    <p class="hint">ล้มมอนไปแล้ว ${fmt(S.kills)} ตัว · ชงเรียกไปแล้ว ${fmt(S.pulls)} ครั้ง</p>
    <p class="hint">อยากเปลี่ยนภาพเป็นภาพที่เจนเอง: วางไฟล์ PNG ในโฟลเดอร์ <code>game/assets/</code> ตามชื่อใน <code>PROMPTS.md</code> เกมจะใช้ภาพนั้นแทนให้เอง</p>
    <div class="sheet-btns"><button class="btn ghost" data-act="reset">เริ่มเกมใหม่ (ลบเซฟ)</button><button class="btn" data-act="close">ปิด</button></div>`);
}

// ---------- Actions ----------
function levelUp(id) {
  const c = heroLvCost(S.heroes[id].lv);
  if (S.gold < c) return false;
  S.gold -= c; S.heroes[id].lv++;
  return true;
}
function equip(uid, heroId) {
  const g = S.gear.find(x => x.uid === uid);
  S.gear.forEach(x => { if (x.by === heroId && GEAR[x.id].slot === GEAR[g.id].slot) x.by = null; });
  g.by = heroId;
}
const sheetOpen = () => !$("#sheet").classList.contains("hidden");

const ACT = {
  close: () => closeSheet(),
  lv: el => {
    if (!levelUp(el.dataset.id)) return toast("ทองไม่พอ");
    save(); refreshParty();
    if (sheetOpen()) heroSheet(el.dataset.id);
    renderPanel();
  },
  lvAll: () => {
    let n = 0, guard = 0;
    // spend gold on whoever is lowest, so the team grows evenly
    while (guard++ < 500) {
      const ids = S.team.filter(Boolean).sort((a, b) => S.heroes[a].lv - S.heroes[b].lv);
      if (!levelUp(ids[0])) break;
      n++;
    }
    toast(n ? `อัพไป ${n} เลเวล` : "ทองไม่พอ");
    save(); refreshParty(); renderPanel();
  },
  autoNext: el => { S.autoNext = el.checked; save(); },
  autoR: el => { S.autoSalvageR = el.checked; save(); },
  goBest: () => { S.stage = S.best; S.autoNext = true; save(); startStage(); renderPanel(); },
  hero: el => heroSheet(el.dataset.id),
  slot: el => {
    const free = Object.keys(S.heroes).filter(id => !S.team.includes(id));
    if (!free.length) return toast("ฮีโร่ทุกคนอยู่ในทีมแล้ว");
    openSheet(`<div class="card-h"><span>เลือกฮีโร่ใส่ช่อง${["หน้า", "กลาง", "หลัง"][el.dataset.i]}</span></div><div class="hgrid">${free.map(id => `
      <button class="hcard" data-act="toTeam" data-id="${id}" data-i="${el.dataset.i}" style="--c:${HEROES[id].color}">${imgTag(heroPic(id))}${rar(HEROES[id].rarity)}<b>${HEROES[id].name}</b><small>${ROLE[HEROES[id].role].th} · Lv ${S.heroes[id].lv}</small></button>`).join("")}</div>`);
  },
  toTeam: el => {
    const id = el.dataset.id, i = +el.dataset.i, from = S.team.indexOf(id);
    if (from >= 0) S.team[from] = S.team[i] || null;
    S.team[i] = id;
    save(); closeSheet(); startStage(); renderPanel();
  },
  unteam: el => {
    S.team[S.team.indexOf(el.dataset.id)] = null;
    save(); closeSheet(); startStage(); renderPanel();
  },
  pickGear: el => pickGearSheet(el.dataset.id, el.dataset.slot),
  equipPick: el => { equip(+el.dataset.uid, el.dataset.hero); save(); refreshParty(); heroSheet(el.dataset.hero); renderPanel(); },
  gearItem: el => gearSheet(+el.dataset.uid),
  equipTo: el => { equip(+el.dataset.uid, el.dataset.id); save(); refreshParty(); gearSheet(+el.dataset.uid); renderPanel(); },
  unequip: el => { S.gear.find(x => x.uid === +el.dataset.uid).by = null; save(); refreshParty(); gearSheet(+el.dataset.uid); renderPanel(); },
  enhance: el => {
    const g = S.gear.find(x => x.uid === +el.dataset.uid), c = plusCost(g);
    if (S.gold < c || g.plus >= PLUS_MAX) return toast("ทองไม่พอ");
    S.gold -= c;
    const ok = Math.random() < PLUS_RATE[g.plus];
    if (ok) g.plus++;
    save(); refreshParty(); gearSheet(g.uid); renderPanel();
    flashEnhance(ok, g);
  },
  salvage: el => {
    const g = S.gear.find(x => x.uid === +el.dataset.uid);
    S.gold += gearSalvage(g);
    S.gear = S.gear.filter(x => x !== g);
    toast(`ได้ทอง ${fmt(gearSalvage(g))}`);
    save(); refreshParty(); closeSheet(); renderPanel();
  },
  salvageR: () => {
    const list = S.gear.filter(g => !g.by && GEAR[g.id].rarity === "R");
    const gold = list.reduce((a, g) => a + gearSalvage(g), 0);
    S.gear = S.gear.filter(g => !list.includes(g));
    S.gold += gold;
    toast(`ย่อย ${list.length} ชิ้น ได้ทอง ${fmt(gold)}`);
    save(); renderPanel();
  },
  gf: el => { gearFilter = el.dataset.k; renderPanel(); },
  pull: el => pull(el.dataset.k, +el.dataset.n, !!el.dataset.free),
  claim: el => {
    const d = daily(), k = el.dataset.q;
    if (d.claimed[k]) return;
    const beans = k === "all" ? ALL_DONE_BEANS : QUESTS[+k].beans;
    d.claimed[k] = true; S.beans += beans;
    toast(`+${beans} เมล็ดกาแฟ`);
    save(); updateWallet(); renderPanel(); questDot();
  },
  reset: el => {
    // two taps instead of confirm(), which some app views silently refuse
    if (!el.dataset.sure) { el.dataset.sure = "1"; el.textContent = "แตะอีกครั้งเพื่อลบเซฟจริงๆ"; return; }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
    S = freshState(); save();
    location.reload();
  },
  menu: () => menuSheet(),
  auto: () => { S.auto = !S.auto; save(); renderHud(); },
  speed: () => { S.speed = S.speed === 1 ? 2 : 1; save(); renderHud(); },
};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled || el.type === "checkbox") return;
  ACT[el.dataset.act](el, e);
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-act]");
  if (el && el.type === "checkbox") ACT[el.dataset.act](el, e);
});
// the scene shrinks on menu tabs so lists have room, and grows back on the adventure tab
function setTab(t) {
  TAB = t;
  document.body.classList.toggle("compact", t !== "adv");
  resize(); renderPanel(); $("#panel").scrollTop = 0;
}
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => setTab(b.dataset.tab));

function renderHud() {
  $("#autoBtn").classList.toggle("on", S.auto);
  $("#speedBtn").classList.toggle("on", S.speed > 1);
  $("#speedBtn").textContent = S.speed > 1 ? "×2" : "×1";
}

let toastT = 0;
function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms);
}

// ---------- Loot popups ----------
let dropT = 0;
function showDrop(g) {
  const d = GEAR[g.id], el = $("#drop");
  el.className = `drop r-${d.rarity}b`;
  el.innerHTML = `${d.rarity === "SSR" ? '<span class="rays"></span>' : ""}<span class="drop-pic">${imgTag(gearPic(g.id))}</span>
    <span class="drop-body"><small>ได้ของจากมอน!</small><b>${d.name}</b>${rar(d.rarity)}<small>${statText(gearStats(g))}</small></span>`;
  clearTimeout(dropT); dropT = setTimeout(() => { el.className = "drop hidden"; }, 3200);
}
function flashEnhance(ok, g) {
  const el = $("#enhanceFx");
  el.textContent = ok ? `สำเร็จ! +${g.plus}` : "พลาด…";
  el.className = `enhance-fx ${ok ? "ok" : "fail"}`;
  setTimeout(() => { el.className = "enhance-fx hidden"; }, 900);
}

// ---------- Gacha ----------
function rollRarity(k) {
  S.pity[k]++;
  if (S.pity[k] >= COST.pity) { S.pity[k] = 0; return "SSR"; }
  const r = Math.random();
  if (r < RARITY.SSR.rate) { S.pity[k] = 0; return "SSR"; }
  return r < RARITY.SSR.rate + RARITY.SR.rate ? "SR" : "R";
}
function pull(k, n, free) {
  const cost = free ? 0 : k === "hero" ? (n === 10 ? COST.heroPull10 : COST.heroPull) : (n === 10 ? COST.gearPull10 : COST.gearPull);
  if (S.beans < cost) return toast(`เมล็ดกาแฟไม่พอ (ต้องใช้ ${cost})`);
  S.beans -= cost;
  if (free) S.free[k] = today();
  const rs = Array.from({ length: n }, () => rollRarity(k));
  if (n === 10 && rs.every(r => r === "R")) rs[9] = "SR";
  const results = rs.map(r => k === "hero" ? grantHero(r) : grantGear(r));
  S.pulls += n; bump("pulls", n);
  save(); updateWallet(); refreshParty(); renderPanel();
  showGacha(k, results);
}
function grantHero(r) {
  const id = pick(Object.keys(HEROES).filter(x => HEROES[x].rarity === r));
  const o = S.heroes[id];
  if (!o) {
    S.heroes[id] = { lv: 1, star: 1 };
    const gap = S.team.indexOf(null);
    if (gap >= 0) S.team[gap] = id;
    return { kind: "hero", id, rarity: r, isNew: true };
  }
  if (o.star < 5) { o.star++; return { kind: "hero", id, rarity: r, note: `★${o.star}` }; }
  S.beans += DUPE_BEANS[r];
  return { kind: "hero", id, rarity: r, note: `+${DUPE_BEANS[r]} เมล็ด` };
}
function grantGear(r) {
  const id = pick(Object.keys(GEAR).filter(x => GEAR[x].rarity === r));
  S.gear.push(newGear(id));
  return { kind: "gear", id, rarity: r, isNew: true };
}

function showGacha(k, results) {
  const fx = $("#gachaFx");
  const best = results.some(r => r.rarity === "SSR") ? "SSR" : results.some(r => r.rarity === "SR") ? "SR" : "R";
  fx.className = `gacha-fx brew best-${best}`;
  fx.innerHTML = `<div class="brew-stage"><div class="cup"><i></i><i></i><i></i></div><p>${k === "hero" ? "กำลังชงกาแฟเรียกฮีโร่…" : "ช่างกำลังตีเหล็ก…"}</p><small>แตะเพื่อข้าม</small></div>`;
  let shown = false;
  const reveal = () => {
    if (shown) return;
    shown = true;
    fx.className = `gacha-fx reveal ${results.length === 1 ? "single" : ""}`;
    fx.innerHTML = `<div class="results">${results.map((r, i) => {
      const pic = r.kind === "hero" ? heroPic(r.id) : gearPic(r.id);
      const name = r.kind === "hero" ? HEROES[r.id].name : GEAR[r.id].name;
      return `<div class="rcard r-${r.rarity}b" style="animation-delay:${i * 90}ms">
        ${r.rarity === "SSR" ? '<span class="rays"></span>' : ""}
        ${imgTag(pic)}${rar(r.rarity)}<b>${name}</b>${r.isNew ? '<span class="new">NEW</span>' : r.note ? `<small>${r.note}</small>` : ""}</div>`;
    }).join("")}</div><button class="btn wide" id="gachaOk">เยี่ยม!</button>`;
    $("#gachaOk").onclick = e => {
      e.stopPropagation();
      fx.className = "gacha-fx hidden"; fx.innerHTML = "";
      const ssr = results.filter(r => r.kind === "hero" && r.rarity === "SSR" && r.isNew);
      if (ssr.length) say(ssr.map(r => ({ who: r.id, text: HEROES[r.id].line })));
    };
  };
  fx.onclick = reveal;
  setTimeout(reveal, best === "SSR" ? 2000 : 1300);
}

// ---------- Dialogue (visual-novel box over the battle) ----------
let DQ = [], typing = 0;
function say(lines, pause) {
  DQ.push(...lines);
  if (pause) B.paused = true;
  if ($("#dialog").classList.contains("hidden")) nextLine();
}
function nextLine() {
  const d = $("#dialog");
  const line = DQ.shift();
  clearInterval(typing);
  if (!line) { d.classList.add("hidden"); B.paused = false; return; }
  const isHero = !!HEROES[line.who];
  const name = isHero ? HEROES[line.who].name : line.name || "มาสเตอร์";
  const color = isHero ? HEROES[line.who].color : "#c9a8ff";
  const pic = isHero ? heroPic(line.who) : (ART["portrait:master"] ? { src: ART["portrait:master"].src, art: true } : { src: sprite("master").url, art: false });
  d.querySelector(".dlg-portrait").innerHTML = imgTag(pic);
  d.querySelector(".dlg-name").textContent = name;
  d.querySelector(".dlg-name").style.color = color;
  const t = d.querySelector(".dlg-text");
  t.textContent = "";
  d.classList.remove("hidden");
  const chars = [...line.text];
  let i = 0;
  typing = setInterval(() => { t.textContent += chars[i++] || ""; if (i >= chars.length) clearInterval(typing); }, 28);
  d.dataset.full = line.text;
}
$("#dialog").onclick = () => {
  const t = $("#dialog .dlg-text");
  if (t.textContent.length < $("#dialog").dataset.full.length) { clearInterval(typing); t.textContent = $("#dialog").dataset.full; }
  else nextLine();
};

// ---------- Offline rewards ----------
function offlineRewards() {
  const away = Math.min(OFFLINE_CAP, (Date.now() - S.last) / 1000);
  if (away < 120) return null;
  const kills = Math.floor(away / 60 * 14);
  const gold = Math.round(kills * killGold(S.stage));
  const beans = Math.floor(away / 600) * 10;
  S.gold += gold; S.beans += beans; S.kills += kills;
  S.last = Date.now();
  const h = Math.floor(away / 3600), m = Math.floor(away % 3600 / 60);
  return { text: `ระหว่างที่คุณไม่อยู่ ${h ? h + " ชม. " : ""}${m} นาที ทีมปราบมอนไปได้ ${fmt(kills)} ตัว ได้ทอง ${fmt(gold)}${beans ? ` กับเมล็ดกาแฟ ${beans} เม็ด` : ""}` };
}

// ---------- Gifts ----------
const GIFTS = [
  { id: "beans-2026-10-30", beans: 10000, text: "ของขวัญจากร้าน!" },
];

// ---------- Boot ----------
function boot() {
  const had = load();
  loadAllArt();
  resize();
  window.addEventListener("resize", resize);
  renderHud(); updateWallet();
  startStage();
  renderPanel();
  if (!had || !S.introDone) {
    S.introDone = true;
    say([
      { text: "ยินดีต้อนรับสู่ 'กิลด์ยามดึก' ร้านกาแฟที่เปิดเฉพาะตอนเมืองหลับ" },
      { text: "พอดึกปุ๊บ มอนสเตอร์ก็โผล่ออกมาจากตรอก นักผจญภัยของร้านเลยต้องออกไปปราบ" },
      { text: "พวกเธอเดินสำรวจและสู้กันเองได้ แตะมอนเพื่อสั่งรุม แตะพื้นเพื่อพาทีมเดินไปตรงนั้น" },
      { text: "ล้มมอนครบจำนวนแล้วบอสจะโผล่ ตอนบอสชาร์จท่าจะมีวงแดงบนพื้น พาทีมหนีออกจากวง หรือแตะบอสรัวๆ ให้มึนก็ได้" },
      { text: "ทำภารกิจวันนี้ให้ครบจะได้เมล็ดกาแฟไว้ 'ชงเรียก' เพื่อนใหม่ ตอนนี้ให้ไว้ก่อน 3,000 เม็ด ลองดูสิ" },
      { who: "bell", text: HEROES.bell.line },
    ], true);
  } else {
    const off = offlineRewards();
    if (off) { updateWallet(); say([{ text: off.text }]); }
  }
  // one-time gifts: each id is paid once per save
  S.gifts = S.gifts || {};
  GIFTS.forEach(g => {
    if (S.gifts[g.id]) return;
    S.gifts[g.id] = true; S.beans += g.beans;
    updateWallet(); renderPanel();
    say([{ text: `${g.text} รับเมล็ดกาแฟ ${fmt(g.beans)} เม็ด ไปชงเรียกได้เลย!` }]);
  });
  save();
  setInterval(save, 10000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
    else { const off = offlineRewards(); if (off) { updateWallet(); renderPanel(); say([{ text: off.text }]); } }
  });
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
boot();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
