/**
 * audio.js — 游戏音效与背景音乐(BGM)系统
 */

/* ============================================================
 * BGM 管理器
 * ============================================================ */
const BGM = {
  current: null,
  volume: 0.5,
  fadeDuration: 1200,
  isSwitching: false,

  play(scene, key, loop = true) {
    if (this.isSwitching) return;

    if (this.current) {
      this.current.stop();
      this.current = null;
    }

    const audio = scene.sound.add(key, { loop, volume: this.volume });
    audio.on('error', (err) => {
      console.warn(`BGM play error: ${key}`, err);
    });
    audio.play();
    this.current = audio;
  },

  switch(scene, key, loop = true) {
    if (this.isSwitching || (this.current && this.current.key === key)) return;

    this.isSwitching = true;

    if (this.current) {
      scene.tweens.add({
        targets: this.current,
        volume: 0,
        duration: this.fadeDuration,
        ease: 'Power2',
        onComplete: () => {
          this.current.stop();
          this.current = null;
          this._startNew(scene, key, loop);
        }
      });
    } else {
      this._startNew(scene, key, loop);
    }
  },

  _startNew(scene, key, loop) {
    const audio = scene.sound.add(key, { loop, volume: 0 });
    audio.on('error', (err) => {
      console.warn(`BGM play error: ${key}`, err);
    });
    audio.play();
    this.current = audio;

    scene.tweens.add({
      targets: audio,
      volume: this.volume,
      duration: this.fadeDuration,
      ease: 'Power2',
      onComplete: () => {
        this.isSwitching = false;
      }
    });
  },

  stop() {
    if (this.current) {
      this.current.stop();
      this.current = null;
    }
    this.isSwitching = false;
  },

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.current) {
      this.current.volume = this.volume;
    }
  }
};
