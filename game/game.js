// กิลด์ยามดึก: cover shooter gacha with daily quests.
// Sim runs in fixed logical pixels (LW x LH); the canvas is scaled by a whole number so pixels stay crisp.
// Monsters walk in from the horizon, the squad shoots from behind sandbags at the bottom.
"use strict";
const $ = s => document.querySelector(s);
const LW = 160, LH = 150, HORIZON = 44, COVER_Y = 128;
const SAVE_KEY = "nightguild-save-v1";
const HERO_X = [32, 80, 128];
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
function build(g, pal, flipToo) {
  const s = { w: g.w, h: g.h, img: Pix.toCanvas(g, pal), white: Pix.toCanvas(g, pal, 1, false, true) };
  if (flipToo) { s.flip = Pix.toCanvas(g, pal, 1, true); s.whiteFlip = Pix.toCanvas(g, pal, 1, true, true); }
  s.url = Pix.toCanvas(g, pal, 4).toDataURL();
  return s;
}
function sprite(key) {
  if (SPR[key]) return SPR[key];
  const [kind, id] = key.split(":");
  let s;
  if (kind === "hero") { const L = HEROES[id].look; s = build(Pix.humanoid(L), Pix.palette(L)); }
  else if (kind === "rear") { const L = HEROES[id].look; s = build(Pix.humanoid(L, true), Pix.palette(L)); }
  else if (kind === "master") { const L = { skin: "#e0b090", hair: "#3a2a2a", style: "short", outfit: "#2a2a2a", accent: "#e8e0cc", extras: ["beard"], weapon: "none" }; s = build(Pix.humanoid(L), Pix.palette(L)); }
  else if (kind === "gear") { const d = GEAR[id], c = GEAR_COLORS[d.rarity]; s = build(Pix.icon(d.icon), Pix.palette({ outfit: c.o, accent: c.a, wood: c.w, metal: c.metal })); }
  else {
    const d = kind === "boss" ? BOSSES[id] : MONSTERS[id];
    if (d.humanoid) s = build(Pix.humanoid(d.humanoid), Pix.palette(d.humanoid), true);
    else s = build(Pix.monster({ kind: d.kind, extras: kind === "boss" ? ["crown"] : [] }), Pix.palette(d.look), true);
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
    v: 1, gold: 50, beans: 1600, stage: 1, best: 1, autoNext: true, auto: true, speed: 1,
    heroes, team: [...STARTER_TEAM], gear: [], uid: 1,
    pity: { hero: 0, gear: 0 }, free: { hero: "", gear: "" },
    daily: null,
    last: Date.now(), introDone: false, aimTip: false, kills: 0, pulls: 0,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = Object.assign(freshState(), JSON.parse(raw)); delete S.farm; delete S.harvests; return true; }
  } catch (e) { /* private mode or broken save: start fresh */ }
  S = freshState();
  return false;
}
function save() {
  S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}

// ---------- Stats ----------
const heroLvCost = lv => Math.round(15 * Math.pow(1.14, lv - 1));
const gearRm = r => ({ R: 1, SR: 1.6, SSR: 2.4 })[r];
const gearLvCost = g => Math.round(30 * gearRm(GEAR[g.id].rarity) * Math.pow(1.16, g.lv - 1));
const gearSalvage = g => Math.round(20 * gearRm(GEAR[g.id].rarity) * g.lv);
const DUPE_BEANS = { R: 15, SR: 50, SSR: 200 };

function gearStats(g) {
  const d = GEAR[g.id], f = 1 + .15 * (g.lv - 1), fs = 1 + .04 * (g.lv - 1);
  const o = {};
  ["atk", "hp", "def"].forEach(k => { if (d[k]) o[k] = d[k] * f; });
  if (d.crit) o.crit = d.crit * fs;
  if (d.spd) o.spd = d.spd * fs;
  return o;
}
function heroStats(id) {
  const d = HEROES[id], o = S.heroes[id], r = ROLE[d.role];
  const m = RARITY[d.rarity].mult * Math.pow(1.1, o.lv - 1) * (1 + .22 * (o.star - 1));
  const pct = { atk: 0, hp: 0, def: 0 };
  let crit = r.crit + (GUNS[d.gun].crit || 0), spd = 100;
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
// shots per second × damage per shot, so every gun lands on a comparable number
function gunDps(gun) { const g = GUNS[gun]; return g.mult * (g.pellets || 1) * .8 / g.interval * g.ammo * g.interval / (g.ammo * g.interval + g.reload); }
const power = (st, gun) => Math.round(st.atk * gunDps(gun) * 12 * (1 + st.crit * .6) * st.spd / 100 + st.hp * .5 + st.def * 2);
const heroPower = id => power(heroStats(id), HEROES[id].gun);
const teamPower = () => S.team.reduce((a, id) => a + (id ? heroPower(id) : 0), 0);

function stageScale(n) { return Math.pow(1.115, n - 1); }
function worldOf(n) { return Math.floor((n - 1) / STAGES_PER_WORLD) % WORLDS.length; }
function stageName(n) { return `${Math.floor((n - 1) / STAGES_PER_WORLD) + 1}-${(n - 1) % STAGES_PER_WORLD + 1}`; }
const killGold = n => 3 * Math.pow(1.13, n - 1);
const MELEE = { rat: 1, alleycat: 1, wolf: 1, imp: 1, skeleton: 1 };

// ---------- Battle ----------
const B = { heroes: [], foes: [], queue: [], proj: [], shots: [], tracers: [], fx: [], nums: [], later: [], wave: 1, state: "fight", timer: 0, cutin: null, banner: null, shake: 0, t: 0, paused: false, ctrl: 0 };
const AIM = { on: false, x: 80, y: 80 };

function makeHeroUnit(id, slot) {
  const st = heroStats(id), d = HEROES[id], gun = GUNS[d.gun];
  return {
    side: "hero", id, slot, name: d.name, color: d.color, gun: d.gun,
    maxHp: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit,
    coverMax: st.hp * .8, cover: st.hp * .8,
    ammo: gun.ammo, reload: 0, fireT: .3 + slot * .2, heat: 0, peek: 0, recoil: 0,
    energy: 0, x: HERO_X[slot], y: COVER_Y, scale: 1,
    flash: 0, dead: false, shield: 0, buffs: [], taunt: 0,
  };
}
function makeFoe(key, n, boss) {
  const d = boss ? BOSSES[key] : MONSTERS[key], sc = stageScale(n);
  const melee = !boss && !!MELEE[key];
  const x = boss ? 80 : rand(16, 144);
  return {
    side: "foe", key, name: d.name, sprite: (boss ? "boss:" : "mob:") + key, art: (boss ? "boss:" : "mob:") + key,
    scale: boss ? 2 : 1, boss, melee,
    maxHp: 70 * sc * (boss ? 9 : d.hp), hp: 70 * sc * (boss ? 9 : d.hp), atk: 7 * sc * (boss ? 1.4 : d.atk), def: 5 * sc,
    x, y: HORIZON - 2 + rand(0, 6), stopY: boss ? 74 : melee ? COVER_Y - 6 : rand(66, 100),
    speed: boss ? 10 : melee ? rand(16, 22) : rand(9, 14), flipped: x > 80,
    atkCd: rand(.6, 1.4), flash: 0, dead: false, dying: 0, slow: 0, burn: null, step: Math.random() * 6,
    gold: killGold(n) * (boss ? 8 : 1),
  };
}
const foeBox = f => { const s = sprite(f.sprite), w = (ART[f.art] ? 26 : s.w) * f.scale, h = (ART[f.art] ? 26 : s.h) * f.scale; return { x: f.x - w / 2, y: f.y - h, w, h }; };

function startStage(msg) {
  B.heroes = S.team.map((id, i) => id ? makeHeroUnit(id, i) : null).filter(Boolean);
  if (B.ctrl >= B.heroes.length) B.ctrl = 0;
  B.foes = []; B.queue = []; B.proj = []; B.shots = []; B.tracers = []; B.later = [];
  B.wave = 1;
  B.state = "between"; B.timer = .8;
  B.banner = { text: msg || `ด่าน ${stageName(S.stage)}`, sub: WORLDS[worldOf(S.stage)].name, t: 1.6 };
  renderParty(true); renderStageInfo();
}
function spawnWave() {
  const w = WORLDS[worldOf(S.stage)];
  B.foes = []; B.queue = [];
  if (B.wave === WAVES_PER_STAGE) {
    const bi = worldOf(S.stage);
    B.queue.push({ t: 0, make: () => makeFoe(bi, S.stage, true) });
    for (let i = 0; i < 2; i++) B.queue.push({ t: 1.5 + i * 1.2, make: () => makeFoe(pick(w.mobs), S.stage, false) });
    B.banner = { text: "บอส!", sub: BOSSES[bi].name, t: 1.4, boss: true };
  } else {
    const count = Math.min(7, 3 + Math.floor(S.stage / 4) + (B.wave > 2 ? 1 : 0));
    let t = 0;
    for (let i = 0; i < count; i++) { B.queue.push({ t, make: () => makeFoe(pick(w.mobs), S.stage, false) }); t += rand(.5, 1); }
  }
  B.state = "fight";
  renderStageInfo();
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
const atkOf = u => u.atk * (1 + u.buffs.reduce((a, b) => a + b.atk, 0));
const muzzle = u => ({ x: u.x + 6, y: COVER_Y - 12 - u.peek * 8 });

function foeTarget(mode) {
  const f = alive(B.foes);
  if (!f.length) return null;
  if (mode === "lowest") return f.reduce((a, b) => b.hp / b.maxHp < a.hp / a.maxHp ? b : a);
  if (mode === "random") return pick(f);
  return f.reduce((a, b) => b.y > a.y ? b : a); // closest to the wall
}
function heroTarget() {
  const h = alive(B.heroes);
  if (!h.length) return null;
  return h.find(x => x.taunt > 0) || pick(h);
}
function foeAt(x, y) {
  let best = null;
  alive(B.foes).forEach(f => { const b = foeBox(f); if (x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2 && (!best || f.y > best.y)) best = f; });
  return best;
}

function addNum(x, y, text, color, big) { B.nums.push({ x: x + rand(-3, 3), y, text, color, t: 0, big }); }
function burst(x, y, color, n = 6, spread = 1) {
  for (let i = 0; i < n; i++) B.fx.push({ x, y, vx: rand(-30, 30) * spread, vy: rand(-45, -10) * spread, t: 0, life: rand(.3, .55), color, size: Math.random() < .3 ? 2 : 1 });
}

function damageFoe(att, f, mult, opts = {}) {
  if (!f || f.dead) return 0;
  const a = atkOf(att);
  let dmg = a * mult * a / (a + f.def);
  const crit = opts.crit || Math.random() < att.crit;
  if (crit) dmg *= opts.head ? 2 : 1.6;
  dmg = Math.max(1, Math.round(dmg * rand(.92, 1.08)));
  f.hp -= dmg; f.flash = .08;
  const b = foeBox(f);
  addNum(f.x, b.y - 2, fmt(dmg) + (crit ? "!" : ""), crit ? "#ffd84a" : "#ffffff", crit);
  if (!opts.skill) att.energy = Math.min(100, att.energy + mult * 2.7);
  if (opts.lifesteal) healHero(att, dmg * opts.lifesteal);
  if (crit && mult > 1) B.shake = .1;
  if (f.hp <= 0) killFoe(f);
  return dmg;
}
function hurtHero(u, dmg) {
  if (u.dead) return;
  const a = dmg;
  dmg = Math.max(1, Math.round(dmg * dmg / (dmg + u.def)));
  if (u.shield > 0) { const s = Math.min(u.shield, dmg); u.shield -= s; dmg -= s; if (!dmg) return addNum(u.x, COVER_Y - 22, "บล็อก", "#9fdcff"); }
  // tucked in: the sandbags take it. Peeking out to shoot: the hero takes it.
  if (u.peek < .5 && u.cover > 0) { u.cover = Math.max(0, u.cover - dmg); burst(u.x + rand(-10, 10), COVER_Y + 2, "#c8b48a", 4); return; }
  u.hp -= dmg; u.flash = .1;
  u.energy = Math.min(100, u.energy + 3);
  addNum(u.x, COVER_Y - 24, fmt(dmg), "#ff8a8a");
  if (u.hp <= 0) { u.hp = 0; u.dead = true; burst(u.x, COVER_Y - 8, "#9a8aa8", 10); }
  return a;
}
function healHero(u, amt) {
  if (u.dead) return;
  amt = Math.round(amt);
  u.hp = Math.min(u.maxHp, u.hp + amt);
  if (amt > 0) addNum(u.x, COVER_Y - 24, "+" + fmt(amt), "#8affb8");
}
function killFoe(f) {
  f.hp = 0; f.dead = true; f.dying = .45;
  S.gold += f.gold; S.kills++; bump("kills");
  const b = foeBox(f);
  addNum(f.x, b.y - 8, "+" + fmt(f.gold) + "G", "#ffcb52");
  burst(f.x, b.y + b.h / 2, "#ffcb52", f.boss ? 24 : 8, f.boss ? 1.6 : 1);
  updateWallet();
}

// One trigger pull. With a point it is aimed by hand (can miss, head shots crit), otherwise it locks on.
function fire(u, tgt, point) {
  const g = GUNS[u.gun], m = muzzle(u), manual = !!point;
  const pellets = g.pellets || 1;
  if (g.splash) {
    const to = point || (() => { const b = foeBox(tgt); return { x: tgt.x, y: b.y + b.h * .5 }; })();
    B.shots.push({ x: m.x, y: m.y, tx: to.x, ty: to.y, t: 0, dur: .32, color: u.color, fn: () => {
      burst(to.x, to.y, "#ffb04a", 14, 1.4); burst(to.x, to.y, "#fff2d8", 6);
      alive(B.foes).forEach(f => { if (Math.hypot(f.x - to.x, (f.y - 8 * f.scale) - to.y) < g.splash) damageFoe(u, f, g.mult * (manual ? 1.2 : 1)); });
    } });
  } else for (let i = 0; i < pellets; i++) {
    let px, py, hit;
    if (manual) {
      px = point.x + (pellets > 1 ? rand(-g.spread, g.spread) : rand(-1, 1)); py = point.y + (pellets > 1 ? rand(-g.spread, g.spread) * .6 : rand(-1, 1));
      hit = foeAt(px, py);
    } else {
      const b = foeBox(tgt);
      px = tgt.x + rand(-b.w * .35, b.w * .35); py = b.y + rand(b.h * .2, b.h * .8);
      hit = pellets > 1 && Math.random() < .25 ? null : tgt;
      if (!hit) { px += rand(-8, 8); py += rand(-6, 6); }
    }
    B.tracers.push({ x1: m.x, y1: m.y, x2: px, y2: py, t: 0, life: u.gun === "SNP" ? .12 : .05, color: u.gun === "SNP" ? "#fff6e8" : u.color, wide: u.gun === "SNP" });
    if (hit) {
      const b = foeBox(hit), head = manual && py < b.y + b.h * .35;
      damageFoe(u, hit, g.mult * (manual ? 1.2 : 1), { crit: head, head });
      B.fx.push({ x: px, y: py, vx: 0, vy: 0, t: 0, life: .08, color: "#fff", size: 2 });
    } else B.fx.push({ x: px, y: py, vx: rand(-10, 10), vy: -10, t: 0, life: .2, color: "#6a5a7a", size: 1 });
  }
  u.recoil = .06;
  u.ammo--;
  if (u.ammo <= 0) u.reload = g.reload;
}

function heroUpdate(u, dt) {
  if (u.recoil > 0) u.recoil -= dt;
  if (u.flash > 0) u.flash -= dt;
  u.buffs = u.buffs.filter(b => (b.t -= dt) > 0);
  if (u.taunt > 0) u.taunt -= dt;
  const g = GUNS[u.gun];
  const isCtrl = B.heroes[B.ctrl] === u;
  const manual = isCtrl && AIM.on && !u.dead;
  let tgt = null;
  if (!manual && (S.auto || !isCtrl) && B.state === "fight") tgt = foeTarget("front");
  if (u.dead) { u.peek = 0; return; }
  if (u.reload > 0) {
    u.peek = Math.max(0, u.peek - dt * 6);
    u.reload -= dt;
    if (u.reload <= 0) { u.ammo = g.ammo; u.heat = 0; }
    return;
  }
  const want = manual || !!tgt;
  u.peek = want ? Math.min(1, u.peek + dt * 6) : Math.max(0, u.peek - dt * 4);
  if (!want) { u.heat = Math.max(0, u.heat - dt); return; }
  u.heat = Math.min(2, u.heat + dt);
  u.fireT -= dt * u.spd / 100;
  if (u.fireT <= 0 && u.peek > .7) {
    fire(u, tgt, manual ? { x: AIM.x, y: AIM.y } : null);
    u.fireT = g.ramp ? g.interval - (g.interval - g.ramp) * (u.heat / 2) : g.interval;
  }
  if (S.auto && u.energy >= 100) castSkill(u);
}

function foeUpdate(f, dt) {
  if (f.flash > 0) f.flash -= dt;
  if (f.dead) { if (f.dying > 0) f.dying -= dt; return; }
  if (f.slow > 0) f.slow -= dt;
  if (f.burn) {
    f.burn.t -= dt; f.burn.acc = (f.burn.acc || 0) + dt;
    if (f.burn.acc >= .5) { f.burn.acc = 0; const d = Math.max(1, Math.round(f.burn.dps * .5)); f.hp -= d; addNum(f.x, foeBox(f).y, fmt(d), "#ff9a4a"); if (f.hp <= 0) killFoe(f); }
    if (f.burn.t <= 0) f.burn = null;
  }
  const sp = f.slow > 0 ? .5 : 1;
  if (f.y < f.stopY) { f.y = Math.min(f.stopY, f.y + f.speed * dt * sp); f.step += dt * 8; return; }
  f.atkCd -= dt * sp;
  if (f.atkCd > 0) return;
  const tgt = heroTarget();
  if (!tgt) return;
  if (f.melee) {
    f.atkCd = 1.2;
    f.lunge = .15;
    hurtHero(tgt, f.atk);
  } else if (f.boss) {
    f.atkCd = 2.2;
    alive(B.heroes).forEach((h, i) => B.later.push({ t: i * .15, fn: () => enemyShot(f, h, f.atk * .8) }));
  } else {
    f.atkCd = rand(1.6, 2.2);
    enemyShot(f, tgt, f.atk);
  }
}
function enemyShot(f, h, dmg) {
  if (f.dead) return;
  const b = foeBox(f);
  B.proj.push({ x: f.x, y: b.y + b.h * .5, tx: h.x + rand(-6, 6), ty: COVER_Y - 4, t: 0, dur: .6, fn: () => hurtHero(h, dmg) });
}

function castSkill(u) {
  if (u.dead || u.energy < 100 || B.cutin || B.state !== "fight" || !alive(B.foes).length) return;
  u.energy = 0;
  bump("bursts");
  B.cutin = { t: 0, dur: .75, u, sk: HEROES[u.id].skill };
  renderParty();
}
function applySkill(u, sk) {
  const team = alive(B.heroes), m = muzzle(u);
  if (sk.kind === "hit") {
    for (let i = 0; i < sk.hits; i++) B.later.push({ t: i * .09, fn: () => {
      const f = foeTarget(sk.target);
      if (!f) return;
      const b = foeBox(f);
      B.tracers.push({ x1: m.x, y1: m.y, x2: f.x, y2: b.y + b.h / 2, t: 0, life: .12, color: u.color, wide: true });
      damageFoe(u, f, sk.mult, { crit: sk.crit, lifesteal: sk.lifesteal, skill: true });
      burst(f.x, b.y + b.h / 2, u.color, 6, 1.2);
    } });
  } else if (sk.kind === "aoe") {
    alive(B.foes).forEach((f, i) => B.later.push({ t: i * .06, fn: () => {
      if (f.dead) return;
      const b = foeBox(f);
      damageFoe(u, f, sk.mult, { skill: true });
      if (sk.burn) f.burn = { dps: atkOf(u) * .35, t: sk.burn };
      if (sk.slow) f.slow = sk.slow;
      burst(f.x, b.y + b.h / 2, u.color, 12, 1.5);
    } }));
    B.shake = .2;
  } else if (sk.kind === "heal") {
    team.forEach(h => { healHero(h, h.maxHp * sk.pct); h.cover = Math.min(h.coverMax, h.cover + h.coverMax * sk.pct); burst(h.x, COVER_Y - 12, "#8affb8", 8); });
  } else if (sk.kind === "shield") {
    team.forEach(h => { h.shield += u.maxHp * sk.pct; h.cover = h.coverMax; burst(h.x, COVER_Y - 12, "#9fdcff", 6); });
  }
  if (sk.atk) team.forEach(h => { h.buffs.push({ atk: sk.atk, t: sk.dur }); burst(h.x, COVER_Y - 16, "#ffd84a", 5); });
  if (sk.taunt) u.taunt = sk.taunt;
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
  B.shots = B.shots.filter(p => { p.t += dt; if (p.t >= p.dur) { p.fn(); return false; } return true; });
  B.queue = B.queue.filter(q => { q.t -= dt; if (q.t <= 0) { B.foes.push(q.make()); return false; } return true; });
  B.foes.forEach(f => { if (f.lunge > 0) f.lunge -= dt; foeUpdate(f, dt); });
  B.heroes.forEach(u => heroUpdate(u, dt));

  if (B.state === "between") {
    B.timer -= dt;
    if (B.timer <= 0) spawnWave();
    return;
  }
  if (B.state === "clear" || B.state === "fail") {
    B.timer -= dt;
    if (B.timer <= 0) B.state === "clear" ? afterClear() : afterFail();
    return;
  }
  if (!B.queue.length && !alive(B.foes).length && !B.later.length && !B.shots.length) {
    if (B.wave < WAVES_PER_STAGE) { B.wave++; B.state = "between"; B.timer = 1; renderStageInfo(); }
    else { B.state = "clear"; B.timer = 1.1; B.banner = { text: "ผ่านด่าน!", sub: "", t: 1.1 }; }
  } else if (!alive(B.heroes).length) {
    B.state = "fail"; B.timer = 1.6; B.banner = { text: "ถอยก่อน…", sub: "อัพเกรดทีมแล้วค่อยลุยใหม่", t: 1.6, bad: true };
  }
}

function afterClear() {
  const n = S.stage;
  const bonus = killGold(n) * 6;
  bump("clears");
  S.gold += bonus;
  let beans = 0;
  if (n >= S.best) {
    beans = n % 10 === 0 ? 150 : n % 5 === 0 ? 60 : 25;
    S.best = n + 1;
  }
  S.beans += beans;
  toast(`ผ่านด่าน ${stageName(n)} · +${fmt(bonus)} ทอง${beans ? ` · +${beans} เมล็ดกาแฟ` : ""}`);
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
  B.fx = B.fx.filter(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; return p.t < p.life; });
  B.nums = B.nums.filter(n => { n.t += dt; return n.t < .9; });
  B.tracers = B.tracers.filter(t => (t.t += dt) < t.life);
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

const BG = {};
function bgCanvas(theme) {
  if (BG[theme]) return BG[theme];
  const c = document.createElement("canvas"); c.width = LW; c.height = LH;
  const x = c.getContext("2d");
  const R = (cx, cy, w, h, col) => { x.fillStyle = col; x.fillRect(cx, cy, w, h); };
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const H = HORIZON;
  // ground with perspective: rows get taller toward the bottom, lines fan out from the vanishing point
  const ground = (c1, c2, line) => {
    R(0, H, LW, LH - H, c1);
    let y = H, step = 2;
    while (y < LH) { R(0, Math.round(y), LW, 1, line); y += step; step *= 1.35; }
    x.strokeStyle = line; x.lineWidth = 1;
    for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(80 + i * 4, H); x.lineTo(80 + i * 34, LH); x.stroke(); }
    R(0, H, LW, 1, c2);
  };
  if (theme === "alley") {
    R(0, 0, LW, H, "#2a1a1e");
    for (let row = 0; row < 8; row++) for (let col = -1; col < 14; col++) R(col * 12 + (row % 2 ? 6 : 0), row * 6, 11, 5, ["#4a2c2a", "#43282a", "#512f2c", "#3e2526"][Math.floor(rnd() * 4)]);
    R(8, 8, 30, 34, "#1a1216"); R(10, 10, 26, 32, "#22303a");
    for (let i = 0; i < 7; i++) R(10, 12 + i * 4, 26, 1, "#15202a");
    R(10, 10, 26, 2, "#e8a050");
    R(58, 8, 44, 18, "#1c3a2a"); R(60, 10, 40, 14, "#24503a");
    // neon coffee cup with steam
    R(72, 15, 12, 1, "#7affb0"); R(72, 15, 1, 6, "#7affb0"); R(83, 15, 1, 6, "#7affb0"); R(73, 21, 10, 1, "#7affb0");
    R(84, 16, 3, 1, "#7affb0"); R(86, 16, 1, 3, "#7affb0"); R(84, 18, 3, 1, "#7affb0"); R(70, 23, 16, 1, "#7affb0");
    R(75, 11, 1, 2, "#ff7ab0"); R(78, 10, 1, 3, "#ff7ab0"); R(81, 11, 1, 2, "#ff7ab0");
    R(118, 6, 34, 36, "#1a1216"); R(120, 8, 30, 34, "#3a2a20");
    for (let i = 0; i < 3; i++) { R(122, 10 + i * 11, 26, 1, "#c9a24a"); R(124 + i * 7, 4 + i * 11, 4, 5, "#e8e0cc"); }
    for (let i = 0; i < 6; i++) { const lx = 6 + i * 29; R(lx, 0, 1, 4, "#1a1216"); R(lx - 2, 4, 5, 3, "#f2d16b"); }
    ground("#34403f", "#6a8a84", "#2a3434");
  } else if (theme === "forest") {
    R(0, 0, LW, H, "#0e1e22");
    for (let i = 0; i < 30; i++) R(Math.floor(rnd() * LW), Math.floor(rnd() * 30), 1, 1, "#3a6a6a");
    R(118, 6, 12, 12, "#e8f0d0"); R(116, 8, 16, 8, "#e8f0d0");
    for (let i = 0; i < 12; i++) { const tx = i * 14 - 4, th = 18 + Math.floor(rnd() * 14); R(tx + 4, H - th, 4, th, "#1a2a24"); R(tx - 3, H - th - 10, 18, 14, "#16302a"); R(tx, H - th - 14, 12, 6, "#1c3a30"); }
    ground("#1c3424", "#3a6a4a", "#162a1e");
    for (let i = 0; i < 40; i++) R(Math.floor(rnd() * LW), H + 4 + Math.floor(rnd() * (LH - H - 6)), 1, 2, "#2e5a3a");
  } else if (theme === "cave") {
    R(0, 0, LW, H, "#170f26");
    for (let i = 0; i < 14; i++) { const sx = i * 12 + Math.floor(rnd() * 6), sh = 6 + Math.floor(rnd() * 14); R(sx, 0, 6, sh, "#22183a"); R(sx + 2, sh, 2, 3, "#22183a"); }
    for (let i = 0; i < 8; i++) { const cx = Math.floor(rnd() * LW), cy = 18 + Math.floor(rnd() * 18), h = 5 + Math.floor(rnd() * 6); R(cx, cy, 3, h, "#7a4ad0"); R(cx + 1, cy - 2, 1, 2, "#c9a8ff"); R(cx, cy, 1, h, "#b98cff"); }
    ground("#251a36", "#4a3a6a", "#1c1430");
    for (let i = 0; i < 7; i++) { const cx = Math.floor(rnd() * LW), cy = H + 10 + Math.floor(rnd() * 60); R(cx, cy, 3, 6, "#9af0ff"); R(cx + 1, cy - 2, 1, 2, "#e0ffff"); }
  } else {
    R(0, 0, LW, H, "#120e2a");
    for (let i = 0; i < 50; i++) R(Math.floor(rnd() * LW), Math.floor(rnd() * H), 1, 1, rnd() < .2 ? "#ffd76a" : "#8a8ac8");
    R(18, 8, 12, 12, "#f0e8c8"); R(22, 8, 8, 9, "#120e2a");
    R(64, 6, 32, 38, "#1e1840"); R(68, 10, 24, 34, "#26204e");
    for (let i = 0; i < 4; i++) { R(72, 14 + i * 8, 4, 4, "#ffd76a"); R(84, 14 + i * 8, 4, 4, i % 2 ? "#2a2458" : "#ffd76a"); }
    R(60, 2, 40, 5, "#2e2860");
    ground("#221e44", "#4a4480", "#1a1638");
  }
  return (BG[theme] = c);
}

function drawBg(theme) {
  const art = ART["bg:" + theme];
  if (art) {
    ctx.imageSmoothingEnabled = true;
    const s = Math.max(LW / art.width, LH / art.height), w = art.width * s, h = art.height * s;
    ctx.drawImage(art, (LW - w) / 2, (LH - h) / 2, w, h);
    ctx.imageSmoothingEnabled = false;
  } else ctx.drawImage(bgCanvas(theme), 0, 0);
  const t = B.t;
  if (theme === "forest") for (let i = 0; i < 12; i++) {
    const fx = (i * 37 + Math.sin(t * .7 + i) * 10 + LW) % LW, fy = 30 + (i * 23) % 80 + Math.sin(t * 1.3 + i * 2) * 4;
    ctx.fillStyle = `rgba(220,255,140,${.4 + .6 * Math.abs(Math.sin(t * 2 + i))})`; ctx.fillRect(fx | 0, fy | 0, 1, 1);
  } else if (theme === "alley" && !ART["bg:alley"]) {
    if (Math.sin(t * 9) > .93) { ctx.fillStyle = "rgba(20,30,24,.7)"; ctx.fillRect(60, 10, 40, 14); }
  } else if (theme === "tower") for (let i = 0; i < 6; i++) {
    if (Math.sin(t * 3 + i * 7) > .9) { ctx.fillStyle = "#fff"; ctx.fillRect((i * 53) % LW, (i * 7) % H, 1, 1); }
  } else if (theme === "cave") for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(185,140,255,${.3 + .3 * Math.sin(t * 2 + i)})`; ctx.fillRect((i * 29 + t * 3) % LW | 0, 20 + (i * 31) % 100, 1, 1);
  }
}

function drawFoe(f) {
  if (f.dead && f.dying <= 0) return;
  const s = sprite(f.sprite), art = ART[f.art], b = foeBox(f);
  const walk = f.y < f.stopY ? Math.round(Math.abs(Math.sin(f.step)) * -1) : Math.round(Math.sin(B.t * 3 + f.x) * .6);
  const lunge = f.lunge > 0 ? 3 : 0;
  const x = Math.round(b.x), y = Math.round(b.y + walk + lunge + (f.dead ? (1 - f.dying / .45) * 4 : 0));
  ctx.globalAlpha = f.dead ? Math.max(0, f.dying / .45) : 1;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(Math.round(f.x - b.w * .3), Math.round(f.y), Math.round(b.w * .6), 2);
  if (art) {
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    if (f.flipped) { ctx.translate(Math.round(f.x), 0); ctx.scale(-1, 1); ctx.translate(-Math.round(f.x), 0); }
    if (f.flash > 0) ctx.filter = "brightness(3)";
    const sc = Math.min(b.w / art.width, b.h / art.height), aw = art.width * sc, ah = art.height * sc;
    ctx.drawImage(art, Math.round(f.x - aw / 2), y + b.h - ah, aw, ah);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  } else {
    const img = f.flash > 0 ? (f.flipped ? s.whiteFlip : s.white) : (f.flipped ? s.flip : s.img);
    ctx.drawImage(img, x, y, b.w, b.h);
  }
  if (f.burn && !f.dead) { ctx.fillStyle = B.t % .3 < .15 ? "#ff9a4a" : "#ffd84a"; ctx.fillRect(x + b.w - 3, y + 3, 2, 2); }
  if (f.slow > 0 && !f.dead) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(x + 1, y + 3, 2, 2); }
  if (!f.dead && (f.hp < f.maxHp || f.boss)) {
    const bw = f.boss ? 34 : 14, bx = Math.round(f.x - bw / 2), by = y - 4;
    ctx.fillStyle = "#160f1c"; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
    ctx.fillStyle = "#4a2030"; ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = f.boss ? "#ff5a7a" : "#ff7a6a"; ctx.fillRect(bx, by, Math.ceil(bw * f.hp / f.maxHp), 2);
  }
  ctx.globalAlpha = 1;
}

function drawHero(u) {
  const art = ART["hero:" + u.id], s = sprite("rear:" + u.id);
  const rise = Math.round(u.peek * 9) - (u.recoil > 0 ? 1 : 0);
  const top = COVER_Y - 12 - rise + (u.dead ? 6 : 0);
  ctx.save();
  if (u.dead) ctx.filter = "grayscale(1) brightness(.5)";
  if (art) {
    ctx.imageSmoothingEnabled = true;
    const h = 34, w = art.width * h / art.height;
    if (u.flash > 0 && !u.dead) ctx.filter = "brightness(3)";
    ctx.drawImage(art, Math.round(u.x - w / 2), top - 2, w, h);
    ctx.imageSmoothingEnabled = false;
  } else ctx.drawImage(u.flash > 0 && !u.dead ? s.white : s.img, Math.round(u.x - s.w / 2), top);
  ctx.restore();
  if (u.shield > 0 && !u.dead) { ctx.fillStyle = "rgba(159,220,255,.22)"; ctx.fillRect(u.x - 14, top - 2, 28, COVER_Y - top + 2); ctx.fillStyle = "#9fdcff"; ctx.fillRect(u.x - 14, top - 2, 28, 1); }
  if (u.taunt > 0 && !u.dead) { ctx.fillStyle = "#ffd84a"; ctx.fillRect(u.x - 1, top - 5, 2, 2); }
  if (!u.peek && u.recoil <= 0 && u.reload <= 0 && B.heroes[B.ctrl] === u && !S.auto && !u.dead) pixText("พร้อม", u.x, top - 5, 5, u.color, "center", 400);
}

function drawCover(u) {
  const w = 34, x0 = Math.round(u.x - w / 2), r = u.cover / u.coverMax;
  const bag = (bx, by, bw) => {
    ctx.fillStyle = "#160f1c"; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = "#9a8660"; ctx.fillRect(bx + 1, by + 1, bw - 2, 4);
    ctx.fillStyle = "#c2ac7e"; ctx.fillRect(bx + 2, by + 1, bw - 4, 1);
    ctx.fillStyle = "#6e5e44"; ctx.fillRect(bx + 1, by + 4, bw - 2, 1);
  };
  // rows of bags disappear as the cover breaks
  const rows = [[COVER_Y + 10, [0, 12, 24], 11], [COVER_Y + 4, [6, 18], 11], [COVER_Y - 2, [0, 12, 24], 11]];
  const keep = r <= 0 ? 1 : r < .34 ? 2 : 3;
  ctx.fillStyle = "#1a1220"; ctx.fillRect(x0 - 2, COVER_Y + 16, w + 4, LH - COVER_Y - 16);
  rows.slice(0, keep).forEach(([y, xs, bw]) => xs.forEach(dx => bag(x0 + dx, y + (keep < 3 ? 6 : 0), bw)));
  if (r < .67 && r > 0) { ctx.fillStyle = "#160f1c"; ctx.fillRect(x0 + 9, COVER_Y + (keep < 3 ? 6 : 0) + 1, 2, 3); }
  // hp + cover + ammo under the bags
  const by = LH - 9;
  ctx.fillStyle = "#0b0810"; ctx.fillRect(x0, by, w, 7);
  ctx.fillStyle = "#4a2030"; ctx.fillRect(x0 + 1, by + 1, w - 2, 2);
  ctx.fillStyle = "#ff6a7a"; ctx.fillRect(x0 + 1, by + 1, Math.ceil((w - 2) * u.hp / u.maxHp), 2);
  ctx.fillStyle = "#3a3020"; ctx.fillRect(x0 + 1, by + 4, w - 2, 2);
  ctx.fillStyle = "#c2ac7e"; ctx.fillRect(x0 + 1, by + 4, Math.ceil((w - 2) * r), 2);
  const g = GUNS[u.gun];
  if (u.reload > 0) {
    const p = 1 - u.reload / g.reload;
    ctx.fillStyle = "#0b0810"; ctx.fillRect(u.x - 12, COVER_Y - 26, 24, 4);
    ctx.fillStyle = "#ffd84a"; ctx.fillRect(u.x - 11, COVER_Y - 25, Math.ceil(22 * p), 2);
    pixText("RELOAD", u.x, COVER_Y - 30, 5, "#ffd84a", "center", 400);
  } else if (B.heroes[B.ctrl] === u) {
    pixText(`${u.ammo}`, x0 + w - 2, COVER_Y + 21, 5, "#fff2d8", "right", 400);
  }
  if (B.heroes[B.ctrl] === u && !u.dead) { ctx.fillStyle = u.color; ctx.fillRect(x0, LH - 2, w, 1); }
}

function drawCrosshair() {
  const u = B.heroes[B.ctrl];
  if (!AIM.on || !u || u.dead) return;
  const x = Math.round(AIM.x), y = Math.round(AIM.y), c = u.reload > 0 ? "#6a5a7a" : u.color;
  const spread = GUNS[u.gun].spread ? 6 : 3;
  ctx.fillStyle = "#160f1c";
  [[-spread - 4, 0, 4, 1], [spread + 1, 0, 4, 1], [0, -spread - 4, 1, 4], [0, spread + 1, 1, 4]].forEach(([a, b, w, h]) => ctx.fillRect(x + a - 1, y + b - 1, w + 2, h + 2));
  ctx.fillStyle = c;
  [[-spread - 4, 0, 4, 1], [spread + 1, 0, 4, 1], [0, -spread - 4, 1, 4], [0, spread + 1, 1, 4]].forEach(([a, b, w, h]) => ctx.fillRect(x + a, y + b, w, h));
  ctx.fillRect(x, y, 1, 1);
  const f = foeAt(x, y);
  if (f) { const b = foeBox(f); if (y < b.y + b.h * .35) pixText("HEAD", x, y - spread - 8, 5, "#ffd84a", "center", 400); }
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
  ctx.fillStyle = `rgba(10,6,14,${.55 * ease})`; ctx.fillRect(0, 0, LW, LH);
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
  pixText("BURST", 116 - slide / 2, bandY + 6, 6, c.u.color, "center", 400);
  thaiText(c.sk.name, 116 - slide / 2, bandY + 19, 11, "#fff2d8");
  thaiText(c.u.name, 116 - slide / 2, bandY + 32, 7, c.u.color);
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const sx = B.shake > 0 ? Math.round(rand(-1, 1)) : 0, sy = B.shake > 0 ? Math.round(rand(-1, 1)) : 0;
  ctx.save(); ctx.translate(sx, sy);
  drawBg(WORLDS[worldOf(S.stage)].theme);
  [...B.foes].sort((a, b) => a.y - b.y).forEach(drawFoe);
  B.proj.forEach(p => {
    const k = p.t / p.dur, x = p.x + (p.tx - p.x) * k, y = p.y + (p.ty - p.y) * k;
    ctx.fillStyle = "#160f1c"; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    ctx.fillStyle = B.t % .2 < .1 ? "#ff5a9a" : "#ffb0d0"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  });
  B.tracers.forEach(t => {
    ctx.globalAlpha = 1 - t.t / t.life;
    ctx.strokeStyle = t.color; ctx.lineWidth = t.wide ? 1.5 : .8;
    ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  B.shots.forEach(p => {
    const k = p.t / p.dur, x = p.x + (p.tx - p.x) * k, y = p.y + (p.ty - p.y) * k;
    ctx.fillStyle = "#160f1c"; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    ctx.fillStyle = p.color; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    ctx.fillStyle = "rgba(255,200,120,.6)"; ctx.fillRect(Math.round(x) - 1, Math.round(y) + 2, 2, 3);
  });
  B.heroes.forEach(drawHero);
  B.heroes.forEach(u => {
    if (u.recoil > 0 && !u.dead) { const m = muzzle(u); ctx.fillStyle = "#fff2a0"; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 2, 3, 3); }
  });
  B.heroes.forEach(drawCover);
  B.fx.forEach(p => { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); });
  ctx.globalAlpha = 1;
  B.nums.forEach(n => { ctx.globalAlpha = n.t < .7 ? 1 : 1 - (n.t - .7) / .2; pixText(n.text, n.x, n.y - n.t * 14, n.big ? 8 : 6, n.color); });
  ctx.globalAlpha = 1;
  drawCrosshair();
  ctx.restore();
  if (B.cutin) drawCutin(B.cutin);
  if (B.banner && !B.cutin) {
    const b = B.banner, a = Math.min(1, b.t * 3), y0 = 58;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(10,6,14,.7)"; ctx.fillRect(0, y0, LW, b.sub ? 28 : 18);
    ctx.fillStyle = b.boss ? "#ff5a7a" : b.bad ? "#9a8aa8" : "#7affb0"; ctx.fillRect(0, y0, LW, 1); ctx.fillRect(0, y0 + (b.sub ? 28 : 18) - 1, LW, 1);
    thaiText(b.text, LW / 2, y0 + 9, 10, b.boss ? "#ff9ab0" : "#fff2d8");
    if (b.sub) thaiText(b.sub, LW / 2, y0 + 21, 7, "#c8b8d8");
    ctx.globalAlpha = 1;
  }
}

// ---------- Aiming: hold on the scene to take over the selected hero's gun ----------
function aimFrom(e) {
  const r = cv.getBoundingClientRect();
  AIM.x = Math.max(0, Math.min(LW, (e.clientX - r.left) / r.width * LW));
  AIM.y = Math.max(0, Math.min(COVER_Y - 4, (e.clientY - r.top) / r.height * LH - 6)); // a little above the finger so it stays visible
}
cv.addEventListener("pointerdown", e => {
  if (B.paused) return;
  cv.setPointerCapture(e.pointerId);
  AIM.on = true; aimFrom(e);
  if (!S.aimTip) { S.aimTip = true; save(); }
});
cv.addEventListener("pointermove", e => { if (AIM.on) aimFrom(e); });
["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => cv.addEventListener(ev, () => { AIM.on = false; }));

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
  $("#waveDots").innerHTML = Array.from({ length: WAVES_PER_STAGE }, (_, i) =>
    `<i class="${i + 1 < B.wave ? "done" : i + 1 === B.wave ? "now" : ""} ${i + 1 === WAVES_PER_STAGE ? "boss" : ""}"></i>`).join("");
}

let partyKey = "";
function renderParty(force) {
  const el = $("#party");
  const key = B.heroes.map(u => u.id).join() + Object.keys(ART).length + B.ctrl;
  if (force || key !== partyKey) {
    partyKey = key;
    el.innerHTML = B.heroes.map((u, i) => `
      <button class="pcard ${i === B.ctrl ? "ctrl" : ""}" data-i="${i}" style="--c:${u.color}">
        <span class="pic">${imgTag(heroPic(u.id))}</span>
        <span class="pinfo">
          <span class="pname">${u.name}<em>${GUNS[u.gun].th}</em></span>
          <span class="bar hp"><i></i></span>
          <span class="bar en"><i></i></span>
        </span>
      </button>`).join("");
    el.querySelectorAll(".pcard").forEach(b => b.onclick = () => {
      const i = +b.dataset.i, u = B.heroes[i];
      if (u.energy >= 100 && !u.dead) return castSkill(u);
      if (B.ctrl !== i) { B.ctrl = i; renderParty(true); toast(`เล็งด้วย ${u.name}: กดค้างที่ฉากแล้วลาก`); }
    });
  }
  el.querySelectorAll(".pcard").forEach((b, i) => {
    const u = B.heroes[i];
    if (!u) return;
    b.querySelector(".hp i").style.width = (100 * u.hp / u.maxHp) + "%";
    b.querySelector(".en i").style.width = u.energy + "%";
    b.classList.toggle("ready", u.energy >= 100 && !u.dead);
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
function gunTag(gun) { return `<span class="gun">${GUNS[gun].th}</span>`; }

function advPanel() {
  const w = WORLDS[worldOf(S.stage)];
  const rows = S.team.filter(Boolean).map(id => {
    const h = HEROES[id], o = S.heroes[id];
    return `<div class="row">
      <span class="thumb" style="--c:${h.color}">${imgTag(heroPic(id))}</span>
      <span class="grow"><b>${h.name}</b> ${rar(h.rarity)} ${gunTag(h.gun)}<br><small>Lv ${o.lv} · พลัง ${fmt(heroPower(id))}</small></span>
      ${lvButton(id)}
    </div>`;
  }).join("");
  return `
    ${S.aimTip ? "" : `<div class="tip">แตะการ์ดฮีโร่เพื่อเลือกคนเล็ง แล้ว<b>กดค้างที่ฉากต่อสู้แล้วลาก</b>เพื่อยิงเอง ยิงโดนหัวได้คริติคอล แต่ตอนโผล่ออกมายิงจะโดนยิงด้วยนะ</div>`}
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
    <p class="hint">ปิดแอปไปได้เลย ทีมจะยิงมอนต่อเอง กลับมาเก็บทองกับเมล็ดกาแฟได้ (สูงสุด 8 ชั่วโมง)</p>`;
}

function teamPanel() {
  const slots = [0, 1, 2].map(i => {
    const id = S.team[i];
    if (!id) return `<button class="slot empty" data-act="slot" data-i="${i}">+<small>ว่าง</small></button>`;
    const h = HEROES[id];
    return `<button class="slot r-${h.rarity}b" data-act="hero" data-id="${id}" style="--c:${h.color}">
      <span class="slot-n">${["ซ้าย", "กลาง", "ขวา"][i]}</span>
      ${imgTag(heroPic(id))}<b>${h.name}</b><small>${GUNS[h.gun].th} · Lv ${S.heroes[id].lv}</small></button>`;
  }).join("");
  const owned = Object.keys(HEROES).filter(id => S.heroes[id]);
  const order = { SSR: 0, SR: 1, R: 2 };
  owned.sort((a, b) => order[HEROES[a].rarity] - order[HEROES[b].rarity] || S.heroes[b].lv - S.heroes[a].lv);
  const list = owned.map(id => {
    const h = HEROES[id], o = S.heroes[id], inTeam = S.team.includes(id);
    return `<button class="hcard r-${h.rarity}b" data-act="hero" data-id="${id}" style="--c:${h.color}">
      ${imgTag(heroPic(id))}
      <span class="hc-top">${rar(h.rarity)}${inTeam ? '<span class="tag">ในทีม</span>' : ""}</span>
      <b>${h.name}</b><small>${GUNS[h.gun].th} · Lv ${o.lv}</small>${stars(o.star)}
    </button>`;
  }).join("");
  const missing = Object.keys(HEROES).length - owned.length;
  return `
    <div class="card"><div class="card-h"><span>ทีมยิง</span><small>ใส่ตัวตั้งรับไว้ล่อกระสุนได้</small></div><div class="slots">${slots}</div></div>
    <div class="card"><div class="card-h"><span>ฮีโร่ของฉัน</span><small>${owned.length}/${Object.keys(HEROES).length}${missing ? " · ที่เหลือไปชงเรียกนะ" : ""}</small></div><div class="hgrid">${list}</div></div>`;
}

function gearRow(g, act = "gearItem", extra = "") {
  const d = GEAR[g.id];
  return `<button class="row btnrow" data-act="${act}" data-uid="${g.uid}" ${extra}>
    <span class="thumb icon r-${d.rarity}b">${imgTag(gearPic(g.id))}</span>
    <span class="grow"><b>${d.name}</b> ${rar(d.rarity)}<br><small>${SLOT_TH[d.slot]} · Lv ${g.lv}/${GEAR_MAX_LV[d.rarity]} · ${statText(gearStats(g))}</small></span>
    ${g.by ? `<span class="tag" style="--c:${HEROES[g.by].color}">${HEROES[g.by].name}</span>` : ""}
  </button>`;
}
function statText(o) {
  const parts = [];
  if (o.atk) parts.push(`โจมตี +${Math.round(o.atk)}%`);
  if (o.hp) parts.push(`HP +${Math.round(o.hp)}%`);
  if (o.def) parts.push(`ป้องกัน +${Math.round(o.def)}%`);
  if (o.crit) parts.push(`คริ +${Math.round(o.crit * 100)}%`);
  if (o.spd) parts.push(`ยิงไว +${Math.round(o.spd)}%`);
  return parts.join(" · ");
}
let gearFilter = "all";
function gearPanel() {
  const order = { SSR: 0, SR: 1, R: 2 };
  const items = S.gear.filter(g => gearFilter === "all" || GEAR[g.id].slot === gearFilter)
    .sort((a, b) => order[GEAR[a.id].rarity] - order[GEAR[b.id].rarity] || b.lv - a.lv);
  const chips = ["all", "weapon", "armor", "charm"].map(k => `<button class="chip ${gearFilter === k ? "on" : ""}" data-act="gf" data-k="${k}">${k === "all" ? "ทั้งหมด" : SLOT_TH[k]}</button>`).join("");
  const spare = S.gear.filter(g => !g.by && GEAR[g.id].rarity === "R").length;
  return `
    <div class="chips">${chips}</div>
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
    <p class="hint">สุ่ม ×10 การันตีอย่างน้อย SR 1 ชิ้น · เมล็ดกาแฟได้จากภารกิจวันนี้ การผ่านด่านครั้งแรก และตอนปิดแอปไว้</p>`;
}

// ---------- Daily quests: the steady source of coffee beans ----------
const QUESTS = [
  { k: "kills",  need: 150, beans: 60, text: n => `ยิงมอน ${n} ตัว` },
  { k: "clears", need: 5,   beans: 60, text: n => `ผ่านด่าน ${n} ครั้ง` },
  { k: "bursts", need: 15,  beans: 40, text: n => `ใช้ BURST ${n} ครั้ง` },
  { k: "pulls",  need: 1,   beans: 30, text: () => "ชงเรียก 1 ครั้ง (ใช้สุ่มฟรีก็ได้)" },
];
const ALL_DONE_BEANS = 60;
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
  const h = HEROES[id], o = S.heroes[id], st = heroStats(id), sk = h.skill, g = GUNS[h.gun];
  const slots = ["weapon", "armor", "charm"].map(slot => {
    const it = S.gear.find(x => x.by === id && GEAR[x.id].slot === slot);
    return it ? `<button class="eq" data-act="pickGear" data-id="${id}" data-slot="${slot}">${imgTag(gearPic(it.id))}<small>${GEAR[it.id].name}<br>Lv ${it.lv}</small></button>`
              : `<button class="eq empty" data-act="pickGear" data-id="${id}" data-slot="${slot}">+<small>${SLOT_TH[slot]}</small></button>`;
  }).join("");
  const inTeam = S.team.indexOf(id);
  openSheet(`
    <div class="hero-head" style="--c:${h.color}">
      <span class="big-pic">${imgTag(heroPic(id))}</span>
      <div><b class="hname">${h.name}</b> ${rar(h.rarity)}<br><small>${ROLE[h.role].th} · ${g.th} · Lv ${o.lv}</small><br>${stars(o.star)}</div>
    </div>
    <p class="quote">“${h.line}”</p>
    <div class="stats">
      <span>HP<b>${fmt(st.hp)}</b></span><span>โจมตี<b>${fmt(st.atk)}</b></span><span>ป้องกัน<b>${fmt(st.def)}</b></span>
      <span>คริ<b>${Math.round(st.crit * 100)}%</b></span><span>กระสุน<b>${g.ammo}</b></span><span>พลัง<b>${fmt(heroPower(id))}</b></span>
    </div>
    <div class="skill"><b>BURST: ${sk.name}</b><small>${skillText(sk)}</small></div>
    <div class="eqs">${slots}</div>
    <div class="sheet-btns">
      ${lvButton(id)}
      ${inTeam >= 0 ? `<button class="btn ghost" data-act="unteam" data-id="${id}" ${S.team.filter(Boolean).length <= 1 ? "disabled" : ""}>ออกจากทีม</button>`
                    : [0, 1, 2].map(i => `<button class="btn ghost" data-act="toTeam" data-id="${id}" data-i="${i}">ใส่ช่อง${["ซ้าย", "กลาง", "ขวา"][i]}</button>`).join("")}
    </div>
    <p class="hint">ได้ตัวซ้ำจากกาชา = ดาวเพิ่ม (สูงสุด 5) แต่ละดาวเพิ่มพลัง 22%</p>`);
}
function skillText(sk) {
  const pct = v => Math.round(v * 100) + "%";
  let t = "";
  if (sk.kind === "hit") t = `ยิง${sk.target === "lowest" ? "ศัตรูที่ HP น้อยสุด" : sk.target === "random" ? "ศัตรูสุ่ม" : "ศัตรูตัวที่ใกล้สุด"} ${sk.hits > 1 ? sk.hits + " นัด นัดละ " : ""}${pct(sk.mult)}`;
  if (sk.kind === "aoe") t = `ยิงศัตรูทุกตัว ${pct(sk.mult)}`;
  if (sk.kind === "heal") t = `ฟื้น HP และซ่อมกำบังทั้งทีม ${pct(sk.pct)}`;
  if (sk.kind === "shield") t = `ให้โล่ทั้งทีม ${pct(sk.pct)} ของ HP ตัวเอง และซ่อมกำบังเต็ม`;
  if (sk.kind === "buff") t = "ปลุกใจทั้งทีม";
  if (sk.atk) t += ` · พลังโจมตีทั้งทีม +${pct(sk.atk)} ${sk.dur} วิ`;
  if (sk.burn) t += ` · ติดไฟ ${sk.burn} วิ`;
  if (sk.slow) t += ` · ทำให้ช้าลง ${sk.slow} วิ`;
  if (sk.lifesteal) t += ` · ดูดเลือด ${pct(sk.lifesteal)}`;
  if (sk.taunt) t += ` · ล่อให้ศัตรูยิงตัวเอง ${sk.taunt} วิ`;
  if (sk.crit) t += " · คริติคอลทุกนัด";
  return t + " · เกจเต็มแล้วแตะการ์ดเพื่อใช้ (หรือเปิด AUTO)";
}

function gearSheet(uid) {
  const g = S.gear.find(x => x.uid === uid);
  if (!g) return closeSheet();
  const d = GEAR[g.id], max = GEAR_MAX_LV[d.rarity], cost = gearLvCost(g);
  const owners = Object.keys(S.heroes).map(id => `<button class="chip ${g.by === id ? "on" : ""}" data-act="equipTo" data-uid="${uid}" data-id="${id}">${HEROES[id].name}</button>`).join("");
  openSheet(`
    <div class="hero-head">
      <span class="big-pic icon r-${d.rarity}b">${imgTag(gearPic(g.id))}</span>
      <div><b class="hname">${d.name}</b> ${rar(d.rarity)}<br><small>${SLOT_TH[d.slot]} · Lv ${g.lv}/${max}</small></div>
    </div>
    <div class="skill"><b>ค่าพลัง</b><small>${statText(gearStats(g))}</small>
      ${g.lv < max ? `<small class="next">เลเวลถัดไป: ${statText(gearStats({ ...g, lv: g.lv + 1 }))}</small>` : ""}</div>
    <div class="card-h"><span>ใส่ให้</span></div>
    <div class="chips wrap">${owners}${g.by ? `<button class="chip" data-act="unequip" data-uid="${uid}">ถอดออก</button>` : ""}</div>
    <div class="sheet-btns">
      ${g.lv < max ? `<button class="btn" data-act="gearLv" data-uid="${uid}" ${S.gold < cost ? "disabled" : ""}>อัพเลเวล <span class="coin"></span>${fmt(cost)}</button>` : `<button class="btn" disabled>เลเวลเต็มแล้ว</button>`}
      <button class="btn ghost" data-act="salvage" data-uid="${uid}">ย่อยเป็นทอง ${fmt(gearSalvage(g))}</button>
    </div>`);
}

function pickGearSheet(heroId, slot) {
  const items = S.gear.filter(g => GEAR[g.id].slot === slot).sort((a, b) => (b.by === heroId) - (a.by === heroId) || RARITY[GEAR[b.id].rarity].mult - RARITY[GEAR[a.id].rarity].mult || b.lv - a.lv);
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
  goBest: () => { S.stage = S.best; S.autoNext = true; save(); startStage(); renderPanel(); },
  hero: el => heroSheet(el.dataset.id),
  slot: el => {
    const free = Object.keys(S.heroes).filter(id => !S.team.includes(id));
    if (!free.length) return toast("ฮีโร่ทุกคนอยู่ในทีมแล้ว");
    openSheet(`<div class="card-h"><span>เลือกฮีโร่ใส่ช่อง${["ซ้าย", "กลาง", "ขวา"][el.dataset.i]}</span></div><div class="hgrid">${free.map(id => `
      <button class="hcard" data-act="toTeam" data-id="${id}" data-i="${el.dataset.i}" style="--c:${HEROES[id].color}">${imgTag(heroPic(id))}${rar(HEROES[id].rarity)}<b>${HEROES[id].name}</b><small>${GUNS[HEROES[id].gun].th} · Lv ${S.heroes[id].lv}</small></button>`).join("")}</div>`);
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
  gearLv: el => {
    const g = S.gear.find(x => x.uid === +el.dataset.uid), c = gearLvCost(g);
    if (S.gold < c) return toast("ทองไม่พอ");
    S.gold -= c; g.lv++;
    save(); refreshParty(); gearSheet(g.uid); renderPanel();
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
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
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
  S.gear.push({ uid: S.uid++, id, lv: 1, by: null });
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
  const beans = Math.floor(away / 600) * 5;
  S.gold += gold; S.beans += beans; S.kills += kills;
  S.last = Date.now();
  const h = Math.floor(away / 3600), m = Math.floor(away % 3600 / 60);
  return { text: `ระหว่างที่คุณไม่อยู่ ${h ? h + " ชม. " : ""}${m} นาที ทีมยิงมอนไปได้ ${fmt(kills)} ตัว ได้ทอง ${fmt(gold)}${beans ? ` กับเมล็ดกาแฟ ${beans} เม็ด` : ""}` };
}

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
      { text: "พอดึกปุ๊บ มอนสเตอร์ก็โผล่ออกมาจากตรอก นักผจญภัยของร้านเลยต้องตั้งแนวยิงหลังกระสอบทราย" },
      { text: "พวกเขายิงกันเองได้ แต่ถ้ากดค้างที่ฉากแล้วลาก เธอจะเล็งเองได้ เล็งหัวแรงกว่านะ" },
      { text: "ทำภารกิจวันนี้ให้ครบจะได้เมล็ดกาแฟไว้ 'ชงเรียก' เพื่อนใหม่ ตอนนี้ให้ไว้ก่อน 1,600 เม็ด ลองดูสิ" },
      { who: "bram", text: HEROES.bram.line },
    ], true);
  } else {
    const off = offlineRewards();
    if (off) { updateWallet(); say([{ text: off.text }]); }
  }
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
