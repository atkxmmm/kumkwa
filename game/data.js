// Game content: heroes, gear, monsters and worlds. Numbers here are the whole balance sheet.
"use strict";

const RARITY = {
  R:   { name: "R",   mult: 1.0, color: "#9fb3c8", rate: 0.79 },
  SR:  { name: "SR",  mult: 1.4, color: "#b98cff", rate: 0.18 },
  SSR: { name: "SSR", mult: 1.9, color: "#ffcb52", rate: 0.03 },
};

const ROLE = {
  warrior: { th: "นักดาบ",   hp: 1.2,  atk: 1.0,  def: 1.2, spd: 100, crit: .08, ranged: false },
  tank:    { th: "อัศวินโล่", hp: 1.7,  atk: .7,   def: 1.9, spd: 85,  crit: .05, ranged: false },
  archer:  { th: "นักธนู",   hp: .85,  atk: 1.15, def: .8,  spd: 115, crit: .15, ranged: true },
  mage:    { th: "จอมเวท",   hp: .8,   atk: 1.3,  def: .7,  spd: 90,  crit: .1,  ranged: true },
  healer:  { th: "นักบวช",   hp: .95,  atk: .7,   def: .9,  spd: 95,  crit: .05, ranged: true },
  rogue:   { th: "นักฆ่า",    hp: .9,   atk: 1.2,  def: .8,  spd: 125, crit: .25, ranged: false },
  bard:    { th: "กวี",       hp: 1.0,  atk: .85,  def: 1.0, spd: 105, crit: .08, ranged: true },
};

// Active skills: the first is ready from Lv1, the second unlocks at SKILL2_LV; the passive at PASSIVE_LV.
// kinds: strike (focus target), multi (random targets), lowest, blast (circle at target), nova (circle at caster or target),
// rain (ticking circle), leap (jump in and blast), heal, guard (team shield + taunt), buff, revive, clone.
// el: fire sets a burn, ice chills. Ice on a burning monster = steam blast, fire on a chilled one = melt (x2).
// Skills count double against monster shields and boss charge gauges.
const SKILL2_LV = 10, PASSIVE_LV = 5;
const HEROES = {
  bell:   { name: "เบลล์", rarity: "R", role: "warrior", color: "#e0a26a",
            look: { skin: "#e8b58f", hair: "#7a4a2a", style: "long", outfit: "#5a6b7d", accent: "#c9a24a", weapon: "sword" },
            skills: [
              { name: "ฟันสุดแรง", cd: 7, kind: "strike", mult: 2.6, hits: 1 },
              { name: "วงดาบพายุ", cd: 13, kind: "nova", r: 26, mult: 1.3, ticks: 3 } ],
            passive: { name: "จังหวะนักดาบ", kind: "everyN", n: 4, text: "ทุกการโจมตีครั้งที่ 4 คริติคอลแน่นอน" },
            line: "กาแฟดำแก้วเดียวก็พอ… ที่เหลือฝากดาบฉันเถอะ" },
  fen:    { name: "เฟน", rarity: "R", role: "archer", color: "#8fd28a",
            look: { skin: "#f0c7a0", hair: "#3e7d4a", style: "ponytail", outfit: "#4f6b3a", accent: "#a8743a", weapon: "bow" },
            skills: [
              { name: "ศรสามดอก", cd: 7, kind: "multi", mult: 1.2, hits: 3, mark: true },
              { name: "ฝนศร", cd: 14, kind: "rain", r: 24, mult: .7, ticks: 5 } ],
            passive: { name: "ตาเหยี่ยว", kind: "onhit", effect: "mark", chance: .25, text: "ลูกธนูมีโอกาส 25% ทำเครื่องหมายล่า ศัตรูโดนแรงขึ้น 30%" },
            line: "ยิงจากตรงนี้ได้ ไม่ต้องเดินไปใกล้หรอก" },
  pim:    { name: "พิม", rarity: "R", role: "mage", color: "#ff9cc0",
            look: { skin: "#f3cfb3", hair: "#e07a9a", style: "bob", outfit: "#4a3a7a", accent: "#f2d16b", extra: "#3a2e5e", weapon: "staff", extras: ["hat"] },
            skills: [
              { name: "ลูกไฟ", cd: 6, kind: "blast", r: 18, mult: 1.5, el: "fire" },
              { name: "อุกกาบาต", cd: 15, kind: "blast", r: 30, mult: 2.8, el: "fire", big: true } ],
            passive: { name: "มือเพลิง", kind: "onhit", effect: "fire", chance: .3, text: "การโจมตีมีโอกาส 30% ทำให้ติดไฟ" },
            line: "เวทนี้เพิ่งหัดเมื่อวาน… น่าจะไม่ระเบิดใส่เรานะ" },
  noi:    { name: "น้อย", rarity: "R", role: "healer", color: "#8fe0c8",
            look: { skin: "#e9b994", hair: "#2b2233", style: "long", outfit: "#e8e0cc", accent: "#7ac0a8", weapon: "book" },
            skills: [
              { name: "ชาอุ่นใจ", cd: 8, kind: "heal", pct: .28 },
              { name: "ชาสมุนไพรพิเศษ", cd: 16, kind: "heal", pct: .18, shield: .2 } ],
            passive: { name: "ห่วงใย", kind: "onkill", heal: .04, text: "ทุกครั้งที่ทีมล้มมอน ฟื้น HP ทั้งทีม 4%" },
            line: "เจ็บตรงไหนบอกนะ น้อยชงชาสมุนไพรไว้ให้แล้ว" },
  garnet: { name: "การ์เน็ต", rarity: "SR", role: "tank", color: "#d6b25a",
            look: { skin: "#c98f6a", hair: "#3a2a22", style: "bob", outfit: "#3e4a66", accent: "#d6b25a", weapon: "shield" },
            skills: [
              { name: "กำแพงเหล็ก", cd: 10, kind: "guard", pct: .22, taunt: 5 },
              { name: "กระแทกโล่", cd: 12, kind: "nova", r: 22, mult: 1.2, ticks: 1, stun: 1.5 } ],
            passive: { name: "หนามโล่", kind: "thorns", pct: .25, text: "สะท้อนดาเมจ 25% กลับไปหาคนที่ตี" },
            line: "ยืนหลังฉันไว้ ไม่มีอะไรผ่านโล่นี้ไปได้" },
  vex:    { name: "เว็กซ์", rarity: "SR", role: "rogue", color: "#e06a8a",
            look: { skin: "#d8b8c8", hair: "#5a4a8a", style: "hood", outfit: "#2a2a3a", accent: "#c04a6a", weapon: "dagger", extras: ["mask"] },
            skills: [
              { name: "เงาสี่คม", cd: 7, kind: "lowest", mult: .95, hits: 4 },
              { name: "ร่างเงา", cd: 16, kind: "clone", dur: 8, power: .6 } ],
            passive: { name: "ล่าเหยื่อ", kind: "markbonus", pct: .5, text: "ตีศัตรูที่โดนทำเครื่องหมายแรงขึ้นอีก 50%" },
            line: "ค่าจ้างจ่ายเป็นเมล็ดกาแฟก็ได้ ไม่ถามที่มา" },
  mira:   { name: "มิระ", rarity: "SR", role: "mage", color: "#9fdcff",
            look: { skin: "#f2dde0", hair: "#8fd6ff", style: "long", outfit: "#3a5a9a", accent: "#d9f3ff", weapon: "staff" },
            skills: [
              { name: "พายุน้ำแข็ง", cd: 8, kind: "nova", r: 40, mult: 1.2, ticks: 1, el: "ice", at: "target" },
              { name: "หอกน้ำแข็ง", cd: 13, kind: "strike", mult: 3, hits: 1, el: "ice", freeze: 2 } ],
            passive: { name: "ลมหนาว", kind: "onhit", effect: "ice", chance: .3, text: "การโจมตีมีโอกาส 30% ทำให้ศัตรูหนาวสั่น ช้าลง" },
            line: "ขอเป็นลาเต้เย็น… เย็นมากๆ นะคะ" },
  tammy:  { name: "แทมมี่", rarity: "SR", role: "bard", color: "#f2c45a",
            look: { skin: "#b97f5a", hair: "#e0a030", style: "ponytail", outfit: "#a04a3a", accent: "#f2d16b", weapon: "lute" },
            skills: [
              { name: "เพลงปลุกใจ", cd: 10, kind: "buff", atk: .35, dur: 8 },
              { name: "เพลงเร่งจังหวะ", cd: 18, kind: "buff", spd: 40, dur: 6, cdr: 3 } ],
            passive: { name: "จังหวะสนุก", kind: "aura", spd: 10, text: "ทั้งทีมตีเร็วขึ้น 10" },
            line: "เพลงนี้แต่งให้ทุกคนที่ยังไม่ยอมแพ้คืนนี้!" },
  ruby:   { name: "รูบี้", rarity: "SSR", role: "warrior", color: "#ff7a6a",
            look: { skin: "#d99ad0", hair: "#2a1e24", style: "long", outfit: "#2e2a4a", accent: "#e05a4a", extra: "#d8604a", extra2: "#6a1e2a", metal: "#f0d0e0", weapon: "greatsword", extras: ["horns"] },
            skills: [
              { name: "ดาบอเวจี", cd: 8, kind: "strike", mult: 4.2, hits: 1, lifesteal: .5 },
              { name: "นรกเพลิง", cd: 14, kind: "nova", r: 30, mult: 2, ticks: 2, el: "fire" } ],
            passive: { name: "กระหายเลือด", kind: "lifesteal", pct: .1, text: "ทุกการโจมตีดูดเลือด 10%" },
            line: "อย่ามองเขาข้านานนัก… สั่งเอสเปรสโซ่มาสองช็อตสิ" },
  kaida:  { name: "ไคดะ", rarity: "SSR", role: "warrior", color: "#ff9a4a",
            look: { skin: "#f0c8a8", hair: "#d84a3a", style: "spiky", outfit: "#6a2a2a", accent: "#f0b040", extra: "#a83a3a", weapon: "spear", back: ["wings"] },
            skills: [
              { name: "ลมหายใจมังกร", cd: 8, kind: "blast", r: 26, mult: 2.4, el: "fire" },
              { name: "มังกรดิ่ง", cd: 14, kind: "leap", r: 24, mult: 3, el: "fire" } ],
            passive: { name: "เลือดมังกร", kind: "onhit", effect: "fire", chance: .25, burnPlus: .5, text: "โอกาส 25% ติดไฟ และไฟแรงขึ้น 50%" },
            line: "เลือดมังกรร้อนพอจะต้มกาแฟได้ อยากลองไหม?" },
  elara:  { name: "เอลาร่า", rarity: "SSR", role: "healer", color: "#fff0a0",
            look: { skin: "#f6dcc8", hair: "#f6e6a0", style: "long", outfit: "#f4f0e6", accent: "#ffd76a", extra: "#ffe680", weapon: "staff", extras: ["halo"] },
            skills: [
              { name: "แสงรุ่งอรุณ", cd: 9, kind: "heal", pct: .45, atk: .25, dur: 6 },
              { name: "ปาฏิหาริย์", cd: 25, kind: "revive", pct: .5 } ],
            passive: { name: "พรแห่งแสง", kind: "onkill", heal: .05, text: "ทุกครั้งที่ทีมล้มมอน ฟื้น HP ทั้งทีม 5%" },
            line: "ราตรีจะยาวแค่ไหน แสงก็จะกลับมาเสมอ" },
  mochi:  { name: "โมจิ", rarity: "SSR", role: "rogue", color: "#a8f0d0",
            look: { skin: "#f2d0b0", hair: "#f4f4f4", style: "bob", outfit: "#3a3a44", accent: "#4f8a5a", weapon: "katana", extras: ["catears", "scarf"], back: ["tail"] },
            skills: [
              { name: "ดาบเหมียวพันคม", cd: 7, kind: "multi", mult: 1.1, hits: 6, crit: true },
              { name: "ร่างเงาเหมียว", cd: 15, kind: "clone", dur: 8, power: .8 } ],
            passive: { name: "สัญชาตญาณแมว", kind: "everyN", n: 3, text: "ทุกการโจมตีครั้งที่ 3 คริติคอลแน่นอน" },
            line: "เมี้ยว… ขอนมอุ่นๆ แก้วนึง แล้วไปลุยกัน" },
};
const STARTER_TEAM = ["bell", "fen", "noi"];
// heroes that were renamed; old saves are moved over on load
const RENAMED = { bram: "bell", garron: "garnet", tum: "tammy" };

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

// trait: shield (hits soak into a shield first), bomber (runs in and explodes), flyer (melee often misses),
// healer (mends nearby monsters), fast (attacks twice as often, less HP)
const TRAITS = {
  shield: { th: "ใส่โล่", tip: "มอนใส่โล่: ต้องตีโล่ให้แตกก่อน สกิลทำลายโล่ได้แรงเป็นสองเท่า" },
  bomber: { th: "ระเบิด", tip: "มอนระเบิด: จะวิ่งเข้ามาระเบิดใส่ทีม แตะที่มันเพื่อสั่งให้ทุกคนรุมก่อนถึงตัว" },
  flyer:  { th: "บินได้", tip: "มอนบินได้: นักดาบตีพลาดบ่อย ใช้ธนูกับเวทจะดีกว่า" },
  healer: { th: "ฮีลเลอร์", tip: "มอนฮีลเลอร์: คอยฟื้นเลือดให้พวก แตะที่มันเพื่อจัดการก่อน" },
  fast:   { th: "ว่องไว", tip: "มอนว่องไว: ตีเร็วแต่เลือดน้อย" },
};
const MONSTERS = {
  slime:   { name: "สไลม์กาแฟ",   kind: "slime",    look: { outfit: "#7a4a2e", accent: "#efe0c4", metal: "#fff" }, hp: 1, atk: 1 },
  rat:     { name: "หนูพกระเบิด",   kind: "rat",      look: { outfit: "#6a6a7a", accent: "#d88a9a" }, hp: .6, atk: 1, trait: "bomber" },
  alleycat:{ name: "แมวจรผี",     kind: "cat",      look: { outfit: "#3a3a4a", accent: "#7affb0", eye: "#7affb0" }, hp: .7, atk: .9, trait: "fast" },
  shroom:  { name: "เห็ดสปอร์",    kind: "mushroom", look: { outfit: "#b04a5a", accent: "#e8dcc8", metal: "#ffe8f0" }, hp: 1, atk: .8, trait: "healer" },
  wolf:    { name: "หมาป่าเงา",    kind: "wolf",     look: { outfit: "#4a4a6a", accent: "#8a8aaa", eye: "#ffd84a" }, hp: .8, atk: 1.1, trait: "fast" },
  bat:     { name: "ค้างคาวถ้ำ",    kind: "bat",      look: { outfit: "#5a3a6a", eye: "#ff5a5a" }, hp: .8, atk: 1, trait: "flyer" },
  golem:   { name: "โกเลมหิน",     kind: "golem",    look: { outfit: "#6a6070", accent: "#9af0ff", eye: "#9af0ff" }, hp: 1.4, atk: .9, trait: "shield" },
  ghost:   { name: "วิญญาณหลงทาง",  kind: "ghost",    look: { outfit: "#c8d0f0", eye: "#3a2a5a", metal: "#ffffff" }, hp: .9, atk: 1, trait: "flyer" },
  skeleton:{ name: "อัศวินกระดูก",   humanoid: { skin: "#e8e2d0", hair: "#e8e2d0", style: "bald", outfit: "#d8d2c0", accent: "#9a9282", eye: "#ff5a5a", blush: "#e8e2d0", weapon: "shield", extras: ["bones"] }, hp: 1.1, atk: 1.1, trait: "shield" },
  imp:     { name: "อิมป์หมอผี",    humanoid: { skin: "#c85a6a", hair: "#3a1e2a", style: "spiky", outfit: "#3a1e2a", accent: "#ffb04a", eye: "#ffd84a", weapon: "staff", extras: ["horns"], back: ["tail"] }, hp: .9, atk: 1, trait: "healer" },
};

const BOSSES = [
  { name: "ราชาสไลม์ลาเต้",  move: "คลื่นลาเต้ถล่ม", kind: "slime", look: { outfit: "#5a3220", accent: "#fff2d8", extra: "#ffd76a", metal: "#fff" } },
  { name: "จ่าฝูงจันทร์เสี้ยว", move: "หอนใต้จันทร์", kind: "wolf",  look: { outfit: "#2a2a4a", accent: "#c8c8ff", eye: "#ff5a5a", extra: "#ffd76a" } },
  { name: "โกเลมคริสตัล",    move: "ฝนคริสตัล", kind: "golem", look: { outfit: "#4a3a7a", accent: "#ff9af0", eye: "#ff9af0", extra: "#ffd76a" } },
  { name: "ลิชดวงดาว",       move: "ดาวตกพันดวง", humanoid: { skin: "#d8e0ff", hair: "#2a2050", style: "hood", outfit: "#2a2050", accent: "#9fdcff", eye: "#9fdcff", blush: "#d8e0ff", weapon: "staff", extras: ["crown"], back: ["cape"], extra: "#ffd76a", extra2: "#1a1438" } },
];

const WORLDS = [
  { name: "ตรอกนีออน",   theme: "alley",  mobs: ["slime", "rat", "alleycat"] },
  { name: "ป่าหิ่งห้อย",  theme: "forest", mobs: ["shroom", "wolf", "bat"] },
  { name: "ถ้ำคริสตัล",   theme: "cave",   mobs: ["bat", "golem", "rat"] },
  { name: "หอคอยดวงดาว", theme: "tower",  mobs: ["skeleton", "ghost", "imp"] },
];
const STAGES_PER_WORLD = 10;
const WAVES_PER_STAGE = 5;

const COST = {
  heroPull: 160, heroPull10: 1440,
  gearPull: 100, gearPull10: 900,
  pity: 60,
};


// Gear drops roll extra stats; enhancing (+1 to +10) can fail but never drops a level.
const SUB_POOL = [
  { k: "atk", min: 3, max: 8 }, { k: "hp", min: 3, max: 8 }, { k: "def", min: 3, max: 8 },
  { k: "crit", min: .01, max: .04 }, { k: "spd", min: 2, max: 6 },
];
const SUB_COUNT = { R: 1, SR: 2, SSR: 3 };
const PLUS_MAX = 10;
const PLUS_RATE = [1, 1, 1, .9, .8, .7, .6, .5, .4, .3]; // chance to go from +i to +i+1
const DROP_RATE = { mob: .04, boss: 1 };
const DROP_RARITY = { mob: { SSR: .03, SR: .17 }, boss: { SSR: .15, SR: .55 } };
