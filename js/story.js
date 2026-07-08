/**
 * story.js — 开场剧情场景（太空终端打字机 + 长按跳过）
 */

class StoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StoryScene' });
  }

  preload() {
    this.load.audio('bgm-story', 'assets/bgms/bgm_story.mp3');
    this.load.audio('bgm-battle', 'assets/bgms/bgm_battle.mp3');
    this.load.audio('bgm-boss', 'assets/bgms/bgm_boss.mp3');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#000000');

    // 播放开场剧情 BGM
    BGM.play(this, 'bgm-story', true);

    // 终端外框
    const frame = this.add.graphics();
    frame.lineStyle(2, 0x00ff44, 0.5);
    frame.strokeRect(30, 30, W - 60, H - 60);
    frame.lineStyle(1, 0x006622, 0.3);
    frame.strokeRect(40, 40, W - 80, H - 80);

    // 扫描线
    const scanline = this.add.graphics();
    scanline.fillStyle(0x00ff44, 0.03);
    scanline.fillRect(42, 42, W - 84, 2);
    this.tweens.add({
      targets: scanline,
      y: H - 88,
      duration: 4000,
      repeat: -1,
      yoyo: true,
      ease: 'Linear',
    });

    // 噪点层
    const noise = this.add.graphics();
    this.time.addEvent({
      delay: 100,
      callback: () => {
        noise.clear();
        noise.fillStyle(0x00ff44, Math.random() * 0.02);
        noise.fillRect(Math.random() * (W - 80) + 40, Math.random() * (H - 80) + 40, Math.random() * 3, Math.random() * 2);
      },
      repeat: -1,
    });

    this.storyLines = [
      { prefix: '[ 地球联合防卫阵线 (EDF) - 绝密量子广播 ]', text: '', isHeader: true },
      { prefix: '[ 时间：新纪元 142 年 / 地球资源枯竭第 11 载 ]', text: '', isHeader: true },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「...警告：这不是演习。这是人类文明的最后一则简报。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「十一年前，地球地核彻底冷却，磁场消散。人类倾尽全球资源，开启了‘火星温床计划’，将最后的五十亿幸存者送入火星轨道殖民站。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「我们以为找到了避难所。但我们错了。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「三天前，火星地下深处传来剧烈的超低频震荡，地核内部的引力常数突然发生诡异坍塌。轨道上的殖民站正在被火星引力疯狂撕扯，预计 24 小时后，整个人类文明将坠入赤红的火星大气层，化为灰烬。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「探测器在火星地底 2000 米的‘太古空腔’中，捕捉到了一个庞大的高能生命反应——代号‘火星吞噬者’。它不是一颗行星，它是一个正在苏醒的星体寄生虫。正是它在疯狂抽干引力。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「我们没有退路了。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「宇航员，你是‘强渡计划’唯一的执行者。你已经搭载着单人轨道舱，强行破击降落在了荒凉的火星赤道地表。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「你的任务：' },
      { prefix: '', text: '1. 深入地表 0m 的辐射沙丘，清剿地表异星幼蛭；' },
      { prefix: '', text: '2. 潜入地下 500m 的晶化矿脉，依靠有限的电磁卡组生存下来；' },
      { prefix: '', text: '3. 破击至地下 2000m 的炽热地核，在殖民站坠毁前，彻底抹杀‘火星吞噬者’。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「你只有一套外骨骼装甲和 3 点初始充能电量。每一步往下，怪物的生态都将发生指数级异变。」' },
      { prefix: '', text: '', isBreak: true },
      { prefix: '', text: '「引力锁死，倒计时开始。强渡火星……祝人类好运。」' },
    ];

    this.lineObjects = [];
    this.currentLineIndex = 0;
    this.charIndex = 0;
    this.typeTimer = null;
    this.isTyping = false;
    this.isFinished = false;

    // 跳过状态
    this.skipHoldTime = 0;
    this.skipRequired = 1500;
    this.skipActive = false;

    // 跳过提示（底部居中，支持鼠标/触摸长按）
    this.skipContainer = this.add.container(W / 2, H - 28).setAlpha(0.8);
    this.skipText = this.add.text(0, 0, '长按 [SPACE] 或 按住屏幕 1.5秒跳过', {
      fontSize: '13px',
      fontFamily: '"Courier New", monospace',
      color: '#33ff66',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.skipContainer.add(this.skipText);

    // 跳过进度条背景
    this.skipBarBg = this.add.graphics();
    this.skipBarFill = this.add.graphics();
    this.skipContainer.add([this.skipBarBg, this.skipBarFill]);
    this.skipBarBg.fillStyle(0x003300, 0.7);
    this.skipBarBg.fillRoundedRect(-120, -24, 240, 8, 4);

    this.input.keyboard.on('keydown-SPACE', () => { if (!this.isFinished) this.skipActive = true; });
    this.input.keyboard.on('keyup-SPACE', () => { this.skipActive = false; });

    // 鼠标/触摸按下也触发跳过（剧情播放期间有效）
    this.input.on('pointerdown', () => { if (!this.isFinished) this.skipActive = true; });
    this.input.on('pointerup', () => { this.skipActive = false; });

    this.startTypingNextLine();
  }

  startTypingNextLine() {
    if (this.currentLineIndex >= this.storyLines.length) {
      this.isFinished = true;
      this.skipText.setText('按任意键或点击屏幕开始');
      this.input.once('pointerdown', () => this.startBattle());
      this.input.keyboard.once('keydown', () => this.startBattle());
      return;
    }

    const lineData = this.storyLines[this.currentLineIndex];

    if (lineData.isBreak) {
      this.currentLineIndex++;
      this.time.delayedCall(1500, () => this.startTypingNextLine());
      return;
    }

    const y = 100 + this.lineObjects.length * 32;
    const prefixColor = lineData.isHeader ? '#00cc44' : (lineData.prefix ? '#00cc44' : '#00ff66');
    const prefixWeight = lineData.isHeader ? 'bold' : (lineData.prefix ? 'bold' : 'normal');
    const mainColor = lineData.isHeader ? '#00ff66' : '#44ff88';

    const prefixText = this.add.text(60, y, lineData.prefix, {
      fontSize: '15px',
      fontFamily: '"Courier New", monospace',
      color: prefixColor,
      fontStyle: prefixWeight,
      stroke: '#000000',
      strokeThickness: 2,
    });

    const mainText = this.add.text(60 + (lineData.prefix ? prefixText.width + 8 : 0), y, '', {
      fontSize: '15px',
      fontFamily: '"Courier New", monospace',
      color: mainColor,
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 800 },
    });

    this.lineObjects.push({ prefix: prefixText, main: mainText, fullText: lineData.text });
    this.charIndex = 0;
    this.isTyping = true;

    const typeDelay = lineData.isHeader ? 30 : 50;
    this.typeTimer = this.time.addEvent({
      delay: typeDelay,
      callback: () => this.typeNextChar(),
      repeat: lineData.text.length,
    });
  }

  typeNextChar() {
    const line = this.lineObjects[this.lineObjects.length - 1];
    this.charIndex++;
    line.main.setText(line.fullText.slice(0, this.charIndex));

    if (this.charIndex >= line.fullText.length) {
      this.isTyping = false;
      this.currentLineIndex++;
      const pauseTime = this.storyLines[this.currentLineIndex]?.isBreak ? 500 : 1500;
      this.time.delayedCall(pauseTime, () => {
        this.scrollLines();
        this.startTypingNextLine();
      });
    }
  }

  scrollLines() {
    const maxVisible = 12;
    if (this.lineObjects.length > maxVisible) {
      const removed = this.lineObjects.shift();
      removed.prefix.destroy();
      removed.main.destroy();
    }
    this.lineObjects.forEach((line, idx) => {
      const targetY = 100 + idx * 32;
      this.tweens.add({
        targets: [line.prefix, line.main],
        y: targetY,
        duration: 300,
        ease: 'Power1',
      });
    });
  }

  update(time, delta) {
    if (this.isFinished) return;

    if (this.skipActive) {
      this.skipHoldTime += delta;
      const pct = Math.min(this.skipHoldTime / this.skipRequired, 1);
      this.skipText.setText(`跳过中... ${Math.floor(pct * 100)}%`);
      this.skipBarFill.clear();
      this.skipBarFill.fillStyle(0x00ff44, 0.85);
      this.skipBarFill.fillRoundedRect(-120, -24, 240 * pct, 8, 4);

      if (this.skipHoldTime >= this.skipRequired) {
        this.skipActive = false;
        this.startBattle();
      }
    } else {
      if (this.skipHoldTime > 0) {
        this.skipHoldTime = Math.max(0, this.skipHoldTime - delta * 2);
        const pct = this.skipHoldTime / this.skipRequired;
        this.skipText.setText('长按 [SPACE] 或 按住屏幕 1.5秒跳过');
        this.skipBarFill.clear();
        this.skipBarFill.fillStyle(0x00ff44, 0.85);
        this.skipBarFill.fillRoundedRect(-120, -24, 240 * pct, 8, 4);
      }
    }
  }

  startBattle() {
    if (this.typeTimer) this.typeTimer.remove();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BattleScene');
    });
  }
}
