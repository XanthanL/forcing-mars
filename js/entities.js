/**
 * entities.js — 玩家 & 敌人模型
 * 支持：固定伤害、交替行动、递增伤害、Boss蓄力 四种模式
 */

/* ============================================================
 * 基类 Entity
 * ============================================================ */
class Entity {
  constructor(name, maxHp) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.shield = 0;
  }

  /** 承受伤害：护盾优先吸收，溢出部分扣减生命值 */
  takeDamage(amount) {
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    const remaining = amount - absorbed;
    this.hp = Math.max(0, this.hp - remaining);
    return { absorbed, damageToHp: remaining, total: amount };
  }

  addShield(amount) {
    this.shield += amount;
  }

  clearShield() {
    this.shield = 0;
  }

  get isAlive() {
    return this.hp > 0;
  }
}

/* ============================================================
 * 玩家类
 * ============================================================ */
class Player extends Entity {
  constructor() {
    super('宇航员', 80);
    this.battery = 0;
    this.maxBattery = 3;
  }

  resetBattery() {
    this.battery = this.maxBattery;
  }

  canPlay(cost) {
    return this.battery >= cost;
  }

  spendBattery(cost) {
    if (this.canPlay(cost)) {
      this.battery -= cost;
      return true;
    }
    return false;
  }
}

/* ============================================================
 * 敌人 AI 模式常量
 * ============================================================ */
const ENEMY_PATTERN = {
  FIXED: 'fixed',               // 固定伤害
  ALTERNATING: 'alternating',   // 交替行动
  RAMPING: 'ramping',           // 递增伤害
  BOSS_CHARGE: 'boss_charge',   // Boss蓄力
};

/* ============================================================
 * 敌人行动结果描述
 * ============================================================ */
class EnemyActionResult {
  constructor(type = 'none', value = 0, desc = '') {
    this.type = type;   // 'damage' | 'shield' | 'charge' | 'chargedAttack'
    this.value = value;
    this.desc = desc;   // 人类可读的描述
  }
}

/* ============================================================
 * 敌人图鉴（数据驱动，新增敌人只需在这里注册）
 * ============================================================ */
const ENEMY_CATALOG = {
  marsLeech: {
    key: 'marsLeech',
    name: '火星幼蛭',
    maxHp: 28,
    pattern: ENEMY_PATTERN.FIXED,
    fixedDamage: 6,
  },
  duneStalker: {
    key: 'duneStalker',
    name: '沙丘跃行者',
    maxHp: 34,
    pattern: ENEMY_PATTERN.ALTERNATING,
    actions: [
      { type: 'shield', value: 5 },
      { type: 'damage', value: 9 },
    ],
  },
  redCrawler: {
    key: 'redCrawler',
    name: '红土爬行者',
    maxHp: 46,
    pattern: ENEMY_PATTERN.ALTERNATING,
    actions: [
      { type: 'damage', value: 11 },
      { type: 'shield', value: 8 },
    ],
  },
  crystalParasite: {
    key: 'crystalParasite',
    name: '晶化寄生虫',
    maxHp: 40,
    pattern: ENEMY_PATTERN.RAMPING,
    baseDamage: 5,
    damageIncrement: 3,
  },
  deepLurker: {
    key: 'deepLurker',
    name: '地底潜伏者',
    maxHp: 55,
    pattern: ENEMY_PATTERN.ALTERNATING,
    actions: [
      { type: 'shield', value: 15 },
      { type: 'damage', value: 14 },
    ],
  },
  marsDevourer: {
    key: 'marsDevourer',
    name: '火星吞噬者',
    maxHp: 70,
    pattern: ENEMY_PATTERN.BOSS_CHARGE,
    chargeTurns: 3,
    chargeDamage: 30,
  },
};

/* ============================================================
 * 敌人类（支持多种 AI 模式）
 * ============================================================ */
class Enemy extends Entity {
  /**
   * @param {object} config
   *   name          - 敌人名称
   *   maxHp         - 最大生命值
   *   pattern       - ENEMY_PATTERN 之一
   *   fixedDamage   - FIXED 模式下固定伤害值
   *   actions       - ALTERNATING 模式下两个行动 [{type, value}, ...]
   *   baseDamage    - RAMPING 模式下起始伤害
   *   damageIncrement - RAMPING 模式下每回合递增
   *   chargeTurns   - BOSS_CHARGE 模式下蓄力回合数
   *   chargeDamage  - BOSS_CHARGE 模式下蓄满后伤害
   */
  constructor(config) {
    super(config.name, config.maxHp);
    this.key = config.key || null;
    this.pattern = config.pattern;
    this.turnCount = 0;

    // FIXED
    this.fixedDamage = config.fixedDamage || 0;

    // ALTERNATING
    this.actions = config.actions || [];

    // RAMPING
    this.baseDamage = config.baseDamage || 0;
    this.damageIncrement = config.damageIncrement || 0;

    // BOSS_CHARGE
    this.chargeTurns = config.chargeTurns || 0;
    this.chargeDamage = config.chargeDamage || 0;
    this.currentCharge = 0;
  }

  /** 从图鉴 key 快速创建敌人实例 */
  static fromCatalog(catalogKey) {
    const data = ENEMY_CATALOG[catalogKey];
    if (!data) {
      throw new Error(`Enemy catalog key not found: ${catalogKey}`);
    }
    return new Enemy(data);
  }

  /** 获取敌人意图描述（用于 UI 显示） */
  getIntentDescription() {
    switch (this.pattern) {
      case ENEMY_PATTERN.FIXED:
        return `造成 ${this.fixedDamage} 点伤害`;

      case ENEMY_PATTERN.ALTERNATING: {
        const idx = this.turnCount % this.actions.length;
        const action = this.actions[idx];
        if (action.type === 'damage') return `攻击！造成 ${action.value} 点伤害`;
        if (action.type === 'shield') return `防御！获得 ${action.value} 点护盾`;
        return '未知行动';
      }

      case ENEMY_PATTERN.RAMPING: {
        const dmg = this.baseDamage + this.turnCount * this.damageIncrement;
        return `造成 ${dmg} 点伤害（递增）`;
      }

      case ENEMY_PATTERN.BOSS_CHARGE: {
        const remaining = this.chargeTurns - this.currentCharge;
        if (remaining > 0) {
          return `蓄力中... (${remaining}/${this.chargeTurns})`;
        }
        return `◆ 致命一击！${this.chargeDamage} 点伤害 ◆`;
      }

      default:
        return '待机';
    }
  }

  /** 获取本回合的实际伤害数值（用于受击震屏参考） */
  getCurrentDamage() {
    switch (this.pattern) {
      case ENEMY_PATTERN.FIXED:
        return this.fixedDamage;
      case ENEMY_PATTERN.ALTERNATING: {
        const idx = this.turnCount % this.actions.length;
        return this.actions[idx].type === 'damage' ? this.actions[idx].value : 0;
      }
      case ENEMY_PATTERN.RAMPING:
        return this.baseDamage + this.turnCount * this.damageIncrement;
      case ENEMY_PATTERN.BOSS_CHARGE: {
        const remaining = this.chargeTurns - this.currentCharge;
        return remaining > 0 ? 0 : this.chargeDamage;
      }
      default:
        return 0;
    }
  }

  /** 执行敌人回合行动，返回行动结果 */
  executeTurn(player) {
    this.turnCount++;
    const result = new EnemyActionResult();

    switch (this.pattern) {
      case ENEMY_PATTERN.FIXED:
        result.type = 'damage';
        result.value = this.fixedDamage;
        result.desc = `${this.name} 造成 ${this.fixedDamage} 点伤害`;
        player.takeDamage(this.fixedDamage);
        break;

      case ENEMY_PATTERN.ALTERNATING: {
        const idx = (this.turnCount - 1) % this.actions.length;
        const action = this.actions[idx];
        if (action.type === 'damage') {
          result.type = 'damage';
          result.value = action.value;
          result.desc = `${this.name} 造成 ${action.value} 点伤害`;
          player.takeDamage(action.value);
        } else if (action.type === 'shield') {
          result.type = 'shield';
          result.value = action.value;
          result.desc = `${this.name} 获得 ${action.value} 点护盾`;
          this.addShield(action.value);
        }
        break;
      }

      case ENEMY_PATTERN.RAMPING: {
        const dmg = this.baseDamage + (this.turnCount - 1) * this.damageIncrement;
        result.type = 'damage';
        result.value = dmg;
        result.desc = `${this.name} 造成 ${dmg} 点伤害`;
        player.takeDamage(dmg);
        break;
      }

      case ENEMY_PATTERN.BOSS_CHARGE: {
        if (this.currentCharge < this.chargeTurns) {
          this.currentCharge++;
          const remaining = this.chargeTurns - this.currentCharge;
          result.type = 'charge';
          result.value = 0;
          result.desc = `${this.name} 正在蓄力... (${this.currentCharge}/${this.chargeTurns})`;
        } else {
          result.type = 'chargedAttack';
          result.value = this.chargeDamage;
          result.desc = `★ ${this.name} 释放致命一击！造成 ${this.chargeDamage} 点伤害 ★`;
          player.takeDamage(this.chargeDamage);
          // 重置蓄力，开始新一轮
          this.currentCharge = 0;
        }
        break;
      }

      default:
        result.type = 'none';
        result.value = 0;
        result.desc = `${this.name} 什么都没做`;
    }

    return result;
  }
}

/* ============================================================
 * 深度关卡配置
 * ============================================================ */
const DEPTH_LEVELS = [
  {
    key: 'surface',
    name: '地表',
    depth: '0m',
    label: '地表 — 0m',
    color: 0xdd7733,
    bgColor: 0x1a0808,
  },
  {
    key: 'shallow',
    name: '地下浅层',
    depth: '500m',
    label: '地下浅层 — 500m',
    color: 0xcc4422,
    bgColor: 0x1a0a06,
  },
  {
    key: 'core',
    name: '地核深处',
    depth: '2000m',
    label: '地核深处 — 2000m',
    color: 0xcc2211,
    bgColor: 0x1a0404,
  },
];

/* ============================================================
 * 关卡敌人配置（数据驱动）
 * pick: 0 表示顺序出现，1 表示从中随机选取一个
 * ============================================================ */
const LEVEL_ENEMY_CONFIG = [
  { catalogKeys: ['marsLeech', 'duneStalker'], pick: 1 },
  { catalogKeys: ['redCrawler', 'crystalParasite'], pick: 1 },
  { catalogKeys: ['deepLurker'], pick: 0 },
];

/* ============================================================
 * 敌人池配置（按关卡索引）
 * 返回一个敌人实例数组。最后一关特殊：先出小Boss再出大Boss。
 * ============================================================ */
function buildEnemyForLevel(levelIndex) {
  const config = LEVEL_ENEMY_CONFIG[levelIndex];
  if (!config) {
    throw new Error(`No enemy config for level index: ${levelIndex}`);
  }

  const enemies = [];

  if (config.pick === 1) {
    const key = config.catalogKeys[Math.floor(Math.random() * config.catalogKeys.length)];
    enemies.push(Enemy.fromCatalog(key));
  } else {
    for (const key of config.catalogKeys) {
      enemies.push(Enemy.fromCatalog(key));
    }
  }

  return enemies;
}

/** 创建最终 Boss：火星吞噬者 */
function buildFinalBoss() {
  return Enemy.fromCatalog('marsDevourer');
}
