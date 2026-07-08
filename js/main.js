/**
 * main.js — Forcing Mars 强渡火星
 * 回合制卡牌对战 · 三深度关卡推进 · 左右对峙布局
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
  scene: [StoryScene, {
    key: 'BattleScene',
    preload,
    create,
    update,
  }],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    max: { width: 960, height: 640 },
  },
});

/* ============================================================
 * 资源预加载
 * ============================================================ */
function preload() {
  const scene = this;

  // 背景
  scene.load.image('bg-surface', 'assets/backgrounds/bg_surface.jpg');
  scene.load.image('bg-shallow', 'assets/backgrounds/bg_shallow.jpg');
  scene.load.image('bg-core', 'assets/backgrounds/bg_core.jpg');
  scene.load.image('bg-transition', 'assets/backgrounds/bg_transition.png');

  // 敌人
  scene.load.image('enemy_mars_leech', 'assets/enemies/enemy_mars_leech.png');
  scene.load.image('enemy_dune_stalker', 'assets/enemies/enemy_dune_stalker.png');
  scene.load.image('enemy_red_crawler', 'assets/enemies/enemy_red_crawler.png');
  scene.load.image('enemy_crystal_parasite', 'assets/enemies/enemy_crystal_parasite.png');
  scene.load.image('enemy_deep_lurker', 'assets/enemies/enemy_deep_lurker.png');
  scene.load.image('enemy_mars_devourer', 'assets/enemies/enemy_mars_devourer.png');

  // 玩家
  scene.load.image('player_astronaut', 'assets/player/player_astronaut.png');
  scene.load.image('player_avatar', 'assets/player/player_avatar.png');

  // UI
  scene.load.image('ui_card_base', 'assets/ui/ui_card_base.png');
  scene.load.image('ui_btn_endturn', 'assets/ui/ui_btn_endturn.png');
  scene.load.image('ui_bar_bg', 'assets/ui/ui_bar_bg.png');
}

/* ============================================================
 * 全局状态（收敛到 GameState，便于调试、存档、扩展）
 * ============================================================ */
const GameState = {
  player: null,
  enemy: null,
  enemyQueue: [],
  depthLevel: 0,
  isFinalBossDefeated: false,

  drawPile: null,
  hand: [],
  discardPile: [],

  turnPhase: 'idle',

  cardContainers: [],
  logLines: [],
  MAX_LOG: 4,
};

/* ============================================================
 * UI 组件引用
 * ============================================================ */
let backgroundImage;
let depthUI;
let depthText;
let depthSegLabels = [];
let logText;
let drawPileText;
let discardPileText;
let turnPhaseText;

// 玩家（左侧）
let playerContainer;
let playerSprite;
let playerHpBarBg;
let playerHpBarFill;
let playerShieldBar;
let playerHpText;
let playerShieldIcon;
let playerShieldText;
let batterySlots = [];
let playerRelicSlots = [];

// 敌人（右侧）
let enemyContainer;
let enemySprite;
let enemyNameText;
let enemyHpBarBg;
let enemyHpBarFill;
let enemyShieldBar;
let enemyHpText;
let enemyShieldText;
let enemyIntentIcon;
let enemyIntentText;
let enemyMaskShape;
let bossChargeTween;
let bossWarningText;

// 结束回合按钮
let endTurnBtn;

/* ============================================================
 * 场景钩子 create
 * ============================================================ */
function create() {
  /* ---------- 初始化 ---------- */
  GameState.player = new Player();
  GameState.depthLevel = 0;
  GameState.isFinalBossDefeated = false;
  GameState.turnPhase = 'idle';
  GameState.hand = [];
  GameState.discardPile = [];
  GameState.drawPile = new DrawPile(buildStarterDeck());
  GameState.cardContainers = [];
  GameState.logLines = [];

  initLevel(GameState.depthLevel);

  /* ---------- 背景 ---------- */
  setBackgroundForLevel(this, GameState.depthLevel);

  /* ---------- 顶部状态栏 ---------- */
  createDepthUI(this);

  /* ---------- 日志 ---------- */
  logText = this.add.text(W / 2, 58, '', {
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    color: '#ffddbb',
    align: 'center',
    lineSpacing: 4,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 0);

  /* ---------- 角色对抗区 ---------- */
  createPlayerUI(this);
  createEnemyUI(this);

  /* ---------- 阶段提示 ---------- */
  turnPhaseText = this.add.text(W / 2, 370, '', {
    fontSize: '15px',
    fontFamily: '"Courier New", monospace',
    color: '#ffaa44',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);

  /* ---------- 牌库信息（左右下角） ---------- */
  drawPileText = this.add.text(80, 440, '', {
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    color: '#ffccaa',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);

  discardPileText = this.add.text(W - 80, 440, '', {
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    color: '#ffccaa',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);

  /* ---------- 结束回合按钮 ---------- */
  endTurnBtn = createEndTurnButton(this);

  /* ---------- 启动 ---------- */
  addLog('系统', `=== 强渡火星 ===`);
  addLog('系统', `当前深度：${DEPTH_LEVELS[GameState.depthLevel].label}`);
  addLog('系统', `敌军：${GameState.enemy.name} 出现了！`);
  startPlayerTurn(this);
}

/* ============================================================
 * 背景图管理
 * ============================================================ */
function setBackgroundForLevel(scene, levelIndex) {
  const bgKeys = ['bg-surface', 'bg-shallow', 'bg-core'];
  const bgKey = bgKeys[levelIndex] || bgKeys[0];

  if (backgroundImage) backgroundImage.destroy();

  backgroundImage = scene.add.image(0, 0, bgKey)
    .setOrigin(0)
    .setDisplaySize(W, H)
    .setDepth(-10);
}

/* ============================================================
 * 深度指示器（顶部状态栏）
 * ============================================================ */
function createDepthUI(scene) {
  depthUI = scene.add.graphics();
  updateDepthUI(scene);
}

function updateDepthUI(scene) {
  depthUI.clear();

  const barH = 42;

  // 背景条
  depthUI.fillStyle(0x0a0505, 0.92);
  depthUI.fillRect(0, 0, W, barH);

  // 顶部霓虹绿线
  depthUI.lineStyle(1, 0x33ff77, 0.6);
  depthUI.lineBetween(0, barH - 1, W, barH - 1);

  // 左侧标签
  depthUI.fillStyle(0x22aa44, 1);
  depthUI.fillRect(0, 0, 4, barH);

  // 清理旧段标签
  for (const lbl of depthSegLabels) { lbl.destroy(); }
  depthSegLabels = [];

  // 三段式深度指示条
  const indicatorY = barH / 2;
  const indicatorStartX = 300;
  const segmentW = 160;
  const segmentH = 16;
  const gap = 10;

  for (let i = 0; i < 3; i++) {
    const lvl = DEPTH_LEVELS[i];
    const segX = indicatorStartX + i * (segmentW + gap);
    const isActive = i === GameState.depthLevel;
    const isPast = i < GameState.depthLevel;

    depthUI.fillStyle(0x1a1110, 0.85);
    depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 3);

    if (isActive) {
      depthUI.fillStyle(lvl.color, 0.9);
      depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 3);
      depthUI.lineStyle(2, 0x33ff77, 1);
      depthUI.strokeRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 3);
    } else if (isPast) {
      depthUI.fillStyle(0x4a2820, 0.7);
      depthUI.fillRoundedRect(segX, indicatorY - segmentH / 2, segmentW, segmentH, 3);
    }

    const segLabel = scene.add.text(segX + segmentW / 2, indicatorY, lvl.depth, {
      fontSize: '11px',
      fontFamily: '"Courier New", monospace',
      color: isActive ? '#ccffcc' : (isPast ? '#887766' : '#55332a'),
      fontStyle: isActive ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    depthSegLabels.push(segLabel);
  }

  // 深度文字
  if (depthText) depthText.destroy();
  const depthStr = GameState.depthLevel === 0 ? '地表' :
    GameState.depthLevel === 1 ? '地下浅层' : '地核深处';
  depthText = scene.add.text(W / 2, 10, `◈ 探索深度  ${DEPTH_LEVELS[GameState.depthLevel].depth}  —  ${depthStr}`, {
    fontSize: '16px',
    fontFamily: '"Courier New", monospace',
    color: '#66ff99',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 0);
}

/* ============================================================
 * 玩家 UI（左侧）
 * ============================================================ */
function createPlayerUI(scene) {
  playerContainer = scene.add.container(0, 0);

  const px = 200;
  const py = 250;

  // 玩家底色板（遮挡非透明资源背景）
  const playerBg = scene.add.graphics();
  playerBg.fillStyle(0x1a0a08, 0.85);
  playerBg.fillRoundedRect(px - 72, py - 72, 144, 144, 16);
  playerBg.lineStyle(2, 0x336688, 0.6);
  playerBg.strokeRoundedRect(px - 72, py - 72, 144, 144, 16);
  playerContainer.add(playerBg);

  // 玩家立绘/方块
  if (scene.textures.exists('player_astronaut')) {
    playerSprite = scene.add.image(px, py, 'player_astronaut')
      .setOrigin(0.5)
      .setDisplaySize(140, 140);
  } else {
    const fallback = scene.add.graphics();
    fallback.fillStyle(0x224466, 1);
    fallback.fillRoundedRect(px - 60, py - 60, 120, 120, 12);
    fallback.lineStyle(2, 0x66ccff, 1);
    fallback.strokeRoundedRect(px - 60, py - 60, 120, 120, 12);
    playerSprite = fallback;
  }
  // 圆形遮罩，裁掉非透明背景
  const playerMaskShape = scene.add.graphics();
  playerMaskShape.fillStyle(0xffffff);
  playerMaskShape.fillCircle(px, py, 68);
  const playerMask = playerMaskShape.createGeometryMask();
  playerSprite.setMask(playerMask);
  playerMaskShape.setVisible(false);
  playerContainer.add(playerSprite);
  playerContainer.add(playerMaskShape);

  // 玩家名
  const nameText = scene.add.text(px, py + 82, GameState.player.name, {
    fontSize: '15px',
    fontFamily: '"Courier New", monospace',
    color: '#66ddff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);
  playerContainer.add(nameText);

  // HP 条
  playerHpBarBg = scene.add.graphics();
  playerHpBarFill = scene.add.graphics();
  playerShieldBar = scene.add.graphics();
  playerContainer.add([playerHpBarBg, playerShieldBar, playerHpBarFill]);

  // HP 数值
  playerHpText = scene.add.text(0, 0, '', {
    fontSize: '13px',
    fontFamily: '"Courier New", monospace',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  playerContainer.add(playerHpText);

  // 护盾图标（六边形）
  playerShieldIcon = scene.add.graphics();
  playerShieldText = scene.add.text(0, 0, '', {
    fontSize: '12px',
    fontFamily: '"Courier New", monospace',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  playerContainer.add([playerShieldIcon, playerShieldText]);

  // 能量电池槽
  batterySlots = [];
  for (let i = 0; i < GameState.player.maxBattery; i++) {
    const slot = scene.add.graphics();
    playerContainer.add(slot);
    batterySlots.push(slot);
  }

  // 遗物槽（空位与已获取遗物均由 updatePlayerUI 绘制）
  playerRelicSlots = [];

  updatePlayerUI(scene);
}

function drawHexagon(gfx, cx, cy, r, color, alpha) {
  gfx.fillStyle(color, alpha);
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i - Math.PI / 2;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  gfx.fillPoints(points, true, true);
}

function drawHexagonOutline(gfx, cx, cy, r, color, alpha, lineWidth = 1.5) {
  gfx.lineStyle(lineWidth, color, alpha);
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i - Math.PI / 2;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  gfx.strokePoints(points, true, true);
}

function drawStar(gfx, cx, cy, points, outerR, innerR) {
  const path = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    path.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  gfx.fillPoints(path, true, true);
}

function updatePlayerUI(scene) {
  const px = 200;
  const hpBarY = 120;
  const hpBarW = 170;
  const hpBarH = 14;
  const hpBarX = px - hpBarW / 2;

  // HP 条背景
  playerHpBarBg.clear();
  playerHpBarBg.fillStyle(0x2a1410, 1);
  playerHpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  // 护盾覆盖条
  playerShieldBar.clear();
  const shieldRatio = Math.min(GameState.player.shield / GameState.player.maxHp, 1);
  if (shieldRatio > 0) {
    playerShieldBar.fillStyle(0x44aaff, 0.5);
    playerShieldBar.fillRoundedRect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH, 4);
  }

  // HP 填充
  playerHpBarFill.clear();
  const hpRatio = GameState.player.hp / GameState.player.maxHp;
  const hpColor = hpRatio > 0.5 ? 0x33cc55 : (hpRatio > 0.25 ? 0xccaa33 : 0xcc3333);
  playerHpBarFill.fillStyle(hpColor, 1);
  playerHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 4);

  // HP 数值
  playerHpText.setPosition(px, hpBarY + hpBarH / 2);
  playerHpText.setText(`${GameState.player.hp}/${GameState.player.maxHp}`);

  // 护盾六边形
  playerShieldIcon.clear();
  const shieldX = hpBarX - 24;
  const shieldY = hpBarY + hpBarH / 2;
  if (GameState.player.shield > 0) {
    drawHexagon(playerShieldIcon, shieldX, shieldY, 16, 0x44aaff, 1);
    playerShieldText.setPosition(shieldX, shieldY);
    playerShieldText.setText(`${GameState.player.shield}`);
  } else {
    playerShieldText.setText('');
  }

  // 电池槽（动态增减，以适配遗物提升的最大电量）
  const battY = 420;
  while (batterySlots.length < GameState.player.maxBattery) {
    const slot = scene.add.graphics();
    playerContainer.add(slot);
    batterySlots.push(slot);
  }
  while (batterySlots.length > GameState.player.maxBattery) {
    const slot = batterySlots.pop();
    slot.destroy();
  }
  for (let i = 0; i < batterySlots.length; i++) {
    const slot = batterySlots[i];
    slot.clear();
    const filled = i < GameState.player.battery;
    const color = filled ? 0x33ccff : 0x223344;
    const glow = filled ? 0x66ffff : 0x112233;
    const x = px - 40 + i * 28;
    slot.lineStyle(2, glow, filled ? 1 : 0.4);
    slot.fillStyle(color, filled ? 1 : 0.3);
    slot.fillCircle(x, battY, 10);
    slot.strokeCircle(x, battY, 10);
  }

  // 遗物槽（HP 条下方）
  for (const slot of playerRelicSlots) { slot.destroy(); }
  playerRelicSlots = [];

  const relicY = hpBarY + hpBarH + 22;
  const relicSize = 10;
  const relicGap = 8;
  const relicStartX = hpBarX + relicSize + 4;

  if (GameState.player.relics.length === 0) {
    const emptySlot = scene.add.graphics();
    drawHexagonOutline(emptySlot, relicStartX, relicY, relicSize, 0x887766, 0.65);
    playerContainer.add(emptySlot);
    playerRelicSlots.push(emptySlot);
  } else {
    for (let i = 0; i < GameState.player.relics.length; i++) {
      const relic = GameState.player.relics[i];
      const rx = relicStartX + i * (relicSize * 2 + relicGap);
      const slot = scene.add.graphics();
      drawHexagon(slot, rx, relicY, relicSize, relic.color, 0.95);
      drawHexagonOutline(slot, rx, relicY, relicSize, 0xffffff, 0.4);
      playerContainer.add(slot);
      playerRelicSlots.push(slot);
    }
  }
}

/** 玩家受击震屏 */
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

  playerHpBarFill.clear();
  playerHpBarFill.fillStyle(0xff0000, 0.9);
  const px = 200;
  const hpBarY = 120;
  const hpBarW = 170;
  const hpBarH = 14;
  const hpBarX = px - hpBarW / 2;
  playerHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  scene.time.delayedCall(150, () => updatePlayerUI(scene));
}

/* ============================================================
 * 敌人 UI（右侧）
 * ============================================================ */
function createEnemyUI(scene) {
  enemyContainer = scene.add.container(0, 0);

  const ex = 820;
  const ey = 250;

  // 敌人底色板
  const enemyBg = scene.add.graphics();
  enemyBg.fillStyle(0x1a0a08, 0.85);
  enemyBg.fillRoundedRect(ex - 92, ey - 92, 184, 184, 16);
  enemyBg.lineStyle(2, 0x883322, 0.6);
  enemyBg.strokeRoundedRect(ex - 92, ey - 92, 184, 184, 16);
  enemyContainer.add(enemyBg);

  // 敌人立绘（先占位，在 updateEnemyUI 中按实际敌人设置贴图）
  enemySprite = scene.add.image(ex, ey, 'enemy_mars_leech')
    .setOrigin(0.5)
    .setAlpha(0);

  // 圆形遮罩，裁掉非透明背景
  enemyMaskShape = scene.add.graphics();
  enemyMaskShape.fillStyle(0xffffff);
  enemyMaskShape.fillCircle(ex, ey, 88);
  const enemyMask = enemyMaskShape.createGeometryMask();
  enemySprite.setMask(enemyMask);
  enemyMaskShape.setVisible(false);
  enemyContainer.add(enemySprite);
  enemyContainer.add(enemyMaskShape);

  // 敌人名
  enemyNameText = scene.add.text(ex, ey + 98, '', {
    fontSize: '16px',
    fontFamily: '"Courier New", monospace',
    color: '#ff6666',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);
  enemyContainer.add(enemyNameText);

  // HP 条
  enemyHpBarBg = scene.add.graphics();
  enemyHpBarFill = scene.add.graphics();
  enemyShieldBar = scene.add.graphics();
  enemyContainer.add([enemyHpBarBg, enemyShieldBar, enemyHpBarFill]);

  enemyHpText = scene.add.text(0, 0, '', {
    fontSize: '13px',
    fontFamily: '"Courier New", monospace',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  enemyContainer.add(enemyHpText);

  enemyShieldText = scene.add.text(0, 0, '', {
    fontSize: '12px',
    fontFamily: '"Courier New", monospace',
    color: '#ffaa44',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  enemyContainer.add(enemyShieldText);

  // 意图图标
  enemyIntentIcon = scene.add.graphics();
  enemyIntentText = scene.add.text(0, 0, '', {
    fontSize: '13px',
    fontFamily: '"Courier New", monospace',
    color: '#ff8844',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  enemyContainer.add([enemyIntentIcon, enemyIntentText]);

  updateEnemyUI(scene);
}

function updateEnemyUI(scene) {
  if (!GameState.enemy) return;

  const ex = 820;
  const ey = 250;
  const spriteHeight = 180;
  const hpBarY = 120;
  const hpBarW = 170;
  const hpBarH = 14;
  const hpBarX = ex - hpBarW / 2;

  // 立绘
  const spriteKey = GameState.enemy.sprite || 'enemy_mars_leech';
  if (scene.textures.exists(spriteKey)) {
    enemySprite.setTexture(spriteKey);
    enemySprite.setAlpha(1);
    const ratio = enemySprite.width / enemySprite.height;
    enemySprite.setDisplaySize(spriteHeight * ratio, spriteHeight);
    enemySprite.setPosition(ex, ey);
  } else {
    enemySprite.setAlpha(0);
  }

  enemyNameText.setPosition(ex, ey + 98);
  enemyNameText.setText(`◥ ${GameState.enemy.name}`);

  // HP 条
  enemyHpBarBg.clear();
  enemyHpBarBg.fillStyle(0x2a1410, 1);
  enemyHpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  // 护盾条
  enemyShieldBar.clear();
  const shieldRatio = Math.min(GameState.enemy.shield / GameState.enemy.maxHp, 1);
  if (shieldRatio > 0) {
    enemyShieldBar.fillStyle(0xffaa44, 0.5);
    enemyShieldBar.fillRoundedRect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH, 4);
  }

  // HP 填充
  enemyHpBarFill.clear();
  const hpRatio = GameState.enemy.hp / GameState.enemy.maxHp;
  const hpColor = hpRatio > 0.5 ? 0xdd6633 : (hpRatio > 0.25 ? 0xcc8833 : 0xcc3333);
  enemyHpBarFill.fillStyle(hpColor, 1);
  enemyHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 4);

  enemyHpText.setPosition(ex, hpBarY + hpBarH / 2);
  enemyHpText.setText(`${GameState.enemy.hp}/${GameState.enemy.maxHp}`);

  // 护盾文字
  if (GameState.enemy.shield > 0) {
    enemyShieldText.setPosition(ex + hpBarW / 2 + 28, hpBarY + hpBarH / 2);
    enemyShieldText.setText(`护盾 ${GameState.enemy.shield}`);
  } else {
    enemyShieldText.setText('');
  }

  // 意图（整体上移，避免与血条重叠）
  const intentIconY = 72;
  const intentTextY = 96;
  drawIntentIcon(scene, ex, intentIconY, GameState.enemy);
  enemyIntentText.setPosition(ex, intentTextY);
  enemyIntentText.setText(GameState.enemy.getIntentDescription());

  // Boss 蓄力视觉：淡红色呼吸灯 + 头顶警告文字
  const isBossCharging = GameState.enemy.pattern === ENEMY_PATTERN.BOSS_CHARGE &&
                         GameState.enemy.currentCharge < GameState.enemy.chargeTurns;
  if (isBossCharging) {
    if (!bossChargeTween) {
      enemySprite.setTint(0xff4444);
      bossChargeTween = scene.tweens.add({
        targets: enemySprite,
        alpha: { from: 1, to: 0.55 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      bossWarningText = scene.add.text(ex, ey - 125, '[ BOSS 正在疯狂凝聚地核能量... ]', {
        fontSize: '20px',
        fontFamily: '"Courier New", monospace',
        color: '#ff4422',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      enemyContainer.add(bossWarningText);
    }
  } else {
    if (bossChargeTween) {
      bossChargeTween.stop();
      bossChargeTween = null;
    }
    if (bossWarningText) {
      bossWarningText.destroy();
      bossWarningText = null;
    }
    if (enemySprite) {
      enemySprite.clearTint();
      enemySprite.setAlpha(1);
    }
  }
}

function drawIntentIcon(scene, cx, cy, enemy) {
  enemyIntentIcon.clear();

  const desc = enemy.getIntentDescription();
  let type = 'unknown';
  if (desc.includes('蓄力')) type = 'charge';
  else if (desc.includes('致命')) type = 'chargedAttack';
  else if (desc.includes('护盾') || desc.includes('防御')) type = 'shield';
  else if (desc.includes('伤害') || desc.includes('攻击')) type = 'damage';

  const size = 20;

  // 意图图标暗色衬底，提升可见度
  enemyIntentIcon.fillStyle(0x000000, 0.6);
  enemyIntentIcon.fillCircle(cx, cy, size + 4);
  enemyIntentIcon.lineStyle(2, 0x000000, 0.8);

  switch (type) {
    case 'damage':
      enemyIntentIcon.fillStyle(0xff3333, 0.9);
      enemyIntentIcon.fillTriangle(cx, cy - size, cx - size, cy + size * 0.6, cx + size, cy + size * 0.6);
      break;
    case 'shield':
      enemyIntentIcon.fillStyle(0x44aaff, 0.9);
      enemyIntentIcon.fillCircle(cx, cy, size * 0.85);
      break;
    case 'charge':
      enemyIntentIcon.fillStyle(0xaa44ff, 0.9);
      enemyIntentIcon.fillCircle(cx, cy, size * 0.6);
      enemyIntentIcon.lineStyle(2, 0xff66ff, 1);
      enemyIntentIcon.strokeCircle(cx, cy, size);
      break;
    case 'chargedAttack':
      enemyIntentIcon.fillStyle(0xff00aa, 0.95);
      drawStar(enemyIntentIcon, cx, cy, 5, size, size * 0.5);
      break;
    default:
      enemyIntentIcon.fillStyle(0x888888, 0.6);
      enemyIntentIcon.fillCircle(cx, cy, size * 0.5);
  }
}

/** 敌人受击震屏 */
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

  enemyHpBarFill.clear();
  enemyHpBarFill.fillStyle(0xff0000, 0.9);
  const ex = 820;
  const hpBarY = 120;
  const hpBarW = 170;
  const hpBarH = 14;
  const hpBarX = ex - hpBarW / 2;
  enemyHpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);

  scene.time.delayedCall(150, () => updateEnemyUI(scene));
}

/* ============================================================
 * 日志
 * ============================================================ */
function addLog(sender, msg) {
  GameState.logLines.push(`[${sender}] ${msg}`);
  if (GameState.logLines.length > GameState.MAX_LOG) GameState.logLines.shift();
}

/* ============================================================
 * UI 刷新
 * ============================================================ */
function refreshUI(scene) {
  updateEnemyUI(scene);
  updatePlayerUI(scene);
  updateDepthUI(scene);

  logText.setText(GameState.logLines.slice(-3).join('  |  '));

  drawPileText.setText(`抽牌堆: ${GameState.drawPile.size} 张`);
  discardPileText.setText(`弃牌堆: ${GameState.discardPile.length} 张`);

  if (GameState.turnPhase === 'playerTurn') {
    turnPhaseText.setText('▶ 玩家回合');
  } else if (GameState.turnPhase === 'enemyTurn') {
    turnPhaseText.setText('● 敌人回合');
  } else if (GameState.turnPhase === 'gameOver') {
    turnPhaseText.setText('');
  } else {
    turnPhaseText.setText('');
  }
}

/* ============================================================
 * 数值飘字特效
 * ============================================================ */
function spawnFloatingText(scene, target, text, color, offsetY, fontSize = '20px') {
  let targetX, targetY;

  if (target === 'player') {
    targetX = 200;
    targetY = 110 + (offsetY || 0);
  } else {
    targetX = 820;
    targetY = 110 + (offsetY || 0);
  }

  const ft = scene.add.text(targetX, targetY - 10, text, {
    fontSize: fontSize,
    fontFamily: '"Courier New", monospace',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5).setAlpha(1);

  scene.tweens.add({
    targets: ft,
    y: targetY - 80,
    alpha: 0,
    duration: 1100,
    ease: 'Power2',
    onComplete: () => ft.destroy(),
  });
}

/* ============================================================
 * Graphics 卡牌渲染
 * ============================================================ */
const CARD_W = 124;
const CARD_H = 72;

function renderHand(scene) {
  for (const c of GameState.cardContainers) { c.destroy(); }
  GameState.cardContainers = [];

  if (GameState.hand.length === 0) return;

  const gap = 10;
  const totalW = GameState.hand.length * CARD_W + (GameState.hand.length - 1) * gap;
  const startX = (W - totalW) / 2 + CARD_W / 2;
  const y = 510;

  for (let i = 0; i < GameState.hand.length; i++) {
    const card = GameState.hand[i];
    const x = startX + i * (CARD_W + gap);
    const container = createCardGraphics(scene, x, y, CARD_W, CARD_H, card, i);
    GameState.cardContainers.push(container);
  }
}

function createCardGraphics(scene, x, y, w, h, card, index) {
  const container = scene.add.container(x, y);
  const canPlay = GameState.player.canPlay(card.cost);
  const alpha = canPlay ? 1.0 : 0.45;

  const bg = scene.add.image(0, 0, 'ui_card_base')
    .setDisplaySize(w, h)
    .setAlpha(alpha);
  container.add(bg);

  const topBar = scene.add.graphics();
  topBar.fillStyle(card.color, 0.7 * alpha);
  topBar.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, 18, { tl: 4, tr: 4, bl: 0, br: 0 });
  container.add(topBar);

  const nameTxt = scene.add.text(0, -h / 2 + 15, card.name, {
    fontSize: '11px',
    fontFamily: '"Courier New", monospace',
    color: canPlay ? '#ffffff' : '#667788',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(nameTxt);

  const costColors = [0xffdd44, 0xff8800, 0xff4444, 0xcc2266];
  const costColor = costColors[Math.min(card.cost - 1, costColors.length - 1)];

  const costBg = scene.add.graphics();
  costBg.fillStyle(0x000000, 0.6);
  costBg.fillCircle(-w / 2 + 16, 2, 10);
  costBg.fillStyle(costColor, 0.9 * alpha);
  costBg.fillCircle(-w / 2 + 16, 2, 8);
  container.add(costBg);

  const costTxt = scene.add.text(-w / 2 + 16, 2, `${card.cost}`, {
    fontSize: '13px',
    fontFamily: '"Courier New", monospace',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(costTxt);

  const descTxt = scene.add.text(-w / 2 + 32, 4, card.desc, {
    fontSize: '11px',
    fontFamily: '"Courier New", monospace',
    color: canPlay ? '#e0f0ff' : '#556677',
    wordWrap: { width: w - 40 },
    stroke: '#000000',
    strokeThickness: 2,
  });
  container.add(descTxt);

  const bottomBar = scene.add.graphics();
  const typeColor = card.type === 'damage' ? 0xff4444 : 0x44aaff;
  bottomBar.fillStyle(typeColor, 0.4 * alpha);
  bottomBar.fillRoundedRect(-w / 2 + 8, h / 2 - 10, w - 16, 4, 2);
  container.add(bottomBar);

  const hitZone = scene.add.rectangle(0, 0, w + 12, h + 16, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hitZone);

  let origY = y;

  hitZone.on('pointerdown', () => {
    if (GameState.turnPhase !== 'playerTurn') return;
    playCard(scene, index, container, x, origY);
  });

  hitZone.on('pointerover', () => {
    if (!canPlay) return;
    scene.tweens.add({
      targets: container,
      y: origY - 16,
      duration: 80,
      ease: 'Back.easeOut',
    });
    bg.setTint(0xffddaa);
  });
  hitZone.on('pointerout', () => {
    scene.tweens.add({
      targets: container,
      y: origY,
      duration: 80,
      ease: 'Power1',
    });
    bg.clearTint();
  });

  return container;
}

/* ============================================================
 * 结束回合按钮
 * ============================================================ */
function createEndTurnButton(scene) {
  const container = scene.add.container(W / 2, 600);

  const btnW = 160;
  const btnH = 42;

  const bg = scene.add.image(0, 0, 'ui_btn_endturn')
    .setDisplaySize(btnW, btnH)
    .setOrigin(0.5);
  container.add(bg);

  const text = scene.add.text(0, 0, '结束回合', {
    fontSize: '15px',
    fontFamily: '"Courier New", monospace',
    color: '#ffddaa',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);
  container.add(text);

  const hitZone = scene.add.rectangle(0, 0, btnW + 20, btnH + 16, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hitZone);

  hitZone.on('pointerdown', () => {
    if (GameState.turnPhase !== 'playerTurn') return;
    endPlayerTurn(scene);
  });

  hitZone.on('pointerover', () => {
    bg.setTint(0xffddaa);
    text.setScale(1.05);
  });
  hitZone.on('pointerout', () => {
    bg.clearTint();
    text.setScale(1);
  });

  return container;
}

/* ============================================================
 * 关卡初始化
 * ============================================================ */
function initLevel(levelIndex) {
  GameState.enemyQueue = buildEnemyForLevel(levelIndex);
  if (GameState.enemyQueue.length === 0) {
    GameState.enemyQueue = buildEnemyForLevel(0);
  }
  GameState.enemy = GameState.enemyQueue.shift();
  GameState.enemy.turnCount = 0;
}

function advanceLevel(scene) {
  GameState.depthLevel++;
  if (GameState.depthLevel >= DEPTH_LEVELS.length) return;
  initLevel(GameState.depthLevel);
  setBackgroundForLevel(scene, GameState.depthLevel);
  updateDepthUI(scene);
  addLog('系统', `=== 下潜至 ${DEPTH_LEVELS[GameState.depthLevel].label} ===`);
  addLog('系统', `敌军：${GameState.enemy.name} 出现了！`);
}

function startBossFight(scene) {
  GameState.enemy = buildFinalBoss();
  GameState.enemy.turnCount = 0;
  addLog('系统', '⚠ 警告：火星吞噬者 出现了！');
}

/* ============================================================
 * 关卡过渡动画
 * ============================================================ */
function playTransitionToNextLevel(scene, callback) {
  GameState.turnPhase = 'transition';

  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0);
  overlay.fillRect(0, 0, W, H);

  const nextLevel = DEPTH_LEVELS[GameState.depthLevel + 1];
  const transitText = scene.add.text(W / 2, H / 2 - 40, '▼ 向下潜入中...', {
    fontSize: '36px',
    fontFamily: '"Courier New", monospace',
    color: '#ff8844',
    fontStyle: 'bold',
  }).setOrigin(0.5).setAlpha(0);

  const depthLabel = scene.add.text(W / 2, H / 2 + 20, `目标深度：${nextLevel.label}`, {
    fontSize: '20px',
    fontFamily: '"Courier New", monospace',
    color: '#cc8866',
  }).setOrigin(0.5).setAlpha(0);

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
 * 战后三选一卡牌奖励弹窗
 * ============================================================ */
function showCardRewardPopup(scene, rewards, onSelect) {
  GameState.turnPhase = 'reward';

  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.85);
  overlay.fillRect(0, 0, W, H);

  const popupW = 760;
  const popupH = 380;
  const popupX = (W - popupW) / 2;
  const popupY = (H - popupH) / 2;

  const popup = scene.add.graphics();
  // 深蓝科技背景
  popup.fillStyle(0x0a1a2a, 0.96);
  popup.fillRoundedRect(popupX, popupY, popupW, popupH, 18);
  // 亮蓝主边框
  popup.lineStyle(3, 0x33ccff, 1);
  popup.strokeRoundedRect(popupX, popupY, popupW, popupH, 18);
  // 内发光装饰线
  popup.lineStyle(1, 0x66ffff, 0.5);
  popup.strokeRoundedRect(popupX + 6, popupY + 6, popupW - 12, popupH - 12, 14);
  // 顶部霓虹条
  popup.fillStyle(0x33ccff, 0.9);
  popup.fillRect(popupX + 30, popupY + 28, popupW - 60, 3);

  const title = scene.add.text(W / 2, popupY + 55, '◆ 选择一张奖励卡牌 ◆', {
    fontSize: '26px',
    fontFamily: '"Courier New", monospace',
    color: '#66ffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5);

  const hint = scene.add.text(W / 2, popupY + 92, '点击或触摸卡牌，将其加入抽牌堆', {
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    color: '#88ccdd',
  }).setOrigin(0.5);

  const cardW = 190;
  const cardH = 220;
  const gap = 28;
  const totalW = rewards.length * cardW + (rewards.length - 1) * gap;
  const startX = (W - totalW) / 2 + cardW / 2;
  const cardY = popupY + 210;

  const rewardObjects = [];

  for (let i = 0; i < rewards.length; i++) {
    const card = rewards[i];
    const x = startX + i * (cardW + gap);

    const container = scene.add.container(x, cardY);

    // 卡牌背景
    const bg = scene.add.graphics();
    bg.fillStyle(0x112233, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    bg.lineStyle(2, 0x33ccff, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    container.add(bg);

    // 顶部颜色条
    const topBar = scene.add.graphics();
    topBar.fillStyle(card.color, 0.85);
    topBar.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, 30, { tl: 6, tr: 6, bl: 0, br: 0 });
    container.add(topBar);

    // 费用圆
    const costBg = scene.add.graphics();
    costBg.fillStyle(0x000000, 0.7);
    costBg.fillCircle(-cardW / 2 + 26, -cardH / 2 + 24, 17);
    costBg.fillStyle(0xffdd44, 0.95);
    costBg.fillCircle(-cardW / 2 + 26, -cardH / 2 + 24, 14);
    container.add(costBg);

    const costText = scene.add.text(-cardW / 2 + 26, -cardH / 2 + 24, `${card.cost}`, {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(costText);

    // 卡牌名称
    const nameText = scene.add.text(0, -cardH / 2 + 58, card.name, {
      fontSize: '15px',
      fontFamily: '"Courier New", monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: cardW - 20 },
    }).setOrigin(0.5);
    container.add(nameText);

    // 卡牌描述
    const descText = scene.add.text(0, 14, card.desc, {
      fontSize: '13px',
      fontFamily: '"Courier New", monospace',
      color: '#cceeff',
      align: 'center',
      wordWrap: { width: cardW - 20 },
      lineSpacing: 5,
    }).setOrigin(0.5);
    container.add(descText);

    // 类型指示条
    const typeColor = card.type === 'damage' ? 0xff4444 : (card.type === 'shield' ? 0x44aaff : 0xffdd00);
    const typeBar = scene.add.graphics();
    typeBar.fillStyle(typeColor, 0.7);
    typeBar.fillRoundedRect(-cardW / 2 + 10, cardH / 2 - 18, cardW - 20, 7, 3);
    container.add(typeBar);

    // 点击/触摸热区（略大于卡牌，提升手机体验）
    const hitZone = scene.add.rectangle(0, 0, cardW + 20, cardH + 20, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on('pointerover', () => {
      scene.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 100 });
      bg.clear();
      bg.fillStyle(0x1a3a5a, 0.99);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      bg.lineStyle(3, 0x66ffff, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    });

    hitZone.on('pointerout', () => {
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
      bg.clear();
      bg.fillStyle(0x112233, 0.98);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      bg.lineStyle(2, 0x33ccff, 0.9);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    });

    hitZone.on('pointerdown', () => {
      // 禁用所有选项，防止重复选择
      rewardObjects.forEach(r => r.hitZone.disableInteractive());

      // 选中放大并消失
      scene.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => {
          cleanup();
          onSelect(card);
        },
      });
    });

    rewardObjects.push({ container, hitZone, bg });
  }

  function cleanup() {
    overlay.destroy();
    popup.destroy();
    title.destroy();
    hint.destroy();
    rewardObjects.forEach(r => r.container.destroy());
  }
}

/* ============================================================
 * 回合状态机
 * ============================================================ */
function startPlayerTurn(scene) {
  if (!GameState.player.isAlive) {
    gameOver(scene, 'defeat');
    return;
  }
  if (!GameState.enemy.isAlive) {
    handleEnemyDefeated(scene);
    return;
  }

  GameState.turnPhase = 'playerTurn';

  GameState.player.resetBattery();
  GameState.player.clearShield();
  addLog('系统', `--- 玩家回合 ---`);
  addLog('系统', `电量重置为 ${GameState.player.maxBattery}，护盾已清空`);

  drawCards(scene, 4);

  refreshUI(scene);
  renderHand(scene);
}

function drawCards(scene, count) {
  let drawn = GameState.drawPile.draw(count);
  if (drawn.length < count) {
    addLog('系统', `抽牌堆不足，洗入弃牌堆 (${GameState.discardPile.length} 张)`);
    GameState.drawPile.reshuffle(GameState.discardPile);
    GameState.discardPile = [];
    const remaining = count - drawn.length;
    const more = GameState.drawPile.draw(remaining);
    drawn = drawn.concat(more);
  }
  GameState.hand = GameState.hand.concat(drawn);
  addLog('系统', `抽取了 ${drawn.length} 张牌`);
}

function playCard(scene, index, cardContainer, cardX, cardY) {
  const card = GameState.hand[index];
  if (!card) return;
  if (GameState.turnPhase !== 'playerTurn') return;

  if (!GameState.player.canPlay(card.cost)) {
    addLog('提示', `电量不足！需要 ${card.cost} 电量`);
    refreshUI(scene);
    return;
  }

  GameState.player.spendBattery(card.cost);

  // 动画：卡牌飞出
  const w = CARD_W, h = CARD_H;
  const flyCard = scene.add.image(0, 0, 'ui_card_base').setDisplaySize(w, h);

  const flyTopBar = scene.add.graphics();
  flyTopBar.fillStyle(card.color, 0.7);
  flyTopBar.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, 18, { tl: 4, tr: 4, bl: 0, br: 0 });

  const flyName = scene.add.text(0, -h / 2 + 15, card.name, {
    fontSize: '11px',
    fontFamily: '"Courier New", monospace',
    color: '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const flyDesc = scene.add.text(0, 6, card.desc, {
    fontSize: '11px',
    fontFamily: '"Courier New", monospace',
    color: '#aaccdd',
  }).setOrigin(0.5);

  const flyContainer = scene.add.container(cardX, cardY, [flyCard, flyTopBar, flyName, flyDesc]);

  scene.tweens.add({
    targets: flyContainer,
    x: cardX + (card.type === 'damage' ? 320 : -160),
    y: cardY - 180,
    alpha: 0,
    scaleX: 0.7,
    scaleY: 0.7,
    duration: 350,
    ease: 'Power2',
    onComplete: () => flyContainer.destroy(),
  });

  if (card.type === 'damage') {
    const result = GameState.enemy.takeDamage(card.value);
    addLog(card.name, `对 ${GameState.enemy.name} 造成 ${card.value} 点伤害` +
      (result.absorbed > 0 ? ` (护盾吸收 ${result.absorbed})` : ''));
    spawnFloatingText(scene, 'enemy', `-${card.value} HP`, '#ff4422');
    shakeEnemyUI(scene);
  } else if (card.type === 'shield') {
    GameState.player.addShield(card.value);
    addLog(card.name, `获得 ${card.value} 点护盾`);
    spawnFloatingText(scene, 'player', `+${card.value} 护盾`, '#ffaa44');
    if (card.heal) {
      GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + card.heal);
      addLog(card.name, `恢复 ${card.heal} 点生命`);
      spawnFloatingText(scene, 'player', `+${card.heal} HP`, '#33ff77', -20);
    }
  } else if (card.type === 'special') {
    if (card.id === 'emergencyOverloadValve') {
      GameState.player.battery += card.gainBattery;
      GameState.player.damageTakenBonus = (GameState.player.damageTakenBonus || 0) + card.damageTakenBonus;
      addLog(card.name, `获得 ${card.gainBattery} 点电量，本回合受伤 +${card.damageTakenBonus}`);
      spawnFloatingText(scene, 'player', `+${card.gainBattery} 电量`, '#ffdd00');
    }
  }

  GameState.hand.splice(index, 1);
  GameState.discardPile.push(card);

  scene.time.delayedCall(100, () => {
    refreshUI(scene);
    if (!GameState.enemy.isAlive) {
      renderHand(scene);
      handleEnemyDefeated(scene);
      return;
    }
    renderHand(scene);
  });
}

function handleEnemyDefeated(scene) {
  addLog('系统', `✦ ${GameState.enemy.name} 已被击败！`);

  GameState.discardPile = GameState.discardPile.concat(GameState.hand);
  GameState.hand = [];
  renderHand(scene);
  refreshUI(scene);

  if (GameState.enemyQueue.length > 0) {
    GameState.enemy = GameState.enemyQueue.shift();
    GameState.enemy.turnCount = 0;
    addLog('系统', `敌军：${GameState.enemy.name} 出现了！`);
    scene.time.delayedCall(600, () => startPlayerTurn(scene));
  } else if (GameState.depthLevel === 2 && !GameState.isFinalBossDefeated) {
    // 迎战最终 Boss 前固定获得史诗遗物：铥元素电池
    if (!GameState.player.relics.some(r => r.id === RELICS.thuliumBattery.id)) {
      GameState.player.addRelic(RELICS.thuliumBattery);
      addLog('系统', `获得史诗遗物：${RELICS.thuliumBattery.name} — ${RELICS.thuliumBattery.desc}`);
      refreshUI(scene);
    }

    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W, H);

    const warningText = scene.add.text(W / 2, H / 2 - 20, '⚠ 检测到巨大生命信号...', {
      fontSize: '26px',
      fontFamily: '"Courier New", monospace',
      color: '#ff6633',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const bossText = scene.add.text(W / 2, H / 2 + 25, '火星吞噬者 正在苏醒！', {
      fontSize: '22px',
      fontFamily: '"Courier New", monospace',
      color: '#ff4422',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.8 }, duration: 500 });
    scene.tweens.add({ targets: warningText, alpha: 1, duration: 400 });
    scene.tweens.add({ targets: bossText, alpha: 1, duration: 400, delay: 300 });

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
              startBossFight(scene);
              GameState.isFinalBossDefeated = true;
              refreshUI(scene);
              scene.time.delayedCall(300, () => startPlayerTurn(scene));
            }
          });
        }
      },
      repeat: 5,
    });
  } else {
    if (GameState.depthLevel < DEPTH_LEVELS.length - 1) {
      // 战后三选一奖励：先弹窗，选择后再进入下潜过渡动画
      const rewards = rollPostBattleRewards(3);
      showCardRewardPopup(scene, rewards, (selectedCard) => {
        GameState.drawPile.cards.push(selectedCard);
        addLog('系统', `获得奖励卡牌：${selectedCard.name}`);
        refreshUI(scene);

        playTransitionToNextLevel(scene, () => {
          advanceLevel(scene);

          // 进入第二层时固定获得基础遗物：火星动力核心
          if (GameState.depthLevel === 1 && !GameState.player.relics.some(r => r.id === RELICS.marsPowerCore.id)) {
            GameState.player.addRelic(RELICS.marsPowerCore);
            addLog('系统', `获得遗物：${RELICS.marsPowerCore.name} — ${RELICS.marsPowerCore.desc}`);
          }

          refreshUI(scene);
          GameState.discardPile = GameState.discardPile.concat(GameState.hand);
          GameState.hand = [];
          GameState.drawPile.reshuffle(GameState.discardPile);
          GameState.discardPile = [];
          refreshUI(scene);
          startPlayerTurn(scene);
        });
      });
    } else {
      gameOver(scene, 'victory');
    }
  }
}

function endPlayerTurn(scene) {
  GameState.turnPhase = 'enemyTurn';
  addLog('系统', `--- 敌人回合 ---`);

  addLog('系统', `${GameState.hand.length} 张手牌进入弃牌堆`);
  GameState.discardPile = GameState.discardPile.concat(GameState.hand);
  GameState.hand = [];

  refreshUI(scene);
  renderHand(scene);

  scene.time.delayedCall(700, () => {
    if (!GameState.enemy.isAlive) {
      handleEnemyDefeated(scene);
      return;
    }
    executeEnemyTurn(scene);
  });
}

function executeEnemyTurn(scene) {
  if (!GameState.enemy.isAlive) {
    handleEnemyDefeated(scene);
    return;
  }

  const result = GameState.enemy.executeTurn(GameState.player);

  if (result.type === 'damage' || result.type === 'chargedAttack') {
    addLog(GameState.enemy.name, result.desc);
    spawnFloatingText(scene, 'player', `-${result.value} HP`, '#ff2211', 0,
      result.type === 'chargedAttack' ? '38px' : '20px');
    shakePlayerUI(scene);
    if (result.type === 'chargedAttack') {
      scene.cameras.main.shake(500, 0.025);
    }
  } else if (result.type === 'shield') {
    addLog(GameState.enemy.name, result.desc);
    spawnFloatingText(scene, 'enemy', `+${result.value} 护盾`, '#ffaa44');
  } else if (result.type === 'charge') {
    addLog(GameState.enemy.name, result.desc);
  }

  refreshUI(scene);

  if (!GameState.player.isAlive) {
    scene.time.delayedCall(500, () => gameOver(scene, 'defeat'));
    return;
  }

  scene.time.delayedCall(600, () => startPlayerTurn(scene));
}

/* ============================================================
 * 游戏结束
 * ============================================================ */
function gameOver(scene, result) {
  GameState.turnPhase = 'gameOver';

  const W2 = W, H2 = H;
  const overlay = scene.add.graphics();

  if (result === 'victory' && GameState.isFinalBossDefeated) {
    overlay.fillStyle(0x080202, 0);
    overlay.fillRect(0, 0, W2, H2);

    scene.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.88 }, duration: 800, ease: 'Power2' });

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

    const missionTitle = scene.add.text(W2 / 2, H2 / 2 - 120, 'MISSION SUCCESS', {
      fontSize: '42px',
      fontFamily: '"Courier New", monospace',
      color: '#ff8844',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({ targets: missionTitle, alpha: 1, y: H2 / 2 - 130, duration: 700, ease: 'Back.easeOut' });

    const line = scene.add.graphics().setAlpha(0);
    scene.tweens.add({ targets: line, alpha: 1, delay: 500, duration: 400 });
    line.lineStyle(2, 0xff8844, 0.7);
    line.lineBetween(W2 / 2 - 140, H2 / 2 - 80, W2 / 2 + 140, H2 / 2 - 80);

    const mainMsg = scene.add.text(W2 / 2, H2 / 2 - 30, '火星安全前哨站已成功建立！', {
      fontSize: '22px',
      fontFamily: '"Courier New", monospace',
      color: '#ffdd99',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({ targets: mainMsg, alpha: 1, y: H2 / 2 - 40, duration: 600, delay: 600, ease: 'Power2' });

    const subMsg = scene.add.text(W2 / 2, H2 / 2 + 20, '人类在火星地下立住了脚跟。\n在这颗锈红色的星球上，新的家园正在诞生。', {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#cc8866',
      align: 'center',
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({ targets: subMsg, alpha: 1, duration: 600, delay: 1000 });

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
    btnHit.on('pointerdown', () => scene.scene.restart());

    scene.tweens.add({ targets: btnContainer, alpha: 1, duration: 600, delay: 1400, ease: 'Power2' });

  } else {
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W2, H2);

    scene.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.75 }, duration: 500, ease: 'Power2' });

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
      fontSize: '26px',
      fontFamily: '"Courier New", monospace',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = scene.add.text(W2 / 2, H2 / 2 + 5, subMsg, {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#cc8866',
    }).setOrigin(0.5).setAlpha(0);

    const restartHint = scene.add.text(W2 / 2, H2 / 2 + 50, '点击任意位置重新开始', {
      fontSize: '15px',
      fontFamily: '"Courier New", monospace',
      color: '#886655',
    }).setOrigin(0.5).setAlpha(0);

    scene.tweens.add({ targets: title, alpha: 1, y: H2 / 2 - 50, duration: 600, delay: 200 });
    scene.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 500 });
    scene.tweens.add({ targets: restartHint, alpha: 1, duration: 600, delay: 800 });

    const restartZone = scene.add.rectangle(W2 / 2, H2 / 2, W2, H2, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    restartZone.on('pointerdown', () => scene.scene.restart());
  }

  addLog('系统', result === 'victory' ? '✦ 使命完成！' : '✧ 战败...');
  refreshUI(scene);
}

/* ============================================================
 * update 循环
 * ============================================================ */
function update() {
  // 战斗场景暂无每帧逻辑
}
