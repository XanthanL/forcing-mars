/**
 * story.js — 开场剧情场景（太空终端打字机 + 长按跳过）
 */

class StoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StoryScene' });
  }

  preload() {
    // 剧情场景不需要额外资源
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#050303');

    // 终端外框
    const frame = this.add.graphics();
    frame.lineStyle(2, 0x2a8a4a, 0.6);
    frame.strokeRect(40, 40, W - 80, H - 80);
    frame.lineStyle(1, 0x1a5a2a, 0.3);
    frame.strokeRect(50, 50, W - 100, H - 100);

    // 扫描线
    const scanline = this.add.graphics();
    scanline.fillStyle(0x22ff66, 0.05);
    scanline.fillRect(52, 52, W - 104, 3);
    this.tweens.add({
      targets: scanline,
      y: H - 108,
      duration: 3000,
      repeat: -1,
      yoyo: true,
      ease: 'Linear',
    });

    this.storyLines = [
      { prefix: '[地球指挥部 - 最后一则广播]', text: '' },
      { prefix: '', text: '火星地核的波动正在撕裂轨道平衡……' },
      { prefix: '', text: '宇航员，你是最后的潜入者。带上电磁护盾，强渡地表。' },
      { prefix: '', text: '往下走……直到最深处。' },
      { prefix: '', text: '愿锈红色的风，送你一程。' },
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
    this.skipContainer = this.add.container(W / 2, H - 25).setAlpha(0.85);
    this.skipText = this.add.text(0, 0, '长按 [SPACE] 或 按住屏幕 跳过剧情', {
      fontSize: '14px',
      fontFamily: '"Courier New", monospace',
      color: '#55cc77',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.skipContainer.add(this.skipText);

    // 跳过进度条背景
    this.skipBarBg = this.add.graphics();
    this.skipBarFill = this.add.graphics();
    this.skipContainer.add([this.skipBarBg, this.skipBarFill]);
    this.skipBarBg.fillStyle(0x113311, 0.8);
    this.skipBarBg.fillRoundedRect(-110, -22, 220, 8, 4);

    this.input.keyboard.on('keydown-SPACE', () => { this.skipActive = true; });
    this.input.keyboard.on('keyup-SPACE', () => { this.skipActive = false; });

    // 鼠标/触摸按下也触发跳过
    this.input.on('pointerdown', () => { this.skipActive = true; });
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
    const y = 120 + this.lineObjects.length * 34;
    const prefixColor = lineData.prefix ? '#55cc77' : '#44ff88';
    const prefixWeight = lineData.prefix ? 'bold' : 'normal';

    const prefixText = this.add.text(70, y, lineData.prefix, {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: prefixColor,
      fontStyle: prefixWeight,
      stroke: '#000000',
      strokeThickness: 2,
    });

    const mainText = this.add.text(70 + (lineData.prefix ? prefixText.width + 8 : 0), y, '', {
      fontSize: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#88ffaa',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.lineObjects.push({ prefix: prefixText, main: mainText, fullText: lineData.text });
    this.charIndex = 0;
    this.isTyping = true;

    this.typeTimer = this.time.addEvent({
      delay: 45,
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
      this.time.delayedCall(600, () => {
        this.scrollLines();
        this.startTypingNextLine();
      });
    }
  }

  scrollLines() {
    // 轻微上移已有行，为新行腾出空间
    const maxVisible = 10;
    if (this.lineObjects.length > maxVisible) {
      const removed = this.lineObjects.shift();
      removed.prefix.destroy();
      removed.main.destroy();
    }
    this.lineObjects.forEach((line, idx) => {
      const targetY = 120 + idx * 34;
      this.tweens.add({
        targets: [line.prefix, line.main],
        y: targetY,
        duration: 200,
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
      this.skipBarFill.fillStyle(0x33cc55, 0.9);
      this.skipBarFill.fillRoundedRect(-110, -22, 220 * pct, 8, 4);

      if (this.skipHoldTime >= this.skipRequired) {
        this.skipActive = false;
        this.startBattle();
      }
    } else {
      if (this.skipHoldTime > 0) {
        this.skipHoldTime = Math.max(0, this.skipHoldTime - delta * 2);
        const pct = this.skipHoldTime / this.skipRequired;
        this.skipText.setText('长按 [SPACE] 或 按住屏幕 跳过剧情');
        this.skipBarFill.clear();
        this.skipBarFill.fillStyle(0x33cc55, 0.9);
        this.skipBarFill.fillRoundedRect(-110, -22, 220 * pct, 8, 4);
      }
    }
  }

  startBattle() {
    if (this.typeTimer) this.typeTimer.remove();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BattleScene');
    });
  }
}
