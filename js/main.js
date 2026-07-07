/**
 * main.js — Forcing Mars 强渡火星
 * 回合制卡牌对战 · 三深度关卡推进 · Graphics动画重构
 */

/* ============================================================
 * Phaser 游戏配置
 * ============================================================ */
const W = 960;
const H = 640;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-container',
  backgroundColor: '#1a0808',
  scene: { create, update },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});

/* ============================================================
 * 全局状态
 * ============================================================ */
let player;
let enemy;            // 当前敌人
let enemyQueue = [];  // 当前关卡敌人队列
let depthLevel = 0;   // 0=0m, 1=500m, 2=2000m
let isFinalBossDefeated = false; // 是否已击败火星吞噬者

let drawPile;
let hand = [];
let discardPile = [];

let turnPhase = 'idle'; // idle | playerTurn | enemyTurn | transition | gameOver

let cardContainers = [];
let endTurnBtn = null;

let logLines = [];
const MAX_LOG = 5;

/* ============================================================
 * UI 组件引用
 * ============================================================ */
let depthUI;          // 深度指示器 Graphics + Text
let depthText;
let depthSegLabels = []; // 三段深度指示条文字对象
let enemyContainer;   // 敌人区域容器
let enemyGraphics;
let enemyNameText;
let enemyHpBarBg;
let enemyHpBarFill;
let enemyHpText;
let enemyShieldText;
let enemyIntentText;

let playerContainer;
let playerHpBarBg;
let playerHpBarFill;
let playerHpText;
let playerShieldText;
let playerBatteryText;

let txtPhase;
let txtLog;
let txtPileInfo;

/* ============================================================
 * 场景钩子 create
 * ============================================================ */
function create() {
  /* ---------- 初始化 ---------- */
  player = new Player();
  depthLevel = 0;
  isFinalBossDefeated = false;
  turnPhase = 'idle';
  hand = [];
  discardPile = [];
  drawPile = new DrawPile(buildStarterDeck());
  cardContainers = [];
  logLines = [];

  initLevel(depthLevel);

  /* ---------- 绘制持久背景 ---------- */
  drawBackground(this);

  /* ---------- 深度指示器 ---------- */
  createDepthUI(this);

  /* ---------- 敌人生成 UI ---------- */
  createEnemyUI(this);

  /* ---------- 玩家 UI ---------- */
  createPlayerUI(this);

  /* ---------- 阶段提示（玩家框下方） ---------- */
  txtPhase = this.add.text(W / 2, 252, '', {
    fontSize: '16px', fontFamily: '"Courier New", monospace',
    color: '#ffaa44',
  }).setOrigin(0.5);

  /* ---------- 日志（阶段提示下方，5行高度约 85px） ---------- */
  txtLog = this.add.text(20, 280, '', {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#cc8866', lineSpacing: 4,
    wordWrap: { width: W - 40 },
  });

  /* ---------- 牌库信息（日志下方） ---------- */
  txtPileInfo = this.add.text(20, 375, '', {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#aa7755',
  });

  /* ---------- 结束回合按钮 ---------- */
  endTurnBtn = createEndTurnButton(this);

  /* ---------- 启动游戏 ---------- */
  addLog('系统', '=== 强渡火星 ===');
  addLog('系统', `当前深度：${DEPTH_LEVELS[depthLevel].label}`);
  addLog('系统', `敌军：${enemy.name} 出现了！`);
  startPlayerTurn(this);
}

/* ============================================================
 * 背景绘制
 * ============================================================ */
function drawBackground(scene) {
  const g = scene.add.graphics();

  // 暗锈红渐变背景
  g.fillStyle(0x1a0808, 1);
  g.fillRect(0, 0, W, H);

  // 底部更深的锈色晕染
  g.fillStyle(0x120404, 0.6);
  g.fillRect(0, H - 180, W, 180);

  // 顶部金属暗色渐变
  g.fillStyle(0x220e0a, 0.4);
  g.fillRect(0, 0, W, 80);

  // 洞穴纹理网格线（暖色）
  g.lineStyle(1, 0x3a1a10, 0.3);
  for (let x = 0; x < W; x += 40) { g.lineBetween(x, 0, x, H); }
  for (let y = 0; y < H; y += 40) { g.lineBetween(0, y, W, y); }

  // 额外的粗网格纹理
  g.lineStyle(1, 0x2a1008, 0.2);
  for (let x = 0; x < W; x += 120) { g.lineBetween(x, 0, x, H); }
  for (let y = 0; y < H; y += 120) { g.lineBetween(0, y, W, y); }

  // 分隔线（金属铜色）
  g.lineStyle(2, 0x6a2a18, 0.6);
  g.lineBetween(0, 35, W, 35);   // 深度下方
  g.lineBetween(0, 155, W, 155); // 敌人下方
  g.lineBetween(0, 250, W, 250); // 玩家下方
  g.lineBetween(0, 395, W, 395); // 牌库下方

  // 分隔线发光光晕
  g.lineStyle(1, 0xaa4020, 0.15);
  g.lineBetween(0, 36, W, 36);
  g.lineBetween(0, 156, W, 156);
  g.lineBetween(0, 251, W, 251);
  g.lineBetween(0, 396, W, 396);
}

/* ============================================================
 * 深度指示器 UI
 * ============================================================ */
function createDepthUI(scene) {
  depthUI = scene.add.graphics();
  updateDepthUI(scene);
}

function updateDepthUI(scene) {
  depthUI.clear();

  const level = DEPTH_LEVELS[depthLevel];
  const barH = 35;

  // 背景条（锈铁色）
  depthUI.fillStyle(0x1a0c08, 0.95);
  depthUI.fillRect(0, 0, W, barH);

  // 左侧深度标签（金属铜色条）
  depthUI.fillStyle(0xaa4020, 1);
  depthUI.fillRect(0, 0, 6, barH);

  // 底部金属高光线
  depthUI.lineStyle(1, 0x5a2818, 0.5);
  depthUI.lineBetween(0, barH - 1, W, barH - 1);

  // 深度文字（如果已存在则更新，否则创建）
  if (depthText) depthText.destroy();

  depthText = scene.add.text(16, barH / 2, '', {
    fontSize: '16px', fontFamily: '"Courier New", monospace',
    color: '#ffcc88', fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  // 清理旧的段标签
  for (const lbl of depthSegLabels) { lbl.destroy(); }
  depthSegLabels = [];

  // 三段式深度指示条
  const indicatorY = barH / 2;
  const indicatorStartX = 280;
  const segmentW = 180;
  const segmentH = 18;
  const gap = 8;

  for (let i = 0; i < 3; i++) {
    const lvl = DEPTH_LEVELS[i];
    const segX = indicatorStartX + i * (segmentW + gap);
    const isActive = i === depthLevel;
    const isPast = i < depthLevel;

    // 底框（暗锈色）
    depthUI.fillStyle(0x2a1410, 0.8);
    depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 4);

    // 填充色
    if (isActive) {
      depthUI.fillStyle(lvl.color, 0.85);
      depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 4);
      depthUI.lineStyle(2, 0xff8844, 0.9);
      depthUI.strokeRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 4);
      // 光晕
      depthUI.lineStyle(1, 0xffaa66, 0.3);
      depthUI.strokeRoundedRect(segX + 2, indicatorY - segmentH / 2 + 2, segmentW - 4, segmentH - 4, 3);
    } else if (isPast) {
      depthUI.fillStyle(0x4a2820, 0.6);
      depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 4);
    }

    // 段文字
    const segLabel = scene.add.text(segX + segmentW / 2, indicatorY, lvl.depth, {
      fontSize: '12px', fontFamily: '"Courier New", monospace',
      color: isActive ? '#ffdd99' : (isPast ? '#886655' : '#55332a'),
      fontStyle: isActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    depthSegLabels.push(segLabel);
  }

  // 更新深度文字
  const depthStr = depthLevel === 0 ? '地表' :
    depthLevel === 1 ? '地下浅层' : '地核深处';
  depthText.setText(`◈ 探索深度  ${level.depth}  —  ${depthStr}`);
}

/* ============================================================
 * 敌人 UI（Graphics 绘制的彩色方块）
 * ============================================================ */
function createEnemyUI(scene) {
  enemyContainer = scene.add.container(0, 0);

  const g = scene.add.graphics();
  enemyGraphics = g;
  enemyContainer.add(g);

  // 敌人名称
  enemyNameText = scene.add.text(0, 0, '', {
    fontSize: '18px', fontFamily: '"Courier New", monospace',
    color: '#ff6666', fontStyle: 'bold',
  }).setOrigin(0.5);
  enemyContainer.add(enemyNameText);

  // HP 条背景
  enemyHpBarBg = scene.add.graphics();
  enemyContainer.add(enemyHpBarBg);

  // HP 条填充
  enemyHpBarFill = scene.add.graphics();
  enemyContainer.add(enemyHpBarFill);

  // HP 数值文字
  enemyHpText = scene.add.text(0, 0, '', {
    fontSize: '14px', fontFamily: '"Courier New", monospace',
    color: '#ffffff',
  }).setOrigin(0.5);
  enemyContainer.add(enemyHpText);

  // 护盾文字（暖金）
  enemyShieldText = scene.add.text(0, 0, '', {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#ffaa44',
  }).setOrigin(0.5);
  enemyContainer.add(enemyShieldText);

  // 意图文字（炽橙）
  enemyIntentText = scene.add.text(0, 0, '', {
    fontSize: '14px', fontFamily: '"Courier New", monospace',
    color: '#ff8844',
  }).setOrigin(0.5);
  enemyContainer.add(enemyIntentText);

  updateEnemyUI(scene);
}

function updateEnemyUI(scene) {
  if (!enemy) return;
  enemyGraphics.clear();

  const cx = W / 2;
  const boxW = 280;
  const boxH = 100;
  const boxX = cx - boxW / 2;
  const boxY = 42;

  // 敌人方块背景（暗锈金属）
  enemyGraphics.fillStyle(0x1a0c08, 0.95);
  enemyGraphics.fillRoundedRect(boxX, boxY, boxW, boxH, 8);

  // 顶部色条（铁锈橙红）
  enemyGraphics.fillStyle(0xaa3018, 0.85);
  enemyGraphics.fillRoundedRect(boxX, boxY, boxW, 22, { tl: 8, tr: 8, bl: 0, br: 0 });

  // 边框（金属铜色）
  enemyGraphics.lineStyle(2, 0xcc4420, 0.7);
  enemyGraphics.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

  // 顶部边框高光
  enemyGraphics.lineStyle(1, 0xff6633, 0.25);
  enemyGraphics.strokeRoundedRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, 6);

  // 防御指示 — 护盾高亮边框（暖色）
  if (enemy.shield > 0) {
    enemyGraphics.lineStyle(3, 0xff8833, 0.7);
    enemyGraphics.strokeRoundedRect(boxX - 2, boxY - 2, boxW + 4, boxH + 4, 10);
    enemyGraphics.lineStyle(1, 0xffbb66, 0.2);
    enemyGraphics.strokeRoundedRect(boxX - 1, boxY - 1, boxW + 2, boxH + 2, 9);
  }

  // 敌人名（炽热橙红）
  enemyNameText.setPosition(cx, boxY + 12);
  enemyNameText.setText(`◥ ${enemy.name}`);

  // HP 条背景
  const hpBarW = 200;
  const hpBarH = 14;
  const hpBarX = cx - hpBarW / 2;
  const hpBarY = boxY + 34;

  enemyHpBarBg.clear();
  enemyHpBarBg.fillStyle(0x2a1410, 1);
  enemyHpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  enemyHpBarFill.clear();
  const hpRatio = enemy.hp / enemy.maxHp;
  const hpColor = hpRatio > 0.5 ? 0xdd6633 : (hpRatio > 0.25 ? 0xcc8833 : 0xcc3333);
  enemyHpBarFill.fillStyle(hpColor, 1);
  enemyHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 4);

  // HP 文字
  enemyHpText.setPosition(cx, hpBarY + hpBarH / 2);
  enemyHpText.setText(`${enemy.hp} / ${enemy.maxHp}`);

  // 护盾文字
  if (enemy.shield > 0) {
    enemyShieldText.setPosition(cx, hpBarY + hpBarH + 14);
    enemyShieldText.setText(`🛡 护盾 ${enemy.shield}`);
  } else {
    enemyShieldText.setText('');
  }

  // 意图
  enemyIntentText.setPosition(cx, boxY + boxH - 12);
  enemyIntentText.setText(`⚡ ${enemy.getIntentDescription()}`);
}

/** 敌人受击震屏动画 */
function shakeEnemyUI(scene) {
  if (!enemyContainer) return;
  const origX = 0;
  const origY = 0;
  scene.tweens.add({
    targets: enemyContainer,
    x: { from: -6, to: 6 },
    yoyo: true,
    repeat: 3,
    duration: 40,
    ease: 'Power1',
    onComplete: () => {
      enemyContainer.x = origX;
      enemyContainer.y = origY;
    }
  });

  // 闪红
  enemyHpBarFill.clear();
  enemyHpBarFill.fillStyle(0xff0000, 0.9);
  const cx = W / 2;
  const hpBarW = 200;
  const hpBarH = 14;
  const hpBarX = cx - hpBarW / 2;
  const boxY = 42;
  const hpBarY = boxY + 34;
  enemyHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  scene.time.delayedCall(150, () => {
    updateEnemyUI(scene);
  });
}

/* ============================================================
 * 玩家 UI（背景框和静态文字只创建一次，避免堆叠遮挡）
 * ============================================================ */
function createPlayerUI(scene) {
  playerContainer = scene.add.container(0, 0);

  // ---- 背景框（仅创建一次） ----
  const startX = 20;
  const startY = 170;

  const bgBox = scene.add.graphics();
  bgBox.fillStyle(0x1a0c08, 0.9);
  bgBox.fillRoundedRect(startX, startY, 400, 66, 6);
  bgBox.lineStyle(1, 0xaa4020, 0.6);
  bgBox.strokeRoundedRect(startX, startY, 400, 66, 6);
  // 高光
  bgBox.lineStyle(1, 0xff6633, 0.1);
  bgBox.strokeRoundedRect(startX + 1, startY + 1, 398, 64, 5);
  playerContainer.add(bgBox);

  // ---- 名称标签（仅创建一次） ----
  const nameTxt = scene.add.text(startX + 8, startY + 6, `◤ ${player.name}`, {
    fontSize: '14px', fontFamily: '"Courier New", monospace',
    color: '#ff8844', fontStyle: 'bold',
  });
  playerContainer.add(nameTxt);

  // ---- HP 条背景（Graphics，通过 .clear() 复用） ----
  playerHpBarBg = scene.add.graphics();
  playerContainer.add(playerHpBarBg);

  // HP 条填充
  playerHpBarFill = scene.add.graphics();
  playerContainer.add(playerHpBarFill);

  // HP 数值文字
  playerHpText = scene.add.text(0, 0, '', {
    fontSize: '14px', fontFamily: '"Courier New", monospace',
    color: '#ffffff',
  }).setOrigin(0, 0.5);
  playerContainer.add(playerHpText);

  // 护盾文字（暖金）
  playerShieldText = scene.add.text(0, 0, '', {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#ffaa44',
  }).setOrigin(0, 0.5);
  playerContainer.add(playerShieldText);

  // 电量文字（琥珀色）
  playerBatteryText = scene.add.text(0, 0, '', {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#ffcc44',
  }).setOrigin(0, 0.5);
  playerContainer.add(playerBatteryText);

  updatePlayerUI(scene);
}

function updatePlayerUI(scene) {
  playerHpBarBg.clear();
  playerHpBarFill.clear();

  const startX = 20;
  const startY = 170;

  // HP 条背景
  const hpBarW = 180;
  const hpBarH = 14;
  const hpBarX = startX + 80;
  const hpBarY = startY + 8;

  playerHpBarBg.fillStyle(0x2a1410, 1);
  playerHpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  const hpRatio = player.hp / player.maxHp;
  const hpColor = hpRatio > 0.5 ? 0xdd6633 : (hpRatio > 0.25 ? 0xcc8833 : 0xcc3333);
  playerHpBarFill.fillStyle(hpColor, 1);
  playerHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 4);

  playerHpText.setPosition(hpBarX + hpBarW + 10, hpBarY + hpBarH / 2);
  playerHpText.setText(`${player.hp}/${player.maxHp}`);

  // 护盾（与 HP 条同行右侧）
  const shieldStr = player.shield > 0 ? `🛡 护盾 ${player.shield}` : '';
  playerShieldText.setPosition(startX + 8, startY + 32);
  playerShieldText.setText(shieldStr);

  // 电量（与护盾同行，护盾右侧）
  const battStr = `⚡ ${'█'.repeat(player.battery)}${'░'.repeat(player.maxBattery - player.battery)} (${player.battery}/${player.maxBattery})`;
  playerBatteryText.setPosition(startX + 8 + (shieldStr ? 130 : 0), startY + 32);
  playerBatteryText.setText(battStr);
}

/** 玩家受击震屏动画 */
function shakePlayerUI(scene) {
  if (!playerContainer) return;
  scene.tweens.add({
    targets: playerContainer,
    x: { from: -5, to: 5 },
    yoyo: true,
    repeat: 3,
    duration: 40,
    ease: 'Power1',
    onComplete: () => {
      playerContainer.x = 0;
      playerContainer.y = 0;
    }
  });

  // 闪红
  playerHpBarFill.clear();
  playerHpBarFill.fillStyle(0xff0000, 0.9);
  const startX = 20;
  const startY = 170;
  const hpBarW = 180;
  const hpBarH = 14;
  const hpBarX = startX + 80;
  const hpBarY = startY + 8;
  playerHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  scene.time.delayedCall(150, () => {
    updatePlayerUI(scene);
  });
}

/* ============================================================
 * 日志
 * ============================================================ */
function addLog(sender, msg) {
  logLines.push(`[${sender}] ${msg}`);
  if (logLines.length > MAX_LOG) logLines.shift();
}

/* ============================================================
 * UI 刷新
 * ============================================================ */
function refreshUI(scene) {
  updateEnemyUI(scene);
  updatePlayerUI(scene);
  txtLog.setText(logLines.join('\n'));
  txtPileInfo.setText(
    `抽牌堆: ${drawPile.size} 张  手牌: ${hand.length} 张  弃牌堆: ${discardPile.length} 张`
  );
  if (turnPhase === 'playerTurn') {
    txtPhase.setText('▶ 玩家回合 — 请出牌或结束回合');
  } else if (turnPhase === 'enemyTurn') {
    txtPhase.setText('● 敌人回合...');
  } else if (turnPhase === 'gameOver') {
    // 由 gameOver 函数管理
  } else {
    txtPhase.setText('');
  }
}

/* ============================================================
 * 数值飘字特效（Floating Text）
 * ============================================================ */
function spawnFloatingText(scene, target, text, color, offsetY) {
  let targetX, targetY;

  if (target === 'player') {
    targetX = 220;
    targetY = 170 + (offsetY || 0);
  } else {
    targetX = W / 2;
    targetY = 42 + (offsetY || 0);
  }

  const ft = scene.add.text(targetX, targetY - 10, text, {
    fontSize: '20px',
    fontFamily: '"Courier New", monospace',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setAlpha(1);

  scene.tweens.add({
    targets: ft,
    y: targetY - 80,
    alpha: 0,
    duration: 900,
    ease: 'Power2',
    onComplete: () => ft.destroy(),
  });
}

/* ============================================================
 * Graphics 卡牌渲染（彩色方块）
 * ============================================================ */
const CARD_W = 124;
const CARD_H = 72;

function renderHand(scene) {
  // 销毁旧卡牌
  for (const c of cardContainers) { c.destroy(); }
  cardContainers = [];

  if (hand.length === 0) return;

  const gap = 8;
  const totalW = hand.length * CARD_W + (hand.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 415;

  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    const x = startX + i * (CARD_W + gap);
    const container = createCardGraphics(scene, x, y, CARD_W, CARD_H, card, i);
    cardContainers.push(container);
  }
}

function createCardGraphics(scene, x, y, w, h, card, index) {
  const container = scene.add.container(x, y);
  const canPlay = player.canPlay(card.cost);
  const alpha = canPlay ? 1.0 : 0.45;

  // — 卡牌底框 —
  const bg = scene.add.graphics();
  bg.fillStyle(0x1a0c08, 0.95 * alpha);
  bg.fillRoundedRect(0, 0, w, h, 8);

  // — 顶部类型色条 —
  bg.fillStyle(card.color, 0.85 * alpha);
  bg.fillRoundedRect(2, 2, w - 4, 20, { tl: 6, tr: 6, bl: 0, br: 0 });

  // — 边框（金属铜色） —
  bg.lineStyle(2, canPlay ? 0xdd6633 : 0x4a2818, 0.8 * alpha);
  bg.strokeRoundedRect(0, 0, w, h, 8);

  container.add(bg);

  // — 卡牌名（在色条内） —
  const nameTxt = scene.add.text(w / 2, 12, card.name, {
    fontSize: '11px', fontFamily: '"Courier New", monospace',
    color: canPlay ? '#ffffff' : '#667788',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(nameTxt);

  // — 费用指示（左侧能量图标） —
  const costColors = [0xffdd44, 0xff8800, 0xff4444, 0xcc2266];
  const costColor = costColors[Math.min(card.cost - 1, costColors.length - 1)];

  const costBg = scene.add.graphics();
  costBg.fillStyle(0x000000, 0.6);
  costBg.fillCircle(16, 38, 10);
  costBg.fillStyle(costColor, 0.9 * alpha);
  costBg.fillCircle(16, 38, 8);
  container.add(costBg);

  const costTxt = scene.add.text(16, 38, `${card.cost}`, {
    fontSize: '13px', fontFamily: '"Courier New", monospace',
    color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(costTxt);

  // — 描述 —
  const descTxt = scene.add.text(32, 30, card.desc, {
    fontSize: '12px', fontFamily: '"Courier New", monospace',
    color: canPlay ? '#aaccdd' : '#556677',
    wordWrap: { width: w - 40 },
  });
  container.add(descTxt);

  // — 牌底小装饰 —
  const bottomBar = scene.add.graphics();
  const typeColor = card.type === 'damage' ? 0xff4444 : 0x44aaff;
  bottomBar.fillStyle(typeColor, 0.3 * alpha);
  bottomBar.fillRoundedRect(4, h - 6, w - 8, 4, 2);
  container.add(bottomBar);

  // — 交互区域 —
  const hitZone = scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hitZone);

  // 原始 y 位置
  let origY = y;

  hitZone.on('pointerdown', () => {
    if (turnPhase !== 'playerTurn') return;
    playCard(scene, index, container, x, origY);
  });

  // hover 抬起效果
  hitZone.on('pointerover', () => {
    if (!canPlay) return;
    scene.tweens.add({
      targets: container,
      y: origY - 10,
      duration: 80,
      ease: 'Back.easeOut',
    });
    // 边框高亮
    bg.clear();
    bg.fillStyle(0x1a0c08, 0.95 * alpha);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.fillStyle(card.color, 0.85 * alpha);
    bg.fillRoundedRect(2, 2, w - 4, 20, { tl: 6, tr: 6, bl: 0, br: 0 });
    bg.lineStyle(3, 0xff8844, 1);
    bg.strokeRoundedRect(0, 0, w, h, 8);
  });
  hitZone.on('pointerout', () => {
    scene.tweens.add({
      targets: container,
      y: origY,
      duration: 80,
      ease: 'Power1',
    });
    // 恢复边框
    bg.clear();
    bg.fillStyle(0x1a0c08, 0.95 * alpha);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.fillStyle(card.color, 0.85 * alpha);
    bg.fillRoundedRect(2, 2, w - 4, 20, { tl: 6, tr: 6, bl: 0, br: 0 });
    bg.lineStyle(2, canPlay ? 0xdd6633 : 0x4a2818, 0.8 * alpha);
    bg.strokeRoundedRect(0, 0, w, h, 8);
  });

  return container;
}

/* ============================================================
 * 结束回合按钮
 * ============================================================ */
function createEndTurnButton(scene) {
  const container = scene.add.container(W / 2, 610);

  const bg = scene.add.graphics();
  bg.fillStyle(0x5a2212, 0.95);
  bg.fillRoundedRect(-70, -16, 140, 32, 8);
  bg.lineStyle(2, 0xcc4420, 0.9);
  bg.strokeRoundedRect(-70, -16, 140, 32, 8);
  // 内高光
  bg.lineStyle(1, 0xff6633, 0.15);
  bg.strokeRoundedRect(-68, -14, 136, 28, 7);
  container.add(bg);

  const text = scene.add.text(0, 0, '结束回合', {
    fontSize: '15px', fontFamily: '"Courier New", monospace',
    color: '#ffffff',
  }).setOrigin(0.5);
  container.add(text);

  const hitZone = scene.add.rectangle(0, 0, 140, 32, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hitZone);

  hitZone.on('pointerdown', () => {
    if (turnPhase !== 'playerTurn') return;
    endPlayerTurn(scene);
  });

  hitZone.on('pointerover', () => {
    bg.clear();
    bg.fillStyle(0x7a3018, 1);
    bg.fillRoundedRect(-70, -16, 140, 32, 8);
    bg.lineStyle(2, 0xff6633, 1);
    bg.strokeRoundedRect(-70, -16, 140, 32, 8);
    bg.lineStyle(1, 0xff8844, 0.2);
    bg.strokeRoundedRect(-68, -14, 136, 28, 7);
  });
  hitZone.on('pointerout', () => {
    bg.clear();
    bg.fillStyle(0x5a2212, 0.95);
    bg.fillRoundedRect(-70, -16, 140, 32, 8);
    bg.lineStyle(2, 0xcc4420, 0.9);
    bg.strokeRoundedRect(-70, -16, 140, 32, 8);
    bg.lineStyle(1, 0xff6633, 0.15);
    bg.strokeRoundedRect(-68, -14, 136, 28, 7);
  });

  return container;
}

/* ============================================================
 * 关卡初始化
 * ============================================================ */
function initLevel(levelIndex) {
  enemyQueue = buildEnemyForLevel(levelIndex);
  if (enemyQueue.length === 0) {
    // 容错
    enemyQueue = buildEnemyForLevel(0);
  }
  enemy = enemyQueue.shift();
  // 重置敌人回合计数器
  enemy.turnCount = 0;
}

/** 切换到下一关 */
function advanceLevel(scene) {
  depthLevel++;
  if (depthLevel >= DEPTH_LEVELS.length) {
    // 理论上不会到这里，由胜利逻辑处理
    return;
  }
  initLevel(depthLevel);
  updateDepthUI(scene);
  addLog('系统', `=== 下潜至 ${DEPTH_LEVELS[depthLevel].label} ===`);
  addLog('系统', `敌军：${enemy.name} 出现了！`);
}

/** 进入 Boss 战（2000m 第二场） */
function startBossFight(scene) {
  enemy = buildFinalBoss();
  enemy.turnCount = 0;
  addLog('系统', '⚠ 警告：火星吞噬者 出现了！');
}

/* ============================================================
 * 关卡过渡动画
 * ============================================================ */
function playTransitionToNextLevel(scene, callback) {
  turnPhase = 'transition';

  // 全屏遮罩
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0);
  overlay.fillRect(0, 0, W, H);

  // "向下潜入中..." 文字
  const nextLevel = DEPTH_LEVELS[depthLevel + 1];
  const transitText = scene.add.text(W / 2, H / 2 - 40, '▼ 向下潜入中...', {
    fontSize: '36px', fontFamily: '"Courier New", monospace',
    color: '#ff8844', fontStyle: 'bold',
  }).setOrigin(0.5).setAlpha(0);

  const depthLabel = scene.add.text(W / 2, H / 2 + 20, `目标深度：${nextLevel.label}`, {
    fontSize: '20px', fontFamily: '"Courier New", monospace',
    color: '#cc8866',
  }).setOrigin(0.5).setAlpha(0);

  // 闪烁效果
  scene.tweens.add({
    targets: overlay,
    alpha: { from: 0, to: 0.85 },
    duration: 300,
    ease: 'Power2',
  });

  scene.tweens.add({
    targets: transitText,
    alpha: 1,
    y: H / 2 - 50,
    duration: 400,
    ease: 'Power2',
  });

  scene.tweens.add({
    targets: depthLabel,
    alpha: 1,
    duration: 500,
    delay: 200,
  });

  // 闪烁 3 次
  let flashCount = 0;
  const flashInterval = scene.time.addEvent({
    delay: 250,
    callback: () => {
      flashCount++;
      const flash = scene.add.graphics();
      flash.fillStyle(0xffffff, flashCount % 2 === 1 ? 0.15 : 0);
      flash.fillRect(0, 0, W, H);
      scene.time.delayedCall(100, () => flash.destroy());

      if (flashCount >= 6) {
        flashInterval.remove();
        // 淡出并回调
        scene.tweens.add({
          targets: [transitText, depthLabel, overlay],
          alpha: 0,
          duration: 400,
          ease: 'Power2',
          onComplete: () => {
            transitText.destroy();
            depthLabel.destroy();
            overlay.destroy();
            if (callback) callback();
          }
        });
      }
    },
    repeat: 5,
  });
}

/* ============================================================
 * 回合状态机
 * ============================================================ */

/** 玩家回合开始 */
function startPlayerTurn(scene) {
  if (!player.isAlive) {
    gameOver(scene, 'defeat');
    return;
  }
  if (!enemy.isAlive) {
    handleEnemyDefeated(scene);
    return;
  }

  turnPhase = 'playerTurn';

  // 1. 重置电量为 3
  player.resetBattery();
  // 2. 清空玩家护盾
  player.clearShield();
  addLog('系统', `--- 玩家回合 ---`);
  addLog('系统', `电量重置为 ${player.maxBattery}，护盾已清空`);

  // 3. 从抽牌堆抽取 4 张
  drawCards(scene, 4);

  refreshUI(scene);
  renderHand(scene);
}

/** 抽牌逻辑 */
function drawCards(scene, count) {
  let drawn = drawPile.draw(count);
  if (drawn.length < count) {
    addLog('系统', `抽牌堆不足，洗入弃牌堆 (${discardPile.length} 张)`);
    drawPile.reshuffle(discardPile);
    discardPile = [];
    const remaining = count - drawn.length;
    const more = drawPile.draw(remaining);
    drawn = drawn.concat(more);
  }
  hand = hand.concat(drawn);
  addLog('系统', `抽取了 ${drawn.length} 张牌`);
}

/** 出牌（含卡牌动画） */
function playCard(scene, index, cardContainer, cardX, cardY) {
  const card = hand[index];
  if (!card) return;
  if (turnPhase !== 'playerTurn') return;

  if (!player.canPlay(card.cost)) {
    addLog('提示', `电量不足！需要 ${card.cost} 电量`);
    refreshUI(scene);
    return;
  }

  // 扣除电量
  player.spendBattery(card.cost);

  // ---- 动画：卡牌飞出 ----
  // 在手牌位置创建一个副本并执行飞出动画
  const flyCard = scene.add.graphics();
  const w = CARD_W, h = CARD_H;
  flyCard.fillStyle(0x1a0c08, 0.95);
  flyCard.fillRoundedRect(0, 0, w, h, 8);
  flyCard.fillStyle(card.color, 0.85);
  flyCard.fillRoundedRect(2, 2, w - 4, 20, { tl: 6, tr: 6, bl: 0, br: 0 });
  flyCard.lineStyle(2, 0xff8844, 1);
  flyCard.strokeRoundedRect(0, 0, w, h, 8);

  // 复制文字
  const flyName = scene.add.text(w / 2, 12, card.name, {
    fontSize: '11px', fontFamily: '"Courier New", monospace',
    color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5);

  const flyDesc = scene.add.text(16, 34, card.desc, {
    fontSize: '11px', fontFamily: '"Courier New", monospace',
    color: '#aaccdd',
  });

  const flyContainer = scene.add.container(cardX, cardY, [flyCard, flyName, flyDesc]);

  // 上移 + 淡出
  scene.tweens.add({
    targets: flyContainer,
    y: cardY - 140,
    alpha: 0,
    scaleX: 0.7,
    scaleY: 0.7,
    duration: 350,
    ease: 'Power2',
    onComplete: () => flyContainer.destroy(),
  });

  // ---- 应用卡牌效果 ----
  if (card.type === 'damage') {
    const result = enemy.takeDamage(card.value);
    addLog(card.name, `对 ${enemy.name} 造成 ${card.value} 点伤害` +
      (result.absorbed > 0 ? ` (护盾吸收 ${result.absorbed})` : ''));

    // 敌人受伤飘字（红色）
    spawnFloatingText(scene, 'enemy', `-${card.value} HP`, '#ff4422');

    // 敌人受击震屏
    shakeEnemyUI(scene);
  } else if (card.type === 'shield') {
    player.addShield(card.value);
    addLog(card.name, `获得 ${card.value} 点护盾`);

    // 护盾飘字（暖金）
    spawnFloatingText(scene, 'player', `+${card.value} 护盾`, '#ffaa44');
  }

  // 从手牌移除，进弃牌堆
  hand.splice(index, 1);
  discardPile.push(card);

  // 立即隐藏被点击的卡牌（已移除了）
  // 短暂延迟后刷新手牌
  scene.time.delayedCall(100, () => {
    refreshUI(scene);

    // 检查敌人是否死亡
    if (!enemy.isAlive) {
      // 不再渲染手牌，准备处理击败
      renderHand(scene);
      handleEnemyDefeated(scene);
      return;
    }

    renderHand(scene);
  });
}

/** 处理敌人被击败 */
function handleEnemyDefeated(scene) {
  addLog('系统', `✦ ${enemy.name} 已被击败！`);

  // 清空手牌
  discardPile = discardPile.concat(hand);
  hand = [];
  renderHand(scene);
  refreshUI(scene);

  // 判断当前关卡是否还有更多敌人
  if (enemyQueue.length > 0) {
    // 同一关卡的下一个敌人
    enemy = enemyQueue.shift();
    enemy.turnCount = 0;
    addLog('系统', `敌军：${enemy.name} 出现了！`);

    // 短暂延迟后开始新回合
    scene.time.delayedCall(600, () => {
      startPlayerTurn(scene);
    });
  } else if (depthLevel === 2 && !isFinalBossDefeated) {
    // 2000m：地底潜伏者已被击败，进入 Boss 战
    // 标记为 true 以便后续击败 Boss 时判定通关，而非再次进入 Boss 流程

    // 过渡效果
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W, H);

    const warningText = scene.add.text(W / 2, H / 2 - 20, '⚠ 检测到巨大生命信号...', {
      fontSize: '26px', fontFamily: '"Courier New", monospace',
      color: '#ff6633', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const bossText = scene.add.text(W / 2, H / 2 + 25, '火星吞噬者 正在苏醒！', {
      fontSize: '22px', fontFamily: '"Courier New", monospace',
      color: '#ff4422',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.8 },
      duration: 500,
    });

    scene.tweens.add({
      targets: warningText,
      alpha: 1,
      duration: 400,
    });

    scene.tweens.add({
      targets: bossText,
      alpha: 1,
      duration: 400,
      delay: 300,
    });

    // 闪烁警告
    let flashCount = 0;
    const flashTimer = scene.time.addEvent({
      delay: 300,
      callback: () => {
        flashCount++;
        const flash = scene.add.graphics();
        flash.fillStyle(0xff0000, flashCount % 2 === 1 ? 0.1 : 0);
        flash.fillRect(0, 0, W, H);
        scene.time.delayedCall(100, () => flash.destroy());

        if (flashCount >= 6) {
          flashTimer.remove();
          scene.tweens.add({
            targets: [warningText, bossText, overlay],
            alpha: 0,
            duration: 400,
            onComplete: () => {
              warningText.destroy();
              bossText.destroy();
              overlay.destroy();
              // 开始 Boss 战
              startBossFight(scene);
              isFinalBossDefeated = true; // Boss 战已激活，下次击败即为通关
              refreshUI(scene);
              scene.time.delayedCall(300, () => {
                startPlayerTurn(scene);
              });
            }
          });
        }
      },
      repeat: 5,
    });
  } else {
    // 普通关卡通关 → 进入下一关
    if (depthLevel < DEPTH_LEVELS.length - 1) {
      playTransitionToNextLevel(scene, () => {
        advanceLevel(scene);
        refreshUI(scene);
        // 重新创建牌组（保持现有牌组，只重置状态）
        discardPile = discardPile.concat(hand);
        hand = [];
        // 用当前弃牌堆重新洗牌构建抽牌堆
        drawPile.reshuffle(discardPile);
        discardPile = [];
        refreshUI(scene);
        startPlayerTurn(scene);
      });
    } else {
      // 所有关卡完成 + 最终 Boss 已击败
      gameOver(scene, 'victory');
    }
  }
}

/** 玩家结束回合 → 触发敌人 AI */
function endPlayerTurn(scene) {
  turnPhase = 'enemyTurn';
  addLog('系统', `--- 敌人回合 ---`);

  // 手牌全部进入弃牌堆
  addLog('系统', `${hand.length} 张手牌进入弃牌堆`);
  discardPile = discardPile.concat(hand);
  hand = [];

  refreshUI(scene);
  renderHand(scene);

  // 敌人 AI 延迟
  scene.time.delayedCall(700, () => {
    if (!enemy.isAlive) {
      handleEnemyDefeated(scene);
      return;
    }
    executeEnemyTurn(scene);
  });
}

/** 执行敌人回合 */
function executeEnemyTurn(scene) {
  if (!enemy.isAlive) {
    handleEnemyDefeated(scene);
    return;
  }

  const result = enemy.executeTurn(player);

  if (result.type === 'damage' || result.type === 'chargedAttack') {
    addLog(enemy.name, result.desc);
    // 玩家受击飘字（红色）
    spawnFloatingText(scene, 'player', `-${result.value} HP`, '#ff4422');
    shakePlayerUI(scene);
  } else if (result.type === 'shield') {
    addLog(enemy.name, result.desc);
    // 敌人护盾飘字（暖金）
    spawnFloatingText(scene, 'enemy', `+${result.value} 护盾`, '#ffaa44');
  } else if (result.type === 'charge') {
    addLog(enemy.name, result.desc);
  }

  refreshUI(scene);

  // 检查玩家是否死亡
  if (!player.isAlive) {
    scene.time.delayedCall(500, () => gameOver(scene, 'defeat'));
    return;
  }

  // 切换到玩家回合
  scene.time.delayedCall(600, () => {
    startPlayerTurn(scene);
  });
}

/* ============================================================
 * 游戏结束
 * ============================================================ */
function gameOver(scene, result) {
  turnPhase = 'gameOver';

  const W2 = W, H2 = H;

  // --- 遮罩层 ---
  const overlay = scene.add.graphics();

  if (result === 'victory' && isFinalBossDefeated) {
    // ========= 精美通关画面 =========
    overlay.fillStyle(0x080202, 0);
    overlay.fillRect(0, 0, W2, H2);

    scene.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.88 },
      duration: 800,
      ease: 'Power2',
    });

    // 微光粒子背景
    for (let i = 0; i < 30; i++) {
      const px = Phaser.Math.Between(0, W2);
      const py = Phaser.Math.Between(0, H2);
      const dot = scene.add.circle(px, py, Phaser.Math.Between(1, 3), 0xff8844, 0.3);
      scene.tweens.add({
        targets: dot,
        alpha: { from: 0, to: 0.6 },
        y: py - Phaser.Math.Between(20, 60),
        duration: Phaser.Math.Between(1500, 3000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // 顶部大标题
    const missionTitle = scene.add.text(W2 / 2, H2 / 2 - 120, 'MISSION SUCCESS', {
      fontSize: '42px',
      fontFamily: '"Courier New", monospace',
      color: '#ff8844',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: missionTitle,
      alpha: 1,
      y: H2 / 2 - 130,
      duration: 700,
      ease: 'Back.easeOut',
    });

    // 分隔线
    const line = scene.add.graphics().setAlpha(0);
    scene.tweens.add({
      targets: line,
      alpha: 1,
      delay: 500,
      duration: 400,
    });
    line.lineStyle(2, 0xff8844, 0.7);
    line.lineBetween(W2 / 2 - 140, H2 / 2 - 80, W2 / 2 + 140, H2 / 2 - 80);

    // 主信息
    const mainMsg = scene.add.text(W2 / 2, H2 / 2 - 30, '火星安全前哨站已成功建立！', {
      fontSize: '22px',
      fontFamily: '"Courier New", monospace',
      color: '#ffdd99',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: mainMsg,
      alpha: 1,
      y: H2 / 2 - 40,
      duration: 600,
      delay: 600,
      ease: 'Power2',
    });

    // 副信息
    const subMsg = scene.add.text(W2 / 2, H2 / 2 + 20, '人类在火星地下立住了脚跟。\n在这颗锈红色的星球上，新的家园正在诞生。', {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#cc8866',
      align: 'center',
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: subMsg,
      alpha: 1,
      duration: 600,
      delay: 1000,
    });

    // 重新开始按钮
    const btnContainer = scene.add.container(W2 / 2, H2 / 2 + 100).setAlpha(0);
    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x5a2212, 1);
    btnBg.fillRoundedRect(-100, -22, 200, 44, 10);
    btnBg.lineStyle(2, 0xcc4420, 1);
    btnBg.strokeRoundedRect(-100, -22, 200, 44, 10);
    btnBg.lineStyle(1, 0xff8844, 0.2);
    btnBg.strokeRoundedRect(-98, -20, 196, 40, 9);
    btnContainer.add(btnBg);

    const btnText = scene.add.text(0, 0, '⟳ 重新开始', {
      fontSize: '18px',
      fontFamily: '"Courier New", monospace',
      color: '#ffcc88',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const btnHit = scene.add.rectangle(0, 0, 200, 44, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    btnContainer.add(btnHit);

    btnHit.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x7a3018, 1);
      btnBg.fillRoundedRect(-100, -22, 200, 44, 10);
      btnBg.lineStyle(2, 0xff6633, 1);
      btnBg.strokeRoundedRect(-100, -22, 200, 44, 10);
      btnBg.lineStyle(1, 0xffaa66, 0.3);
      btnBg.strokeRoundedRect(-98, -20, 196, 40, 9);
      scene.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    btnHit.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x5a2212, 1);
      btnBg.fillRoundedRect(-100, -22, 200, 44, 10);
      btnBg.lineStyle(2, 0xcc4420, 1);
      btnBg.strokeRoundedRect(-100, -22, 200, 44, 10);
      btnBg.lineStyle(1, 0xff8844, 0.2);
      btnBg.strokeRoundedRect(-98, -20, 196, 40, 9);
      scene.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 100 });
    });
    btnHit.on('pointerdown', () => {
      scene.scene.restart();
    });

    scene.tweens.add({
      targets: btnContainer,
      alpha: 1,
      duration: 600,
      delay: 1400,
      ease: 'Power2',
    });

  } else {
    // ========= 普通游戏结束（战败 或 普通胜利） =========
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W2, H2);

    scene.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.75 },
      duration: 500,
      ease: 'Power2',
    });

    let msg, subMsg, color;

    if (result === 'victory') {
      msg = '✦ 胜利 ✦';
      subMsg = '';
      color = '#ffdd44';
    } else {
      msg = '✧ 战败... 宇航员倒下了 ✧';
      subMsg = '火星的深处，埋藏着未竟的使命...';
      color = '#ff4444';
    }

    const title = scene.add.text(W2 / 2, H2 / 2 - 40, msg, {
      fontSize: '26px', fontFamily: '"Courier New", monospace',
      color, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = scene.add.text(W2 / 2, H2 / 2 + 5, subMsg, {
      fontSize: '16px', fontFamily: '"Courier New", monospace',
      color: '#cc8866',
    }).setOrigin(0.5).setAlpha(0);

    const restartHint = scene.add.text(W2 / 2, H2 / 2 + 50, '点击任意位置重新开始', {
      fontSize: '15px', fontFamily: '"Courier New", monospace',
      color: '#886655',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({
      targets: title,
      alpha: 1,
      y: H2 / 2 - 50,
      duration: 600,
      delay: 200,
    });

    scene.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      delay: 500,
    });

    scene.tweens.add({
      targets: restartHint,
      alpha: 1,
      duration: 600,
      delay: 800,
    });

    // 点击重新开始
    const restartZone = scene.add.rectangle(W2 / 2, H2 / 2, W2, H2, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    restartZone.on('pointerdown', () => {
      scene.scene.restart();
    });
  }

  addLog('系统', result === 'victory' ? '✦ 使命完成！' : '✧ 战败...');
  refreshUI(scene);
}

/* ============================================================
 * update 循环
 * ============================================================ */
function update() {
  // 预留
}
