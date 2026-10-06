// ===== 戦国出世録 グラフィック =====
// 外部画像は使わず、すべてプログラムで描く（ドット絵・顔絵・合戦）
'use strict';

// ---------- ドット絵の基本 ----------
function pix(rows) { return rows.map((r) => (r + '................').slice(0, 16)); }
function drawPix(ctx, rows, x, y, s, pal, flip) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch] || '#f0f';
      ctx.fillRect(x + (flip ? w - 1 - c : c) * s, y + r * s, s, s);
    }
  }
}

// 人物スプライト（16x16）
const SPR_BODY = [
  '....bbwwwwbb....',
  '...bbbbwwbbbb...',
  '...sbbbbbbbbs...',
  '...sbbddddbbs...',
  '....bbbbbbbb....',
];
const SPR_LEGS = [
  ['....bbb..bbb....', '....ss....ss....', '....kk....kk....'],
  ['.....bb..bbb....', '.....ss...ss....', '.....kk...kk....'],
  ['....bbb..bb.....', '....ss...ss.....', '....kk...kk.....'],
];
const SPR_HEAD = {
  down: ['................', '.......kk.......', '......kkkk......', '.....kkkkkk.....', '.....kssssk.....', '.....sesses.....', '.....ssssss.....', '......ssss......'],
  up:   ['................', '.......kk.......', '......kkkk......', '.....kkkkkk.....', '.....kkkkkk.....', '.....kkkkkk.....', '.....kssssk.....', '......ssss......'],
  side: ['................', '....kk..........', '....kkkkk.......', '.....kkkkkk.....', '.....kkssss.....', '.....kssses.....', '.....sssssss....', '......ssss......'],
  woman: ['......kkkk......', '.....kkkkkk.....', '....kkkkkkkk....', '....kkssssk.....', '....ksesseskk...', '....kssssssk....', '....kkssssk.....', '......ssss......'],
};
const SPR_BODY_UP = ['....bbbbbbbb....', '...bbbbbbbbbb...', '...sbbbbbbbbs...', '...sbbddddbbs...', '....bbbbbbbb....'];
function personSprite(dir, frame, woman) {
  const head = woman ? SPR_HEAD.woman : dir === 'up' ? SPR_HEAD.up : dir === 'down' ? SPR_HEAD.down : SPR_HEAD.side;
  const body = dir === 'up' ? SPR_BODY_UP : SPR_BODY;
  const legs = woman ? ['....bbbbbbbb....', '....bbbbbbbb....', '.....kk..kk.....'] : SPR_LEGS[frame % 3];
  return pix(head.concat(body, legs));
}
const HERO_PAL = { k: '#2a1d14', s: '#f0c49a', e: '#1a1a1a', b: '#9c6b30', w: '#efe6d2', d: '#4a2f17' };

// ---------- 季節 ----------
function season(month) {
  if (month >= 3 && month <= 4) return { name: '春', grass: '#86b84a', grass2: '#7aab42', tree: '#f4b6c8', tree2: '#e895ad', road: '#d2b48a', snow: false };
  if (month >= 5 && month <= 8) return { name: '夏', grass: '#5f9a3a', grass2: '#568d34', tree: '#2f7a34', tree2: '#25652a', road: '#cfae80', snow: false };
  if (month >= 9 && month <= 11) return { name: '秋', grass: '#a3a23e', grass2: '#959434', tree: '#d8642a', tree2: '#b7461f', road: '#cba878', snow: false };
  return { name: '冬', grass: '#e9eef0', grass2: '#dde4e8', tree: '#4f6f5c', tree2: '#e9eef0', road: '#bdb1a2', snow: true };
}

// ---------- 町の配置 ----------
const TW = 24, TH = 15, TS = 32; // 24x15マス、1マス32px
const TOWN_LAYOUT = [
  { id: 'castle', x: 8, y: 0, w: 8, h: 6, kind: 'castle', label: '城' },
  { id: 'home', x: 2, y: 1, w: 4, h: 3, kind: 'house', label: '屋敷' },
  { id: 'tea', x: 18, y: 1, w: 4, h: 3, kind: 'tea', label: '茶屋' },
  { id: 'market', x: 1, y: 5, w: 6, h: 3, kind: 'market', label: '市' },
  { id: 'dojo', x: 18, y: 5, w: 5, h: 3, kind: 'dojo', label: '道場' },
  { id: 'temple', x: 16, y: 12, w: 6, h: 3, kind: 'temple', label: '寺' },
  { id: 'gate', x: 11, y: 14, w: 2, h: 1, kind: 'gate', label: '町の出口' },
];
const TREES = [[0, 0], [7, 1], [16, 2], [23, 0], [0, 12], [7, 12], [8, 13], [23, 12], [14, 12], [23, 4], [0, 4], [7, 6], [16, 6], [9, 7], [14, 7]];
const POND = [[2, 12], [3, 12], [4, 12], [2, 13], [3, 13], [4, 13], [5, 13], [3, 14], [4, 14]];
function isRoad(x, y) { return y === 9 || y === 10 || ((x === 11 || x === 12) && y >= 6); }

function buildGrid() {
  const g = [];
  for (let y = 0; y < TH; y++) { g.push(new Array(TW).fill(null)); }
  TOWN_LAYOUT.forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) g[y][x] = b; });
  TREES.forEach(([x, y]) => { if (!g[y][x]) g[y][x] = 'tree'; });
  POND.forEach(([x, y]) => { g[y][x] = 'water'; });
  return g;
}
const GRID = buildGrid();
const walkable = (x, y) => x >= 0 && y >= 0 && x < TW && y < TH && GRID[y][x] === null;

// ---------- 町の描画 ----------
function roofTiles(ctx, x, y, w, h, color, dark) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - 6, y + h); ctx.lineTo(x + 8, y); ctx.lineTo(x + w - 8, y); ctx.lineTo(x + w + 6, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  for (let yy = y + 6; yy < y + h; yy += 6) { ctx.beginPath(); ctx.moveTo(x - 6 + (y + h - yy) * 0.4, yy); ctx.lineTo(x + w + 6 - (y + h - yy) * 0.4, yy); ctx.stroke(); }
  ctx.fillStyle = dark; ctx.fillRect(x + 6, y - 2, w - 12, 4);
  ctx.fillRect(x - 6, y + h - 2, w + 12, 4);
}
function wall(ctx, x, y, w, h, color, post) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = post;
  for (let xx = x; xx <= x + w - 4; xx += 22) ctx.fillRect(xx, y, 4, h);
  ctx.fillRect(x + w - 4, y, 4, h);
  ctx.fillRect(x, y + h - 4, w, 4);
}
function door(ctx, cx, by, w, h, color) { ctx.fillStyle = color || '#3a2618'; ctx.fillRect(cx - w / 2, by - h, w, h); }
function label(ctx, text, cx, y) {
  ctx.font = 'bold 15px "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(30,20,12,.82)'; ctx.fillRect(cx - w / 2, y - 11, w, 22);
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - w / 2 + .5, y - 10.5, w - 1, 21);
  ctx.fillStyle = '#fff6df'; ctx.fillText(text, cx, y + 1);
}

function drawCastle(ctx, x, y, w, h, flag, snow) {
  const roof = snow ? '#dfe6ea' : '#2f3a40', rdark = snow ? '#a9b4ba' : '#1c2428';
  // 石垣
  ctx.fillStyle = '#8b8c86';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + 18, y + h * 0.58); ctx.lineTo(x + w - 18, y + h * 0.58); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6b6c66'; ctx.lineWidth = 1.5;
  for (let yy = y + h * 0.58 + 9; yy < y + h; yy += 10) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  // 一層目
  const t1y = y + h * 0.38, t1h = h * 0.2;
  wall(ctx, x + 28, t1y, w - 56, t1h, '#f3efe6', '#b9b2a2');
  ctx.fillStyle = '#2b2b2b';
  for (let xx = x + 44; xx < x + w - 44; xx += 26) ctx.fillRect(xx, t1y + t1h * 0.35, 8, 10);
  roofTiles(ctx, x + 22, t1y - 18, w - 44, 18, roof, rdark);
  // 二層目
  const t2y = y + h * 0.2, t2h = h * 0.13;
  wall(ctx, x + w * 0.3, t2y, w * 0.4, t2h, '#f3efe6', '#b9b2a2');
  ctx.fillStyle = '#2b2b2b';
  for (let xx = x + w * 0.36; xx < x + w * 0.66; xx += 22) ctx.fillRect(xx, t2y + 6, 7, 9);
  roofTiles(ctx, x + w * 0.26, t2y - 16, w * 0.48, 16, roof, rdark);
  // 天守
  const t3y = y + h * 0.06;
  wall(ctx, x + w * 0.38, t3y, w * 0.24, h * 0.09, '#f3efe6', '#b9b2a2');
  roofTiles(ctx, x + w * 0.35, t3y - 14, w * 0.3, 14, roof, rdark);
  // しゃちほこ
  ctx.fillStyle = '#e5b832';
  ctx.fillRect(x + w * 0.38, t3y - 22, 6, 9); ctx.fillRect(x + w * 0.62 - 6, t3y - 22, 6, 9);
  // 門
  door(ctx, x + w / 2, y + h, 36, 30, '#4a3020');
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(x + w / 2 - 1, y + h - 30, 2, 30);
  // 幟
  [x + 6, x + w - 14].forEach((fx, i) => {
    ctx.fillStyle = '#5a4030'; ctx.fillRect(fx + 3, y + h * 0.45, 3, h * 0.55);
    ctx.fillStyle = flag; ctx.fillRect(fx + 6, y + h * 0.47 + (i ? 2 : 0), 12, 40);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx + 12, y + h * 0.47 + 14, 4, 0, 7); ctx.fill();
  });
}

function drawHouse(ctx, x, y, w, h, roof, wallc, snow) {
  const rh = h * 0.45;
  wall(ctx, x + 6, y + rh, w - 12, h - rh, wallc, '#5d4030');
  roofTiles(ctx, x + 6, y + 6, w - 12, rh - 4, snow ? '#e6ecef' : roof, snow ? '#aab5bb' : '#2a2a2a');
  door(ctx, x + w / 2, y + h, 22, 26);
}

function drawBuilding(ctx, b, sz, opts) {
  const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS;
  const snow = opts.snow;
  if (b.kind === 'castle') {
    drawCastle(ctx, x, y + 4, w, h - 4, opts.flag, snow);
    label(ctx, opts.castleLabel, x + w / 2, y + h - 46);
    return;
  }
  if (b.kind === 'house') {
    drawHouse(ctx, x, y, w, h, '#4b4038', '#e8dcc0', snow);
    // 垣根
    ctx.fillStyle = '#6b8e3a'; ctx.fillRect(x, y + h - 8, 10, 8); ctx.fillRect(x + w - 10, y + h - 8, 10, 8);
  } else if (b.kind === 'tea') {
    drawHouse(ctx, x, y, w - 20, h, '#6a4b33', '#ead9b5', snow);
    // のれん
    ctx.fillStyle = '#28427a'; ctx.fillRect(x + (w - 20) / 2 - 16, y + h - 30, 32, 12);
    ctx.fillStyle = '#fff'; ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.fillText('茶', x + (w - 20) / 2, y + h - 23);
    // 野点傘と床几
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + w - 20, y + h * 0.45, 3, h * 0.5);
    ctx.fillStyle = '#c8322a'; ctx.beginPath(); ctx.moveTo(x + w - 46, y + h * 0.5); ctx.quadraticCurveTo(x + w - 18, y + h * 0.18, x + w + 8, y + h * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8322a'; ctx.fillRect(x + w - 44, y + h - 18, 44, 7);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + w - 42, y + h - 11, 4, 9); ctx.fillRect(x + w - 6, y + h - 11, 4, 9);
  } else if (b.kind === 'market') {
    const n = 3, sw = w / n;
    const aw = [['#c8322a', '#f3eadb'], ['#28427a', '#f3eadb'], ['#3c7a3a', '#f3eadb']];
    for (let i = 0; i < n; i++) {
      const sx = x + i * sw + 4;
      ctx.fillStyle = '#7a5434'; ctx.fillRect(sx + 2, y + 26, 4, h - 30); ctx.fillRect(sx + sw - 14, y + 26, 4, h - 30);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = aw[i][k % 2]; ctx.fillRect(sx + k * (sw - 8) / 6, y + 12, (sw - 8) / 6 + 1, 22); }
      ctx.fillStyle = snow ? '#fff' : 'rgba(0,0,0,.15)'; ctx.fillRect(sx, y + 32, sw - 8, 4);
      ctx.fillStyle = '#9b7047'; ctx.fillRect(sx, y + h - 30, sw - 8, 18);
      const goods = [['#e9d27a', '#e9d27a', '#d8c060'], ['#d9472b', '#f08c2b', '#7cb342'], ['#5d4037', '#90a4ae', '#cfd8dc']][i];
      for (let k = 0; k < 5; k++) { ctx.fillStyle = goods[k % 3]; ctx.beginPath(); ctx.arc(sx + 10 + k * ((sw - 26) / 4), y + h - 34, 6, 0, 7); ctx.fill(); }
    }
  } else if (b.kind === 'dojo') {
    drawHouse(ctx, x, y, w, h, '#3e3530', '#9a7556', snow);
    ctx.fillStyle = '#f6f0e0'; ctx.fillRect(x + w / 2 - 14, y + h * 0.48, 28, 14);
    ctx.fillStyle = '#222'; ctx.font = 'bold 10px serif'; ctx.textAlign = 'center'; ctx.fillText('剣', x + w / 2, y + h * 0.48 + 8);
  } else if (b.kind === 'temple') {
    const rh = h * 0.5;
    ctx.fillStyle = '#e9dfc9'; ctx.fillRect(x + 14, y + rh, w - 28, h - rh);
    ctx.fillStyle = '#b23a2e';
    for (let xx = x + 14; xx <= x + w - 20; xx += 30) ctx.fillRect(xx, y + rh, 6, h - rh);
    ctx.fillRect(x + w - 20, y + rh, 6, h - rh);
    roofTiles(ctx, x + 6, y + 8, w - 12, rh - 6, snow ? '#e6ecef' : '#4b4643', snow ? '#aab5bb' : '#2a2725');
    ctx.fillStyle = '#e5b832'; ctx.fillRect(x + w / 2 - 3, y, 6, 10);
    door(ctx, x + w / 2, y + h, 30, 28, '#5a2a20');
    // 鳥居
    const tx = x + w / 2, ty = y - 30;
    ctx.fillStyle = '#c8322a';
    ctx.fillRect(tx - 28, ty, 56, 6); ctx.fillRect(tx - 22, ty + 10, 44, 4);
    ctx.fillRect(tx - 20, ty + 4, 5, 26); ctx.fillRect(tx + 15, ty + 4, 5, 26);
    ctx.fillStyle = '#222'; ctx.fillRect(tx - 30, ty - 3, 60, 4);
  } else if (b.kind === 'gate') {
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 2, y, 8, h); ctx.fillRect(x + w - 10, y, 8, h);
    ctx.fillStyle = '#3a2618'; ctx.fillRect(x - 6, y, w + 12, 8); ctx.fillRect(x, y + 10, w, 4);
  }
  label(ctx, b.label, x + w / 2, b.kind === 'gate' ? y - 12 : b.kind === 'temple' ? y + h * 0.36 : y + 10);
}

function drawTree(ctx, x, y, se, t) {
  const px = x * TS, py = y * TS;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 13, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(px + 13, py + 16, 6, 12);
  ctx.fillStyle = se.tree; ctx.beginPath(); ctx.arc(px + 16, py + 12, 12, 0, 7); ctx.fill();
  ctx.fillStyle = se.tree2; ctx.beginPath(); ctx.arc(px + 11, py + 9, 6, 0, 7); ctx.arc(px + 21, py + 15, 5, 0, 7); ctx.fill();
  if (se.snow) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + 16, py + 5, 7, Math.PI, 0); ctx.fill(); }
}

function drawGround(ctx, se, t) {
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const px = x * TS, py = y * TS;
      if (isRoad(x, y)) {
        ctx.fillStyle = se.road; ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = 'rgba(0,0,0,.06)'; if ((x * 7 + y * 3) % 5 === 0) ctx.fillRect(px + 8, py + 12, 4, 3);
      } else {
        ctx.fillStyle = (x + y) % 2 ? se.grass : se.grass2; ctx.fillRect(px, py, TS, TS);
        if (!se.snow && (x * 13 + y * 7) % 6 === 0) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(px + 6, py + 20, 2, 5); ctx.fillRect(px + 10, py + 18, 2, 7); }
      }
    }
  }
  // 池
  ctx.fillStyle = se.snow ? '#b9d4e0' : '#3f7fa8';
  POND.forEach(([x, y]) => ctx.fillRect(x * TS, y * TS, TS, TS));
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 4; i++) { const p = (t / 900 + i * 0.25) % 1; ctx.fillRect(2 * TS + 10 + i * 22, 12 * TS + 14 + p * 40, 12, 2); }
}

// ---------- 町の状態と操作 ----------
const TOWNVIEW = {
  key: null, x: 11, y: 13, fx: 11, fy: 13, dir: 'up', step: 0, path: [], moving: 0, onBump: null,
  npcs: [], canvas: null, lastMove: 0, bubble: null,
};
const NPC_PALS = [
  { k: '#2a1d14', s: '#f0c49a', e: '#111', b: '#4f6d8a', w: '#eee', d: '#2a3a4a' },
  { k: '#3a2a1a', s: '#e8b98a', e: '#111', b: '#7d8c4a', w: '#eee', d: '#4a5a2a' },
  { k: '#1a1a1a', s: '#f2cfa6', e: '#111', b: '#b5553f', w: '#f6e', d: '#6a2a1f' },
  { k: '#2a2a2a', s: '#efc79c', e: '#111', b: '#8a6aa0', w: '#eee', d: '#4a3a5a' },
  { k: '#5a5a5a', s: '#e8c09a', e: '#111', b: '#706050', w: '#ddd', d: '#403020' },
];
function townEnter(key) {
  if (TOWNVIEW.key === key) return;
  TOWNVIEW.key = key;
  Object.assign(TOWNVIEW, { x: 11, y: 13, fx: 11, fy: 13, dir: 'up', path: [], moving: 0 });
  const spots = [[4, 9], [18, 10], [10, 8], [15, 9], [6, 10], [20, 9], [12, 4]];
  TOWNVIEW.npcs = spots.slice(0, 5).map(([x, y], i) => ({ x, y, fx: x, fy: y, dir: 'down', pal: NPC_PALS[i], woman: i === 2 || i === 3, next: 0 }));
}

function bfs(sx, sy, tx, ty) {
  const key = (x, y) => y * TW + x;
  const prev = new Map(); const q = [[sx, sy]]; prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny) || prev.has(key(nx, ny))) return;
      prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
    });
  }
  if (!prev.has(key(tx, ty))) return null;
  const path = []; let c = [tx, ty];
  while (c && !(c[0] === sx && c[1] === sy)) { path.unshift(c); c = prev.get(key(c[0], c[1])); }
  return path;
}

function townClick(tx, ty) {
  const V = TOWNVIEW;
  const cell = GRID[ty] && GRID[ty][tx];
  if (cell && typeof cell === 'object') {
    // 建物：その前まで歩いて入る
    const b = cell;
    const cands = [];
    for (let x = b.x; x < b.x + b.w; x++) { cands.push([x, b.y + b.h, x, b.y + b.h - 1]); cands.push([x, b.y - 1, x, b.y]); }
    for (let y = b.y; y < b.y + b.h; y++) { cands.push([b.x - 1, y, b.x, y]); cands.push([b.x + b.w, y, b.x + b.w - 1, y]); }
    let best = null;
    cands.forEach(([ax, ay, bx, by]) => {
      if (!walkable(ax, ay)) return;
      const p = ax === V.x && ay === V.y ? [] : bfs(V.x, V.y, ax, ay);
      if (p && (!best || p.length < best.p.length)) best = { p, bx, by };
    });
    if (best) { V.path = best.p.concat([[best.bx, best.by]]); }
  } else if (walkable(tx, ty)) {
    const p = bfs(V.x, V.y, tx, ty);
    if (p) V.path = p;
  }
}

function townStep(dx, dy) {
  const V = TOWNVIEW;
  V.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const nx = V.x + dx, ny = V.y + dy;
  const cell = GRID[ny] && GRID[ny][nx];
  if (cell && typeof cell === 'object') { V.path = []; V.held = null; if (V.onBump) V.onBump(cell.id); return false; }
  if (!walkable(nx, ny)) { V.path = []; return false; }
  V.x = nx; V.y = ny; V.step++;
  return true;
}

function townUpdate(now) {
  const V = TOWNVIEW;
  const sp = 0.14;
  const moving = Math.abs(V.fx - V.x) > 0.01 || Math.abs(V.fy - V.y) > 0.01;
  if (moving) {
    V.fx += Math.sign(V.x - V.fx) * Math.min(sp, Math.abs(V.x - V.fx));
    V.fy += Math.sign(V.y - V.fy) * Math.min(sp, Math.abs(V.y - V.fy));
  } else if (V.path.length) {
    const [nx, ny] = V.path.shift();
    townStep(nx - V.x, ny - V.y);
  } else if (V.held && now - V.lastMove > 40) {
    V.lastMove = now; townStep(V.held[0], V.held[1]);
  }
  // 町人
  V.npcs.forEach((n) => {
    if (Math.abs(n.fx - n.x) > 0.01 || Math.abs(n.fy - n.y) > 0.01) {
      n.fx += Math.sign(n.x - n.fx) * Math.min(0.05, Math.abs(n.x - n.fx));
      n.fy += Math.sign(n.y - n.fy) * Math.min(0.05, Math.abs(n.y - n.fy));
    } else if (now > n.next) {
      n.next = now + 800 + Math.random() * 2200;
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      if (walkable(n.x + d[0], n.y + d[1]) && !(n.x + d[0] === V.x && n.y + d[1] === V.y)) {
        n.x += d[0]; n.y += d[1];
        n.dir = d[0] > 0 ? 'right' : d[0] < 0 ? 'left' : d[1] > 0 ? 'down' : 'up';
      }
    }
  });
}

function drawWalker(ctx, fx, fy, dir, frame, pal, woman) {
  const px = fx * TS, py = fy * TS;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 30, 9, 3, 0, 0, 7); ctx.fill();
  const spr = personSprite(dir === 'left' || dir === 'right' ? 'side' : dir, frame, woman);
  drawPix(ctx, spr, px, py - 2, 2, pal, dir === 'left');
}

function townDraw(ctx, now, info) {
  const V = TOWNVIEW;
  const se = season(info.month);
  drawGround(ctx, se, now);
  TREES.forEach(([x, y]) => { if (GRID[y][x] === 'tree') drawTree(ctx, x, y, se, now); });
  // 奥から順に描く
  const actors = [];
  TOWN_LAYOUT.forEach((b) => actors.push({ y: b.y + b.h - 0.5, f: () => {
    const b2 = Object.assign({}, b, { label: info.labels[b.id] || b.label });
    drawBuilding(ctx, b2, TS, { snow: se.snow, flag: info.flag, castleLabel: info.labels.castle || '城' });
    if (info.locked[b.id]) { ctx.fillStyle = 'rgba(20,15,10,.25)'; ctx.fillRect(b.x * TS, b.y * TS, b.w * TS, b.h * TS); }
    if (info.mission === b.id) {
      const bx = (b.x + b.w / 2) * TS, by = b.y * TS - 6 + Math.sin(now / 200) * 4;
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(bx - 9, by - 16); ctx.lineTo(bx + 9, by - 16); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = 2; ctx.stroke();
    }
  } }));
  V.npcs.forEach((n) => actors.push({ y: n.fy, f: () => drawWalker(ctx, n.fx, n.fy, n.dir, Math.floor(now / 260) % 3 * (Math.abs(n.fx - n.x) + Math.abs(n.fy - n.y) > 0.01 ? 1 : 0), n.pal, n.woman) }));
  const walking = Math.abs(V.fx - V.x) + Math.abs(V.fy - V.y) > 0.01;
  actors.push({ y: V.fy + 0.01, f: () => drawWalker(ctx, V.fx, V.fy, V.dir, walking ? Math.floor(now / 120) % 3 : 0, HERO_PAL, false) });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.f());
  // 自分の目印
  ctx.fillStyle = '#ffd34d';
  const mx = V.fx * TS + 16, my = V.fy * TS - 8 + Math.sin(now / 250) * 2;
  ctx.beginPath(); ctx.moveTo(mx - 5, my - 6); ctx.lineTo(mx + 5, my - 6); ctx.lineTo(mx, my); ctx.closePath(); ctx.fill();
  // 雪・花びら
  if (se.snow || se.name === '春' || se.name === '秋') {
    ctx.fillStyle = se.snow ? 'rgba(255,255,255,.9)' : se.name === '春' ? 'rgba(255,190,210,.9)' : 'rgba(220,110,40,.85)';
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 97 + now * (0.02 + (i % 3) * 0.01)) % (TW * TS));
      const sy = ((i * 53 + now * (0.03 + (i % 4) * 0.008)) % (TH * TS));
      ctx.fillRect(sx + Math.sin(now / 500 + i) * 6, sy, se.snow ? 3 : 4, se.snow ? 3 : 2);
    }
  }
}

// ---------- 顔絵（SVG） ----------
const FACES = {
  hero:      { hair: 'mage', ears: 5, eyes: 'round', brows: 'arch', cloth: '#9c6b30', inner: '#efe6d2', skin: '#f0c49a', grin: true },
  nobunaga:  { hair: 'mage', eyes: 'sharp', brows: 'sharp', beard: 'thin', cloth: '#1d1d1f', inner: '#b0302a', skin: '#f2d2b0', face: 'long' },
  toshiie:   { hair: 'mage', eyes: 'sharp', brows: 'thick', cloth: '#b0302a', inner: '#f0e6d0', skin: '#ebc29a' },
  nene:      { hair: 'woman', eyes: 'soft', brows: 'thin', cloth: '#d9789a', inner: '#fbe9ef', skin: '#f6d8bd', lips: true },
  koroku:    { hair: 'mage', eyes: 'sharp', brows: 'thick', beard: 'full', cloth: '#56657a', inner: '#d8d2c0', skin: '#d9a477' },
  nagahide:  { hair: 'mage', eyes: 'soft', brows: 'thin', beard: 'thin', cloth: '#2f6e9e', inner: '#efe6d2', skin: '#f0cba5' },
  katsuie:   { hair: 'mage', eyes: 'sharp', brows: 'angry', beard: 'full', cloth: '#4a2a5a', inner: '#ddd', skin: '#d8a274', face: 'wide' },
  hanbei:    { hair: 'mage', eyes: 'narrow', brows: 'thin', cloth: '#5f8e94', inner: '#efefe6', skin: '#f5dcc3', face: 'long' },
  nobutsuna: { hair: 'mage', eyes: 'narrow', brows: 'thick', beard: 'white', cloth: '#56524c', inner: '#ddd', skin: '#e2b994', hairColor: '#cfcfcf' },
  rikyu:     { hair: 'bald', eyes: 'narrow', brows: 'thin', cloth: '#2a2a2a', inner: '#888', skin: '#e9c8a5', hood: true },
  mitsuhide: { hair: 'mage', eyes: 'soft', brows: 'thin', beard: 'thin', cloth: '#4f6fa8', inner: '#efe6d2', skin: '#f2d2b0', face: 'long' },
  kanbei:    { hair: 'mage', eyes: 'narrow', brows: 'sharp', beard: 'thin', cloth: '#363b3f', inner: '#cfc6b0', skin: '#e5bd96' },
  mitsunari: { hair: 'boy', eyes: 'sharp', brows: 'thin', cloth: '#7d6a1a', inner: '#f2ead2', skin: '#f6dcc2' },
  kiyomasa:  { hair: 'boy', eyes: 'round', brows: 'thick', cloth: '#a8501e', inner: '#f2ead2', skin: '#eac29c', grin: true },
  yoshimoto: { hair: 'mage', eyes: 'soft', brows: 'dots', beard: 'thin', cloth: '#7a3e98', inner: '#e8c84a', skin: '#fbf3ea', helmet: '#e8c84a' },
  tatsuoki:  { hair: 'mage', eyes: 'soft', brows: 'thin', cloth: '#1e7a6a', inner: '#ddd', skin: '#f2d2b0', helmet: '#2c2c2c' },
  rokkaku:   { hair: 'mage', eyes: 'sharp', brows: 'thin', beard: 'thin', cloth: '#6a6e72', inner: '#ddd', skin: '#e8c09a', helmet: '#3b3b3b' },
  asakura:   { hair: 'mage', eyes: 'sharp', brows: 'thick', beard: 'full', cloth: '#c46a1e', inner: '#ddd', skin: '#dcaa7c', helmet: '#3b2a1a' },
  nagamasa:  { hair: 'mage', eyes: 'sharp', brows: 'sharp', cloth: '#2a6aa8', inner: '#ddd', skin: '#f0cba5', helmet: '#20262c' },
  katsuyori: { hair: 'mage', eyes: 'sharp', brows: 'angry', beard: 'thin', cloth: '#8a2018', inner: '#ddd', skin: '#e6b88e', helmet: '#8a2018' },
  mori:      { hair: 'mage', eyes: 'sharp', brows: 'thick', beard: 'full', cloth: '#1d5a33', inner: '#ddd', skin: '#d9a477', helmet: '#20262c' },
  bandit:    { hair: 'wild', eyes: 'sharp', brows: 'angry', beard: 'stubble', cloth: '#6a5a40', inner: '#9a8a70', skin: '#cf9a6c', scar: true },
  ikki:      { hair: 'band', eyes: 'round', brows: 'thick', cloth: '#7a6a50', inner: '#ddd', skin: '#d9a477' },
  merchant:  { hair: 'mage', eyes: 'narrow', brows: 'dots', cloth: '#7a5a2a', inner: '#e8c84a', skin: '#f2d2b0', face: 'wide', grin: true },
  samurai:   { hair: 'mage', eyes: 'sharp', brows: 'thick', beard: 'thin', cloth: '#4a4a52', inner: '#ddd', skin: '#e2b48a' },
  townsman:  { hair: 'mage', eyes: 'round', brows: 'thin', cloth: '#6a7a5a', inner: '#ddd', skin: '#eac29c' },
};

function faceSVG(id, size) {
  const f = FACES[id] || FACES.samurai;
  size = size || 72;
  const hc = f.hairColor || '#1d1612';
  const skin = f.skin;
  const fw = f.face === 'wide' ? 15 : f.face === 'long' ? 12 : 13.5;
  const fh = f.face === 'long' ? 17 : 15.5;
  let s = `<svg class="face" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">`;
  s += `<rect width="64" height="64" rx="6" fill="#2b2420"/><rect x="2" y="2" width="60" height="60" rx="5" fill="${f.helmet ? '#5b4a3a' : '#d9c79f'}" opacity=".9"/>`;
  // 肩・着物
  s += `<path d="M6 64 C8 48 20 44 32 44 C44 44 56 48 58 64 Z" fill="${f.cloth}"/>`;
  s += `<path d="M24 45 L32 58 L40 45 Z" fill="${f.inner}"/><path d="M27 45 L32 53 L37 45" fill="none" stroke="${f.cloth}" stroke-width="1.2"/>`;
  if (f.helmet) s += `<path d="M6 60 L14 50 L22 54 Z M58 60 L50 50 L42 54 Z" fill="${f.helmet}" opacity=".9"/>`;
  s += `<rect x="28" y="38" width="8" height="8" fill="${skin}"/>`;
  // 耳
  const er = f.ears || 3;
  s += `<ellipse cx="${32 - fw - 0.5}" cy="31" rx="${er * 0.7}" ry="${er}" fill="${skin}"/><ellipse cx="${32 + fw + 0.5}" cy="31" rx="${er * 0.7}" ry="${er}" fill="${skin}"/>`;
  // 顔
  s += `<ellipse cx="32" cy="29" rx="${fw}" ry="${fh}" fill="${skin}"/>`;
  // 髪
  if (f.hair === 'mage') {
    s += `<path d="M${32 - fw} 26 C${32 - fw} 18 ${32 - fw + 2} 15 ${32 - fw + 4} 14 L${32 - fw + 4} 26 Z" fill="${hc}"/>`;
    s += `<path d="M${32 + fw} 26 C${32 + fw} 18 ${32 + fw - 2} 15 ${32 + fw - 4} 14 L${32 + fw - 4} 26 Z" fill="${hc}"/>`;
    s += `<ellipse cx="32" cy="16" rx="${fw - 3}" ry="5" fill="${skin}" opacity=".7"/><path d="M${32 - fw + 4} 15 Q32 9 ${32 + fw - 4} 15" fill="none" stroke="#9fb2c0" stroke-width="2" opacity=".55"/>`;
    s += `<rect x="29" y="7" width="6" height="5" rx="1" fill="${hc}"/><path d="M30 7 Q32 1 37 4 L35 8 Z" fill="${hc}"/>`;
  } else if (f.hair === 'woman') {
    s += `<path d="M14 40 C10 22 18 10 32 10 C46 10 54 22 50 40 L46 40 C47 26 44 20 32 19 C20 20 17 26 18 40 Z" fill="${hc}"/>`;
    s += `<ellipse cx="32" cy="8" rx="8" ry="5" fill="${hc}"/><rect x="22" y="7" width="20" height="2" fill="#c9a24a"/>`;
    s += `<path d="M18 22 C22 15 42 15 46 22 C40 19 24 19 18 22 Z" fill="${hc}"/>`;
  } else if (f.hair === 'boy') {
    s += `<path d="M${32 - fw} 26 C${32 - fw} 12 ${32 + fw} 12 ${32 + fw} 26 C${32 + fw - 3} 18 ${32 - fw + 3} 18 ${32 - fw} 26 Z" fill="${hc}"/>`;
    s += `<path d="M20 20 C26 23 38 23 44 20 L44 17 L20 17 Z" fill="${hc}"/><rect x="29" y="8" width="6" height="5" rx="1" fill="${hc}"/>`;
  } else if (f.hair === 'wild') {
    s += `<path d="M${32 - fw - 3} 30 L${32 - fw - 1} 14 L24 16 L26 9 L32 13 L36 7 L39 13 L45 10 L44 17 L${32 + fw + 3} 14 L${32 + fw + 1} 30 C${32 + fw - 2} 21 ${32 - fw + 2} 21 ${32 - fw - 3} 30 Z" fill="${hc}"/>`;
  } else if (f.hair === 'band') {
    s += `<path d="M${32 - fw} 24 C${32 - fw} 12 ${32 + fw} 12 ${32 + fw} 24 Z" fill="${hc}"/><rect x="${32 - fw - 1}" y="19" width="${fw * 2 + 2}" height="4" fill="#efe6d2"/><path d="M${32 + fw} 20 L${32 + fw + 6} 17 L${32 + fw + 5} 23 Z" fill="#efe6d2"/>`;
  }
  if (f.hood) s += `<path d="M${32 - fw - 3} 34 C${32 - fw - 4} 10 ${32 + fw + 4} 10 ${32 + fw + 3} 34 L${32 + fw} 34 C${32 + fw} 18 ${32 - fw} 18 ${32 - fw} 34 Z" fill="#2a2a2a"/>`;
  if (f.helmet) {
    s += `<path d="M${32 - fw - 5} 24 C${32 - fw - 4} 8 ${32 + fw + 4} 8 ${32 + fw + 5} 24 Z" fill="#2b2b30"/>`;
    s += `<path d="M${32 - fw - 7} 24 L${32 + fw + 7} 24 L${32 + fw + 9} 28 L${32 - fw - 9} 28 Z" fill="#3a3a40"/>`;
    s += `<path d="M24 14 C18 6 16 2 18 0 C22 4 26 8 30 12 Z M40 14 C46 6 48 2 46 0 C42 4 38 8 34 12 Z" fill="${f.helmet}"/><circle cx="32" cy="14" r="3" fill="${f.helmet}"/>`;
  }
  // 眉
  const by = 24;
  const brow = {
    thick: `<path d="M22 ${by} L29 ${by - 1}" stroke="${hc}" stroke-width="2.6" stroke-linecap="round"/><path d="M35 ${by - 1} L42 ${by}" stroke="${hc}" stroke-width="2.6" stroke-linecap="round"/>`,
    thin: `<path d="M23 ${by} Q26 ${by - 2} 29 ${by}" stroke="${hc}" stroke-width="1.2" fill="none"/><path d="M35 ${by} Q38 ${by - 2} 41 ${by}" stroke="${hc}" stroke-width="1.2" fill="none"/>`,
    sharp: `<path d="M22 ${by - 2} L29 ${by}" stroke="${hc}" stroke-width="1.8"/><path d="M35 ${by} L42 ${by - 2}" stroke="${hc}" stroke-width="1.8"/>`,
    angry: `<path d="M21 ${by - 3} L29 ${by + 1}" stroke="${hc}" stroke-width="2.8"/><path d="M35 ${by + 1} L43 ${by - 3}" stroke="${hc}" stroke-width="2.8"/>`,
    arch: `<path d="M22 ${by} Q25.5 ${by - 3} 29 ${by}" stroke="${hc}" stroke-width="1.8" fill="none"/><path d="M35 ${by} Q38.5 ${by - 3} 42 ${by}" stroke="${hc}" stroke-width="1.8" fill="none"/>`,
    dots: `<ellipse cx="25" cy="${by - 4}" rx="2" ry="1.2" fill="${hc}"/><ellipse cx="39" cy="${by - 4}" rx="2" ry="1.2" fill="${hc}"/>`,
  }[f.brows || 'thin'];
  s += brow;
  // 目
  const ey = 28.5;
  const eye = {
    round: `<circle cx="26" cy="${ey}" r="2.1" fill="#1a1a1a"/><circle cx="38" cy="${ey}" r="2.1" fill="#1a1a1a"/><circle cx="26.7" cy="${ey - 0.7}" r=".6" fill="#fff"/><circle cx="38.7" cy="${ey - 0.7}" r=".6" fill="#fff"/>`,
    sharp: `<path d="M22.5 ${ey} L29 ${ey - 1} L28 ${ey + 1} Z" fill="#1a1a1a"/><path d="M35 ${ey - 1} L41.5 ${ey} L36 ${ey + 1} Z" fill="#1a1a1a"/>`,
    narrow: `<path d="M23 ${ey} L29 ${ey}" stroke="#1a1a1a" stroke-width="1.5"/><path d="M35 ${ey} L41 ${ey}" stroke="#1a1a1a" stroke-width="1.5"/>`,
    soft: `<path d="M23 ${ey} Q26 ${ey - 2} 29 ${ey}" stroke="#1a1a1a" stroke-width="1.6" fill="none"/><path d="M35 ${ey} Q38 ${ey - 2} 41 ${ey}" stroke="#1a1a1a" stroke-width="1.6" fill="none"/>`,
  }[f.eyes || 'round'];
  s += eye;
  // 鼻・口
  s += `<path d="M32 30 L31 35 L33 35" fill="none" stroke="rgba(90,50,30,.55)" stroke-width="1.1"/>`;
  if (f.grin) s += `<path d="M27 38 Q32 42.5 37 38 Z" fill="#7a2a20"/><path d="M28 38 L36 38" stroke="#fff" stroke-width="1"/>`;
  else s += `<path d="M28.5 39 Q32 ${f.lips ? 40.5 : 39.8} 35.5 39" stroke="${f.lips ? '#c0392b' : '#7a3a2a'}" stroke-width="${f.lips ? 1.8 : 1.3}" fill="none"/>`;
  if (f.beard === 'thin') s += `<path d="M26 37 Q29 35.5 31.5 36.5 M32.5 36.5 Q35 35.5 38 37" stroke="${hc}" stroke-width="1.4" fill="none"/>`;
  if (f.beard === 'full' || f.beard === 'white') s += `<path d="M${32 - fw + 1} 33 C${32 - fw + 2} 44 28 47 32 48 C36 47 ${32 + fw - 2} 44 ${32 + fw - 1} 33 C40 40 24 40 ${32 - fw + 1} 33 Z" fill="${f.beard === 'white' ? '#d8d8d8' : hc}"/><path d="M27 39 Q32 41.5 37 39" stroke="#7a3a2a" stroke-width="1.3" fill="none"/>`;
  if (f.beard === 'stubble') s += `<path d="M${32 - fw + 2} 35 C26 44 38 44 ${32 + fw - 2} 35" fill="none" stroke="${hc}" stroke-width="2.5" stroke-dasharray="1 1.5" opacity=".7"/>`;
  if (f.scar) s += `<path d="M37 22 L41 33" stroke="#9a3a2a" stroke-width="1.3"/>`;
  // 頬
  s += `<ellipse cx="23.5" cy="33.5" rx="2.5" ry="1.4" fill="#e07a6a" opacity=".22"/><ellipse cx="40.5" cy="33.5" rx="2.5" ry="1.4" fill="#e07a6a" opacity=".22"/>`;
  s += '</svg>';
  return s;
}

// 文中の話し手から顔を探す
function speakerFace(text, title) {
  const plain = String(text || '').replace(/<[^>]+>/g, '');
  const names = [];
  if (typeof PEOPLE !== 'undefined') PEOPLE.forEach((p) => names.push([p.name, p.id]));
  if (typeof GENERALS !== 'undefined') Object.keys(GENERALS).forEach((k) => names.push([GENERALS[k].name, k]));
  names.push(['信長', 'nobunaga'], ['豪商', 'merchant'], ['町人', 'townsman'], ['野盗', 'bandit'], ['侍', 'samurai'], ['重臣', 'samurai']);
  let best = null;
  names.forEach(([n, id]) => {
    const i = plain.indexOf(n + '「');
    if (i >= 0 && (best === null || i < best.i)) best = { i, id };
  });
  if (best) return best.id;
  const t = names.find(([n]) => title === n);
  return t ? t[1] : null;
}

// ---------- 合戦の描画 ----------
const SOLDIER = [
  '..hhhh..',
  '.hhhhhh.',
  'hhhhhhhh',
  '..ssss..',
  '..cccc..',
  '.cccccc.',
  's.cddc.s',
  '..cccc..',
  '..c..c..',
  '..d..d..',
];
function BattleView(canvas, o) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const st = { me: 36, en: 36, fx: [], off: { me: 0, en: 0 }, shake: { me: 0, en: 0 }, shout: null, alive: true };
  const MAXS = 36;
  const palMe = { h: '#2a2a2a', s: '#f0c49a', c: o.myColor, d: '#3a2618' };
  const palEn = { h: '#2a2a2a', s: '#e8b98a', c: o.enColor, d: '#3a2618' };
  function pos(side, i) {
    const col = Math.floor(i / 6), row = i % 6;
    const baseX = side === 'me' ? 250 - col * 30 : W - 280 + col * 30;
    return [baseX + (row % 2) * 10, 84 + row * 26];
  }
  function drawArmy(side, n, now) {
    const pal = side === 'me' ? palMe : palEn;
    const flip = side === 'en';
    const off = st.off[side] * (side === 'me' ? 1 : -1);
    const sh = st.shake[side] > now ? Math.sin(now / 20) * 3 : 0;
    // 幟
    for (let k = 0; k < 4; k++) {
      const bx = side === 'me' ? 60 + k * 44 : W - 70 - k * 44;
      const wave = Math.sin(now / 300 + k) * 3 + (st.shout && st.shout.side === side && st.shout.until > now ? Math.sin(now / 60) * 6 : 0);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(bx, 40, 3, 130);
      ctx.fillStyle = pal.c; ctx.fillRect(bx + 3, 42 + wave * 0.3, 16 + wave * 0.3, 54);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(bx + 11, 62, 5, 0, 7); ctx.fill();
    }
    for (let i = 0; i < n; i++) {
      const [x, y] = pos(side, i);
      const bob = Math.sin(now / 180 + i) * 1.2;
      drawPix(ctx, SOLDIER, x + off + sh, y + bob, 3, pal, flip);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (!flip) { ctx.moveTo(x + off + sh + 22, y + bob + 20); ctx.lineTo(x + off + sh + 40, y + bob - 6); }
      else { ctx.moveTo(x + off + sh + 2, y + bob + 20); ctx.lineTo(x + off + sh - 16, y + bob - 6); }
      ctx.stroke();
      ctx.fillStyle = '#ccc'; ctx.fillRect(flip ? x + off + sh - 18 : x + off + sh + 38, y + bob - 9, 3, 4);
    }
  }
  function frame(now) {
    if (!st.alive || !canvas.isConnected) return;
    // 空と山
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (o.mode === 'rain') { sky.addColorStop(0, '#5a6670'); sky.addColorStop(1, '#8a9690'); }
    else { sky.addColorStop(0, '#9fc4d8'); sky.addColorStop(0.55, '#e7dcc0'); sky.addColorStop(1, '#e7dcc0'); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = o.mode === 'rain' ? '#4e5a52' : '#7d9a86';
    ctx.beginPath(); ctx.moveTo(0, 90); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 70 + Math.sin(x / 70) * 22); ctx.lineTo(W, 120); ctx.lineTo(0, 120); ctx.fill();
    ctx.fillStyle = o.mode === 'rain' ? '#57714a' : '#7fa354'; ctx.fillRect(0, 110, W, H - 110);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 83) % W, 120 + (i * 37) % (H - 130), 10, 2);
    // 馬防柵
    if (o.mode === 'guns') {
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 4;
      for (let y = 80; y < 250; y += 18) { ctx.beginPath(); ctx.moveTo(318, y); ctx.lineTo(330, y + 18); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(320, 100); ctx.lineTo(330, 240); ctx.stroke();
    }
    drawArmy('me', st.me, now);
    drawArmy('en', st.en, now);
    // 効果
    st.fx = st.fx.filter((f) => now < f.t1);
    st.fx.forEach((f) => {
      const p = clampN((now - f.t0) / (f.t1 - f.t0), 0, 1);
      if (p <= 0) return;
      if (f.k === 'arrow') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p - Math.sin(p * Math.PI) * f.arc;
        ctx.strokeStyle = f.gun ? '#ffd34d' : '#3a2618'; ctx.lineWidth = f.gun ? 2 : 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sign(f.x1 - f.x0) * (f.gun ? 6 : 14), y + (f.gun ? 0 : 3)); ctx.stroke();
      } else if (f.k === 'smoke') {
        ctx.fillStyle = `rgba(230,230,230,${0.7 * (1 - p)})`; ctx.beginPath(); ctx.arc(f.x + p * 20, f.y - p * 14, 8 + p * 14, 0, 7); ctx.fill();
      } else if (f.k === 'fire') {
        ctx.fillStyle = `rgba(255,${120 + Math.random() * 100 | 0},40,${0.8 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(f.x + Math.sin(now / 50 + f.x) * 5, f.y - p * 40, 6 + Math.random() * 8, 0, 7); ctx.fill();
      } else if (f.k === 'text') {
        ctx.font = 'bold 30px "Shippori Mincho", serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = f.color || '#ffd34d';
        ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) * 5;
        ctx.strokeText(f.text, f.x, f.y - p * 18); ctx.fillText(f.text, f.x, f.y - p * 18);
        ctx.globalAlpha = 1;
      }
    });
    // 突撃の動き
    ['me', 'en'].forEach((s) => {
      const a = st.anim && st.anim[s];
      if (a && now < a.t1) { const p = (now - a.t0) / (a.t1 - a.t0); st.off[s] = p > 0 ? Math.sin(p * Math.PI) * a.dist : 0; } else st.off[s] = 0;
    });
    if (o.mode === 'rain') {
      ctx.strokeStyle = 'rgba(220,230,240,.55)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 90; i++) { const x = (i * 47 + now * 0.5) % W, y = (i * 29 + now * 0.9) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); ctx.stroke(); }
    }
    requestAnimationFrame(frame);
  }
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const center = (s) => [s === 'me' ? 200 : W - 200, 150];
  const api = {
    set(meRatio, enRatio) {
      st.me = meRatio > 0 ? Math.max(1, Math.ceil(meRatio * MAXS)) : 0;
      st.en = enRatio > 0 ? Math.max(1, Math.ceil(enRatio * MAXS)) : 0;
    },
    fx(kind, side, delay) {
      const t = performance.now() + (delay || 0);
      const other = side === 'me' ? 'en' : 'me';
      const [ox] = center(other);
      if (kind === 'charge') {
        st.anim = st.anim || {}; st.anim[side] = { t0: t, t1: t + 600, dist: 150 };
        st.shake[other] = t + 700;
        st.fx.push({ k: 'text', text: side === 'me' ? 'かかれーっ！' : '敵の突撃！', x: center(side)[0], y: 50, t0: t, t1: t + 900, color: side === 'me' ? '#ffd34d' : '#ff8a80' });
      } else if (kind === 'shoot' || kind === 'gun') {
        const gun = kind === 'gun';
        for (let i = 0; i < (gun ? 16 : 12); i++) {
          const [x0, y0] = pos(side, i % 36);
          const d = i * 30;
          st.fx.push({ k: 'arrow', gun, x0: x0 + 10, y0: y0 + 10, x1: ox + (Math.random() - 0.5) * 120, y1: 100 + Math.random() * 140, arc: gun ? 4 : 60, t0: t + d, t1: t + d + (gun ? 260 : 650) });
          if (gun) st.fx.push({ k: 'smoke', x: x0 + 28, y: y0 + 4, t0: t + d, t1: t + d + 900 });
        }
        st.shake[other] = t + 900;
      } else if (kind === 'scheme') {
        for (let i = 0; i < 26; i++) st.fx.push({ k: 'fire', x: ox - 80 + Math.random() * 160, y: 110 + Math.random() * 120, t0: t + i * 25, t1: t + 900 + i * 25 });
        st.fx.push({ k: 'text', text: '火計！', x: ox, y: 60, t0: t, t1: t + 1000, color: '#ff8a50' });
        st.shake[other] = t + 900;
      } else if (kind === 'cheer') {
        st.shout = { side, until: t + 900 };
        st.fx.push({ k: 'text', text: 'えい、えい、おう！', x: center(side)[0], y: 50, t0: t, t1: t + 1100 });
      } else if (kind === 'fail') {
        st.fx.push({ k: 'text', text: '見破られた…', x: ox, y: 60, t0: t, t1: t + 1000, color: '#ccc' });
      } else if (kind === 'trick') {
        st.fx.push({ k: 'text', text: '敵の計略！', x: center(other)[0], y: 60, t0: t, t1: t + 1000, color: '#ff8a80' });
        st.shake[other] = t + 600;
      }
    },
    stop() { st.alive = false; },
  };
  requestAnimationFrame(frame);
  return api;
}

// ---------- タイトル画面の絵 ----------
function titleScene(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  function frame(now) {
    if (!canvas.isConnected) return;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b1d3a'); g.addColorStop(0.45, '#c2563a'); g.addColorStop(0.7, '#f0b45a'); g.addColorStop(1, '#f6d58f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.58, 46, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a4a'; ctx.beginPath(); ctx.moveTo(0, H * 0.7);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * 0.62 + Math.sin(x / 90) * 26 + Math.sin(x / 37) * 8);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.save(); ctx.translate(W * 0.18, H * 0.3); ctx.scale(0.95, 0.95);
    ctx.globalAlpha = 1;
    drawCastle(ctx, 0, 0, 256, 190, '#c0392b', false);
    ctx.restore();
    ctx.fillStyle = '#2a1a22'; ctx.fillRect(0, H * 0.86, W, H * 0.14);
    for (let i = 0; i < 40; i++) {
      const x = (i * 131 + now * 0.03 * (1 + i % 3)) % W, y = (i * 71 + now * 0.04 * (1 + i % 2)) % H;
      ctx.fillStyle = 'rgba(255,200,215,.85)'; ctx.fillRect(x + Math.sin(now / 400 + i) * 8, y, 5, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
