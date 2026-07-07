# 《强渡火星》美术资源需求表

> 本文档列出游戏所需的美术资源、推荐尺寸、用途，以及可直接复制到 Stable Diffusion / Midjourney / Leonardo 等 AI 绘图工具的英文提示词。

---

## 一、整体美术风格建议

**关键词**：硬核科幻、暗铁锈红、火星地下、低饱和度、金属质感、2D 插画、Clean Vector-like、游戏素材

**主色调**：
- 背景：#1a0808（深褐红）
- 金属边框：#6a2a1a（锈铜色）
- 伤害/能量：#ff4444 → #ff8844（红到橙）
- 护盾/科技：#44aaff → #66ddff（蓝到青）

**风格统一技巧**：
- 所有提示词都包含 `rust red sci-fi Mars underground, dark metallic, 2D game asset, clean illustration, isolated on dark background`。
- 避免写实 3D 渲染，统一走 **2D 插画 / 矢量风格 / 轻度卡通渲染**。
- 敌人 Sprite 建议带透明背景（PNG），方便直接放入 Phaser。

---

## 二、背景图（Backgrounds）

### 1. 地表 · 0m
- **用途**：第一层战斗背景
- **尺寸**：1920×1080 或 960×640（landscape）
- **格式**：JPG / PNG
- **文件名**：`bg_surface.jpg`
- **提示词**：
  ```
  Wide shot of a desolate Mars surface, stormy red sky, rocky plateau, dust particles in air, dark rusty orange and brown palette, sci-fi game background, 2D illustration, cinematic lighting, no characters, 1920x1080
  ```

### 2. 地下浅层 · 500m
- **用途**：第二层战斗背景
- **尺寸**：1920×1080 或 960×640
- **格式**：JPG / PNG
- **文件名**：`bg_shallow.jpg`
- **提示词**：
  ```
  Mars underground cave tunnel, damp rusty rock walls, faint bioluminescent crystals, dark iron red and crimson palette, sci-fi game background, 2D illustration, atmospheric lighting, no characters, 1920x1080
  ```

### 3. 地核深处 · 2000m
- **用途**：第三层战斗背景 + Boss 战
- **尺寸**：1920×1080 或 960×640
- **格式**：JPG / PNG
- **文件名**：`bg_core.jpg`
- **提示词**：
  ```
  Deep Mars core chamber, glowing magma cracks in dark rock, intense red and orange light from below, metallic sci-fi structures, sci-fi game background, 2D illustration, dramatic lighting, no characters, 1920x1080
  ```

### 4. 过渡画面（Transition）
- **用途**：关卡切换时全屏遮罩上的背景
- **尺寸**：960×640
- **格式**：PNG（可叠加）
- **文件名**：`bg_transition.png`
- **提示词**：
  ```
  Abstract Mars drilling descent visualization, vertical tunnel of rust red metal rings and dust, dark sci-fi, 2D game overlay, transparent-friendly dark edges, cinematic
  ```

---

## 三、敌人 Sprite（Enemies）

所有敌人建议尺寸 **256×256 或 512×512**，PNG 透明背景，带 2~4 帧待机/受击动画。

### 1. 火星幼蛭（Mars Leech）
- **文件名**：`enemy_mars_leech.png`
- **提示词**：
  ```
  Small alien leech creature on Mars, segmented rust-red worm body, tiny glowing eyes, slimy texture, aggressive pose, sci-fi game enemy sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 2. 沙丘跃行者（Dune Stalker）
- **文件名**：`enemy_dune_stalker.png`
- **提示词**：
  ```
  Agile alien predator on Mars desert, lean body with sandy armor plates, sharp claws, crouching pose, rust orange and tan color, sci-fi game enemy sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 3. 红土爬行者（Red Crawler）
- **文件名**：`enemy_red_crawler.png`
- **提示词**：
  ```
  Large insectoid alien crawling in Mars tunnel, thick red exoskeleton, multiple legs, defensive stance, dark red and brown, sci-fi game enemy sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 4. 晶化寄生虫（Crystal Parasite）
- **文件名**：`enemy_crystal_parasite.png`
- **提示词**：
  ```
  Alien parasite with crystalline growths on back, sharp mandibles, glowing red core, dark cave creature, sci-fi game enemy sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 5. 地底潜伏者（Deep Lurker）
- **文件名**：`enemy_deep_lurker.png`
- **提示词**：
  ```
  Massive armored alien lurking in Mars deep core, heavy shell, glowing orange vents, menacing posture, dark red and black metal-like skin, sci-fi game enemy sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 6. 火星吞噬者（Mars Devourer）- 最终 Boss
- **文件名**：`enemy_mars_devourer.png`
- **提示词**：
  ```
  Colossal Mars core devourer boss, giant worm-like monster with magma veins, no eyes, massive jaw with glowing teeth, dark red and molten orange, sci-fi game boss sprite, 2D illustration, isolated on transparent background, 1024x1024
  ```

---

## 四、玩家 / 宇航员（Player）

### 1. 宇航员立绘
- **用途**：玩家状态区头像/立绘
- **尺寸**：256×256 或 512×512
- **格式**：PNG 透明背景
- **文件名**：`player_astronaut.png`
- **提示词**：
  ```
  Sci-fi astronaut in advanced Mars exploration suit, helmet with orange visor, white and rust red armor, confident pose, sci-fi game character sprite, 2D illustration, isolated on transparent background, 512x512
  ```

### 2. 宇航员头像（小）
- **用途**：HUD 头像
- **尺寸**：128×128
- **格式**：PNG 透明背景
- **文件名**：`player_avatar.png`
- **提示词**：
  ```
  Close-up portrait of sci-fi astronaut helmet with orange reflective visor, rust red suit details, dark background, sci-fi game avatar icon, 2D illustration, 128x128
  ```

---

## 五、UI 资源

### 1. 卡牌底图
- **用途**：卡牌背景底板
- **尺寸**：248×144（2x 显示尺寸 124×72）
- **格式**：PNG 透明背景
- **文件名**：`ui_card_base.png`
- **提示词**：
  ```
  Sci-fi game card template, dark rust red metallic frame, glowing copper border, empty center for text, holographic corner accents, 2D game UI asset, isolated on transparent background, 248x144
  ```

### 2. 结束回合按钮
- **用途**：结束回合按钮底图
- **尺寸**：280×64
- **格式**：PNG 透明背景
- **文件名**：`ui_btn_endturn.png` / `ui_btn_endturn_hover.png`
- **提示词**：
  ```
  Sci-fi game button, rust red metal plate with copper border, glowing orange highlight, rectangular 280x64, 2D game UI asset, isolated on transparent background
  ```

### 3. 血条/护盾条底图
- **用途**：血条、护盾条背景
- **尺寸**：400×16
- **格式**：PNG 透明背景
- **文件名**：`ui_bar_bg.png`
- **提示词**：
  ```
  Sci-fi game progress bar frame, dark metallic rust red, rounded corners, empty inside, thin copper border, 2D game UI asset, isolated on transparent background, 400x16
  ```

### 4. 深度指示条段
- **用途**：顶部深度 UI 的单个段
- **尺寸**：180×18
- **格式**：PNG 透明背景
- **文件名**：`ui_depth_segment.png` / `ui_depth_segment_active.png`
- **提示词**：
  ```
  Sci-fi game status segment bar, rust red metallic rectangle with glowing edge, dark center, 2D game UI asset, isolated on transparent background, 180x18
  ```

---

## 六、特效（VFX）

### 1. 激光射击特效
- **用途**：打出伤害卡时的攻击光束
- **尺寸**：256×64
- **格式**：PNG 透明背景
- **文件名**：`vfx_laser_beam.png`
- **提示词**：
  ```
  Sci-fi red laser beam projectile, bright core with energy glow, horizontal, transparent background, 2D game VFX, 256x64
  ```

### 2. 护盾展开特效
- **用途**：获得护盾时的护盾生成
- **尺寸**：256×256
- **格式**：PNG 透明背景
- **文件名**：`vfx_shield_burst.png`
- **提示词**：
  ```
  Sci-fi blue energy shield bubble expanding, hexagonal pattern, cyan glow, transparent background, 2D game VFX, 256x256
  ```

### 3. 受击火花
- **用途**：敌人/玩家受击时的粒子
- **尺寸**：128×128
- **格式**：PNG 透明背景
- **文件名**：`vfx_hit_spark.png`
- **提示词**：
  ```
  Sci-fi impact spark burst, orange and red metal shards with glow, transparent background, 2D game VFX, 128x128
  ```

### 4. 蓄力能量球（Boss）
- **用途**：火星吞噬者蓄力时的能量聚集
- **尺寸**：256×256
- **格式**：PNG 透明背景
- **文件名**：`vfx_charge_orb.png`
- **提示词**：
  ```
  Massive charging energy orb, molten red and orange core, dark outer rings, pulsing glow, transparent background, 2D game VFX, 256x256
  ```

---

## 七、动画帧建议

如果希望敌人有简单动画，可以为每个敌人生成 **2 帧待机帧** 和 **1 帧受击帧**：

| 资源 | 帧数 | 命名示例 |
|---|---|---|
| 火星幼蛭待机 | 2 | `enemy_mars_leech_idle_0.png`, `_1.png` |
| 火星幼蛭受击 | 1 | `enemy_mars_leech_hit.png` |
| 火星吞噬者蓄力 | 2 | `enemy_mars_devourer_charge_0.png`, `_1.png` |

在 Phaser 中用 `scene.anims.create()` 组装成动画即可。

---

## 八、文件目录建议

生成后建议按以下目录存放：

```
assets/
├── backgrounds/
│   ├── bg_surface.jpg
│   ├── bg_shallow.jpg
│   ├── bg_core.jpg
│   └── bg_transition.png
├── enemies/
│   ├── enemy_mars_leech.png
│   ├── enemy_dune_stalker.png
│   ├── enemy_red_crawler.png
│   ├── enemy_crystal_parasite.png
│   ├── enemy_deep_lurker.png
│   └── enemy_mars_devourer.png
├── player/
│   ├── player_astronaut.png
│   └── player_avatar.png
├── ui/
│   ├── ui_card_base.png
│   ├── ui_btn_endturn.png
│   ├── ui_btn_endturn_hover.png
│   ├── ui_bar_bg.png
│   ├── ui_depth_segment.png
│   └── ui_depth_segment_active.png
└── vfx/
    ├── vfx_laser_beam.png
    ├── vfx_shield_burst.png
    ├── vfx_hit_spark.png
    └── vfx_charge_orb.png
```

---

## 九、下一步

当你生成好图片后，我可以帮你：
1. 在 `index.html` 中加载这些资源。
2. 把 `main.js` 里的 Graphics 绘制逐步替换成 Sprite/Image。
3. 添加攻击/受击粒子特效和敌人待机动画。

你可以先从 **背景图** 和 **敌人 Sprite** 开始生成，这两项对观感提升最大。
