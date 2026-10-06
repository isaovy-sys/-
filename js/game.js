// ===== 戦国出世録 本体 =====
'use strict';

const SAVE_KEY = 'sengoku-shusse-save-v1';
let S = null;          // ゲーム状態
let view = null;       // 表示中の施設
const queue = [];      // イベント待ち行列

// ---------- 便利関数 ----------
const $ = (id) => document.getElementById(id);
const rnd = (n) => Math.floor(Math.random() * n);
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[rnd(arr.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ym = () => S.year * 12 + (S.month - 1);
const rank = () => RANKS[S.rank];
const town = (id) => S.towns[id || S.town];
const age = () => S.year - BIRTH_YEAR + 1;
const kanji = (n) => {
  const d = '〇一二三四五六七八九';
  if (n <= 10) return n === 10 ? '十' : d[n];
  if (n < 20) return '十' + d[n - 10];
  return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
};
const dateStr = () => `${S.year}年 ${S.month}月 ${S.day}日`;

function log(text) {
  S.log.unshift(`<span class="ld">${S.year}/${S.month}/${S.day}</span> ${text}`);
  if (S.log.length > 60) S.log.pop();
}

function person(id) { return PEOPLE.find((p) => p.id === id); }
const pTown = (p) => (S.ptown && S.ptown[p.id]) || p.town;

// ---------- ダイアログ ----------
function dialog(title, html, choices) {
  const m = $('modal');
  m.innerHTML = `<div class="box"><h2>${title}</h2><div class="dtext">${html}</div><div class="choices"></div></div>`;
  const c = m.querySelector('.choices');
  (choices && choices.length ? choices : [{ label: '了解', fn: null }]).forEach((ch) => {
    const b = document.createElement('button');
    b.textContent = ch.label;
    if (ch.disabled) b.disabled = true;
    if (ch.cls) b.className = ch.cls;
    b.onclick = () => { closeModal(); if (ch.fn) ch.fn(); else processQueue(); };
    c.appendChild(b);
  });
  m.classList.add('show');
}
function msg(title, html, next) {
  dialog(title, html, [{ label: '了解', fn: () => { if (next) next(); else processQueue(); } }]);
}
function closeModal() { $('modal').classList.remove('show'); $('modal').innerHTML = ''; }

function processQueue() {
  if (queue.length) {
    const fn = queue.shift();
    fn(processQueue);
  } else {
    render();
  }
}

// ---------- 新規・セーブ ----------
function newGame(name) {
  const towns = JSON.parse(JSON.stringify(TOWNS_INIT));
  Object.values(towns).forEach((t) => { t.base = t.rice; });
  const rel = {};
  const ptown = {};
  PEOPLE.forEach((p) => { rel[p.id] = p.rel; ptown[p.id] = p.town; });
  S = {
    name: name || '木下藤吉郎',
    year: START_YEAR, month: 1, day: 1, t: 0,
    stats: { tou: 35, bu: 30, chi: 55, sei: 50, mi: 65 },
    skills: { ken: 0, yumi: 0, teppo: 0, uma: 0, ben: 1, san: 1, cha: 0, shino: 0 },
    exp: { ken: 0, yumi: 0, teppo: 0, uma: 0, ben: 0, san: 0, cha: 0, shino: 0 },
    hp: 100, maxhp: 100, gold: 40, kou: 0, rank: 0, trust: 20,
    town: 'kiyosu', capital: 'kiyosu', castle: null,
    towns, inv: { medicine: 1 }, owned: {}, rice: 0,
    rel, ptown, retainers: [], wife: null,
    mission: null, lastHyojo: -1, flags: {}, log: [], ended: false,
  };
  view = null;
  log('織田家に足軽として仕官した。');
  queue.push((done) => msg('仕官',
    `天文二十三年（${START_YEAR}年）正月。<br><br>
    尾張・清洲城下。<br>
    針売りから身を起こした男、<b>${esc(S.name)}</b>は、織田上総介信長に足軽として仕えることになった。<br><br>
    今はしがない足軽にすぎぬ。だが、この男の胸には大きな志があった――。<br><br>
    <span class="hint">【遊び方】城の「評定」で任務を受け、果たして勲功を積もう。勲功がたまると評定で昇進できる。<br>
    道場や寺で腕を磨き、茶屋で人と縁を結び、天下を目指せ。</span>`, done));
  processQueue();
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    msg('記録', '旅の記録を書き残した。（このブラウザに保存されました）');
  } catch (e) {
    msg('記録', '保存できませんでした。ブラウザの設定（プライベートモードなど）を確認してください。');
  }
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function load() {
  try {
    const d = localStorage.getItem(SAVE_KEY);
    if (!d) return false;
    S = JSON.parse(d);
    view = null;
    closeModal();
    render();
    return true;
  } catch (e) { return false; }
}

// ---------- 時間の経過 ----------
function advance(days, opts) {
  opts = opts || {};
  for (let i = 0; i < days; i++) {
    S.day++; S.t++;
    if (!opts.noRest) S.hp = Math.min(S.maxhp, S.hp + 1);
    if (S.day > 30) {
      S.day = 1; S.month++;
      if (S.month > 12) { S.month = 1; S.year++; }
      monthly();
    }
    if (S.mission && !S.mission.done && S.t > S.mission.deadline) {
      const m = S.mission; S.mission = null;
      const loss = Math.round(m.reward / 3);
      S.kou = Math.max(0, S.kou - loss); S.trust = Math.max(0, S.trust - 5);
      log(`任務「${m.title}」の期限が過ぎた。勲功-${loss}`);
      queue.push((done) => msg('任務失敗', `任務「${m.title}」の期限に間に合わなかった……。<br>殿の不興を買った。（勲功-${loss}・信頼-5）`, done));
    }
  }
}

function monthly() {
  // 俸禄
  const pay = rank().salary + (S.castle ? 60 : 0);
  S.gold += pay;
  // 米相場
  Object.values(S.towns).forEach((t) => {
    t.rice = clamp(Math.round(t.rice + (rnd(5) - 2) + (t.base - t.rice) * 0.3), 5, 25);
  });
  if (S.month === 9 || S.month === 10) Object.values(S.towns).forEach((t) => { t.rice = Math.max(5, t.rice - 2); });
  // 歴史イベント
  EVENTS.forEach((ev) => {
    if (S.flags[ev.id]) return;
    if (ym() < ev.y * 12 + (ev.m - 1)) return;
    if (ev.cond && !ev.cond()) return;
    S.flags[ev.id] = true;
    queue.push(ev.run);
  });
}

// ---------- 能力の成長 ----------
function gainStat(k, v) {
  const before = S.stats[k];
  S.stats[k] = clamp(S.stats[k] + v, 1, 100);
  return S.stats[k] - before;
}
function gainSkill(k, exp) {
  if (S.skills[k] >= 5) return '';
  S.exp[k] += exp;
  let up = '';
  while (S.exp[k] >= 100 && S.skills[k] < 5) {
    S.exp[k] -= 100; S.skills[k]++;
    up = `<br><b class="up">${SKILLS[k]}が ${S.skills[k]} に上がった！</b>`;
    log(`${SKILLS[k]}が${S.skills[k]}に上がった。`);
  }
  if (S.skills[k] >= 5) S.exp[k] = 0;
  return up;
}
function checkHp() {
  if (S.hp <= 0) {
    S.hp = 20;
    const lost = Math.floor(S.gold / 2);
    S.gold -= lost;
    S.town = homeTown();
    advance(10, { noRest: true });
    queue.push((done) => msg('昏倒', `深手を負い、気を失った……。<br>気がつくと自宅で寝かされていた。（10日経過・${lost}両を失った）`, done));
  }
}
function homeTown() { return S.castle || S.capital; }

// ---------- 画面描画 ----------
function render() {
  if (!S) return;
  const r = rank();
  const t = town();
  const cl = CLANS[t.owner];
  $('status').innerHTML = `
    <div class="st-name">${esc(S.name)} <small>${kanji(age())}歳</small></div>
    <div class="st-item"><span>身分</span>${r.name}</div>
    <div class="st-item"><span>日付</span>${dateStr()}</div>
    <div class="st-item"><span>所持金</span>${S.gold}両</div>
    <div class="st-item"><span>勲功</span>${S.kou}${S.rank < 6 ? `<small>/${RANKS[S.rank + 1].kou}</small>` : ''}</div>
    <div class="st-item"><span>体力</span><span class="bar"><i style="width:${S.hp / S.maxhp * 100}%"></i></span>${S.hp}</div>`;

  // 施設
  const facs = facilities();
  let html = `<div class="town-head" style="border-color:${cl.color}">
      <div><span class="prov">${t.prov}</span> <b class="tname">${t.name}</b></div>
      <div class="owner" style="background:${cl.color}">${cl.name}</div></div>`;
  const ma = missionActionHere();
  html += '<div class="facs">';
  if (ma) html += `<button class="fac mission" data-act="mission">⚑ ${ma}</button>`;
  facs.forEach((f) => {
    html += `<button class="fac ${view === f.id ? 'on' : ''}" data-fac="${f.id}">${f.icon} ${f.name}</button>`;
  });
  html += `<button class="fac travel" data-act="travel">🗾 旅立つ</button></div>`;
  html += `<div id="panel">${view ? panelHtml(view) : sceneText()}</div>`;
  $('scene').innerHTML = html;

  $('scene').querySelectorAll('[data-fac]').forEach((b) => {
    b.onclick = () => { view = view === b.dataset.fac ? null : b.dataset.fac; render(); };
  });
  const mb = $('scene').querySelector('[data-act="mission"]');
  if (mb) mb.onclick = doMissionHere;
  $('scene').querySelector('[data-act="travel"]').onclick = openMap;
  $('scene').querySelectorAll('[data-do]').forEach((b) => {
    b.onclick = () => ACTIONS[b.dataset.do](b.dataset.arg);
  });
  renderSide();
}

function sceneText() {
  const t = town();
  const lines = [];
  if (S.town === S.capital) lines.push('織田家の本拠。城下は活気にあふれている。');
  else if (t.owner === 'oda') lines.push('織田家の領内の町だ。');
  else lines.push(`${CLANS[t.owner].name}の領地だ。用心して歩こう。`);
  if (S.mission && !S.mission.done) lines.push(`<br>【任務中】${S.mission.title}（${S.mission.where}）残り${Math.max(0, S.mission.deadline - S.t)}日`);
  if (S.mission && S.mission.done) lines.push(`<br>【任務達成】城へ戻って報告しよう。`);
  if (!S.mission && S.lastHyojo !== ym()) lines.push('<br>今月の評定はまだだ。城へ行こう。');
  return `<p class="flavor">${lines.join('')}</p><p class="hint">上の施設を選んでください。</p>`;
}

function facilities() {
  const t = town();
  const f = [];
  if (t.owner === 'oda' && (S.town === S.capital || S.town === S.castle)) f.push({ id: 'castle', name: S.town === S.capital ? '城' : '自城', icon: '🏯' });
  if (S.town === homeTown()) f.push({ id: 'home', name: '屋敷', icon: '🏠' });
  f.push({ id: 'market', name: '市', icon: '🏪' });
  f.push({ id: 'tea', name: '茶屋', icon: '🍵' });
  f.push({ id: 'dojo', name: '道場', icon: '🥋' });
  f.push({ id: 'temple', name: '寺', icon: '⛩' });
  return f;
}

function btn(label, act, arg, disabled, cls) {
  return `<button class="act ${cls || ''}" data-do="${act}" data-arg="${arg === undefined ? '' : esc(arg)}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function panelHtml(id) {
  const t = town();
  let h = '';
  if (id === 'castle') {
    if (S.town === S.capital) {
      h += '<h3>🏯 城</h3><p class="flavor">広間には家臣たちが居並んでいる。</p>';
      const can = S.lastHyojo !== ym();
      h += btn(`評定に出る${can ? '' : '（今月は済）'}`, 'hyojo', '', !can);
      if (S.mission && S.mission.done) h += btn('任務の報告', 'report', '', false, 'hl');
      h += btn('殿に献上する（茶器）', 'present', '', !S.inv.tea);
      h += `<p class="small">殿の信頼：${S.trust}</p>`;
    }
    if (S.town === S.castle) {
      h += `<h3>🏯 ${t.name}城（自城）</h3>`;
      h += btn('城下の内政（5日）', 'govern');
      h += btn('兵の調練（5日）', 'drill');
    }
  } else if (id === 'home') {
    h += '<h3>🏠 屋敷</h3>';
    if (S.wife) h += `<p class="flavor">${person(S.wife).name}「おかえりなさいませ。」</p>`;
    h += btn('休む（3日・体力全快）', 'rest');
    if (S.wife) h += btn('妻と語らう（1日）', 'wifeTalk');
    h += btn('記録する（セーブ）', 'save');
    h += btn('記録を読む（ロード）', 'load', '', !hasSave());
  } else if (id === 'market') {
    h += `<h3>🏪 市</h3><p class="small">米相場：1俵 <b>${t.rice}両</b>（売値 ${Math.floor(t.rice * 0.9)}両）　手持ち米：${S.rice}俵</p>`;
    h += btn('米を1俵買う', 'buyRice', 1, S.gold < t.rice);
    h += btn('米を10俵買う', 'buyRice', 10, S.gold < t.rice * 10);
    h += btn('米を1俵売る', 'sellRice', 1, S.rice < 1);
    h += btn('米を全部売る', 'sellRice', S.rice, S.rice < 1);
    h += '<h4>品物</h4><div class="items">';
    shopList().forEach((k) => {
      const it = ITEMS[k];
      const owned = it.once && S.owned[k];
      h += `<div class="item"><b>${it.name}</b> ${it.price}両 <small>${it.desc}</small>
        ${btn(owned ? '所持' : '買う', 'buy', k, owned || S.gold < it.price)}</div>`;
    });
    h += '</div>';
  } else if (id === 'tea') {
    h += '<h3>🍵 茶屋</h3>';
    h += btn('噂を聞く（1日）', 'rumor');
    const ps = peopleHere();
    if (!ps.length) h += '<p class="small">知った顔はいないようだ。</p>';
    ps.forEach((p) => {
      const r = S.rel[p.id];
      h += `<div class="person"><div><b>${p.name}</b> <small>${p.desc}</small></div>
        <div class="relbar"><span>親密度</span><span class="bar"><i style="width:${r}%"></i></span>${r}</div><div>`;
      h += btn('話す（1日）', 'talk', p.id);
      h += btn('贈り物', 'giftMenu', p.id, !giftItems().length);
      if (p.recruit !== undefined && p.recruit !== null) h += btn('与力に誘う', 'recruit', p.id);
      if (p.wife && !S.wife) h += btn('求婚する', 'propose', p.id);
      if (p.teacher) h += btn(`${SKILLS[p.teacher]}の教えを乞う（3日）`, 'learn', p.id);
      h += '</div></div>';
    });
  } else if (id === 'dojo') {
    h += '<h3>🥋 道場</h3><p class="small">1回：5日・10両・体力-20</p>';
    DOJO_COURSES.forEach((c, i) => {
      if (c.minYear && S.year < c.minYear) return;
      if (c.towns && !c.towns.includes(S.town)) return;
      h += btn(`${c.label}（${SKILLS[c.skill]} ${S.skills[c.skill]}）`, 'train', 'd' + i, S.gold < 10 || S.hp < 25);
    });
  } else if (id === 'temple') {
    h += '<h3>⛩ 寺</h3><p class="small">1回：5日・10両（お布施）・体力-10</p>';
    TEMPLE_COURSES.forEach((c, i) => {
      const lv = c.skill ? `${SKILLS[c.skill]} ${S.skills[c.skill]}` : `${STAT_NAMES[c.stat]} ${S.stats[c.stat]}`;
      h += btn(`${c.label}（${lv}）`, 'train', 't' + i, S.gold < 10 || S.hp < 15);
    });
    h += btn('参拝する（1日・体力+10）', 'pray');
  }
  return h;
}

function shopList() {
  const l = SHOP_DEFAULT.slice();
  Object.keys(ITEMS).forEach((k) => { if (ITEMS[k].towns && ITEMS[k].towns.includes(S.town)) l.push(k); });
  return l;
}
function giftItems() { return Object.keys(S.inv).filter((k) => S.inv[k] > 0 && ITEMS[k].gift); }
function peopleHere() {
  return PEOPLE.filter((p) => pTown(p) === S.town && S.year >= p.from &&
    !S.retainers.includes(p.id) && S.wife !== p.id && !S.flags['gone_' + p.id]);
}

function renderSide() {
  const tab = renderSide.tab || 'stats';
  let h = `<div class="tabs">
    ${[['stats', '能力'], ['people', '人物'], ['inv', '持ち物'], ['log', '記録']].map(([k, n]) =>
      `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="tabbody">`;
  if (tab === 'stats') {
    h += '<table class="stats">';
    Object.keys(STAT_NAMES).forEach((k) => {
      h += `<tr><th>${STAT_NAMES[k]}</th><td><span class="bar"><i style="width:${S.stats[k]}%"></i></span></td><td>${S.stats[k]}</td></tr>`;
    });
    h += '</table><table class="skills">';
    Object.keys(SKILLS).forEach((k) => {
      h += `<tr><th>${SKILLS[k]}</th><td>${'★'.repeat(S.skills[k])}${'☆'.repeat(5 - S.skills[k])}</td></tr>`;
    });
    h += `</table><p class="small">率いる兵：${rank().troops}人　俸禄：${rank().salary + (S.castle ? 60 : 0)}両/月<br>殿の信頼：${S.trust}`;
    if (S.castle) h += `<br>居城：${town(S.castle).name}`;
    h += '</p>';
    if (S.mission) {
      const m = S.mission;
      h += `<div class="mbox"><b>任務：${m.title}</b><br>${m.desc}<br>場所：${m.where}<br>${m.done ? '<b class="up">達成！城で報告を</b>' : `期限：残り${Math.max(0, m.deadline - S.t)}日`}</div>`;
    }
  } else if (tab === 'people') {
    if (S.wife) h += `<p>妻：<b>${person(S.wife).name}</b></p>`;
    h += `<p>与力：${S.retainers.length ? S.retainers.map((id) => person(id).name).join('、') : 'なし'}</p><table class="skills">`;
    PEOPLE.filter((p) => S.year >= p.from && !S.flags['gone_' + p.id]).forEach((p) => {
      h += `<tr><th>${p.name}</th><td>${town(pTown(p)).name}</td><td>${S.rel[p.id]}</td></tr>`;
    });
    h += '</table>';
  } else if (tab === 'inv') {
    const ks = Object.keys(S.inv).filter((k) => S.inv[k] > 0);
    h += `<p>米：${S.rice}俵</p>`;
    if (!ks.length) h += '<p class="small">何も持っていない。</p>';
    ks.forEach((k) => {
      h += `<div class="item"><b>${ITEMS[k].name}</b> ×${S.inv[k]} ${ITEMS[k].use ? btn('使う', 'use', k) : ''}</div>`;
    });
    const os = Object.keys(S.owned);
    if (os.length) h += `<p class="small">家宝：${os.map((k) => ITEMS[k].name).join('、')}</p>`;
  } else {
    h += `<div class="log">${S.log.join('<br>')}</div>`;
  }
  h += '</div>';
  $('side').innerHTML = h;
  $('side').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { renderSide.tab = b.dataset.tab; renderSide(); }; });
  $('side').querySelectorAll('[data-do]').forEach((b) => { b.onclick = () => ACTIONS[b.dataset.do](b.dataset.arg); });
}

// ---------- 行動 ----------
const ACTIONS = {
  hyojo() {
    S.lastHyojo = ym();
    advance(1);
    // 昇進判定
    const promos = [];
    while (S.rank < RANKS.length - 1 && S.kou >= RANKS[S.rank + 1].kou) {
      S.rank++; promos.push(RANKS[S.rank].name);
    }
    const next = () => {
      if (S.mission) {
        msg('評定', `信長「${S.mission.done ? 'はよう報告せい。' : `${S.mission.title}の件、どうなっておる。抜かるでないぞ。`}」`);
        return;
      }
      const ms = genMissions();
      dialog('評定 ― 任務を選ぶ',
        `信長「${esc(S.name)}、そなたにはこれを任せる。どれをやる？」`,
        ms.map((m) => ({
          label: `${m.title}（${m.where}）勲功+${m.reward}`,
          fn: () => {
            m.deadline = S.t + m.days;
            S.mission = m;
            log(`任務「${m.title}」を拝命した。`);
            msg('拝命', `<b>${m.title}</b><br>${m.desc}<br><br>場所：${m.where}<br>期限：${m.days}日以内`);
          },
        })).concat([{ label: '今回は辞退する', fn: () => msg('評定', '信長「……で、あるか。」（信頼-2）', () => { S.trust = Math.max(0, S.trust - 2); processQueue(); }) }]));
    };
    if (promos.length) {
      const pr = promos[promos.length - 1];
      let extra = '';
      if (S.rank >= 5 && !S.castle) {
        S.castle = town('odani').owner === 'oda' ? 'odani' : S.capital;
        extra = `<br>${town(S.castle).name}に城を与えられた！`;
      }
      log(`${pr}に昇進した！`);
      msg('昇進', `信長「${esc(S.name)}、その働き見事である。今日より<b>${pr}</b>に取り立てる。」<br><br>
        率いる兵が${rank().troops}人になった。俸禄は${rank().salary}両/月。${extra}`, next);
    } else next();
  },
  report() {
    const m = S.mission;
    S.mission = null;
    S.kou += m.reward;
    S.trust = clamp(S.trust + 3, 0, 100);
    let pay = '';
    if (m.type === 'supply') { const g = m.need * 13; S.gold += g; pay = `<br>兵糧代として${g}両を下された。`; }
    log(`任務「${m.title}」を報告。勲功+${m.reward}`);
    msg('報告', `信長「で、あるか。大儀であった。」<br><br>勲功+${m.reward}（合計${S.kou}）${pay}
      ${S.rank < 6 && S.kou >= RANKS[S.rank + 1].kou ? '<br><span class="hint">次の評定で昇進できそうだ！</span>' : ''}`);
  },
  present() {
    S.inv.tea--;
    const up = 5 + Math.floor(S.skills.cha * 2);
    S.trust = clamp(S.trust + up, 0, 100);
    S.kou += 5;
    msg('献上', `茶器を献上した。<br>信長「ほう、良い品じゃ。」<br>（信頼+${up}・勲功+5）`);
  },
  govern() {
    advance(5);
    const g = 40 + Math.round(S.stats.sei * 1.5 + S.skills.san * 15);
    S.gold += g; S.kou += 5;
    const up = chance(0.4) ? gainStat('sei', 1) : 0;
    msg('内政', `城下の町割りや検地に励んだ。<br>年貢が${g}両入った。勲功+5${up ? '<br>政治が上がった！' : ''}`);
  },
  drill() {
    advance(5);
    const up = gainStat('tou', 1 + rnd(2));
    msg('調練', `兵を鍛えた。<br>統率+${up}`);
  },
  rest() {
    advance(3);
    S.hp = S.maxhp;
    msg('休息', 'ゆっくり休んだ。体力が全快した。');
  },
  wifeTalk() {
    advance(1);
    const w = person(S.wife);
    S.hp = Math.min(S.maxhp, S.hp + 20);
    const lines = ['「無理はなさらないでくださいね。」', '「あなたなら、きっと大きなお方になれますよ。」', '「たまには家でゆっくりしてくださいな。」', '「みなさまに配るお菓子を用意しておきました。」'];
    let extra = '';
    if (chance(0.3)) { gainStat('mi', 1); extra = '<br>魅力が上がった！'; }
    msg('語らい', `${w.name}${pick(lines)}<br><br>心が安らいだ。（体力+20）${extra}`);
  },
  save() { save(); },
  load() { if (!load()) msg('記録', '記録が見つからない。'); },
  buyRice(n) {
    n = +n; const p = town().rice * n;
    if (S.gold < p) return;
    S.gold -= p; S.rice += n; render();
  },
  sellRice(n) {
    n = +n; if (S.rice < n || n < 1) return;
    S.gold += Math.floor(town().rice * 0.9) * n; S.rice -= n; render();
  },
  buy(k) {
    const it = ITEMS[k];
    if (S.gold < it.price) return;
    S.gold -= it.price;
    if (it.once) {
      S.owned[k] = true;
      let e = '';
      if (k === 'sword') { gainStat('bu', 6); e = '武力+6'; }
      if (k === 'book') { gainStat('tou', 4); gainStat('chi', 2); e = '統率+4・知略+2'; }
      if (k === 'horse') e = '旅が速くなった';
      if (k === 'gun') { S.skills.teppo = Math.min(5, S.skills.teppo + 1); e = '鉄砲+1'; }
      msg('購入', `${it.name}を手に入れた！（${e}）`);
    } else {
      S.inv[k] = (S.inv[k] || 0) + 1;
      render();
    }
  },
  use(k) {
    if (k === 'medicine' && S.inv.medicine > 0) {
      S.inv.medicine--; S.hp = Math.min(S.maxhp, S.hp + 50);
      render();
    }
  },
  rumor() {
    advance(1);
    const rs = RUMORS.filter((r) => S.year < r.until);
    msg('噂', `町人「${pick(rs).text}」`);
  },
  talk(id) {
    advance(1);
    const p = person(id);
    const up = 3 + rnd(4) + Math.floor(S.stats.mi / 25) + S.skills.ben;
    S.rel[id] = clamp(S.rel[id] + up, 0, 100);
    let extra = '';
    if (chance(0.15)) { gainStat('mi', 1); extra = '<br>魅力が上がった！'; }
    msg(p.name, `${p.name}${pick(p.talk)}<br><br>親密度+${up}（${S.rel[id]}）${extra}`);
  },
  giftMenu(id) {
    const p = person(id);
    dialog('贈り物', `${p.name}に何を贈る？`, giftItems().map((k) => ({
      label: `${ITEMS[k].name}（${S.inv[k]}）`,
      fn: () => {
        S.inv[k]--;
        let up = ITEMS[k].gift + Math.floor(S.skills.cha * 1.5);
        let t = '「これはかたじけない。」';
        if (p.likes === k) { up = Math.round(up * 1.8); t = '「おお！これは好物じゃ！」'; }
        S.rel[id] = clamp(S.rel[id] + up, 0, 100);
        msg(p.name, `${p.name}${t}<br>親密度+${up}（${S.rel[id]}）`);
      },
    })).concat([{ label: 'やめる', fn: null }]));
  },
  recruit(id) {
    const p = person(id);
    if (S.rank < p.recruit) return msg(p.name, `${p.name}「今のお主の身分では、ついて行く気にはなれぬな。」<br><span class="hint">（${RANKS[p.recruit].name}以上が必要）</span>`);
    if (S.rel[id] < 70) return msg(p.name, `${p.name}「まだお主のことをよく知らぬ。」<br><span class="hint">（親密度70以上が必要）</span>`);
    if (town().owner !== 'oda' && S.rel[id] < 90) {
      // 敵方の人物は論戦で口説き落とす
      return startDuel({
        title: `${p.name}を説得`, kind: 'debate', opp: { name: p.name, stat: 70, skill: 3 },
      }, (win) => {
        if (win) { joinRetainer(id); } else { S.rel[id] = clamp(S.rel[id] - 5, 0, 100); msg(p.name, `${p.name}「……その話は、またにしてくだされ。」`); }
      });
    }
    joinRetainer(id);
  },
  propose(id) {
    const p = person(id);
    advance(1);
    if (S.rel[id] >= 70 && S.rank >= 1) {
      S.wife = id;
      gainStat('mi', 3);
      log(`${p.name}と祝言を挙げた。`);
      msg('祝言', `${p.name}「……はい。末永く、よろしくお願いいたします。」<br><br>ささやかながら祝言を挙げた。<br>（魅力+3・屋敷で妻と語らえるようになった）`);
    } else {
      S.rel[id] = clamp(S.rel[id] - 3, 0, 100);
      msg(p.name, `${p.name}「まあ……。そういうお話は、もう少し立派になられてから。」<br><span class="hint">（親密度70以上・足軽組頭以上が必要）</span>`);
    }
  },
  learn(id) {
    const p = person(id);
    if (S.rel[id] < 40) return msg(p.name, `${p.name}「見ず知らずの方に教えることはありませぬ。」<br><span class="hint">（親密度40以上が必要）</span>`);
    if (S.gold < 20) return msg(p.name, '謝礼の20両が足りない。');
    S.gold -= 20;
    advance(3);
    const up = gainSkill(p.teacher, 45 + rnd(20));
    if (p.teacher === 'cha') gainStat('sei', 1);
    if (p.teacher === 'ken') gainStat('bu', 2);
    msg(p.name, `${p.name}から${SKILLS[p.teacher]}の手ほどきを受けた。${up}`);
  },
  train(arg) {
    const c = arg[0] === 'd' ? DOJO_COURSES[+arg.slice(1)] : TEMPLE_COURSES[+arg.slice(1)];
    S.gold -= 10;
    S.hp -= arg[0] === 'd' ? 20 : 10;
    advance(5, { noRest: true });
    let r = '';
    if (c.skill) r += gainSkill(c.skill, 25 + rnd(20) + Math.floor(S.stats[c.stat] / 10));
    const st = gainStat(c.stat, c.skill ? (chance(0.5) ? 1 : 0) : 1 + rnd(2));
    if (st) r += `<br>${STAT_NAMES[c.stat]}+${st}`;
    msg('修行', `${c.label}に励んだ。${r || '<br>手応えはいまひとつだった。'}`);
  },
  pray() {
    advance(1);
    S.hp = Math.min(S.maxhp, S.hp + 10);
    if (chance(0.2)) { gainStat('chi', 1); msg('参拝', '心が澄み渡った。（体力+10・知略+1）'); } else msg('参拝', '手を合わせた。（体力+10）');
  },
};

function joinRetainer(id) {
  const p = person(id);
  S.retainers.push(id);
  log(`${p.name}が与力になった。`);
  const eff = { build: '普請が捗る', scheme: '合戦で策略が冴える', attack: '合戦で攻撃力が上がる', supply: '合戦で士気が上がる' }[p.bonus.type];
  msg('与力', `${p.name}「よかろう。お主の行く末、見届けさせてもらう。」<br><br>${p.name}が与力になった！<br>（効果：${eff}）`);
}

// ---------- 任務 ----------
function genMissions() {
  const r = S.rank;
  const mul = 1 + r * 0.35;
  const enemyTowns = Object.keys(S.towns).filter((k) => S.towns[k].owner !== 'oda' && !S.towns[k].hidden && S.towns[k].owner !== 'matsudaira');
  const odaTowns = Object.keys(S.towns).filter((k) => S.towns[k].owner === 'oda' && !S.towns[k].hidden);
  const pool = [];
  const cap = town(S.capital).name;
  pool.push({ type: 'build', title: '城の普請', desc: '城の石垣・塀を修繕せよ。', town: S.capital, reward: Math.round(15 * mul), days: 40 });
  const need = 5 + r * 5;
  pool.push({ type: 'supply', title: '兵糧の調達', desc: `米${need}俵を城へ納めよ。（代金は後で下される）`, town: S.capital, need, reward: Math.round(15 * mul), days: 50 });
  if (enemyTowns.length) {
    const tg = pick(enemyTowns);
    pool.push({ type: 'scout', title: '敵情偵察', desc: `${town(tg).name}へ赴き、茶屋で敵の様子を探れ。`, town: tg, reward: Math.round(22 * mul), days: 60 });
  }
  if (r >= 1) {
    const tg = pick(odaTowns);
    pool.push({ type: 'bandit', title: '野盗討伐', desc: `${town(tg).name}付近を荒らす野盗を討て。`, town: tg, reward: Math.round(28 * mul), days: 50 });
    const mt = pick(['sakai', 'kyoto', 'kiyosu']);
    pool.push({ type: 'trade', title: '商人との交渉', desc: `${town(mt).name}の豪商から矢銭（軍資金）を引き出せ。`, town: mt, reward: Math.round(25 * mul), days: 60 });
  }
  if (r >= 2 && enemyTowns.length) {
    const tg = pick(enemyTowns);
    pool.push({ type: 'plot', title: '調略', desc: `${town(tg).name}の敵将を寝返らせよ。`, town: tg, reward: Math.round(45 * mul), days: 70 });
  }
  // 3つ選ぶ
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(rnd(pool.length), 1)[0]);
  out.forEach((m) => { m.where = town(m.town).name; });
  return out;
}

function missionActionHere() {
  const m = S.mission;
  if (!m || m.done || m.town !== S.town) return null;
  return {
    build: '普請を指揮する', supply: `米を納める（${S.rice}/${m.need}俵）`, scout: '敵情を探る',
    bandit: '野盗を討つ', trade: '豪商と交渉する', plot: '敵将を調略する',
  }[m.type];
}

function missionDone() {
  S.mission.done = true;
  log(`任務「${S.mission.title}」を果たした。`);
}

function doMissionHere() {
  const m = S.mission;
  if (m.type === 'build') {
    if (S.hp < 20) return msg('普請', '体力が足りない。休んでからにしよう。');
    startBuild({ title: '城の普請', rounds: 6 }, (ok) => {
      if (ok) { missionDone(); msg('普請完了', '見事に普請をやり遂げた！<br>城へ報告しよう。'); }
      else msg('普請', '期日内に終わらなかった……。また挑戦しよう。');
    });
  } else if (m.type === 'supply') {
    if (S.rice < m.need) return msg('兵糧', `米が${m.need - S.rice}俵足りない。市で買ってこよう。`);
    S.rice -= m.need;
    missionDone();
    msg('兵糧', `米${m.need}俵を蔵に納めた。<br>城で報告しよう。`);
  } else if (m.type === 'scout') {
    advance(2);
    const p = 0.4 + S.stats.chi / 200 + S.skills.shino * 0.08;
    if (chance(p)) {
      missionDone();
      gainStat('chi', 1);
      msg('偵察', `町人に紛れて兵の数や城の備えを探り出した！<br>${town(S.capital).name}へ戻って報告しよう。（知略+1）`);
    } else if (chance(0.4)) {
      dialog('見つかった！', '「怪しい奴め！何者じゃ！」<br>敵の侍に見咎められた！', [
        { label: '斬り抜ける', fn: () => startDuel({ title: '一騎討ち', kind: 'sword', opp: { name: `${CLANS[town().owner].name}の侍`, stat: 40 + S.rank * 6, skill: 1 + Math.floor(S.rank / 2) } }, (w) => {
          if (w) msg('偵察', '敵を退けた。今日はこれ以上は探れない。'); else { S.hp -= 30; checkHp(); msg('偵察', '手傷を負って逃げ帰った……。（体力-30）'); }
        }) },
        { label: '言い逃れる', fn: () => startDuel({ title: '言い逃れ', kind: 'debate', opp: { name: `${CLANS[town().owner].name}の侍`, stat: 40, skill: 1 } }, (w) => {
          if (w) msg('偵察', '「なんだ、ただの商人か。」なんとかごまかせた。'); else { S.gold = Math.floor(S.gold * 0.8); msg('偵察', '袖の下を渡して見逃してもらった……。（所持金の2割を失った）'); }
        }) },
      ]);
    } else msg('偵察', '有益な話は聞けなかった……。（2日経過）');
  } else if (m.type === 'bandit') {
    startBattle({ title: '野盗討伐', enemy: 'bandit', ratio: 0.8 }, (win) => {
      if (win) { missionDone(); msg('討伐', '野盗を蹴散らした！城へ報告しよう。'); } else msg('討伐', '野盗に敗れた……。態勢を立て直そう。');
    });
  } else if (m.type === 'trade') {
    startDuel({ title: '豪商と交渉', kind: 'debate', opp: { name: '豪商', stat: 55 + S.rank * 5, skill: 2 + Math.floor(S.rank / 2) } }, (win) => {
      advance(1);
      if (win) { missionDone(); gainSkill('ben', 15); msg('交渉成立', '豪商「……参りました。お引き受けしましょう。」<br>矢銭を出させることに成功した！城へ報告しよう。'); } else msg('交渉決裂', '豪商「お話になりませんな。」<br>また出直そう。');
    });
  } else if (m.type === 'plot') {
    const g = `${CLANS[town().owner].name}の重臣`;
    startDuel({ title: '調略', kind: 'debate', opp: { name: g, stat: 65 + S.rank * 4, skill: 3 } }, (win) => {
      advance(2);
      if (win) { missionDone(); gainSkill('ben', 20); msg('調略成功', `${g}「……織田殿にお味方いたそう。」<br>寝返りの約束を取り付けた！`); } else msg('調略失敗', `${g}「帰られよ。」<br>また機会を待とう。`);
    });
  }
}

// ---------- 旅 ----------
function travelDays(a, b) {
  const A = S.towns[a], B = S.towns[b];
  const d = Math.hypot(A.x - B.x, A.y - B.y);
  let days = Math.max(1, Math.round(d / 22));
  if (S.owned.horse) days = Math.max(1, Math.round(days * 0.6));
  days = Math.max(1, Math.round(days * (1 - S.skills.uma * 0.06)));
  return days;
}

function openMap() {
  const m = $('modal');
  let svg = `<svg viewBox="40 20 500 320" class="map">
    <path d="M60,250 C90,215 140,230 180,225 C200,200 240,175 270,160 C300,150 330,150 360,120 C390,90 410,40 450,25 L520,60 C500,110 495,160 510,220 C520,260 515,300 500,320 C460,325 430,320 400,315 C370,320 330,300 300,290 C260,300 230,310 200,325 C170,330 150,300 120,290 C90,285 70,280 60,250 Z" class="land"/>`;
  const ids = Object.keys(S.towns).filter((k) => !S.towns[k].hidden);
  ids.forEach((k) => {
    const t = S.towns[k];
    const c = CLANS[t.owner].color;
    const here = k === S.town;
    svg += `<g class="tw ${here ? 'here' : ''}" data-t="${k}">
      <circle cx="${t.x}" cy="${t.y}" r="${here ? 9 : 7}" fill="${c}" />
      <text x="${t.x}" y="${t.y - 12}">${t.name}</text>
      ${here ? '' : `<text class="days" x="${t.x}" y="${t.y + 20}">${travelDays(S.town, k)}日</text>`}</g>`;
  });
  svg += '</svg>';
  const legend = [...new Set(ids.map((k) => S.towns[k].owner))].map((o) => `<span><i style="background:${CLANS[o].color}"></i>${CLANS[o].name}</span>`).join('');
  m.innerHTML = `<div class="box wide"><h2>どこへ向かう？</h2>${svg}<div class="legend">${legend}</div><div class="choices"><button id="mapClose">やめる</button></div></div>`;
  m.classList.add('show');
  $('mapClose').onclick = () => { closeModal(); render(); };
  m.querySelectorAll('.tw').forEach((g) => {
    g.onclick = () => {
      const k = g.dataset.t;
      if (k === S.town) return;
      const d = travelDays(S.town, k);
      closeModal();
      dialog('旅立ち', `${town(k).name}へ向かう。（${d}日）`, [
        { label: '出発する', fn: () => travel(k, d) },
        { label: 'やめる', fn: null },
      ]);
    };
  });
}

function travel(k, d) {
  const enemyTrip = S.towns[k].owner !== 'oda';
  advance(d);
  S.town = k; view = null;
  log(`${town(k).name}に着いた。`);
  if (chance(enemyTrip ? 0.15 : 0.08) && !queue.length) {
    queue.unshift((done) => dialog('野盗だ！', '山道で野盗に囲まれた！<br>「金目のものを置いていけ！」', [
      { label: '戦う', fn: () => startDuel({ title: '野盗と一騎討ち', kind: 'sword', opp: { name: '野盗の頭', stat: 35 + rnd(25), skill: 1 + rnd(2) } }, (w) => {
        if (w) { const g = 10 + rnd(30); S.gold += g; gainStat('bu', 1); msg('撃退', `野盗を追い払った！奪われていた銭${g}両を取り戻した。（武力+1）`, done); } else { S.hp -= 25; const l = Math.floor(S.gold * 0.3); S.gold -= l; checkHp(); msg('敗北', `打ちのめされ、${l}両を奪われた……。`, done); }
      }) },
      { label: '金を渡す', fn: () => { const l = Math.floor(S.gold * 0.2); S.gold -= l; msg('野盗', `${l}両を渡して見逃してもらった。`, done); } },
      { label: '逃げる', fn: () => { if (chance(0.4 + S.skills.uma * 0.12)) msg('逃走', 'うまく逃げ切った！', done); else { S.hp -= 15; checkHp(); msg('逃走', '逃げ切れず、傷を負った。（体力-15）', done); } } },
    ]));
  }
  processQueue();
}

// ---------- 普請（ミニゲーム） ----------
function startBuild(o, cb) {
  const st = { progress: 0, morale: 55 + Math.floor(S.stats.mi / 5), round: 1, rounds: o.rounds, log: [] };
  const koroku = S.retainers.includes('koroku') ? 15 : 0;
  const m = $('modal');
  function draw() {
    m.innerHTML = `<div class="box"><h2>🔨 ${o.title}</h2>
      <p>${st.round <= st.rounds ? `${st.round}日目 / ${st.rounds}日` : '終了'}</p>
      <div class="gauge"><span>進み具合</span><span class="bar big"><i style="width:${st.progress}%"></i></span>${st.progress}%</div>
      <div class="gauge"><span>人足の士気</span><span class="bar big mor"><i style="width:${st.morale}%"></i></span>${st.morale}</div>
      ${koroku ? '<p class="small">与力・蜂須賀小六の川並衆が手伝っている！</p>' : ''}
      <div class="blog">${st.log.slice(-4).join('<br>')}</div>
      <div class="choices">
        <button data-b="0">叱咤激励する</button>
        <button data-b="1" ${S.gold < 10 ? 'disabled' : ''}>褒美を与える（10両）</button>
        <button data-b="2" ${S.hp < 15 ? 'disabled' : ''}>共に汗を流す（体力-10）</button>
        <button data-b="3">組を分けて競わせる</button>
      </div></div>`;
    m.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => act(+b.dataset.b); });
  }
  function act(i) {
    let gain = 0;
    const f = st.morale / 100;
    if (i === 0) { gain = (10 + S.stats.tou / 6) * f; st.morale -= 8 + rnd(6); st.log.push('「急げ急げ！」人足たちは渋々働いた。'); }
    if (i === 1) { S.gold -= 10; st.morale += 18; gain = 7 * f; st.log.push('褒美を配ると、人足たちは大喜びした。'); }
    if (i === 2) { S.hp -= 10; st.morale += 8; gain = (10 + S.stats.mi / 8) * f; st.log.push('自ら石を運ぶと、皆が奮い立った。'); }
    if (i === 3) { const p = 0.3 + S.stats.chi / 150 + S.skills.san * 0.05; if (chance(p)) { gain = (18 + S.stats.sei / 6) * f; st.log.push('組ごとの競争で一気に捗った！'); } else { gain = 5 * f; st.morale -= 5; st.log.push('組同士で喧嘩が起きてしまった……。'); } }
    gain = Math.round(gain * (1 + S.stats.sei / 200) + koroku * f * 0.6);
    st.progress = clamp(st.progress + gain, 0, 100);
    st.morale = clamp(st.morale, 5, 100);
    st.log[st.log.length - 1] += `（+${gain}%）`;
    st.round++;
    if (st.progress >= 100 || st.round > st.rounds) {
      const ok = st.progress >= 100;
      advance(o.rounds, { noRest: true });
      if (ok) { gainStat('sei', 1); gainSkill('san', 10); }
      closeModal();
      cb(ok);
    } else draw();
  }
  m.classList.add('show');
  draw();
}

// ---------- 一騎討ち・論戦（カード勝負） ----------
// 攻 > 技 > 守 > 攻
const CARD = {
  sword:  { a: '斬', d: '受', t: '崩', me: '武力', a2: '気力' },
  debate: { a: '論', d: '聴', t: '情', me: '弁舌', a2: '気勢' },
};
const BEATS = { a: 't', t: 'd', d: 'a' };

function startDuel(o, cb) {
  const kind = o.kind;
  const L = CARD[kind];
  const myStat = kind === 'sword' ? S.stats.bu + (S.owned.sword ? 8 : 0) : Math.round((S.stats.chi + S.stats.mi) / 2);
  const mySkill = kind === 'sword' ? S.skills.ken : S.skills.ben;
  const hpPenalty = kind === 'sword' ? clamp(S.hp / S.maxhp, 0.5, 1) : 1;
  const me = { hp: Math.round((20 + myStat / 3) * hpPenalty), stat: myStat, skill: mySkill, hand: [] };
  const op = { hp: Math.round(20 + o.opp.stat / 3), stat: o.opp.stat, skill: o.opp.skill, hand: [] };
  me.max = me.hp; op.max = op.hp;
  const draw = (who) => ({ type: pick(['a', 'd', 't']), pow: 1 + rnd(3) + (chance(who.skill / 6) ? 2 : 0) });
  for (let i = 0; i < 5; i++) { me.hand.push(draw(me)); op.hand.push(draw(op)); }
  let shown = rnd(5); let round = 1; const lg = [];
  const m = $('modal');
  const cardHtml = (c, cls) => `<span class="card ${c.type} ${cls || ''}"><b>${L[c.type]}</b><i>${c.pow}</i></span>`;
  function dmg(c, s) { return Math.max(1, Math.round(c.pow * 2.4 * (0.7 + s / 150))); }
  function show() {
    m.innerHTML = `<div class="box"><h2>${kind === 'sword' ? '⚔' : '💬'} ${o.title}</h2>
      <div class="duel">
        <div class="side"><b>${esc(o.opp.name)}</b><span class="bar big red"><i style="width:${op.hp / op.max * 100}%"></i></span>${op.hp}
          <div class="hand">${op.hand.map((c, i) => i === shown ? cardHtml(c, 'peek') : '<span class="card back">？</span>').join('')}</div></div>
        <div class="vs">第${round}合</div>
        <div class="side"><b>${esc(S.name)}</b><span class="bar big"><i style="width:${me.hp / me.max * 100}%"></i></span>${me.hp}
          <div class="hand mine">${me.hand.map((c, i) => `<button class="cardbtn" data-c="${i}">${cardHtml(c)}</button>`).join('')}</div></div>
      </div>
      <p class="small rule">「${L.a}」は「${L.t}」に勝ち、「${L.t}」は「${L.d}」に勝ち、「${L.d}」は「${L.a}」に勝つ。同じ型なら数字の大きい方が勝つ。<br>相手の手札が1枚だけ見えている。読み合いで勝て！</p>
      <div class="blog">${lg.slice(-3).join('<br>')}</div></div>`;
    m.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => play(+b.dataset.c); });
  }
  function play(i) {
    const mc = me.hand[i];
    // 相手は見せている札を出しやすい
    let oi = chance(0.45) ? shown : rnd(5);
    const oc = op.hand[oi];
    let t = `${cardHtml(mc)} 対 ${cardHtml(oc)} … `;
    if (BEATS[mc.type] === oc.type) { const d = dmg(mc, me.stat); op.hp -= d; t += `<b class="up">勝ち！ ${d}の打撃</b>`; }
    else if (BEATS[oc.type] === mc.type) { const d = dmg(oc, op.stat); me.hp -= d; t += `<b class="dn">負け… ${d}の打撃</b>`; }
    else if (mc.pow > oc.pow) { const d = Math.ceil(dmg(mc, me.stat) / 2); op.hp -= d; t += `押し勝った ${d}`; }
    else if (mc.pow < oc.pow) { const d = Math.ceil(dmg(oc, op.stat) / 2); me.hp -= d; t += `押し負けた ${d}`; }
    else t += '互角！';
    lg.push(t);
    me.hand[i] = draw(me); op.hand[oi] = draw(op);
    shown = rnd(5); round++;
    if (me.hp <= 0 || op.hp <= 0 || round > 12) {
      const win = op.hp <= 0 ? true : me.hp <= 0 ? false : me.hp / me.max >= op.hp / op.max;
      if (win) gainSkill(kind === 'sword' ? 'ken' : 'ben', 8);
      m.innerHTML = `<div class="box"><h2>${win ? '勝利！' : '敗北…'}</h2><div class="blog">${lg.slice(-3).join('<br>')}</div>
        <p>${win ? `${esc(o.opp.name)}を${kind === 'sword' ? '打ち負かした' : '言い負かした'}！` : `${esc(o.opp.name)}に敗れた……。`}</p>
        <div class="choices"><button id="duelEnd">次へ</button></div></div>`;
      $('duelEnd').onclick = () => { closeModal(); cb(win); };
    } else show();
  }
  m.classList.add('show');
  show();
}

// ---------- 合戦 ----------
function startBattle(o, cb) {
  const G = GENERALS[o.enemy];
  const bonus = (type) => S.retainers.map(person).filter((p) => p.bonus && p.bonus.type === type).reduce((s, p) => s + p.bonus.value, 0);
  const base = rank().troops;
  const me = {
    troops: base, max: base,
    morale: clamp(60 + Math.floor(S.stats.mi / 5) + bonus('supply'), 0, 100),
    atk: S.stats.tou * 0.6 + S.stats.bu * 0.4 + bonus('attack'),
    chi: S.stats.chi + bonus('scheme'),
  };
  const et = Math.max(5, Math.round(base * (o.ratio || 1)));
  const en = { troops: et, max: et, morale: o.mode === 'rain' ? 55 : 75, atk: G.tou * 0.6 + G.bu * 0.4, chi: G.chi };
  const maxTurn = o.mode === 'survive' ? 6 : 12;
  let turn = 1; let dueled = false; const lg = [`${o.title}――敵将は${G.name}！`];
  if (o.mode === 'rain') lg.push('激しい雨が降っている。奇襲の好機だ！');
  if (o.mode === 'guns') lg.push('馬防柵の後ろに鉄砲隊を並べた。');
  if (o.mode === 'survive') lg.push(`殿（しんがり）を務めよ！${maxTurn}合耐え抜けば勝ち。`);
  const m = $('modal');
  const r = (a, b) => a + Math.random() * (b - a);
  function hit(att, def, mult) {
    const d = Math.round(att.troops * 0.1 * (att.atk / 55) * mult * r(0.8, 1.2) * (0.6 + att.morale / 250));
    return Math.min(def.troops, Math.max(1, d));
  }
  function apply(def, d) {
    def.troops -= d;
    def.morale = clamp(def.morale - Math.round(d / def.max * 70), 0, 100);
  }
  function draw() {
    const bar = (s, cls) => `<div class="gauge"><span>兵</span><span class="bar big ${cls}"><i style="width:${s.troops / s.max * 100}%"></i></span>${s.troops}</div>
      <div class="gauge"><span>士気</span><span class="bar big mor"><i style="width:${s.morale}%"></i></span>${s.morale}</div>`;
    m.innerHTML = `<div class="box"><h2>🎌 ${o.title}</h2><p>第${turn}合 / ${maxTurn}</p>
      <div class="armies"><div><b>${esc(S.name)}隊</b>${bar(me, '')}</div><div><b>${G.name}隊</b>${bar(en, 'red')}</div></div>
      <div class="blog">${lg.slice(-5).join('<br>')}</div>
      <div class="choices">
        <button data-c="charge">突撃</button>
        <button data-c="shoot">射撃</button>
        <button data-c="cheer">鼓舞</button>
        <button data-c="scheme">策略</button>
        <button data-c="duel" ${dueled ? 'disabled' : ''}>一騎討ち</button>
        <button data-c="retreat">退却</button>
      </div></div>`;
    m.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => cmd(b.dataset.c); });
  }
  function enemyTurn(mult) {
    if (en.troops <= 0) return;
    if (chance(0.15) && en.chi > 40) {
      if (chance(en.chi / (en.chi + me.chi))) { me.morale = clamp(me.morale - 15, 0, 100); lg.push(`<b class="dn">${G.name}の計略にかかった！士気-15</b>`); return; }
    }
    const d = hit(en, me, mult * (o.mode === 'survive' ? 1.3 : 1));
    apply(me, d); lg.push(`敵の攻撃！味方 -${d}`);
  }
  function cmd(c) {
    if (c === 'retreat') return finish(false, '退却した。');
    if (c === 'duel') {
      dueled = true;
      return startDuel({ title: `${G.name}と一騎討ち`, kind: 'sword', opp: { name: G.name, stat: G.bu, skill: Math.floor(G.bu / 25) } }, (win) => {
        if (win) { en.morale = clamp(en.morale - 35, 0, 100); lg.push(`<b class="up">一騎討ちに勝利！敵の士気が大きく下がった！</b>`); }
        else { me.morale = clamp(me.morale - 25, 0, 100); S.hp -= 25; lg.push('<b class="dn">一騎討ちに敗れた……味方の士気が下がった。</b>'); }
        m.classList.add('show'); next();
      });
    }
    if (c === 'charge') {
      const d = hit(me, en, 1.3 + S.skills.uma * 0.08); apply(en, d); lg.push(`突撃！敵 -${d}`); enemyTurn(1.1);
    } else if (c === 'shoot') {
      let mult = 0.7 + S.skills.yumi * 0.08 + S.skills.teppo * 0.12 + (S.owned.gun ? 0.2 : 0);
      if (o.mode === 'guns') mult *= 2.2;
      if (o.mode === 'rain') mult *= 0.6;
      const d = hit(me, en, mult); apply(en, d); lg.push(`矢弾を浴びせた！敵 -${d}`); enemyTurn(0.55);
    } else if (c === 'cheer') {
      const up = 10 + Math.floor(S.stats.mi / 8); me.morale = clamp(me.morale + up, 0, 100); lg.push(`兵を鼓舞した！士気+${up}`); enemyTurn(0.9);
    } else if (c === 'scheme') {
      let p = me.chi / (me.chi + en.chi);
      if (o.mode === 'rain') p += 0.25;
      if (chance(p)) {
        const d = Math.round(en.troops * 0.15); apply(en, d); en.morale = clamp(en.morale - 20, 0, 100);
        lg.push(`<b class="up">${o.mode === 'rain' ? '雨に紛れた奇襲が' : '策'}が決まった！敵 -${d}・士気-20</b>`);
        enemyTurn(0.6);
      } else { me.morale = clamp(me.morale - 8, 0, 100); lg.push('策は見破られた……。士気-8'); enemyTurn(1); }
    }
    next();
  }
  function next() {
    turn++;
    if (en.troops <= 0 || en.morale <= 0) return finish(true, '敵は総崩れとなった！');
    if (me.troops <= 0 || me.morale <= 0) return finish(false, '味方は総崩れとなった……。');
    if (turn > maxTurn) {
      if (o.mode === 'survive') return finish(true, '見事に殿を務め上げた！');
      return finish(me.troops / me.max + me.morale / 100 > en.troops / en.max + en.morale / 100, '日が暮れ、両軍は兵を引いた。');
    }
    draw();
  }
  function finish(win, text) {
    if (win) { gainStat('tou', 1); }
    S.hp = Math.max(1, S.hp - 10);
    m.innerHTML = `<div class="box"><h2>${win ? '勝利！' : '敗北…'}</h2><div class="blog">${lg.slice(-4).join('<br>')}</div><p>${text}</p>
      <div class="choices"><button id="batEnd">次へ</button></div></div>`;
    m.classList.add('show');
    $('batEnd').onclick = () => { closeModal(); cb(win); };
  }
  m.classList.add('show');
  draw();
}

// ---------- 歴史イベント ----------
function warEvent(o) {
  // o: id, y, m, title, intro, enemy, ratio, mode, minRank, win(kou), lose(kou), after()
  return {
    id: o.id, y: o.y, m: o.m, cond: o.cond,
    run: (done) => {
      S.town = S.capital; view = null;
      const after = () => { if (o.after) o.after(); };
      if (S.rank < (o.minRank || 0)) {
        after();
        return msg(o.title, `${o.intro}<br><br>${o.skip || 'このたびの戦では後詰を命じられ、出番はなかった。'}`, done);
      }
      msg(o.title, `${o.intro}<br><br>${esc(S.name)}も手勢を率いて出陣した！`, () => {
        startBattle({ title: o.title, enemy: o.enemy, ratio: o.ratio, mode: o.mode }, (win) => {
          const k = win ? o.win : o.lose;
          S.kou += k;
          if (win) S.trust = clamp(S.trust + 5, 0, 100);
          log(`${o.title}に${win ? '勝利' : '敗北'}。勲功+${k}`);
          after();
          msg(o.title, `${win ? o.winText : (o.loseText || '奮戦むなしく、手柄は立てられなかった。')}<br><br>勲功+${k}`, done);
        });
      });
    },
  };
}

const EVENTS = [
  warEvent({
    id: 'okehazama', y: 1560, m: 5, title: '桶狭間の戦い',
    intro: '駿河の今川義元が二万を超す大軍で尾張に攻め込んできた！<br>信長「人間五十年……。出陣じゃ！」<br>折からの豪雨の中、織田軍は今川本陣へ奇襲をかける。',
    enemy: 'yoshimoto', ratio: 1.4, mode: 'rain', win: 60, lose: 15,
    winText: '今川義元、討ち取ったり！<br>織田軍は奇跡的な大勝利を収めた。',
    after: () => { S.towns.okazaki.owner = 'matsudaira'; },
  }),
  {
    id: 'sunomata', y: 1566, m: 9,
    run: (done) => {
      S.town = S.capital; view = null;
      if (S.rank < 1) return msg('墨俣築城', '美濃攻めの拠点として墨俣に砦を築く計画が持ち上がったが、他の重臣が失敗したらしい……。', done);
      dialog('墨俣一夜城', `信長「美濃攻めには墨俣に砦が要る。佐久間も柴田もしくじった。${esc(S.name)}、そなたにできるか？」${S.retainers.includes('koroku') ? '<br><br>（蜂須賀小六の川並衆が力を貸してくれる！）' : '<br><br><span class="hint">（蜂須賀小六が与力なら有利になる）</span>'}`, [
        { label: '「お任せくだされ！」', fn: () => startBuild({ title: '墨俣一夜城', rounds: 4 }, (ok) => {
          if (ok) { S.kou += 120; S.trust = clamp(S.trust + 15, 0, 100); log('墨俣に一夜で城を築いた！勲功+120'); msg('墨俣一夜城', '敵の目の前に、わずかな日数で砦を築き上げた！<br>信長「猿め、やりおったわ！」<br><br>勲功+120', done); }
          else { S.kou += 10; msg('墨俣築城', '砦は完成しなかった……。だが、その心意気は買われた。<br>勲功+10', done); }
        }) },
        { label: '「荷が重うございます」', fn: () => { S.trust = Math.max(0, S.trust - 5); msg('墨俣築城', '信長「……で、あるか。」<br>（信頼-5）', done); } },
      ]);
    },
  },
  warEvent({
    id: 'inabayama', y: 1567, m: 8, title: '稲葉山城の戦い',
    intro: '墨俣を足がかりに、織田軍はついに美濃・稲葉山城へ攻めかかった！',
    enemy: 'tatsuoki', ratio: 1.2, win: 80, lose: 20,
    winText: '稲葉山城は落ち、斎藤龍興は逃げ去った。<br>信長は城を「岐阜」と改め、本拠を移した。',
    after: () => {
      const t = S.towns.inabayama; t.owner = 'oda'; t.name = '岐阜';
      if (S.capital === 'kiyosu') { S.capital = 'inabayama'; if (S.town === 'kiyosu') S.town = 'inabayama'; }
      PEOPLE.forEach((p) => { if (pTown(p) === 'kiyosu' && !p.wife) S.ptown[p.id] = 'inabayama'; });
      log('織田家は本拠を岐阜に移した。');
    },
  }),
  warEvent({
    id: 'joraku', y: 1568, m: 9, title: '上洛戦（観音寺城）',
    intro: '信長は足利義昭を奉じて京へ上る。行く手を阻む南近江の六角氏を討て！',
    enemy: 'rokkaku', ratio: 1.0, minRank: 1, win: 70, lose: 15,
    winText: '六角氏は城を捨てて逃げた。織田軍は京に入った！',
    after: () => { S.towns.kyoto.owner = 'oda'; S.towns.sakai.owner = 'oda'; },
  }),
  warEvent({
    id: 'kanegasaki', y: 1570, m: 4, title: '金ヶ崎の退き口',
    intro: '越前の朝倉攻めの最中、浅井長政が裏切った！織田軍は挟み撃ちの危機に陥る。<br>信長はただちに京へ退くことを決めた。',
    enemy: 'asakura', ratio: 2.2, mode: 'survive', minRank: 2, win: 150, lose: 30,
    skip: '殿は他の将が務め、織田軍はからくも京へ逃げ延びた。',
    winText: '命がけの殿を務め上げ、信長を無事に逃がした！<br>信長「猿、大儀であった。」',
    loseText: '多くの兵を失いながらも、なんとか逃げ延びた……。',
  }),
  warEvent({
    id: 'anegawa', y: 1570, m: 6, title: '姉川の戦い',
    intro: '裏切った浅井・朝倉の連合軍と、織田・徳川連合軍が姉川で激突した！',
    enemy: 'nagamasa', ratio: 1.2, win: 90, lose: 20,
    winText: '激戦の末、浅井・朝倉軍を打ち破った！',
  }),
  warEvent({
    id: 'odani', y: 1573, m: 8, title: '小谷城の戦い',
    intro: 'ついに浅井家の本拠・小谷城を攻める時が来た。',
    enemy: 'nagamasa', ratio: 1.0, win: 150, lose: 30,
    winText: '浅井長政は自害し、小谷城は落ちた。<br>北近江は織田領となり、城下は「長浜」と改められた。',
    after: () => { const t = S.towns.odani; t.owner = 'oda'; t.name = '長浜'; },
  }),
  warEvent({
    id: 'nagashino', y: 1575, m: 5, title: '長篠の戦い',
    intro: '武田勝頼率いる最強の騎馬軍団が三河に攻め込んだ。<br>信長は大量の鉄砲を用意し、馬防柵を築いて待ち構える。<br><span class="hint">（「射撃」が大きな効果を発揮する！）</span>',
    enemy: 'katsuyori', ratio: 1.3, mode: 'guns', win: 120, lose: 25,
    winText: '鉄砲の三段撃ちで武田騎馬隊は壊滅した！',
  }),
  {
    id: 'azuchi', y: 1576, m: 2,
    run: (done) => {
      S.towns.azuchi.hidden = false;
      if (S.capital === 'inabayama') S.capital = 'azuchi';
      PEOPLE.forEach((p) => { if (pTown(p) === 'inabayama' && !p.wife && p.id !== 'hanbei') S.ptown[p.id] = 'azuchi'; });
      log('信長は安土に城を築き、本拠を移した。');
      msg('安土城', '琵琶湖のほとりに、天主を持つ壮麗な城――安土城が築かれた。<br>織田家の本拠は安土に移った。', done);
    },
  },
  warEvent({
    id: 'chugoku', y: 1578, m: 7, title: '中国攻め（上月城）',
    intro: '信長は西国の雄・毛利家との戦を始めた。播磨で毛利の大軍が迫る！',
    enemy: 'mori', ratio: 1.3, minRank: 3, win: 150, lose: 30,
    skip: '中国攻めは他の将が担当することになった。',
    winText: '毛利軍を押し返し、播磨を平定した！姫路が織田家の拠点となった。',
    after: () => { S.towns.himeji.owner = 'oda'; },
  }),
  {
    id: 'ishiyama', y: 1580, m: 8,
    run: (done) => {
      S.towns.ishiyama.owner = 'oda'; S.towns.himeji.owner = 'oda';
      log('石山本願寺が退去した。');
      msg('石山合戦の終結', '十年に及んだ本願寺との戦いが終わり、石山は織田家のものとなった。', done);
    },
  },
  {
    id: 'koshu', y: 1582, m: 3,
    run: (done) => {
      S.towns.kofu.owner = 'oda';
      log('武田家が滅亡した。');
      msg('甲州征伐', '織田軍は甲斐に攻め込み、名門・武田家はついに滅びた。<br>天下統一は目前だ……。', done);
    },
  },
  {
    id: 'honnoji', y: 1582, m: 6,
    run: (done) => {
      S.towns.kyoto.owner = 'oda';
      const intro = '天正十年六月二日――。<br><br>「敵は本能寺にあり！」<br><br>明智光秀の謀反により、織田信長は京・本能寺で炎の中に消えた。';
      if (S.rank < 3) {
        return msg('本能寺の変', `${intro}<br><br>まだ身分の低い${esc(S.name)}には、どうすることもできなかった……。`, () => ending('low'));
      }
      dialog('本能寺の変', `${intro}<br><br>知らせを受けた${esc(S.name)}は――`, [
        { label: '「殿の仇を討つ！」（中国大返し）', fn: () => {
          msg('中国大返し', '毛利と急ぎ和睦を結び、全軍を率いて京へ向けて驚くべき速さで駆け戻った！<br><br>山崎の地で、明智軍と対峙する――。', () => {
            startBattle({ title: '山崎の戦い', enemy: 'mitsuhide', ratio: 1.1 }, (win) => ending(win ? 'tenka' : 'yamazaki_lose'));
          });
        } },
        { label: '様子を見る', fn: () => msg('本能寺の変', '迷っているうちに、他の重臣が光秀を討った……。', () => ending('wait')) },
      ]);
    },
  },
];

// ---------- エンディング ----------
function ending(type) {
  S.ended = true;
  const score = S.kou + S.rank * 300 + S.retainers.length * 100 + (S.wife ? 100 : 0) + Object.values(S.stats).reduce((a, b) => a + b, 0);
  const T = {
    tenka: ['天下人', `山崎の戦いで明智光秀を討ち、主君の仇を討った${esc(S.name)}。<br>その名は天下に轟き、やがて織田家の家臣たちを従え、<br>ついには天下統一を成し遂げるのであった――。<br><br>針売りの小僧から天下人へ。<br>日ノ本一の出世物語は、こうして語り継がれることとなった。`],
    yamazaki_lose: ['夢の跡', '山崎の戦いに敗れ、仇討ちはならなかった……。<br>だが、その忠義は人々の心に残った。'],
    wait: ['一武将として', `${esc(S.name)}は織田家の重臣の一人として、その後も堅実に生きた。`],
    low: ['名もなき志', `信長亡き後、${esc(S.name)}は乱世の中で新たな道を探すことになる……。`],
  }[type];
  log(`物語は終わった。（${T[0]}）`);
  $('modal').innerHTML = `<div class="box ending"><h2>― ${T[0]} ―</h2><div class="dtext">${T[1]}</div>
    <table class="stats"><tr><th>最終身分</th><td>${rank().name}</td></tr><tr><th>勲功</th><td>${S.kou}</td></tr>
    <tr><th>与力</th><td>${S.retainers.map((id) => person(id).name).join('、') || 'なし'}</td></tr>
    <tr><th>妻</th><td>${S.wife ? person(S.wife).name : 'なし'}</td></tr><tr><th>評価点</th><td><b>${score}</b></td></tr></table>
    <div class="choices"><button id="toTitle">タイトルへ</button></div></div>`;
  $('modal').classList.add('show');
  $('toTitle').onclick = () => { closeModal(); title(); };
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 保存なし */ }
}

// ---------- タイトル ----------
function title() {
  S = null;
  $('status').innerHTML = '';
  $('side').innerHTML = '';
  $('scene').innerHTML = `<div class="title">
    <h1>戦国出世録</h1><p class="sub">― 足軽から天下人へ ―</p>
    <label>名前 <input id="pname" value="木下藤吉郎" maxlength="10"></label>
    <div class="choices"><button id="start" class="hl">はじめから</button>
    <button id="cont" ${hasSave() ? '' : 'disabled'}>つづきから</button></div>
    <p class="small">一五五四年、尾張。一介の足軽となった男の立身出世の物語。<br>
    任務・修行・人との縁・合戦を重ね、一五八二年の運命の日を迎えよ。</p></div>`;
  $('start').onclick = () => newGame($('pname').value.trim());
  $('cont').onclick = () => load();
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', title); else title();
