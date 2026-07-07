/**
 * cards.js — 卡牌定义、牌组构建、抽牌/弃牌系统
 */

/* ============================================================
 * 稀有度常量
 * ============================================================ */
const CARD_RARITY = {
  STARTER: 'starter',
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
};

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
    rarity: CARD_RARITY.STARTER,
  },
  overchargeBlast: {
    id: 'overchargeBlast',
    name: '过载轰击',
    cost: 2,
    desc: '造成 14 点伤害',
    type: 'damage',
    value: 14,
    color: 0xff8800,
    rarity: CARD_RARITY.UNCOMMON,
  },
  plasmaShield: {
    id: 'plasmaShield',
    name: '电浆护盾',
    cost: 1,
    desc: '获得 5 点护盾',
    type: 'shield',
    value: 5,
    color: 0x44aaff,
    rarity: CARD_RARITY.STARTER,
  },
  shieldMatrix: {
    id: 'shieldMatrix',
    name: '矩阵防御',
    cost: 2,
    desc: '获得 12 点护盾',
    type: 'shield',
    value: 12,
    color: 0x66ddff,
    rarity: CARD_RARITY.UNCOMMON,
  },
  // 预留扩展卡牌示例，战后奖励池可用
  piercingBeam: {
    id: 'piercingBeam',
    name: '穿透光束',
    cost: 2,
    desc: '造成 10 点伤害，无视护盾',
    type: 'damage',
    value: 10,
    color: 0xff2266,
    rarity: CARD_RARITY.RARE,
    pierce: true,
  },
  emergencyRepair: {
    id: 'emergencyRepair',
    name: '紧急维修',
    cost: 1,
    desc: '获得 8 点护盾，下一回合保留',
    type: 'shield',
    value: 8,
    color: 0x22ddff,
    rarity: CARD_RARITY.COMMON,
    retain: true,
  },
};

/* ============================================================
 * 卡牌池（用于战后奖励、商店等）
 * ============================================================ */
const CARD_POOL = {
  [CARD_RARITY.COMMON]: ['emergencyRepair'],
  [CARD_RARITY.UNCOMMON]: ['overchargeBlast', 'shieldMatrix'],
  [CARD_RARITY.RARE]: ['piercingBeam'],
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
 * 战后奖励抽卡
 * 按权重随机抽取指定数量的不同卡牌
 * ============================================================ */
function rollCardRewards(count = 3, weights = { common: 0.6, uncommon: 0.3, rare: 0.1 }) {
  const rewards = [];
  const pickedIds = new Set();

  while (rewards.length < count) {
    const roll = Math.random();
    let rarity;
    if (roll < weights.rare) {
      rarity = CARD_RARITY.RARE;
    } else if (roll < weights.rare + weights.uncommon) {
      rarity = CARD_RARITY.UNCOMMON;
    } else {
      rarity = CARD_RARITY.COMMON;
    }

    const pool = CARD_POOL[rarity];
    if (!pool || pool.length === 0) continue;

    const key = pool[Math.floor(Math.random() * pool.length)];
    const def = CARD_DEFS[key];
    if (pickedIds.has(def.id)) continue;

    pickedIds.add(def.id);
    rewards.push({ ...def });
  }

  return rewards;
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
