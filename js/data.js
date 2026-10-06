// ===== ゲームデータ =====

const START_YEAR = 1554;
const BIRTH_YEAR = 1537;

// 勢力
const CLANS = {
  oda:      { name: '織田家',   color: '#c0392b' },
  imagawa:  { name: '今川家',   color: '#8e44ad' },
  matsudaira:{ name: '松平家',  color: '#e67e22' },
  saito:    { name: '斎藤家',   color: '#16a085' },
  azai:     { name: '浅井家',   color: '#2980b9' },
  miyoshi:  { name: '三好家',   color: '#7f8c8d' },
  honganji: { name: '本願寺',   color: '#d4ac0d' },
  takeda:   { name: '武田家',   color: '#922b21' },
  uesugi:   { name: '上杉家',   color: '#1f618d' },
  mori:     { name: '毛利家',   color: '#196f3d' },
};

// 町（x,y は地図座標）
const TOWNS_INIT = {
  kasugayama: { name: '春日山', prov: '越後', x: 430, y: 50,  owner: 'uesugi',   rice: 9 },
  kofu:       { name: '甲府',   prov: '甲斐', x: 470, y: 215, owner: 'takeda',   rice: 13 },
  sunpu:      { name: '駿府',   prov: '駿河', x: 480, y: 300, owner: 'imagawa',  rice: 11 },
  okazaki:    { name: '岡崎',   prov: '三河', x: 395, y: 295, owner: 'imagawa',  rice: 10 },
  kiyosu:     { name: '清洲',   prov: '尾張', x: 350, y: 265, owner: 'oda',      rice: 10 },
  inabayama:  { name: '稲葉山', prov: '美濃', x: 335, y: 220, owner: 'saito',    rice: 10 },
  odani:      { name: '小谷',   prov: '北近江', x: 285, y: 185, owner: 'azai',   rice: 11 },
  azuchi:     { name: '安土',   prov: '南近江', x: 270, y: 225, owner: 'oda',    rice: 12, hidden: true },
  kyoto:      { name: '京',     prov: '山城', x: 225, y: 245, owner: 'miyoshi',  rice: 15 },
  ishiyama:   { name: '石山',   prov: '摂津', x: 195, y: 275, owner: 'honganji', rice: 13 },
  sakai:      { name: '堺',     prov: '和泉', x: 222, y: 318, owner: 'miyoshi',  rice: 14 },
  himeji:     { name: '姫路',   prov: '播磨', x: 105, y: 255, owner: 'mori',     rice: 10 },
};

// 身分
const RANKS = [
  { name: '足軽',     kou: 0,    troops: 10,   salary: 3 },
  { name: '足軽組頭', kou: 60,   troops: 50,   salary: 10 },
  { name: '足軽大将', kou: 180,  troops: 200,  salary: 30 },
  { name: '侍大将',   kou: 400,  troops: 500,  salary: 60 },
  { name: '部将',     kou: 800,  troops: 1000, salary: 120 },
  { name: '城主',     kou: 1400, troops: 2000, salary: 250 },
  { name: '宿老',     kou: 2200, troops: 4000, salary: 400 },
];

const STAT_NAMES = { tou: '統率', bu: '武力', chi: '知略', sei: '政治', mi: '魅力' };

const SKILLS = {
  ken:   '剣術',
  yumi:  '弓術',
  teppo: '鉄砲',
  uma:   '馬術',
  ben:   '弁舌',
  san:   '算術',
  cha:   '茶道',
  shino: '忍術',
};

// 道場・寺で学べるもの
const DOJO_COURSES = [
  { skill: 'ken',  stat: 'bu',  label: '剣術の稽古' },
  { skill: 'yumi', stat: 'tou', label: '弓術の稽古' },
  { skill: 'uma',  stat: 'tou', label: '馬術の稽古' },
  { skill: 'teppo', stat: 'tou', label: '鉄砲の稽古', minYear: 1558 },
  { skill: 'shino', stat: 'chi', label: '忍びの修行', towns: ['kofu', 'kyoto'] },
];
const TEMPLE_COURSES = [
  { skill: 'ben', stat: 'mi',  label: '弁舌を磨く' },
  { skill: 'san', stat: 'sei', label: '算術を学ぶ' },
  { skill: null,  stat: 'chi', label: '兵法を学ぶ' },
  { skill: null,  stat: 'sei', label: '政道を学ぶ' },
];

// 品物
const ITEMS = {
  medicine: { name: '薬',     price: 20,  desc: '体力を50回復する', use: true },
  sake:     { name: '酒',     price: 15,  desc: '贈り物（親密度+少）', gift: 8 },
  sweets:   { name: '菓子',   price: 25,  desc: '贈り物（親密度+中）', gift: 14 },
  tea:      { name: '茶器',   price: 120, desc: '贈り物（親密度+大）', gift: 30 },
  horse:    { name: '名馬',   price: 250, desc: '旅の日数が短くなる', once: true },
  sword:    { name: '名刀',   price: 300, desc: '武力+6・一騎討ちで有利', once: true },
  book:     { name: '兵法書', price: 180, desc: '統率+4・知略+2', once: true },
  gun:      { name: '鉄砲',   price: 220, desc: '鉄砲技能+1', once: true, towns: ['sakai'] },
};
const SHOP_DEFAULT = ['medicine', 'sake', 'sweets', 'tea', 'horse', 'sword', 'book'];

// 人物
// recruit: 与力にできる条件（身分）, bonus: 合戦での加勢
const PEOPLE = [
  { id: 'toshiie', name: '前田利家', town: 'kiyosu', from: 1554, rel: 30,
    desc: '槍の又左。若くして血気盛ん。', likes: 'sake', recruit: null,
    talk: ['「藤吉郎、お主は口だけは達者よのう！」', '「槍働きなら誰にも負けぬ。」', '「まつの飯は日ノ本一じゃ。」'] },
  { id: 'nene', name: 'ねね', town: 'kiyosu', from: 1554, rel: 20,
    desc: '浅野家の養女。明るく聡明な娘。', likes: 'sweets', wife: true,
    talk: ['「まあ、また来なさったの？」', '「お侍さまは出世が大事でございますね。」', '「私は、身分より人柄を見ますよ。」'] },
  { id: 'koroku', name: '蜂須賀小六', town: 'kiyosu', from: 1554, rel: 15,
    desc: '川並衆の頭目。木曽川に顔が利く。', likes: 'sake', recruit: 1,
    bonus: { type: 'build', value: 15 },
    talk: ['「川のことならわしに聞け。」', '「侍なんぞ、腹の底は知れたもんよ。」', '「面白い男なら、手を貸さんでもない。」'] },
  { id: 'nagahide', name: '丹羽長秀', town: 'kiyosu', from: 1554, rel: 25,
    desc: '織田家の重臣。温厚で万事に通じる。', likes: 'tea', recruit: null,
    talk: ['「何事も段取りが肝要じゃ。」', '「殿は才ある者を好まれる。」'] },
  { id: 'katsuie', name: '柴田勝家', town: 'kiyosu', from: 1554, rel: 0,
    desc: '織田家随一の猛将。成り上がり者を嫌う。', likes: 'sake', recruit: null,
    talk: ['「猿めが、何の用じゃ。」', '「武士は戦場で語るものよ。」'] },
  { id: 'hanbei', name: '竹中半兵衛', town: 'inabayama', from: 1554, rel: 5,
    desc: '斎藤家に仕える稀代の軍師。', likes: 'book', recruit: 2,
    bonus: { type: 'scheme', value: 25 },
    talk: ['「戦は始まる前に勝負がついているものです。」', '「主君の器を見極めたいのです。」'] },
  { id: 'nobutsuna', name: '上泉信綱', town: 'kyoto', from: 1554, rel: 10,
    desc: '新陰流の剣聖。諸国を巡り剣を教える。', likes: 'sake', teacher: 'ken',
    talk: ['「剣は人を活かすためにある。」', '「心が乱れれば剣も乱れる。」'] },
  { id: 'rikyu', name: '千宗易（利休）', town: 'sakai', from: 1554, rel: 10,
    desc: '堺の豪商にして茶人。', likes: 'tea', teacher: 'cha',
    talk: ['「一期一会。この一服も二度とは無いもの。」', '「侘びとは、足りぬを楽しむ心です。」'] },
  { id: 'mitsuhide', name: '明智光秀', town: 'kyoto', from: 1568, rel: 20,
    desc: '教養深い武将。将軍家とも縁がある。', likes: 'book', recruit: null,
    talk: ['「天下とは、誰のためにあるのでしょうな。」', '「戦のない世を作りたいものです。」'] },
  { id: 'kanbei', name: '黒田官兵衛', town: 'himeji', from: 1575, rel: 15,
    desc: '播磨の切れ者。先を読む目を持つ。', likes: 'tea', recruit: 3,
    bonus: { type: 'scheme', value: 25 },
    talk: ['「機を逃す者は天下を逃しまする。」', '「播磨の国衆はまとまりませぬ。」'] },
  { id: 'mitsunari', name: '石田佐吉', town: 'odani', from: 1574, rel: 20,
    desc: '寺の小姓。算術に優れた少年。', likes: 'tea', recruit: 3,
    bonus: { type: 'supply', value: 15 },
    talk: ['「三杯のお茶、ぬるい順にお出ししました。」', '「数字は嘘をつきませぬ。」'] },
  { id: 'kiyomasa', name: '加藤虎之助', town: 'kiyosu', from: 1573, rel: 30,
    desc: '母方の縁者の少年。怪力の持ち主。', likes: 'sweets', recruit: 2,
    bonus: { type: 'attack', value: 15 },
    talk: ['「叔父上！槍を教えてくだされ！」', '「虎でも何でも退治してみせまする！」'] },
];

// 合戦の敵大将
const GENERALS = {
  yoshimoto: { name: '今川義元', bu: 40, chi: 65, tou: 70 },
  tatsuoki:  { name: '斎藤龍興', bu: 35, chi: 30, tou: 40 },
  rokkaku:   { name: '六角義賢', bu: 45, chi: 50, tou: 55 },
  asakura:   { name: '朝倉景鏡', bu: 60, chi: 50, tou: 65 },
  nagamasa:  { name: '浅井長政', bu: 75, chi: 60, tou: 75 },
  katsuyori: { name: '武田勝頼', bu: 80, chi: 55, tou: 80 },
  mori:      { name: '吉川元春', bu: 80, chi: 65, tou: 80 },
  mitsuhide: { name: '明智光秀', bu: 70, chi: 90, tou: 85 },
  bandit:    { name: '野盗の頭', bu: 50, chi: 20, tou: 30 },
  ikki:      { name: '一揆の大将', bu: 45, chi: 40, tou: 45 },
};

// 茶屋の噂
const RUMORS = [
  { until: 1560, text: '駿河の今川様が、いずれ大軍で上洛するとか…。' },
  { until: 1567, text: '美濃の稲葉山城は難攻不落。だが、主の龍興様は遊んでばかりとか。' },
  { until: 1567, text: '木曽川の向こう、墨俣に砦が築ければ美濃攻めが楽になるのだが…。' },
  { until: 1568, text: '京では将軍家が困っておられるそうな。' },
  { until: 1573, text: '近江の浅井様は、殿の妹君お市様を娶られたとか。' },
  { until: 1575, text: '甲斐の武田の騎馬隊は日ノ本最強と聞く。' },
  { until: 1580, text: '石山の本願寺は門徒衆が多く、一筋縄ではいかぬ。' },
  { until: 1582, text: '西国の毛利はまだまだ手強いぞ。' },
  { until: 1600, text: '堺では南蛮の珍しい品が手に入るらしい。' },
  { until: 1600, text: '贈り物は相手の好みに合わせると喜ばれるそうな。' },
  { until: 1600, text: '道場や寺で修行すると、いざという時に役立つぞ。' },
  { until: 1600, text: '米の値は町ごとに違う。安く買って高く売れば儲かるぞ。' },
];
