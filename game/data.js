// Game content: heroes, gear, monsters and worlds. Numbers here are the whole balance sheet.
"use strict";

const RARITY = {
  R:   { name: "R",   mult: 1.0, color: "#9fb3c8", rate: 0.79 },
  SR:  { name: "SR",  mult: 1.4, color: "#b98cff", rate: 0.18 },
  SSR: { name: "SSR", mult: 1.9, color: "#ffcb52", rate: 0.03 },
};

const ROLE = {
  attacker:  { th: "บุก",     hp: .9,  atk: 1.2, def: .85, crit: .12 },
  defender:  { th: "ตั้งรับ",  hp: 1.6, atk: .75, def: 1.7, crit: .05 },
  supporter: { th: "ซัพพอร์ต", hp: 1.1, atk: .85, def: 1.1, crit: .08 },
};

// interval = seconds between shots, mult = damage per shot (per pellet for SG), ammo then reload seconds.
const GUNS = {
  AR:  { th: "ไรเฟิล",     sprite: "rifle",   interval: .2,  mult: .34, ammo: 30,  reload: 1.6 },
  SMG: { th: "SMG",       sprite: "smg",     interval: .11, mult: .19, ammo: 50,  reload: 1.4 },
  SG:  { th: "ช็อตกัน",    sprite: "shotgun", interval: .9,  mult: .24, ammo: 6,   reload: 1.8, pellets: 8, spread: 10 },
  SNP: { th: "สไนเปอร์",   sprite: "sniper",  interval: 1.5, mult: 3.4, ammo: 5,   reload: 2,   crit: .2 },
  RL:  { th: "จรวด",      sprite: "rocket",  interval: 1.4, mult: 2.2, ammo: 5,   reload: 2.2, splash: 16 },
  MG:  { th: "ปืนกล",      sprite: "mg",      interval: .24, mult: .22, ammo: 150, reload: 3,   ramp: .07 },
};

// skill kinds: hit (front/lowest/random, hits), aoe, heal, shield, buff. Extras: burn, slow, lifesteal, taunt, crit.
const HEROES = {
  bram:   { name: "แบรม", rarity: "R", role: "attacker", gun: "AR", color: "#e0a26a",
            look: { skin: "#e8b58f", hair: "#7a4a2a", style: "short", outfit: "#5a6b7d", accent: "#c9a24a", wood: "#3a3a44", metal: "#c8ccd8" },
            skill: { name: "ระดมยิง", kind: "hit", target: "front", mult: 1.1, hits: 5 },
            line: "กาแฟดำแก้วเดียวก็พอ… ที่เหลือฝากปืนผมเถอะ" },
  fen:    { name: "เฟน", rarity: "R", role: "attacker", gun: "SNP", color: "#8fd28a",
            look: { skin: "#f0c7a0", hair: "#3e7d4a", style: "ponytail", outfit: "#4f6b3a", accent: "#a8743a", wood: "#2e3a2a", metal: "#d8e0c8" },
            skill: { name: "นัดเดียวจอด", kind: "hit", target: "lowest", mult: 5, hits: 1, crit: true },
            line: "ยิงจากตรงนี้ได้ ไม่ต้องเดินไปใกล้หรอก" },
  pim:    { name: "พิม", rarity: "R", role: "attacker", gun: "RL", color: "#ff9cc0",
            look: { skin: "#f3cfb3", hair: "#e07a9a", style: "bob", outfit: "#4a3a7a", accent: "#f2d16b", extra: "#ff6a8a", wood: "#3a3050", weapon: "rocket" },
            skill: { name: "พลุดอกใหญ่", kind: "aoe", mult: 1.6 },
            line: "จรวดลูกนี้เพิ่งหัดยิงเมื่อวาน… น่าจะไม่ระเบิดใส่เรานะ" },
  noi:    { name: "น้อย", rarity: "R", role: "supporter", gun: "SMG", color: "#8fe0c8",
            look: { skin: "#e9b994", hair: "#2b2233", style: "long", outfit: "#e8e0cc", accent: "#7ac0a8", wood: "#3a4448", metal: "#e8f0f0" },
            skill: { name: "ชาอุ่นใจ", kind: "heal", pct: .28 },
            line: "เจ็บตรงไหนบอกนะ น้อยชงชาสมุนไพรไว้ให้แล้ว" },
  garron: { name: "การ์รอน", rarity: "SR", role: "defender", gun: "SG", color: "#d6b25a",
            look: { skin: "#c98f6a", hair: "#3a2a22", style: "short", outfit: "#3e4a66", accent: "#d6b25a", extras: ["beard"], wood: "#4a3a2a", metal: "#b8b0a0" },
            skill: { name: "กำแพงเหล็ก", kind: "shield", pct: .25, taunt: 5 },
            line: "หลบหลังข้าไว้ ไม่มีกระสุนนัดไหนผ่านไปได้" },
  vex:    { name: "เว็กซ์", rarity: "SR", role: "attacker", gun: "SMG", color: "#e06a8a",
            look: { skin: "#d8b8c8", hair: "#5a4a8a", style: "hood", outfit: "#2a2a3a", accent: "#c04a6a", extras: ["mask"], wood: "#1e1e28", metal: "#c04a6a" },
            skill: { name: "พายุกระสุน", kind: "hit", target: "lowest", mult: .9, hits: 6 },
            line: "ค่าจ้างจ่ายเป็นเมล็ดกาแฟก็ได้ ไม่ถามที่มา" },
  mira:   { name: "มิระ", rarity: "SR", role: "attacker", gun: "AR", color: "#9fdcff",
            look: { skin: "#f2dde0", hair: "#8fd6ff", style: "long", outfit: "#3a5a9a", accent: "#d9f3ff", wood: "#2a3a5a", metal: "#d9f3ff" },
            skill: { name: "กระสุนน้ำแข็ง", kind: "aoe", mult: 1.4, slow: 4 },
            line: "ขอเป็นลาเต้เย็น… เย็นมากๆ นะคะ" },
  tum:    { name: "ตั้ม", rarity: "SR", role: "supporter", gun: "MG", color: "#f2c45a",
            look: { skin: "#b97f5a", hair: "#e0a030", style: "spiky", outfit: "#a04a3a", accent: "#f2d16b", wood: "#3a2a22", metal: "#e0c890" },
            skill: { name: "เพลงปลุกใจ", kind: "buff", atk: .35, dur: 8 },
            line: "ปืนกลกระบอกนี้เล่นเพลงได้ด้วยนะ ฟังให้ดี!" },
  ruby:   { name: "รูบี้", rarity: "SSR", role: "attacker", gun: "SG", color: "#ff7a6a",
            look: { skin: "#d99ad0", hair: "#2a1e24", style: "long", outfit: "#2e2a4a", accent: "#e05a4a", extra: "#d8604a", extra2: "#6a1e2a", wood: "#2a1e2a", metal: "#f0a0b0", extras: ["horns"] },
            skill: { name: "นรกระยะเผาขน", kind: "hit", target: "front", mult: 4.2, hits: 1, lifesteal: .5 },
            line: "อย่ามองเขาข้านานนัก… สั่งเอสเปรสโซ่มาสองช็อตสิ" },
  kaida:  { name: "ไคดะ", rarity: "SSR", role: "attacker", gun: "RL", color: "#ff9a4a",
            look: { skin: "#f0c8a8", hair: "#d84a3a", style: "spiky", outfit: "#6a2a2a", accent: "#f0b040", extra: "#a83a3a", wood: "#4a2a22", back: ["wings"] },
            skill: { name: "ลมหายใจมังกร", kind: "aoe", mult: 2.4, burn: 4 },
            line: "เลือดมังกรร้อนพอจะต้มกาแฟได้ อยากลองไหม?" },
  elara:  { name: "เอลาร่า", rarity: "SSR", role: "supporter", gun: "AR", color: "#fff0a0",
            look: { skin: "#f6dcc8", hair: "#f6e6a0", style: "long", outfit: "#f4f0e6", accent: "#ffd76a", extra: "#ffe680", wood: "#c8b890", metal: "#fff8d8", extras: ["halo"] },
            skill: { name: "แสงรุ่งอรุณ", kind: "heal", pct: .45, atk: .25, dur: 6 },
            line: "ราตรีจะยาวแค่ไหน แสงก็จะกลับมาเสมอ" },
  mochi:  { name: "โมจิ", rarity: "SSR", role: "attacker", gun: "SNP", color: "#a8f0d0",
            look: { skin: "#f2d0b0", hair: "#f4f4f4", style: "short", outfit: "#3a3a44", accent: "#4f8a5a", wood: "#2a2a30", metal: "#a8f0d0", extras: ["catears", "scarf"], back: ["tail"] },
            skill: { name: "เหมียวสไนป์หกนัด", kind: "hit", target: "random", mult: 1.4, hits: 6, crit: true },
            line: "เมี้ยว… ขอนมอุ่นๆ แก้วนึง แล้วไปลุยกัน" },
};
// sprite weapon comes from the gun
Object.values(HEROES).forEach(h => { h.look.weapon = GUNS[h.gun].sprite; });
const STARTER_TEAM = ["bram", "fen", "noi"];

const GEAR = {
  // atk / hp / def are % bonuses on the hero's own stats; crit is a flat chance, spd is flat speed.
  // weapon → atk
  rustblade:  { name: "ดาบเหล็กสนิม",    slot: "weapon", icon: "sword",   rarity: "R",   atk: 10 },
  willow:     { name: "ไม้เท้าต้นหลิว",  slot: "weapon", icon: "staff",   rarity: "R",   atk: 8, crit: .02 },
  neonblade:  { name: "ดาบนีออน",       slot: "weapon", icon: "sword",   rarity: "SR",  atk: 18, crit: .04 },
  shadowbow:  { name: "ธนูเงาจันทร์",    slot: "weapon", icon: "bow",     rarity: "SR",  atk: 16, spd: 8 },
  fang:       { name: "เขี้ยวราตรี",      slot: "weapon", icon: "dagger",  rarity: "SSR", atk: 28, crit: .1 },
  starstaff:  { name: "คทาดวงดาว",       slot: "weapon", icon: "staff",   rarity: "SSR", atk: 36 },
  // armor → hp, def
  leather:    { name: "เสื้อหนังเก่า",     slot: "armor",  icon: "plate",   rarity: "R",   hp: 12, def: 10 },
  apron:      { name: "ผ้ากันเปื้อนบาริสต้า", slot: "armor", icon: "robe",  rarity: "R",   hp: 10, def: 6, spd: 4 },
  ironplate:  { name: "เกราะเหล็กกล้า",   slot: "armor",  icon: "plate",   rarity: "SR",  hp: 22, def: 20 },
  nightcloak: { name: "ผ้าคลุมยามดึก",    slot: "armor",  icon: "cloak",   rarity: "SR",  hp: 18, def: 12, spd: 10 },
  dragonmail: { name: "เกราะเกล็ดมังกร",  slot: "armor",  icon: "plate",   rarity: "SSR", hp: 40, def: 35 },
  saintrobe:  { name: "อาภรณ์นักบุญ",     slot: "armor",  icon: "robe",    rarity: "SSR", hp: 34, def: 20, atk: 10 },
  // charm → crit, spd, misc
  copperring: { name: "แหวนทองแดง",     slot: "charm",  icon: "ring",    rarity: "R",   crit: .04, atk: 3 },
  beanamulet: { name: "จี้เมล็ดกาแฟ",     slot: "charm",  icon: "amulet",  rarity: "R",   hp: 6, spd: 6 },
  owlfeather: { name: "ขนนกฮูก",         slot: "charm",  icon: "feather", rarity: "SR",  spd: 14, crit: .04 },
  moonring:   { name: "แหวนจันทร์เสี้ยว",  slot: "charm",  icon: "ring",    rarity: "SR",  crit: .08, atk: 6 },
  phoenix:    { name: "ขนนกฟีนิกซ์",      slot: "charm",  icon: "feather", rarity: "SSR", spd: 22, hp: 16 },
  eclipse:    { name: "จี้สุริยคราส",     slot: "charm",  icon: "amulet",  rarity: "SSR", crit: .15, atk: 14 },
};
const GEAR_MAX_LV = { R: 10, SR: 20, SSR: 30 };
const SLOT_TH = { weapon: "อาวุธ", armor: "เกราะ", charm: "เครื่องราง" };

const GEAR_COLORS = {
  R:   { o: "#7d8ea3", a: "#b8c4d2", w: "#5a4636", metal: "#e6ebf2" },
  SR:  { o: "#7a5ad0", a: "#c9a8ff", w: "#4a3a6a", metal: "#e8dcff" },
  SSR: { o: "#d08a2a", a: "#ffd76a", w: "#6a3a1e", metal: "#fff4c8" },
};

const MONSTERS = {
  slime:   { name: "สไลม์กาแฟ",   kind: "slime",    look: { outfit: "#7a4a2e", accent: "#efe0c4", metal: "#fff" }, hp: 1, atk: 1 },
  rat:     { name: "หนูท่อ",       kind: "rat",      look: { outfit: "#6a6a7a", accent: "#d88a9a" }, hp: .8, atk: 1.1 },
  alleycat:{ name: "แมวจรผี",     kind: "cat",      look: { outfit: "#3a3a4a", accent: "#7affb0", eye: "#7affb0" }, hp: .9, atk: 1.2 },
  shroom:  { name: "เห็ดพิษ",      kind: "mushroom", look: { outfit: "#b04a5a", accent: "#e8dcc8", metal: "#ffe8f0" }, hp: 1.1, atk: .9 },
  wolf:    { name: "หมาป่าเงา",    kind: "wolf",     look: { outfit: "#4a4a6a", accent: "#8a8aaa", eye: "#ffd84a" }, hp: 1.2, atk: 1.2 },
  bat:     { name: "ค้างคาวถ้ำ",    kind: "bat",      look: { outfit: "#5a3a6a", eye: "#ff5a5a" }, hp: .7, atk: 1.1 },
  golem:   { name: "โกเลมหิน",     kind: "golem",    look: { outfit: "#6a6070", accent: "#9af0ff", eye: "#9af0ff" }, hp: 1.6, atk: .9 },
  ghost:   { name: "วิญญาณหลงทาง",  kind: "ghost",    look: { outfit: "#c8d0f0", eye: "#3a2a5a", metal: "#ffffff" }, hp: .9, atk: 1.2 },
  skeleton:{ name: "โครงกระดูก",    humanoid: { skin: "#e8e2d0", hair: "#e8e2d0", style: "bald", outfit: "#d8d2c0", accent: "#9a9282", eye: "#ff5a5a", blush: "#e8e2d0", weapon: "sword", extras: ["bones"] }, hp: 1, atk: 1.2 },
  imp:     { name: "อิมป์",        humanoid: { skin: "#c85a6a", hair: "#3a1e2a", style: "spiky", outfit: "#3a1e2a", accent: "#ffb04a", eye: "#ffd84a", weapon: "claws", extras: ["horns"], back: ["tail"] }, hp: .9, atk: 1.3 },
};

const BOSSES = [
  { name: "ราชาสไลม์ลาเต้",  kind: "slime", look: { outfit: "#5a3220", accent: "#fff2d8", extra: "#ffd76a", metal: "#fff" } },
  { name: "จ่าฝูงจันทร์เสี้ยว", kind: "wolf",  look: { outfit: "#2a2a4a", accent: "#c8c8ff", eye: "#ff5a5a", extra: "#ffd76a" } },
  { name: "โกเลมคริสตัล",    kind: "golem", look: { outfit: "#4a3a7a", accent: "#ff9af0", eye: "#ff9af0", extra: "#ffd76a" } },
  { name: "ลิชดวงดาว",       humanoid: { skin: "#d8e0ff", hair: "#2a2050", style: "hood", outfit: "#2a2050", accent: "#9fdcff", eye: "#9fdcff", blush: "#d8e0ff", weapon: "staff", extras: ["crown"], back: ["cape"], extra: "#ffd76a", extra2: "#1a1438" } },
];

const WORLDS = [
  { name: "ตรอกนีออน",   theme: "alley",  mobs: ["slime", "rat", "alleycat"] },
  { name: "ป่าหิ่งห้อย",  theme: "forest", mobs: ["shroom", "wolf", "bat"] },
  { name: "ถ้ำคริสตัล",   theme: "cave",   mobs: ["bat", "golem", "slime"] },
  { name: "หอคอยดวงดาว", theme: "tower",  mobs: ["skeleton", "ghost", "imp"] },
];
const STAGES_PER_WORLD = 10;
const WAVES_PER_STAGE = 5;

const COST = {
  heroPull: 160, heroPull10: 1440,
  gearPull: 100, gearPull10: 900,
  pity: 60,
};

// Farm. Gold crops pay in multiples of the gold one monster gives at your best stage, so they never fall behind.
const CROPS = {
  lettuce:    { name: "ผักกาดหอม",   time: 60,        unlock: 1,  cost: 2,  gold: 9,   look: { outfit: "#8ad86a", accent: "#c8f0a0", hair: "#4a9a4a", metal: "#e8ffd8", wood: "#6a4a32" } },
  carrot:     { name: "แครอท",      time: 5 * 60,    unlock: 3,  cost: 6,  gold: 45,  look: { outfit: "#f08a3a", accent: "#f0b060", hair: "#4a9a4a", wood: "#6a4a32" } },
  tomato:     { name: "มะเขือเทศ",   time: 20 * 60,   unlock: 6,  cost: 15, gold: 170, look: { outfit: "#e04a4a", hair: "#3a8a3a", metal: "#ffb0a0", wood: "#6a4a32" } },
  coffee:     { name: "ต้นกาแฟ",     time: 60 * 60,   unlock: 8,  cost: 30, beans: 35, look: { outfit: "#c03a3a", hair: "#2a6a3a", wood: "#5a3a22" } },
  strawberry: { name: "สตรอว์เบอร์รี", time: 3 * 3600, unlock: 15, cost: 60, beans: 90, gold: 300, look: { outfit: "#ff5a7a", hair: "#3a8a4a", metal: "#fff0a0", wood: "#6a4a32" } },
  pumpkin:    { name: "ฟักทองยักษ์",  time: 8 * 3600,  unlock: 25, cost: 120, beans: 220, gold: 900, look: { outfit: "#f0902a", hair: "#3a7a3a", metal: "#ffd8a0", wood: "#6a4a32" } },
};
const FARM_START = 4, FARM_MAX = 9;
const plotCost = n => Math.round(400 * Math.pow(3, n - FARM_START));
