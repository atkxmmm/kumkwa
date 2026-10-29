// กิลด์ยามดึก: idle fantasy adventure gacha with daily quests.
// Sim runs in fixed logical pixels (LW x LH); the canvas is scaled by a whole number so pixels stay crisp.
"use strict";
const $ = s => document.querySelector(s);
const LW = 160, LH = 150, GROUND = 118;
const SAVE_KEY = "nightguild-save-v1";
const HERO_X = [64, 44, 24], HERO_DY = [0, 6, -5];
const FOE_X = [102, 122, 142], FOE_DY = [0, 6, -5];
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
  else if (kind === "master") { const L = { skin: "#e0b090", hair: "#3a2a2a", style: "long", outfit: "#2a2a2a", accent: "#e8e0cc", weapon: "none" }; s = build(Pix.humanoid(L), Pix.palette(L)); }
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
    v: 1, gold: 50, beans: 3000, stage: 1, best: 1, autoNext: true, auto: true, speed: 1,
    heroes, team: [...STARTER_TEAM], gear: [], uid: 1,
    pity: { hero: 0, gear: 0 }, free: { hero: "", gear: "" },
    daily: null,
    last: Date.now(), introDone: false, tapTip: false, seen: {}, kills: 0, pulls: 0,
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
  let crit = r.crit, spd = r.spd;
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

function stageScale(n) { return Math.pow(1.115, n - 1); }
function worldOf(n) { return Math.floor((n - 1) / STAGES_PER_WORLD) % WORLDS.length; }
function stageName(n) { return `${Math.floor((n - 1) / STAGES_PER_WORLD) + 1}-${(n - 1) % STAGES_PER_WORLD + 1}`; }
const killGold = n => 3 * Math.pow(1.13, n - 1);

// ---------- Battle ----------
// Side view: the party stands on the left, monsters on the right. Tap a monster to focus the whole team on it;
// tap a charging boss to break its big attack.
const B = { heroes: [], foes: [], proj: [], fx: [], nums: [], later: [], wave: 1, state: "fight", timer: 0, cutin: null, banner: null, shake: 0, t: 0, paused: false, focus: null };

function makeHeroUnit(id, slot) {
  const st = heroStats(id), d = HEROES[id];
  return {
    side: "hero", id, slot, name: d.name, sprite: "hero:" + id, art: "hero:" + id, scale: 1,
    maxHp: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit,
    ranged: ROLE[d.role].ranged, color: d.color,
    energy: 0, cd: .4 + slot * .25, x: HERO_X[slot], y: GROUND + HERO_DY[slot],
    lunge: 0, flash: 0, dead: false, dying: 0, shield: 0, buffs: [], taunt: 0, slow: 0, burn: null,
  };
}
function makeFoe(key, slot, n, boss) {
  const d = boss ? BOSSES[key] : MONSTERS[key], sc = stageScale(n);
  const trait = boss ? null : d.trait || null;
  const hp = 55 * sc * (boss ? 9 : d.hp);
  const f = {
    side: "foe", key, slot, name: d.name, sprite: (boss ? "boss:" : "mob:") + key, art: (boss ? "boss:" : "mob:") + key,
    scale: boss ? 2 : 1, boss, trait,
    maxHp: hp, hp, atk: 8.5 * sc * (boss ? 1.5 : d.atk), def: 5 * sc,
    spd: boss ? 80 : trait === "fast" ? 170 : 88, crit: .05, color: "#ff6a6a",
    cd: .9 + slot * .3 + Math.random() * .4, x: boss ? 124 : FOE_X[slot], y: GROUND + (boss ? 2 : FOE_DY[slot]),
    lunge: 0, flash: 0, dead: false, dying: 0, shield: 0, buffs: [], taunt: 0, slow: 0, burn: null,
    gold: killGold(n) * (boss ? 8 : 1),
  };
  f.homeX = f.x;
  if (trait === "shield") f.shield = f.shieldMax = hp * .6;
  if (trait === "healer") f.healCd = 3;
  if (boss) Object.assign(f, { move: d.move, chargeCd: 5, charge: null, stun: 0, summoned: 0, enraged: false });
  return f;
}
const lift = u => u.trait === "flyer" ? 14 + Math.round(Math.sin(B.t * 3 + u.slot) * 2) : 0;
function unitBox(u) {
  const s = sprite(u.sprite), w = (ART[u.art] ? 28 : s.w) * u.scale, h = (ART[u.art] ? 28 : s.h) * u.scale;
  return { x: u.x - w / 2, y: u.y - h - lift(u), w, h };
}

function startStage(msg) {
  B.heroes = S.team.map((id, i) => id ? makeHeroUnit(id, i) : null).filter(Boolean);
  B.foes = []; B.proj = []; B.later = []; B.focus = null;
  B.wave = 1;
  B.state = "between"; B.timer = .6;
  B.banner = { text: msg || `ด่าน ${stageName(S.stage)}`, sub: WORLDS[worldOf(S.stage)].name, t: 1.6 };
  renderParty(true); renderStageInfo();
}
function spawnWave() {
  const w = WORLDS[worldOf(S.stage)];
  B.foes = []; B.focus = null;
  if (B.wave === WAVES_PER_STAGE) {
    const bi = worldOf(S.stage);
    B.foes.push(makeFoe(bi, 0, S.stage, true));
    B.banner = { text: "บอส!", sub: BOSSES[bi].name, t: 1.4, boss: true };
  } else {
    const count = S.stage < 3 && B.wave < 3 ? 2 : 3;
    for (let i = 0; i < count; i++) B.foes.push(makeFoe(pick(w.mobs), i, S.stage, false));
  }
  B.foes.forEach(f => { if (f.trait && !S.seen[f.trait]) { S.seen[f.trait] = true; toast(TRAITS[f.trait].tip, 4200); } });
  B.state = "fight";
  renderStageInfo();
}
function summon(boss) {
  const w = WORLDS[worldOf(S.stage)];
  [1, 2].forEach(slot => {
    if (B.foes.some(f => !f.dead && f.slot === slot && !f.boss)) return;
    const f = makeFoe(pick(w.mobs), slot, S.stage, false);
    f.x = f.homeX = slot === 1 ? 96 : 146; f.gold *= .5;
    B.foes.push(f);
    burst(f.x, f.y - 8, "#c9a8ff", 10, 1.2);
  });
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
const atkOf = u => u.atk * (1 + u.buffs.reduce((a, b) => a + b.atk, 0));

function chooseTarget(u, mode) {
  if (u.side === "hero") {
    const f = alive(B.foes);
    if (!f.length) return null;
    if (mode === "lowest") return f.reduce((a, b) => b.hp / b.maxHp < a.hp / a.maxHp ? b : a);
    if (mode === "random") return pick(f);
    if (B.focus && !B.focus.dead) return B.focus;
    // on AUTO the team panics about a bomber that is nearly on top of them
    const close = S.auto && f.find(x => x.trait === "bomber" && x.x < 92);
    return close || f.reduce((a, b) => b.x < a.x ? b : a);
  }
  const h = alive(B.heroes);
  if (!h.length) return null;
  const t = h.find(x => x.taunt > 0);
  if (t) return t;
  const weights = h.map(x => x.slot === 0 ? 3 : 2);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < h.length; i++) { r -= weights[i]; if (r <= 0) return h[i]; }
  return h[0];
}
function foeAt(x, y) {
  let best = null;
  alive(B.foes).forEach(f => { const b = unitBox(f); if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4 && (!best || b.w < unitBox(best).w)) best = f; });
  return best;
}

function addNum(x, y, text, color, big) { B.nums.push({ x: x + rand(-3, 3), y, text, color, t: 0, big }); }
function burst(x, y, color, n = 6, spread = 1) {
  for (let i = 0; i < n; i++) B.fx.push({ x, y, vx: rand(-30, 30) * spread, vy: rand(-45, -10) * spread, t: 0, life: rand(.3, .55), color, size: Math.random() < .3 ? 2 : 1 });
}

function damage(att, tgt, mult, opts = {}) {
  if (!tgt || tgt.dead) return 0;
  const b = unitBox(tgt);
  if (tgt.trait === "flyer" && !att.ranged && !opts.skill && Math.random() < .5) { addNum(tgt.x, b.y - 2, "MISS", "#a898b0"); return 0; }
  const a = atkOf(att);
  let dmg = a * mult * a / (a + tgt.def);
  const crit = opts.crit || Math.random() < att.crit;
  if (crit) dmg *= 1.6;
  if (tgt.stun > 0) dmg *= 1.5;
  dmg = Math.max(1, Math.round(dmg * rand(.92, 1.08)));
  let taken = dmg;
  if (tgt.charge) tgt.charge.gauge += dmg * (opts.skill ? 2 : 1);
  if (tgt.trait === "shield" && tgt.shield > 0) {
    const hit = Math.min(tgt.shield, taken * (opts.skill ? 2 : 1));
    tgt.shield -= hit; taken = 0;
    addNum(tgt.x, b.y - 2, fmt(hit), "#9fdcff", crit);
    burst(tgt.x - 6, b.y + b.h / 2, "#9fdcff", 4);
    if (tgt.shield <= 0) { addNum(tgt.x, b.y - 10, "โล่แตก!", "#9fdcff", true); burst(tgt.x, b.y + b.h / 2, "#9fdcff", 14, 1.4); }
    return hit;
  }
  if (tgt.shield > 0) { const s = Math.min(tgt.shield, taken); tgt.shield -= s; taken -= s; }
  tgt.hp -= taken;
  tgt.flash = .1;
  addNum(tgt.x, b.y - 2, fmt(dmg) + (crit ? "!" : ""), crit ? "#ffd84a" : tgt.side === "hero" ? "#ff8a8a" : "#ffffff", crit);
  burst(tgt.x, b.y + b.h / 2, crit ? "#ffd84a" : "#fff2d8", crit ? 8 : 4);
  if (tgt.side === "hero") tgt.energy = Math.min(100, tgt.energy + 5);
  if (crit) B.shake = .12;
  if (opts.lifesteal) heal(att, dmg * opts.lifesteal);
  if (tgt.hp <= 0) kill(tgt);
  return dmg;
}
function heal(u, amt) {
  if (u.dead) return;
  amt = Math.round(amt);
  u.hp = Math.min(u.maxHp, u.hp + amt);
  if (amt > 0) addNum(u.x, unitBox(u).y - 2, "+" + fmt(amt), "#8affb8");
}
function kill(u) {
  u.hp = 0; u.dead = true; u.dying = .5;
  if (B.focus === u) B.focus = null;
  if (u.side === "foe") {
    S.gold += u.gold; S.kills++; bump("kills");
    const b = unitBox(u);
    addNum(u.x, b.y - 4, "+" + fmt(u.gold) + "G", "#ffcb52");
    burst(u.x, b.y + b.h / 2, "#ffcb52", u.boss ? 20 : 8, u.boss ? 1.6 : 1);
    // treasure chests: the small, frequent bean drip that keeps the gacha in reach
    if (Math.random() < (u.boss ? 1 : .05)) {
      const beans = u.boss ? 40 : Math.round(rand(8, 20));
      S.beans += beans;
      B.fx.push({ x: u.x, y: b.y, vx: 0, vy: -12, t: 0, life: 1.2, color: "chest", size: 0 });
      addNum(u.x, b.y - 14, `หีบ! +${beans} เมล็ด`, "#ffcb52", true);
    }
    updateWallet();
  } else burst(u.x, u.y - 8, "#9a8aa8", 8);
}

function basicAttack(u) {
  const tgt = chooseTarget(u, "front");
  if (!tgt) return;
  if (u.ranged) {
    const b = unitBox(tgt);
    B.proj.push({ x: u.x + (u.side === "hero" ? 8 : -8), y: u.y - 14, tx: tgt.x, ty: b.y + b.h / 2, t: 0, dur: .22, color: u.color, fn: () => damage(u, tgt, 1) });
  } else {
    u.lunge = .18;
    B.later.push({ t: .08, fn: () => damage(u, tgt, 1) });
  }
  if (u.side === "hero") u.energy = Math.min(100, u.energy + (HEROES[u.id].role === "healer" ? 24 : 20));
}

function castSkill(u) {
  if (u.dead || u.energy < 100 || B.cutin || B.state !== "fight" || !alive(B.foes).length) return;
  u.energy = 0;
  bump("bursts");
  B.cutin = { t: 0, dur: .75, u, sk: HEROES[u.id].skill };
  renderParty();
}
function applySkill(u, sk) {
  const team = alive(B.heroes);
  if (sk.kind === "hit") {
    for (let i = 0; i < sk.hits; i++) B.later.push({ t: i * .09, fn: () => {
      const tgt = chooseTarget(u, sk.target);
      if (tgt) { damage(u, tgt, sk.mult, { crit: sk.crit, lifesteal: sk.lifesteal, skill: true }); const b = unitBox(tgt); burst(tgt.x, b.y + b.h / 2, u.color, 6, 1.2); }
    } });
    u.lunge = .25;
  } else if (sk.kind === "aoe") {
    alive(B.foes).forEach((f, i) => B.later.push({ t: i * .06, fn: () => {
      if (f.dead) return;
      damage(u, f, sk.mult, { skill: true });
      if (sk.burn) f.burn = { dps: atkOf(u) * .35, t: sk.burn };
      if (sk.slow) f.slow = sk.slow;
      const b = unitBox(f); burst(f.x, b.y + b.h / 2, u.color, 12, 1.5);
    } }));
    B.shake = .2;
  } else if (sk.kind === "heal") {
    team.forEach(h => { heal(h, h.maxHp * sk.pct); burst(h.x, h.y - 12, "#8affb8", 8); });
  } else if (sk.kind === "shield") {
    team.forEach(h => { h.shield += u.maxHp * sk.pct; burst(h.x, h.y - 12, "#9fdcff", 6); });
  }
  if (sk.atk) team.forEach(h => { h.buffs.push({ atk: sk.atk, t: sk.dur }); burst(h.x, h.y - 16, "#ffd84a", 5); });
  if (sk.taunt) u.taunt = sk.taunt;
}

// Monster traits that need more than "stand and swing"
function foeSpecial(f, dt) {
  if (f.trait === "bomber") {
    const front = alive(B.heroes).reduce((a, b) => !a || b.x > a.x ? b : a, null);
    if (!front) return true;
    f.x -= dt * 20 * (f.slow > 0 ? .5 : 1);
    if (f.x <= front.x + 12) {
      // boom: big hit on whoever it reached, a splash on the rest
      alive(B.heroes).forEach(h => {
        const dmg = f.atk * (h === front ? 4 : 1.5);
        let taken = Math.max(1, Math.round(dmg * dmg / (dmg + h.def)));
        if (h.shield > 0) { const s = Math.min(h.shield, taken); h.shield -= s; taken -= s; }
        h.hp -= taken; h.flash = .12; addNum(h.x, h.y - 26, fmt(taken), "#ff9a4a", true);
        if (h.hp <= 0) kill(h);
      });
      burst(f.x, f.y - 8, "#ffb04a", 24, 1.8); burst(f.x, f.y - 8, "#fff2d8", 10, 1);
      B.shake = .3;
      f.hp = 0; f.dead = true; f.dying = .1; f.gold = 0;
      if (B.focus === f) B.focus = null;
    }
    return true; // bombers never stop to swing
  }
  if (f.trait === "healer") {
    f.healCd -= dt;
    if (f.healCd <= 0) {
      f.healCd = 4.5;
      const hurt = alive(B.foes).filter(x => x !== f && x.hp < x.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) { const amt = Math.round(hurt.maxHp * .15); hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt); addNum(hurt.x, unitBox(hurt).y - 2, "+" + fmt(amt), "#8affb8"); burst(hurt.x, hurt.y - 10, "#8affb8", 8); burst(f.x, f.y - 12, "#8affb8", 4); }
    }
  }
  if (f.boss) return bossUpdate(f, dt);
  return false;
}
function bossUpdate(f, dt) {
  if (!f.enraged && f.hp < f.maxHp * .3) { f.enraged = true; f.spd *= 1.5; addNum(f.x, unitBox(f).y - 8, "โกรธแล้ว!", "#ff5a7a", true); B.shake = .25; }
  if (f.summoned < 1 && f.hp < f.maxHp * .66 || f.summoned < 2 && f.hp < f.maxHp * .33) { f.summoned++; summon(f); }
  if (f.stun > 0) { f.stun -= dt; return true; }
  if (f.charge) {
    const c = f.charge;
    c.t += dt;
    if (c.gauge >= c.need) {
      f.charge = null; f.stun = 3; f.chargeCd = 9;
      addNum(f.x, unitBox(f).y - 10, "BREAK!", "#ffd84a", true);
      burst(f.x, f.y - 20, "#ffd84a", 26, 2); B.shake = .3;
    } else if (c.t >= c.dur) {
      f.charge = null; f.chargeCd = 9;
      B.banner = { text: f.move, sub: "", t: .9, boss: true };
      alive(B.heroes).forEach((h, i) => B.later.push({ t: i * .1, fn: () => {
        const dmg = atkOf(f) * 3.2;
        let taken = Math.max(1, Math.round(dmg * dmg / (dmg + h.def)));
        if (h.shield > 0) { const s = Math.min(h.shield, taken); h.shield -= s; taken -= s; }
        h.hp -= taken; h.flash = .15; addNum(h.x, h.y - 26, fmt(taken), "#ff5a7a", true); burst(h.x, h.y - 12, "#ff5a7a", 12, 1.4);
        if (h.hp <= 0) kill(h);
      } }));
      B.shake = .4;
    }
    return true; // no normal swings while charging
  }
  f.chargeCd -= dt;
  // normal hits alone rarely fill this in time; taps and skills are what break it
  if (f.chargeCd <= 0) f.charge = { t: 0, dur: 3.2, gauge: 0, need: f.maxHp * .3 };
  return false;
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

  const all = [...B.heroes, ...B.foes];
  all.forEach(u => {
    if (u.lunge > 0) u.lunge -= dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.dead) { if (u.dying > 0) u.dying -= dt; return; }
    u.buffs = u.buffs.filter(b => (b.t -= dt) > 0);
    if (u.taunt > 0) u.taunt -= dt;
    if (u.slow > 0) u.slow -= dt;
    if (u.burn) {
      u.burn.t -= dt; u.burn.acc = (u.burn.acc || 0) + dt;
      if (u.burn.acc >= .5) { u.burn.acc = 0; const d = Math.max(1, Math.round(u.burn.dps * .5)); u.hp -= d; addNum(u.x, unitBox(u).y, fmt(d), "#ff9a4a"); if (u.hp <= 0) kill(u); }
      if (u.burn.t <= 0) u.burn = null;
    }
  });

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

  all.forEach(u => {
    if (u.dead) return;
    if (u.side === "foe" && foeSpecial(u, dt)) return;
    u.cd -= dt * (u.slow > 0 ? .55 : 1);
    if (u.cd <= 0) { basicAttack(u); u.cd = 100 / u.spd * (u.side === "foe" ? 1.15 : 1); }
    if (u.side === "hero" && S.auto && u.energy >= 100) castSkill(u);
  });

  if (!alive(B.foes).length && !B.later.length && !B.proj.length) {
    if (B.wave < WAVES_PER_STAGE) { B.wave++; B.state = "between"; B.timer = .7; renderStageInfo(); }
    else { B.state = "clear"; B.timer = 1.1; B.banner = { text: "ผ่านด่าน!", sub: "", t: 1.1 }; }
  } else if (!alive(B.heroes).length) {
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
  const o = GROUND - 104; // scenery was laid out for a ground line at 104
  if (theme === "alley") {
    R(0, 0, LW, LH, "#2a1a1e");
    for (let row = 0; row < 20; row++) for (let col = -1; col < 14; col++) R(col * 12 + (row % 2 ? 6 : 0), row * 6, 11, 5, ["#4a2c2a", "#43282a", "#512f2c", "#3e2526"][Math.floor(rnd() * 4)]);
    R(10, 18 + o, 40, 44, "#1a1216"); R(12, 20 + o, 36, 40, "#22303a");
    for (let i = 0; i < 9; i++) R(12, 22 + o + i * 4, 36, 1, "#15202a");
    R(12, 20 + o, 36, 2, "#e8a050");
    R(64, 14 + o, 36, 20, "#1c3a2a"); R(66, 16 + o, 32, 16, "#24503a");
    R(74, 20 + o, 12, 1, "#7affb0"); R(74, 20 + o, 1, 6, "#7affb0"); R(85, 20 + o, 1, 6, "#7affb0"); R(75, 26 + o, 10, 1, "#7affb0");
    R(86, 21 + o, 3, 1, "#7affb0"); R(88, 21 + o, 1, 3, "#7affb0"); R(86, 23 + o, 3, 1, "#7affb0"); R(72, 28 + o, 16, 1, "#7affb0");
    R(77, 16 + o, 1, 2, "#ff7ab0"); R(80, 15 + o, 1, 3, "#ff7ab0"); R(83, 16 + o, 1, 2, "#ff7ab0");
    R(122, 8 + o, 30, 50, "#1a1216"); R(124, 10 + o, 26, 46, "#3a2a20");
    for (let i = 0; i < 4; i++) { R(126, 12 + o + i * 11, 22, 1, "#c9a24a"); R(128 + i * 4, 6 + o + i * 11, 4, 5, "#e8e0cc"); }
    for (let i = 0; i < 6; i++) { const lx = 8 + i * 28; R(lx, 0, 1, 6 + o, "#1a1216"); R(lx - 2, 6 + o, 5, 3, "#f2d16b"); }
    R(0, GROUND - 6, LW, LH, "#3a4a4a"); R(0, GROUND - 6, LW, 2, "#6a8a84"); R(0, GROUND - 4, LW, 1, "#2a3434");
    for (let i = 0; i < 30; i++) R(Math.floor(rnd() * LW), GROUND + Math.floor(rnd() * (LH - GROUND)), 3, 1, "#2e3c3c");
  } else if (theme === "forest") {
    R(0, 0, LW, LH, "#0e1e22");
    for (let i = 0; i < 50; i++) R(Math.floor(rnd() * LW), Math.floor(rnd() * 60), 1, 1, "#3a6a6a");
    R(110, 10, 12, 12, "#e8f0d0"); R(108, 12, 16, 8, "#e8f0d0"); R(112, 12, 4, 4, "#c8d0b0");
    for (let i = 0; i < 9; i++) { const tx = i * 19 - 4, th = 60 + Math.floor(rnd() * 20); R(tx + 4, GROUND - th, 6, th, "#1a2a24"); R(tx - 4, GROUND - th - 18, 22, 26, "#16302a"); R(tx - 1, GROUND - th - 24, 16, 10, "#1c3a30"); }
    for (let i = 0; i < 7; i++) { const tx = i * 26 + 6, th = 46 + Math.floor(rnd() * 16); R(tx + 3, GROUND - th, 7, th, "#24382e"); R(tx - 6, GROUND - th - 14, 26, 22, "#22493a"); R(tx - 2, GROUND - th - 20, 18, 10, "#2a5a46"); }
    R(0, GROUND - 6, LW, LH, "#1e3a2a"); R(0, GROUND - 6, LW, 2, "#3a6a4a");
    for (let i = 0; i < 40; i++) R(Math.floor(rnd() * LW), GROUND - 7 + Math.floor(rnd() * 3) * (rnd() < .5 ? 0 : 10), 1, 2, "#4a8a5a");
  } else if (theme === "cave") {
    R(0, 0, LW, LH, "#170f26");
    for (let i = 0; i < 14; i++) { const sx = i * 12 + Math.floor(rnd() * 6), sh = 8 + Math.floor(rnd() * 22); R(sx, 0, 6, sh, "#22183a"); R(sx + 2, sh, 2, 4, "#22183a"); }
    for (let i = 0; i < 10; i++) { const cx = Math.floor(rnd() * LW), cy = 36 + Math.floor(rnd() * 60), h = 6 + Math.floor(rnd() * 8); R(cx, cy, 3, h, "#7a4ad0"); R(cx + 1, cy - 2, 1, 2, "#c9a8ff"); R(cx, cy, 1, h, "#b98cff"); }
    R(0, GROUND - 6, LW, LH, "#2a1e3a"); R(0, GROUND - 6, LW, 2, "#4a3a6a");
    for (let i = 0; i < 6; i++) { const cx = Math.floor(rnd() * LW); R(cx, GROUND - 12, 3, 7, "#9af0ff"); R(cx + 1, GROUND - 14, 1, 2, "#e0ffff"); }
  } else {
    R(0, 0, LW, LH, "#120e2a");
    for (let i = 0; i < 80; i++) R(Math.floor(rnd() * LW), Math.floor(rnd() * 100), 1, 1, rnd() < .2 ? "#ffd76a" : "#8a8ac8");
    R(18, 12, 14, 14, "#f0e8c8"); R(22, 12, 10, 10, "#120e2a");
    R(60, 20 + o, 40, 84, "#1e1840"); R(64, 24 + o, 32, 80, "#26204e");
    for (let i = 0; i < 6; i++) { R(72, 30 + o + i * 12, 4, 6, "#ffd76a"); R(84, 30 + o + i * 12, 4, 6, i % 2 ? "#2a2458" : "#ffd76a"); }
    R(56, 14 + o, 48, 8, "#2e2860"); R(76, 4 + o, 8, 10, "#2e2860"); R(79, o, 2, 4, "#ffd76a");
    R(0, GROUND - 6, LW, LH, "#2a2450"); R(0, GROUND - 6, LW, 2, "#4a4480");
    for (let i = 0; i < 16; i++) R(i * 10, GROUND - 4, 9, 1, "#221e44");
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
    const fx = (i * 37 + Math.sin(t * .7 + i) * 10 + LW) % LW, fy = 40 + (i * 23) % 60 + Math.sin(t * 1.3 + i * 2) * 4;
    ctx.fillStyle = `rgba(220,255,140,${.4 + .6 * Math.abs(Math.sin(t * 2 + i))})`; ctx.fillRect(fx | 0, fy | 0, 1, 1);
  } else if (theme === "alley" && !ART["bg:alley"]) {
    if (Math.sin(t * 9) > .93) { ctx.fillStyle = "rgba(20,30,24,.7)"; ctx.fillRect(66, 16 + GROUND - 104, 32, 16); }
  } else if (theme === "tower") for (let i = 0; i < 6; i++) {
    if (Math.sin(t * 3 + i * 7) > .9) { ctx.fillStyle = "#fff"; ctx.fillRect((i * 53) % LW, (i * 17) % 90, 1, 1); }
  } else if (theme === "cave") for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(185,140,255,${.3 + .3 * Math.sin(t * 2 + i)})`; ctx.fillRect((i * 29 + t * 3) % LW | 0, 20 + (i * 31) % 80, 1, 1);
  }
}

function drawUnit(u) {
  if (u.dead && u.dying <= 0) return;
  const s = sprite(u.sprite), art = ART[u.art], flip = u.side === "foe";
  const bob = u.dead ? 0 : Math.round(Math.sin(B.t * 3 + u.slot * 1.7) * .6);
  const dir = flip ? -1 : 1;
  const lungeOff = u.lunge > 0 ? Math.round(Math.sin((1 - u.lunge / .18) * Math.PI) * 6) * dir : 0;
  const b = unitBox(u), w = b.w, h = b.h;
  const shake = u.charge ? Math.round(rand(-1, 1)) : 0;
  const x = Math.round(b.x + lungeOff + shake), y = Math.round(b.y + bob + (u.dead ? (1 - u.dying / .5) * 6 : 0));
  ctx.globalAlpha = u.dead ? Math.max(0, u.dying / .5) : 1;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(Math.round(u.x - w * .3), u.y, Math.round(w * .6), 2);
  ctx.save();
  if (u.enraged) ctx.filter = "sepia(1) saturate(4) hue-rotate(-30deg)";
  if (u.stun > 0) ctx.filter = "grayscale(.8)";
  if (art) {
    ctx.imageSmoothingEnabled = true;
    if (flip) { ctx.translate(Math.round(u.x + lungeOff), 0); ctx.scale(-1, 1); ctx.translate(-Math.round(u.x + lungeOff), 0); }
    if (u.flash > 0) ctx.filter = "brightness(3)";
    const sc = Math.min(w / art.width, h / art.height), aw = art.width * sc, ah = art.height * sc;
    ctx.drawImage(art, Math.round(u.x + lungeOff - aw / 2), y + h - ah, aw, ah);
    ctx.imageSmoothingEnabled = false;
  } else {
    const img = u.flash > 0 ? (flip ? s.whiteFlip : s.white) : (flip ? s.flip : s.img);
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
  if (u.dead) { ctx.globalAlpha = 1; return; }
  if (u.shield > 0 && u.trait !== "shield") { ctx.fillStyle = "rgba(159,220,255,.25)"; ctx.fillRect(x - 1, y + 2, w + 2, h - 2); ctx.fillStyle = "#9fdcff"; ctx.fillRect(x - 1, y + 2, 1, h - 2); ctx.fillRect(x + w, y + 2, 1, h - 2); }
  if (u.trait === "shield" && u.shield > 0) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(x - 2, y + 3, 2, h - 5); ctx.fillStyle = "rgba(159,220,255,.35)"; ctx.fillRect(x - 4, y + 5, 2, h - 9); }
  if (u.trait === "bomber") { ctx.fillStyle = B.t % .25 < .12 ? "#ff5a3a" : "#ffd84a"; ctx.fillRect(x + w - 4, y - 1, 2, 2); }
  if (u.trait === "healer") { ctx.fillStyle = "#8affb8"; ctx.fillRect(Math.round(u.x) - 1, y - 7, 3, 1); ctx.fillRect(Math.round(u.x), y - 8, 1, 3); }
  if (u.trait === "fast") { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x + w, y + 6, 3, 1); ctx.fillRect(x + w + 1, y + 10, 4, 1); }
  if (u.trait === "flyer") { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(u.x - 4), u.y, 8, 1); }
  if (u.taunt > 0) { ctx.fillStyle = "#ffd84a"; ctx.fillRect(Math.round(u.x) - 1, y - 4, 2, 2); }
  if (u.burn) { ctx.fillStyle = B.t % .3 < .15 ? "#ff9a4a" : "#ffd84a"; ctx.fillRect(x + w - 3, y + 3, 2, 2); }
  if (u.slow > 0) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(x + 1, y + 3, 2, 2); }
  if (u.side === "foe") {
    const bw = u.boss ? 34 : 14, bx = Math.round(u.x - bw / 2), by = y - 4;
    ctx.fillStyle = "#160f1c"; ctx.fillRect(bx - 1, by - 1, bw + 2, u.shieldMax ? 6 : 4);
    ctx.fillStyle = "#4a2030"; ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = u.boss ? "#ff5a7a" : "#ff7a6a"; ctx.fillRect(bx, by, Math.ceil(bw * u.hp / u.maxHp), 2);
    if (u.shieldMax) { ctx.fillStyle = "#9fdcff"; ctx.fillRect(bx, by + 3, Math.ceil(bw * Math.max(0, u.shield) / u.shieldMax), 1); }
    if (B.focus === u) { const fy = by - 6 + Math.round(Math.sin(B.t * 6)); ctx.fillStyle = "#7affb0"; ctx.fillRect(Math.round(u.x) - 2, fy, 5, 1); ctx.fillRect(Math.round(u.x) - 1, fy + 1, 3, 1); ctx.fillRect(Math.round(u.x), fy + 2, 1, 1); }
    if (u.charge) drawCharge(u, bx, by, bw);
    if (u.stun > 0) pixText("STUN", u.x, by - 6, 5, "#ffd84a", "center", 400);
  }
  ctx.globalAlpha = 1;
}
// The boss's big attack: red bar is time left, gold bar is how close the team is to breaking it.
function drawCharge(u, bx, by, bw) {
  const c = u.charge;
  ctx.fillStyle = "#160f1c"; ctx.fillRect(bx - 1, by - 13, bw + 2, 7);
  ctx.fillStyle = "#ff5a7a"; ctx.fillRect(bx, by - 12, Math.ceil(bw * (1 - c.t / c.dur)), 2);
  ctx.fillStyle = "#ffd84a"; ctx.fillRect(bx, by - 9, Math.ceil(bw * Math.min(1, c.gauge / c.need)), 2);
  if (B.t % .5 < .3) thaiText("แตะบอส!", u.x, by - 19, 7, "#ffd84a");
  ctx.strokeStyle = `rgba(255,90,122,${.4 + .3 * Math.sin(B.t * 12)})`; ctx.lineWidth = 1;
  ctx.strokeRect(1.5, 1.5, LW - 3, LH - 3);
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
  const bandY = 48, bandH = 46;
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
  drawBg(WORLDS[worldOf(S.stage)].theme);
  [...B.heroes, ...B.foes].sort((a, b) => a.y - b.y).forEach(drawUnit);
  B.proj.forEach(p => {
    const k = p.t / p.dur, x = p.x + (p.tx - p.x) * k, y = p.y + (p.ty - p.y) * k - Math.sin(k * Math.PI) * 6;
    ctx.fillStyle = p.color; ctx.fillRect(Math.round(x) - 2, Math.round(y), 4, 1); ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
  });
  B.fx.forEach(p => {
    ctx.globalAlpha = 1 - p.t / p.life;
    if (p.color === "chest") { const x = Math.round(p.x) - 4, y = Math.round(p.y); ctx.fillStyle = "#160f1c"; ctx.fillRect(x - 1, y - 1, 10, 8); ctx.fillStyle = "#a8743a"; ctx.fillRect(x, y, 8, 6); ctx.fillStyle = "#ffcb52"; ctx.fillRect(x, y + 2, 8, 1); ctx.fillRect(x + 3, y + 2, 2, 2); }
    else { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
  });
  ctx.globalAlpha = 1;
  B.nums.forEach(n => { ctx.globalAlpha = n.t < .7 ? 1 : 1 - (n.t - .7) / .2; (/[ก-๙]/.test(n.text) ? thaiText : pixText)(n.text, n.x, n.y - n.t * 14, n.big ? 8 : 6, n.color); });
  ctx.globalAlpha = 1;
  ctx.restore();
  if (B.cutin) drawCutin(B.cutin);
  if (B.banner && !B.cutin) {
    const b = B.banner, a = Math.min(1, b.t * 3), y0 = 52;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(10,6,14,.7)"; ctx.fillRect(0, y0, LW, b.sub ? 28 : 18);
    ctx.fillStyle = b.boss ? "#ff5a7a" : b.bad ? "#9a8aa8" : "#7affb0"; ctx.fillRect(0, y0, LW, 1); ctx.fillRect(0, y0 + (b.sub ? 28 : 18) - 1, LW, 1);
    thaiText(b.text, LW / 2, y0 + 9, 10, b.boss ? "#ff9ab0" : "#fff2d8");
    if (b.sub) thaiText(b.sub, LW / 2, y0 + 21, 7, "#c8b8d8");
    ctx.globalAlpha = 1;
  }
}

// ---------- Taps on the scene: focus a monster, or hammer a charging boss ----------
cv.addEventListener("pointerdown", e => {
  if (B.paused || B.state !== "fight") return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
  const f = foeAt(x, y);
  B.fx.push({ x, y, vx: 0, vy: 0, t: 0, life: .15, color: "#7affb0", size: 2 });
  if (!f) return;
  if (f.charge) {
    f.charge.gauge += f.charge.need * .12;
    burst(x, y, "#ffd84a", 6, 1.2);
    addNum(x, y - 4, "ตุ้บ!", "#ffd84a");
  }
  B.focus = f;
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
  $("#waveDots").innerHTML = Array.from({ length: WAVES_PER_STAGE }, (_, i) =>
    `<i class="${i + 1 < B.wave ? "done" : i + 1 === B.wave ? "now" : ""} ${i + 1 === WAVES_PER_STAGE ? "boss" : ""}"></i>`).join("");
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
          <span class="bar en"><i></i></span>
        </span>
      </button>`).join("");
    el.querySelectorAll(".pcard").forEach(b => b.onclick = () => {
      const i = +b.dataset.i, u = B.heroes[i];
      if (u.energy >= 100 && !u.dead) return castSkill(u);
      toast(`${HEROES[u.id].skill.name}: เกจยังไม่เต็ม`);
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
    ${S.tapTip ? "" : `<div class="tip"><b>แตะที่มอน</b>เพื่อสั่งทั้งทีมรุมตีตัวนั้น ตอนบอสชาร์จท่าใหญ่<b>แตะบอสรัวๆ</b>ให้แถบสีทองเต็ม บอสจะมึนงงแทนที่จะถล่มทีมเรา</div>`}
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
  if (o.spd) parts.push(`ความเร็ว +${Math.round(o.spd)}`);
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
  const h = HEROES[id], o = S.heroes[id], st = heroStats(id), sk = h.skill;
  const slots = ["weapon", "armor", "charm"].map(slot => {
    const it = S.gear.find(x => x.by === id && GEAR[x.id].slot === slot);
    return it ? `<button class="eq" data-act="pickGear" data-id="${id}" data-slot="${slot}">${imgTag(gearPic(it.id))}<small>${GEAR[it.id].name}<br>Lv ${it.lv}</small></button>`
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
    <div class="skill"><b>สกิล: ${sk.name}</b><small>${skillText(sk)}</small></div>
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
  let t = "";
  if (sk.kind === "hit") t = `โจมตี${sk.target === "lowest" ? "ศัตรูที่ HP น้อยสุด" : sk.target === "random" ? "ศัตรูสุ่ม" : "ศัตรูตัวที่ใกล้สุด"} ${sk.hits > 1 ? sk.hits + " ครั้ง ครั้งละ " : ""}${pct(sk.mult)}`;
  if (sk.kind === "aoe") t = `โจมตีศัตรูทุกตัว ${pct(sk.mult)}`;
  if (sk.kind === "heal") t = `ฟื้น HP ทั้งทีม ${pct(sk.pct)}`;
  if (sk.kind === "shield") t = `ให้โล่ทั้งทีม ${pct(sk.pct)} ของ HP ตัวเอง`;
  if (sk.kind === "buff") t = "ปลุกใจทั้งทีม";
  if (sk.atk) t += ` · พลังโจมตีทั้งทีม +${pct(sk.atk)} ${sk.dur} วิ`;
  if (sk.burn) t += ` · ติดไฟ ${sk.burn} วิ`;
  if (sk.slow) t += ` · ทำให้ช้าลง ${sk.slow} วิ`;
  if (sk.lifesteal) t += ` · ดูดเลือด ${pct(sk.lifesteal)}`;
  if (sk.taunt) t += ` · ยั่วศัตรูให้ตีตัวเอง ${sk.taunt} วิ`;
  if (sk.crit) t += " · คริติคอลทุกครั้ง";
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
function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms);
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
  const beans = Math.floor(away / 600) * 10;
  S.gold += gold; S.beans += beans; S.kills += kills;
  S.last = Date.now();
  const h = Math.floor(away / 3600), m = Math.floor(away % 3600 / 60);
  return { text: `ระหว่างที่คุณไม่อยู่ ${h ? h + " ชม. " : ""}${m} นาที ทีมปราบมอนไปได้ ${fmt(kills)} ตัว ได้ทอง ${fmt(gold)}${beans ? ` กับเมล็ดกาแฟ ${beans} เม็ด` : ""}` };
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
      { text: "พอดึกปุ๊บ มอนสเตอร์ก็โผล่ออกมาจากตรอก นักผจญภัยของร้านเลยต้องออกไปปราบ" },
      { text: "พวกเธอสู้กันเองได้ แต่ถ้าแตะที่มอน ทั้งทีมจะรุมตัวนั้น ตอนบอสชาร์จท่าใหญ่ให้แตะบอสรัวๆ นะ" },
      { text: "ทำภารกิจวันนี้ให้ครบจะได้เมล็ดกาแฟไว้ 'ชงเรียก' เพื่อนใหม่ ตอนนี้ให้ไว้ก่อน 3,000 เม็ด ลองดูสิ" },
      { who: "bell", text: HEROES.bell.line },
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
