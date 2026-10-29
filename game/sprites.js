// Pixel sprites drawn in code. A builder paints palette letters onto a small grid,
// then an outline pass wraps every shape in a 1px dark line. Shade letters (S, H, O, A)
// are derived from the base colours so a spec only needs a handful of hex values.
"use strict";
const Pix = (() => {
  const OUTLINE = "#160f1c";

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function makeGrid(w, h) { return { w, h, d: Array.from({ length: h }, () => Array(w).fill(null)) }; }

  function painter(g) {
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y][x] = c; };
    return {
      px: (x, y, c) => set(x, y, c),
      rect: (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); },
      pts: (list, c) => list.forEach(([x, y]) => set(x, y, c)),
    };
  }

  function outline(g) {
    const add = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.d[y][x]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const v = g.d[y + dy] && g.d[y + dy][x + dx];
        return v && v !== "k";
      });
      if (n) add.push([x, y]);
    }
    add.forEach(([x, y]) => { g.d[y][x] = "k"; });
  }

  function palette(spec) {
    const p = {
      k: OUTLINE,
      s: spec.skin || "#e8b58f", h: spec.hair || "#5a3a2a", o: spec.outfit || "#555",
      a: spec.accent || "#d6b25a", w: spec.wood || "#6b4a32", W: spec.metal || "#d8dde6",
      x: spec.extra || "#c8503a", X: spec.extra2 || shade(spec.extra || "#c8503a", .7),
      e: spec.eye || "#1d1626", p: spec.blush || "#e88a8a", b: spec.boots || "#2e2430",
    };
    p.S = shade(p.s, .82); p.H = shade(p.h, .72); p.O = shade(p.o, .7); p.A = shade(p.a, .7);
    return p;
  }

  function toCanvas(g, pal, scale = 1, flip = false, white = false) {
    const c = document.createElement("canvas");
    c.width = g.w * scale; c.height = g.h * scale;
    const x = c.getContext("2d");
    for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
      const v = g.d[y][i];
      if (!v) continue;
      x.fillStyle = white ? (v === "k" ? "#ffffff" : "#fff6e8") : pal[v];
      x.fillRect((flip ? g.w - 1 - i : i) * scale, y * scale, scale, scale);
    }
    return c;
  }

  // ---- Humanoid: 20x24, facing right, feet on the bottom rows ----
  const HAIR = {
    short(P) { P.rect(6, 2, 9, 2, "h"); P.rect(6, 4, 2, 5, "h"); P.pts([[8, 4], [9, 4], [10, 4], [12, 4], [13, 4]], "h"); P.rect(6, 6, 1, 3, "H"); },
    long(P) { HAIR.short(P); P.rect(5, 4, 3, 9, "h"); P.rect(5, 9, 1, 4, "H"); P.rect(13, 4, 1, 2, "h"); },
    ponytail(P) { HAIR.short(P); P.rect(4, 4, 2, 2, "h"); P.rect(3, 5, 2, 6, "h"); P.px(3, 10, "H"); },
    bob(P) { HAIR.short(P); P.rect(6, 4, 2, 6, "h"); P.rect(14, 3, 1, 5, "h"); P.rect(6, 8, 1, 2, "H"); },
    spiky(P) { HAIR.short(P); P.pts([[7, 1], [9, 1], [11, 1], [13, 1], [5, 3], [15, 3]], "h"); },
    hood(P) { P.rect(6, 2, 9, 2, "O"); P.rect(6, 4, 2, 6, "O"); P.rect(14, 3, 1, 5, "O"); P.rect(8, 4, 6, 1, "h"); P.pts([[5, 5], [5, 6], [5, 7]], "O"); },
    bald(P) { P.rect(7, 2, 7, 1, "s"); },
  };

  const EXTRA = {
    horns(P) { P.pts([[7, 1], [7, 0], [6, 0], [13, 1], [13, 0], [14, 0]], "x"); },
    catears(P) { P.pts([[7, 1], [7, 0], [8, 1], [12, 1], [13, 1], [13, 0]], "h"); P.pts([[7, 1], [13, 1]], "p"); },
    beard(P) { P.rect(10, 8, 4, 2, "h"); P.px(9, 9, "h"); },
    halo(P) { P.rect(8, 0, 5, 1, "x"); },
    wings(P) { P.rect(3, 11, 3, 4, "x"); P.rect(2, 9, 2, 3, "x"); P.px(1, 8, "x"); P.rect(4, 15, 2, 1, "X"); P.rect(3, 13, 1, 2, "X"); },
    tail(P) { P.rect(4, 17, 3, 1, "h"); P.pts([[3, 16], [3, 15]], "h"); },
    scarf(P) { P.rect(8, 10, 6, 2, "a"); P.rect(12, 12, 2, 3, "a"); P.px(13, 15, "A"); },
    cape(P) { P.rect(5, 11, 2, 9, "X"); P.px(4, 19, "X"); },
    mask(P) { P.rect(10, 8, 4, 2, "O"); },
    hat(P) { P.rect(5, 2, 11, 1, "x"); P.rect(8, 0, 4, 2, "x"); P.px(12, 1, "x"); P.rect(8, 1, 4, 1, "a"); },
    crown(P) { P.pts([[8, 1], [10, 0], [10, 1], [12, 1], [8, 0], [12, 0]], "a"); P.rect(8, 1, 5, 1, "a"); },
    bones(P) { P.rect(8, 12, 5, 1, "O"); P.rect(8, 14, 5, 1, "O"); },
  };

  const WEAPON = {
    sword(P) { P.rect(15, 5, 1, 10, "W"); P.rect(14, 15, 3, 1, "a"); P.px(15, 16, "w"); P.px(15, 17, "a"); },
    greatsword(P) { P.rect(15, 3, 1, 12, "W"); P.rect(16, 3, 1, 12, "X"); P.px(15, 2, "W"); P.rect(13, 15, 5, 1, "a"); P.rect(15, 16, 1, 2, "w"); },
    staff(P) { P.rect(15, 4, 1, 15, "w"); P.rect(14, 1, 3, 3, "a"); P.px(15, 2, "W"); },
    bow(P) { P.pts([[16, 8], [17, 9], [17, 10], [18, 11], [18, 12], [18, 13], [17, 14], [17, 15], [16, 16]], "w"); P.rect(16, 9, 1, 7, "W"); P.rect(14, 12, 3, 1, "a"); },
    dagger(P) { P.rect(15, 12, 1, 4, "W"); P.px(15, 16, "a"); },
    shield(P) { P.rect(14, 11, 4, 7, "a"); P.rect(15, 12, 2, 5, "w"); P.rect(15, 14, 2, 1, "W"); },
    lute(P) { P.rect(12, 14, 4, 3, "w"); P.px(13, 15, "A"); P.rect(16, 13, 2, 1, "w"); P.px(18, 12, "a"); },
    book(P) { P.rect(14, 13, 3, 4, "a"); P.rect(15, 13, 1, 4, "W"); },
    katana(P) { P.pts([[15, 14], [16, 13], [16, 12], [17, 11], [17, 10], [18, 9], [18, 8], [18, 7]], "W"); P.px(15, 15, "a"); P.px(14, 16, "w"); },
    spear(P) { P.rect(16, 3, 1, 17, "w"); P.pts([[16, 0], [16, 1], [16, 2], [15, 2], [17, 2]], "W"); P.px(16, 3, "a"); },
    rifle(P) { P.rect(15, 5, 2, 11, "w"); P.rect(15, 3, 1, 2, "W"); P.rect(14, 11, 1, 3, "a"); P.px(16, 7, "W"); },
    smg(P) { P.rect(15, 9, 2, 6, "w"); P.rect(15, 7, 1, 2, "W"); P.rect(14, 12, 1, 3, "a"); },
    shotgun(P) { P.rect(15, 4, 2, 12, "w"); P.rect(16, 4, 1, 12, "W"); P.rect(14, 8, 1, 3, "a"); },
    sniper(P) { P.rect(15, 1, 1, 15, "w"); P.px(15, 0, "W"); P.rect(16, 6, 1, 4, "a"); P.rect(14, 12, 1, 3, "w"); },
    rocket(P) { P.rect(14, 3, 3, 12, "w"); P.rect(14, 1, 3, 2, "x"); P.px(15, 0, "x"); P.rect(14, 8, 3, 1, "a"); },
    mg(P) { P.rect(14, 6, 3, 10, "w"); P.rect(15, 3, 1, 3, "W"); P.rect(13, 11, 1, 4, "a"); P.px(16, 8, "W"); },
    claws(P) { P.pts([[15, 15], [16, 14], [15, 17], [16, 16]], "W"); },
    none() {},
  };

  function humanoid(spec, rear = false) {
    const g = makeGrid(20, 24), P = painter(g);
    if (!rear) (spec.back || []).forEach(k => EXTRA[k](P));
    P.rect(7, 21, 3, 2, "b"); P.rect(11, 21, 3, 2, "b");
    P.rect(8, 18, 2, 3, "O"); P.rect(11, 18, 2, 3, "O");
    P.rect(7, 11, 7, 7, "o"); P.rect(7, 11, 1, 7, "O"); P.rect(7, 16, 7, 1, "a");
    P.rect(6, 12, 1, 5, "O"); P.px(6, 17, "S");
    P.rect(14, 12, 1, 4, "o"); P.px(14, 16, "s");
    P.rect(9, 10, 2, 1, "S");
    P.rect(7, 3, 7, 7, "s"); P.rect(7, 9, 7, 1, "S");
    P.px(10, 6, "e"); P.px(12, 6, "e"); P.px(12, 7, "p");
    HAIR[spec.style || "short"](P);
    if (rear) {
      // seen from behind: the face becomes hair, long styles fall over the shoulders
      P.rect(7, 3, 7, 7, spec.style === "bald" ? "s" : "h"); P.rect(7, 4, 1, 5, spec.style === "bald" ? "S" : "H");
      if (spec.style === "long") P.rect(7, 10, 7, 4, "h");
      if (spec.style === "ponytail") P.rect(9, 10, 3, 5, "h");
      if (spec.style === "hood") P.rect(7, 3, 7, 8, "O");
    }
    (spec.extras || []).forEach(k => { if (!rear || !["beard", "mask"].includes(k)) EXTRA[k](P); });
    WEAPON[spec.weapon || "none"](P);
    if (rear) (spec.back || []).forEach(k => EXTRA[k](P));
    outline(g);
    return g;
  }

  // ---- Monsters: 20x20, facing right ----
  const MONSTER = {
    slime(P) { P.rect(4, 12, 12, 6, "o"); P.rect(5, 10, 10, 2, "o"); P.rect(7, 8, 6, 2, "a"); P.rect(5, 10, 10, 1, "a"); P.rect(4, 17, 12, 1, "O"); P.pts([[7, 11], [6, 12]], "W"); P.pts([[11, 13], [14, 13]], "e"); },
    rat(P) { P.rect(5, 12, 9, 5, "o"); P.rect(12, 11, 5, 4, "o"); P.rect(12, 9, 2, 2, "a"); P.px(15, 12, "e"); P.px(17, 13, "p"); P.pts([[4, 13], [3, 13], [2, 12], [1, 11]], "a"); P.pts([[6, 17], [12, 17]], "O"); P.rect(6, 16, 6, 1, "O"); },
    bat(P) { P.rect(8, 8, 4, 5, "o"); P.rect(2, 7, 6, 3, "O"); P.rect(12, 7, 6, 3, "O"); P.pts([[1, 6], [18, 6], [3, 10], [5, 10], [14, 10], [16, 10]], "O"); P.pts([[8, 7], [11, 7]], "o"); P.pts([[9, 9], [11, 9]], "e"); },
    mushroom(P) { P.rect(4, 5, 12, 4, "o"); P.rect(6, 4, 8, 1, "o"); P.pts([[7, 6], [11, 5], [13, 7], [5, 7]], "W"); P.rect(7, 9, 6, 7, "a"); P.pts([[10, 11], [12, 11]], "e"); P.rect(7, 16, 2, 1, "O"); P.rect(11, 16, 2, 1, "O"); },
    wolf(P) { P.rect(4, 9, 10, 5, "o"); P.rect(13, 6, 5, 5, "o"); P.rect(17, 8, 2, 2, "o"); P.pts([[13, 5], [14, 4], [16, 5]], "o"); P.px(16, 7, "e"); P.rect(5, 14, 2, 4, "O"); P.rect(12, 14, 2, 4, "O"); P.rect(1, 8, 3, 2, "o"); P.px(1, 7, "o"); P.rect(6, 13, 6, 1, "a"); P.px(19, 9, "k"); },
    golem(P) { P.rect(5, 6, 10, 9, "o"); P.rect(8, 2, 5, 4, "o"); P.rect(11, 3, 2, 1, "e"); P.rect(3, 7, 2, 8, "O"); P.rect(15, 7, 3, 8, "O"); P.rect(6, 15, 3, 4, "O"); P.rect(11, 15, 3, 4, "O"); P.pts([[7, 8], [12, 10], [9, 12], [16, 8]], "a"); },
    ghost(P) { P.rect(6, 4, 8, 10, "o"); P.rect(5, 6, 10, 8, "o"); P.pts([[5, 14], [7, 14], [9, 14], [11, 14], [13, 14], [6, 15], [10, 15]], "o"); P.pts([[10, 8], [12, 8]], "e"); P.px(11, 10, "e"); P.rect(6, 5, 2, 2, "W"); },
    cat(P) { P.rect(5, 11, 9, 5, "o"); P.rect(12, 8, 6, 5, "o"); P.pts([[12, 7], [12, 6], [17, 7], [17, 6]], "o"); P.pts([[14, 10], [16, 10]], "e"); P.rect(5, 16, 2, 2, "O"); P.rect(11, 16, 2, 2, "O"); P.pts([[4, 11], [3, 10], [3, 9], [2, 8]], "o"); P.rect(6, 12, 2, 1, "a"); },
  };

  function monster(spec) {
    const g = makeGrid(20, 20), P = painter(g);
    MONSTER[spec.kind](P);
    (spec.extras || []).forEach(k => k === "crown" ? P.pts([[8, 2], [10, 1], [12, 2], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3]], "x") : 0);
    outline(g);
    return g;
  }

  // ---- Gear icons: 14x14 ----
  const ICON = {
    sword(P) { P.pts([[11, 1], [12, 1], [12, 2], [10, 2], [11, 3], [9, 3], [10, 4], [8, 4], [9, 5], [7, 5], [8, 6], [6, 6], [7, 7]], "W"); P.pts([[3, 7], [4, 8], [5, 9], [6, 10], [7, 9], [6, 8]], "a"); P.pts([[4, 10], [3, 11], [2, 12]], "w"); },
    staff(P) { P.pts([[3, 12], [4, 11], [5, 10], [6, 9], [7, 8], [8, 7]], "w"); P.rect(8, 3, 4, 4, "a"); P.px(9, 4, "W"); },
    bow(P) { P.pts([[3, 2], [5, 2], [7, 3], [9, 4], [10, 6], [11, 8], [11, 10], [12, 12]], "w"); P.pts([[3, 3], [4, 5], [5, 7], [7, 9], [9, 11], [11, 12]], "W"); P.pts([[2, 12], [3, 11], [4, 10], [5, 9]], "a"); },
    dagger(P) { P.rect(6, 2, 2, 6, "W"); P.rect(4, 8, 6, 1, "a"); P.rect(6, 9, 2, 3, "w"); },
    plate(P) { P.rect(3, 3, 8, 9, "o"); P.rect(2, 3, 2, 3, "a"); P.rect(10, 3, 2, 3, "a"); P.rect(6, 3, 2, 2, "k"); P.rect(4, 6, 6, 1, "W"); P.rect(3, 11, 8, 1, "O"); },
    robe(P) { P.rect(4, 2, 6, 3, "o"); P.rect(3, 5, 8, 7, "o"); P.rect(6, 2, 2, 10, "a"); P.rect(3, 11, 8, 1, "O"); },
    cloak(P) { P.rect(4, 2, 6, 2, "o"); P.rect(3, 4, 8, 8, "o"); P.rect(6, 4, 2, 2, "a"); P.pts([[3, 12], [5, 12], [8, 12], [10, 12]], "O"); },
    ring(P) { P.rect(4, 6, 6, 1, "a"); P.rect(4, 11, 6, 1, "a"); P.rect(3, 7, 1, 4, "a"); P.rect(10, 7, 1, 4, "a"); P.rect(5, 2, 4, 4, "o"); P.px(6, 3, "W"); },
    amulet(P) { P.pts([[3, 2], [4, 3], [5, 4], [10, 2], [9, 3], [8, 4]], "a"); P.rect(5, 5, 4, 5, "o"); P.rect(6, 10, 2, 1, "o"); P.px(6, 6, "W"); },
    feather(P) { P.pts([[10, 1], [9, 2], [10, 2], [8, 3], [9, 3], [10, 3], [7, 4], [8, 4], [9, 4], [6, 5], [7, 5], [8, 5], [5, 6], [6, 6], [7, 6], [5, 7], [6, 7], [4, 8], [5, 8]], "o"); P.pts([[3, 9], [2, 10], [1, 11]], "a"); },
  };

  function icon(kind) {
    const g = makeGrid(14, 14), P = painter(g);
    ICON[kind](P);
    outline(g);
    return g;
  }

  // ---- Crops: 16x16, stage 0 seed → 3 ripe ----
  function crop(kind, stage) {
    const g = makeGrid(16, 16), P = painter(g);
    if (stage === 0) { P.pts([[5, 12], [8, 13], [11, 12]], "w"); }
    else if (stage === 1) { P.rect(7, 10, 1, 4, "h"); P.pts([[6, 9], [5, 9], [8, 9], [9, 8]], "h"); }
    else if (stage === 2) { P.rect(7, 7, 1, 7, "h"); P.rect(4, 8, 3, 2, "h"); P.rect(8, 6, 3, 2, "h"); P.rect(5, 11, 2, 1, "H"); P.rect(8, 10, 3, 1, "H"); }
    else {
      const R = {
        lettuce() { P.rect(4, 7, 8, 7, "o"); P.rect(5, 6, 6, 1, "o"); P.rect(6, 8, 4, 5, "a"); P.rect(7, 9, 1, 4, "W"); },
        carrot() { P.rect(6, 9, 4, 3, "o"); P.rect(7, 12, 2, 2, "o"); P.pts([[6, 6], [7, 5], [8, 6], [9, 5], [7, 7], [8, 7], [8, 8], [7, 8]], "h"); P.px(7, 10, "A"); },
        tomato() { P.rect(7, 2, 1, 12, "h"); P.rect(4, 6, 3, 3, "o"); P.rect(9, 4, 3, 3, "o"); P.rect(8, 9, 3, 3, "o"); P.pts([[5, 6], [10, 4], [9, 9]], "W"); P.pts([[6, 5], [11, 3]], "h"); },
        coffee() { P.rect(7, 3, 2, 11, "w"); P.rect(3, 4, 4, 3, "h"); P.rect(9, 6, 4, 3, "h"); P.rect(4, 9, 3, 2, "h"); P.pts([[5, 7], [6, 7], [10, 9], [11, 9], [5, 11], [9, 5]], "o"); },
        strawberry() { P.rect(3, 9, 10, 2, "h"); P.rect(5, 6, 3, 4, "o"); P.rect(9, 7, 3, 4, "o"); P.rect(6, 10, 1, 1, "o"); P.pts([[6, 7], [10, 8], [5, 8]], "W"); P.pts([[6, 5], [10, 6]], "h"); },
        pumpkin() { P.rect(3, 8, 10, 6, "o"); P.rect(4, 7, 8, 1, "o"); P.rect(6, 8, 1, 6, "O"); P.rect(9, 8, 1, 6, "O"); P.rect(7, 5, 2, 2, "h"); P.px(4, 9, "W"); },
      };
      R[kind]();
    }
    outline(g);
    return g;
  }

  return { humanoid, monster, icon, crop, palette, toCanvas, shade };
})();
