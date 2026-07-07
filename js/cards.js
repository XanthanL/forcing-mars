/**
 * cards.js — 卡牌定义、牌组构建、抽牌/弃牌系统
 */

/* ============================================================
 * 卡牌定义
 * ============================================================ */
const CARD_DEFS = {
  laserShot: {
    id: 'laserShot',
    name: '激光射击',
    cost: 1,
    desc: '造成 6 点伤害',
    type: 'damage',
    value: 6,
    color: 0xff4444,
  },
  overchargeBlast: {
    id: 'overchargeBlast',
    name: '过载轰击',
    cost: 2,
    desc: '造成 14 点伤害',
    type: 'damage',
    value: 14,
    color: 0xff8800,
  },
  plasmaShield: {
    id: 'plasmaShield',
    name: '电浆护盾',
    cost: 1,
    desc: '获得 5 点护盾',
    type: 'shield',
    value: 5,
    color: 0x44aaff,
  },
  shieldMatrix: {
    id: 'shieldMatrix',
    name: '矩阵防御',
    cost: 2,
    desc: '获得 12 点护盾',
    type: 'shield',
    value: 12,
    color: 0x66ddff,
  },
};

/* ============================================================
 * 初始牌组（共 10 张）
 * ============================================================ */
function buildStarterDeck() {
  const deck = [];
  const template = [
    { def: 'laserShot',        count: 4 },
    { def: 'overchargeBlast',  count: 1 },
    { def: 'plasmaShield',     count: 4 },
    { def: 'shieldMatrix',     count: 1 },
  ];
  let uid = 0;
  for (const entry of template) {
    for (let i = 0; i < entry.count; i++) {
      deck.push({ ...CARD_DEFS[entry.def], uid: uid++ });
    }
  }
  return deck;
}

/* ============================================================
 * Fisher–Yates 洗牌
 * ============================================================ */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ============================================================
 * 抽牌堆
 * ============================================================ */
class DrawPile {
  constructor(cards) {
    this.cards = shuffleArray([...cards]);
  }

  /** 抽出 count 张牌 */
  draw(count) {
    return this.cards.splice(0, count);
  }

  /** 将弃牌堆洗回抽牌堆 */
  reshuffle(discarded) {
    this.cards.push(...discarded);
    shuffleArray(this.cards);
  }

  get size() {
    return this.cards.length;
  }
}
