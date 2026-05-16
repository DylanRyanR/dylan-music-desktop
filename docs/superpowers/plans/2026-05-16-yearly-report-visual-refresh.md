# 年报海报视觉翻新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将年报 Story 模式和导出 Poster 的视觉质感从"功能可用"提升到"精致音乐感"（Apple Music Replay 风格），覆盖背景氛围、字体排版、空间节奏、装饰质感四个方面。

**Architecture:** 修改两个文件 —— `action.ts` 负责导出 Poster 的 Canvas 绘制逻辑，`PosterStory.vue` 负责 Story 模式的模板和样式。两个文件共享同一套视觉语言（配色、字重层级、间距体系），但各自独立实现。

**Tech Stack:** Electron renderer, TypeScript, Canvas 2D API, Vue 3 SFC, Less CSS modules, ESLint

---

## 文件结构

- 修改: `src/renderer/store/reportYearly/action.ts`
  - 背景绘制（渐变、光球、纹理）
  - `fillGlassCard()` 质感升级
  - `drawYearlyPoster()` 字体、间距、装饰分隔线
  - 新增模块级噪点纹理缓存
- 修改: `src/renderer/views/ReportYearly/components/PosterStory.vue`
  - Phase 配色变量
  - 页面背景公式（linear → radial gradient）
  - 光斑装饰重写
  - 玻璃卡片 CSS 变量
  - 字体层级与间距调整

---

### Task 1: 导出 Poster 背景氛围重制

**Files:**
- 修改: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: 添加模块级噪点纹理缓存**

在 `action.ts` 顶部（`formatDuration` 等工具函数之后、`drawYearlyPosterClassic` 之前）插入：

```ts
let noisePatternCanvas: HTMLCanvasElement | null = null
const getNoisePattern = (): CanvasPattern | null => {
  if (noisePatternCanvas) {
    const cachedCtx = noisePatternCanvas.getContext('2d')
    if (cachedCtx) return cachedCtx.createPattern(noisePatternCanvas, 'repeat')
  }
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const imageData = ctx.getImageData(0, 0, 128, 128)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 40)
    imageData.data[i] = v
    imageData.data[i + 1] = v
    imageData.data[i + 2] = v
    imageData.data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  noisePatternCanvas = canvas
  return ctx.createPattern(canvas, 'repeat')
}
```

- [ ] **Step 2: 替换背景梯度、光晕和方格阵列**

在 `drawYearlyPoster()` 中，找到当前的背景绘制代码块：

```ts
const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
bg.addColorStop(0, '#1f2937')
bg.addColorStop(0.45, '#1d4ed8')
bg.addColorStop(1, '#3b1f5f')
ctx.fillStyle = bg
ctx.fillRect(0, 0, canvas.width, canvas.height)

const haloA = ctx.createRadialGradient(820, 220, 80, 820, 220, 560)
haloA.addColorStop(0, 'rgba(255, 170, 120, .34)')
haloA.addColorStop(1, 'rgba(255, 170, 120, 0)')
ctx.fillStyle = haloA
ctx.fillRect(0, 0, canvas.width, canvas.height)

const haloB = ctx.createRadialGradient(180, 1540, 90, 180, 1540, 580)
haloB.addColorStop(0, 'rgba(96, 232, 255, .26)')
haloB.addColorStop(1, 'rgba(96, 232, 255, 0)')
ctx.fillStyle = haloB
ctx.fillRect(0, 0, canvas.width, canvas.height)

ctx.fillStyle = 'rgba(255, 255, 255, .06)'
for (let i = 0; i < 24; i += 1) {
  const x = 34 + (i % 6) * 170
  const y = 260 + Math.floor(i / 6) * 172
  ctx.fillRect(x, y, 110, 110)
}
```

全部替换为：

```ts
// 底色：纵向三阶渐变
const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
bg.addColorStop(0, '#0f172a')
bg.addColorStop(0.5, '#1e1b4b')
bg.addColorStop(1, '#0f172a')
ctx.fillStyle = bg
ctx.fillRect(0, 0, canvas.width, canvas.height)

// 液态光球 ×3
const orbA = ctx.createRadialGradient(820, 280, 60, 820, 280, 620)
orbA.addColorStop(0, 'rgba(255, 140, 80, .20)')
orbA.addColorStop(1, 'rgba(255, 140, 80, 0)')
ctx.fillStyle = orbA
ctx.fillRect(0, 0, canvas.width, canvas.height)

const orbB = ctx.createRadialGradient(180, 1620, 80, 180, 1620, 540)
orbB.addColorStop(0, 'rgba(56, 200, 240, .15)')
orbB.addColorStop(1, 'rgba(56, 200, 240, 0)')
ctx.fillStyle = orbB
ctx.fillRect(0, 0, canvas.width, canvas.height)

const orbC = ctx.createRadialGradient(540, 960, 100, 540, 960, 500)
orbC.addColorStop(0, 'rgba(130, 80, 220, .10)')
orbC.addColorStop(1, 'rgba(130, 80, 220, 0)')
ctx.fillStyle = orbC
ctx.fillRect(0, 0, canvas.width, canvas.height)

// 黑胶纹理：同心圆环
ctx.save()
ctx.globalAlpha = 0.028
for (let r = 260; r < 1200; r += 80) {
  ctx.beginPath()
  ctx.arc(540, 960, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, .5)'
  ctx.lineWidth = 1
  ctx.stroke()
}
ctx.restore()

// 细微噪点
const noise = getNoisePattern()
if (noise) {
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.fillStyle = noise
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}
```

- [ ] **Step 3: 运行 lint**

```bash
npx eslint src/renderer/store/reportYearly/action.ts
```

预期: No lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "feat: refresh yearly poster export background with liquid orbs and texture"
```

---

### Task 2: 导出 Poster 玻璃卡片质感升级 + 区块分隔线

**Files:**
- 修改: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: 升级 `fillGlassCard` 函数**

找到 `fillGlassCard` 函数（约第 162 行），完整替换为：

```ts
const fillGlassCard = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 24,
) => {
  // 底色填充
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = 'rgba(255, 255, 255, .07)'
  ctx.fill()

  // 内发光渐变叠加
  ctx.save()
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  const shine = ctx.createLinearGradient(x, y, x + width, y + height)
  shine.addColorStop(0, 'rgba(255, 255, 255, .18)')
  shine.addColorStop(0.4, 'rgba(255, 255, 255, .04)')
  shine.addColorStop(1, 'rgba(255, 255, 255, .01)')
  ctx.fillStyle = shine
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  // 外边框
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = 'rgba(255, 255, 255, .10)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 顶部高光线
  ctx.save()
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255, 255, 255, .14)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + radius, y + 1)
  ctx.lineTo(x + width - radius, y + 1)
  ctx.stroke()
  ctx.restore()
}
```

- [ ] **Step 2: 在四大区块之间添加渐变分隔线**

在 `drawYearlyPoster()` 中，找到 `fillGlassCard(ctx, contentLeft, middleTop, ...)` 之前、`fillGlassCard(ctx, contentLeft, replayTop, ...)` 之前、`fillGlassCard(ctx, contentLeft, footerTop, ...)` 之前，各插入分隔线绘制。

具体：在 Hero 区块绘制完成后（约 `heroTop + 334` 那行之后）、`fillGlassCard(ctx, contentLeft, middleTop, ...)` 之前插入：

```ts
// Section divider: Hero → Middle
ctx.save()
const dividerY1 = middleTop - 20
const dividerGrad1 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY1, contentLeft + contentWidth * 0.8, dividerY1)
dividerGrad1.addColorStop(0, 'rgba(255, 255, 255, 0)')
dividerGrad1.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
dividerGrad1.addColorStop(1, 'rgba(255, 255, 255, 0)')
ctx.strokeStyle = dividerGrad1
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY1)
ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY1)
ctx.stroke()
ctx.restore()
```

在 Middle 区块绘制完成后、`fillGlassCard(ctx, contentLeft, replayTop, ...)` 之前插入：

```ts
// Section divider: Middle → Replay
ctx.save()
const dividerY2 = replayTop - 20
const dividerGrad2 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY2, contentLeft + contentWidth * 0.8, dividerY2)
dividerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0)')
dividerGrad2.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
dividerGrad2.addColorStop(1, 'rgba(255, 255, 255, 0)')
ctx.strokeStyle = dividerGrad2
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY2)
ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY2)
ctx.stroke()
ctx.restore()
```

在 Replay 区块绘制完成后、`fillGlassCard(ctx, contentLeft, footerTop, ...)` 之前插入：

```ts
// Section divider: Replay → Footer
ctx.save()
const dividerY3 = footerTop - 20
const dividerGrad3 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY3, contentLeft + contentWidth * 0.8, dividerY3)
dividerGrad3.addColorStop(0, 'rgba(255, 255, 255, 0)')
dividerGrad3.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
dividerGrad3.addColorStop(1, 'rgba(255, 255, 255, 0)')
ctx.strokeStyle = dividerGrad3
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY3)
ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY3)
ctx.stroke()
ctx.restore()
```

- [ ] **Step 3: 运行 lint**

```bash
npx eslint src/renderer/store/reportYearly/action.ts
```

预期: No lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "feat: upgrade poster glass card material and add section dividers"
```

---

### Task 3: 导出 Poster 字体排版与间距精修

**Files:**
- 修改: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: 更新 `sectionGap` 和 hero 主数值到副文案的间距**

在 `getYearlyPosterLayoutMetrics()` 中（约第 80 行），将：

```ts
const sectionGap = 34
```

改为：

```ts
const sectionGap = 38
```

- [ ] **Step 2: 更新 Hero 区字体层级**

在 `drawYearlyPoster()` 的 Hero 区（约 `heroTop + 88` 那几行），修改主数值字体栈和副文案间距。

将：

```ts
ctx.font = '700 100px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(formatDuration(overview.totalListenSeconds), innerLeft, heroTop + 282)
ctx.font = '500 30px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillStyle = 'rgba(255, 255, 255, .78)'
ctx.fillText(resolveI18n('yearly_report__poster_total_line', `Total listens ${overview.sessionCount}`, { sessions: overview.sessionCount }), innerLeft + 4, heroTop + 334)
```

改为：

```ts
ctx.font = '900 100px "DIN Alternate", "SF Mono", "Menlo", "Segoe UI", monospace'
ctx.fillText(formatDuration(overview.totalListenSeconds), innerLeft, heroTop + 276)
ctx.font = '500 26px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillStyle = 'rgba(255, 255, 255, .68)'
ctx.fillText(resolveI18n('yearly_report__poster_total_line', `Total listens ${overview.sessionCount}`, { sessions: overview.sessionCount }), innerLeft + 4, heroTop + 310)
```

- [ ] **Step 3: 更新 Middle 区左栏 Favorite 行标签和数值的权重**

将 favorite 行的 label font（约 `favoriteY` 循环中）：

```ts
ctx.fillStyle = 'rgba(232, 242, 255, .66)'
ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(label, innerLeft, favoriteY)
ctx.fillStyle = '#ffffff'
ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(main, innerLeft, favoriteY + 40)
ctx.fillStyle = 'rgba(232, 242, 255, .72)'
ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(sub, innerLeft, favoriteY + 74)
```

改为：

```ts
ctx.fillStyle = 'rgba(232, 242, 255, .58)'
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(label, innerLeft, favoriteY)
ctx.fillStyle = '#ffffff'
ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(main, innerLeft, favoriteY + 42)
ctx.fillStyle = 'rgba(232, 242, 255, .64)'
ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(sub, innerLeft, favoriteY + 76)
```

- [ ] **Step 4: 更新 Middle 区右栏 KPI 卡片的间距**

将 stat 卡片循环中的 `statY += 106` 改为：

```ts
statY += 100
```

- [ ] **Step 5: 更新 Replay 区标题到列表的间距**

将 `replayHeaderHeight` 从 118 改为 122（在 `getYearlyPosterLayoutMetrics` 中）：

```ts
const replayHeaderHeight = 122
```

- [ ] **Step 6: 更新 Replay 列表行的字体**

将 replay row 循环中的字体调整（约 `replayY` 循环）：

```ts
ctx.font = '700 30px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(`#${index + 1}`, innerLeft + 24, replayY + 16)
ctx.fillStyle = '#ffffff'
ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(trimText(item.songName, replayVisibleCount <= 2 ? 32 : 28), innerLeft + 126, replayY + 12)
ctx.fillStyle = 'rgba(255, 255, 255, .68)'
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(trimText(item.artistName, replayVisibleCount <= 2 ? 24 : 22), innerLeft + 126, replayY + 46)
```

改为：

```ts
ctx.font = '700 28px "DIN Alternate", "SF Mono", "Menlo", monospace'
ctx.fillText(`#${String(index + 1).padStart(2, '0')}`, innerLeft + 24, replayY + 16)
ctx.fillStyle = '#ffffff'
ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(trimText(item.songName, replayVisibleCount <= 2 ? 32 : 28), innerLeft + 120, replayY + 12)
ctx.fillStyle = 'rgba(255, 255, 255, .60)'
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(trimText(item.artistName, replayVisibleCount <= 2 ? 24 : 22), innerLeft + 120, replayY + 46)
```

- [ ] **Step 7: 更新 Footer 区**

将 footer 填充色和字体微调：

```ts
ctx.fillStyle = 'rgba(255, 255, 255, .62)' // → .55
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
```

- [ ] **Step 8: 运行 lint**

```bash
npx eslint src/renderer/store/reportYearly/action.ts
```

预期: No lint errors.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "feat: refine poster export typography hierarchy and spacing rhythm"
```

---

### Task 4: Story 模式色彩与背景重制

**Files:**
- 修改: `src/renderer/views/ReportYearly/components/PosterStory.vue`

- [ ] **Step 1: 更新 5 组 Phase 渐变配色**

在 `pages` computed 中，更新每页的 `gradient` 和 `theme`：

Cover (warmup):
```ts
gradient: 'radial-gradient(circle at 30% 20%, #2a1814 0%, #1c1210 60%, #140c0a 100%)',
theme: 'dark',
```

KPI (warmup):
```ts
gradient: 'radial-gradient(circle at 70% 30%, #2a1a12 0%, #1c1210 60%, #140c0a 100%)',
theme: 'dark',
```

Freshness (explore):
```ts
gradient: 'radial-gradient(circle at 25% 25%, #142420 0%, #0f1a1a 60%, #0a1313 100%)',
theme: 'dark',
```

Favorites (explore):
```ts
gradient: 'radial-gradient(circle at 70% 35%, #1a201e 0%, #0f1a1a 60%, #0a1313 100%)',
theme: 'dark',
```

Season (habit):
```ts
gradient: 'radial-gradient(circle at 30% 25%, #152838 0%, #0f1c2e 60%, #0a1522 100%)',
theme: 'dark',
```

Weekly (habit):
```ts
gradient: 'radial-gradient(circle at 65% 30%, #1a2c3a 0%, #0f1c2e 60%, #0a1522 100%)',
theme: 'dark',
```

Night (deep):
```ts
gradient: 'radial-gradient(circle at 35% 28%, #1c1838 0%, #13112c 60%, #0d0b20 100%)',
theme: 'dark',
```

Replay (deep):
```ts
gradient: 'radial-gradient(circle at 60% 25%, #201c3a 0%, #13112c 60%, #0d0b20 100%)',
theme: 'dark',
```

Timeline (closure):
```ts
gradient: 'radial-gradient(circle at 30% 30%, #2a1620 0%, #1e1118 60%, #160c12 100%)',
theme: 'dark',
```

Rank (closure):
```ts
gradient: 'radial-gradient(circle at 65% 28%, #261820 0%, #1e1118 60%, #160c12 100%)',
theme: 'dark',
```

Ending (closure):
```ts
gradient: 'radial-gradient(circle at 40% 25%, #2a1420 0%, #1e1118 60%, #160c12 100%)',
theme: 'dark',
```

所有页 `theme` 统一改为 `'dark'`。

- [ ] **Step 2: 更新 CSS 中 dark theme 的文字颜色变量**

由于所有页面都改为 `dark` theme，将 `--page-ink` 和 `--page-ink-soft` 的 dark 值作为默认值。同时更新 `.page` 默认 CSS 变量：

```less
.page {
  --page-gradient: radial-gradient(circle at 30% 20%, #2a1814 0%, #1c1210 60%, #140c0a 100%);
  --page-ink: #f3f7ff;
  --page-ink-soft: rgba(243, 247, 255, .78);
  --panel-bg: rgba(255, 255, 255, .07);
  --panel-stroke: rgba(255, 255, 255, .10);
  ...
}
```

并移除模板中 `:style` 绑定里的 `--page-ink` / `--page-ink-soft` / `--panel-bg` / `--panel-stroke`（因为现在统一 dark，不需要动态切换）。

- [ ] **Step 3: 更新 phaseMetaMap 颜色映射**

将 `phaseMetaMap` 中每个 phase 的 `start`/`end` 颜色更新为新的光球色：

```ts
warmup: { label: ..., start: '#f97316', end: '#fb923c' },
explore: { label: ..., start: '#22d3a8', end: '#34d399' },
habit: { label: ..., start: '#38bdf8', end: '#60a5fa' },
deep: { label: ..., start: '#818cf8', end: '#a78bfa' },
closure: { label: ..., start: '#f472b6', end: '#fb7185' },
```

- [ ] **Step 4: 重写装饰光斑系统**

将 `ornamentSets` 从 3 组固定小圆替换为每页动态光斑。重写 `getPageOrnaments` 为生成大/中/小光斑：

```ts
interface OrnamentSeed {
  top: string
  left: string
  size: number
  alpha: number
  blur: number
  hue: string
}

const ornamentHueSets: string[][] = [
  ['rgba(249, 115, 22, VAR)', 'rgba(251, 146, 60, VAR)', 'rgba(252, 211, 77, VAR)'],
  ['rgba(34, 211, 168, VAR)', 'rgba(52, 211, 153, VAR)', 'rgba(110, 231, 183, VAR)'],
  ['rgba(56, 189, 248, VAR)', 'rgba(96, 165, 250, VAR)', 'rgba(147, 197, 253, VAR)'],
  ['rgba(129, 140, 248, VAR)', 'rgba(167, 139, 250, VAR)', 'rgba(196, 181, 253, VAR)'],
  ['rgba(244, 114, 182, VAR)', 'rgba(251, 113, 133, VAR)', 'rgba(252, 165, 165, VAR)'],
]

const getPageOrnaments = (pageIndex: number, totalPages: number): OrnamentSeed[] => {
  const hueSet = ornamentHueSets[pageIndex % ornamentHueSets.length]
  const t = totalPages > 1 ? pageIndex / (totalPages - 1) : 0.5
  return [
    { top: `${18 + (t * 14) % 18}%`, left: `${68 + (t * 10) % 16}%`, size: 260, alpha: 0.14, blur: 80, hue: hueSet[0] },
    { top: `${54 + (t * 18) % 14}%`, left: `${14 + (t * 12) % 12}%`, size: 170, alpha: 0.11, blur: 60, hue: hueSet[1] },
    { top: `${72 + (t * 12) % 14}%`, left: `${78 - (t * 8) % 12}%`, size: 80, alpha: 0.09, blur: 40, hue: hueSet[2] },
  ]
}
```

在模板中更新光斑渲染：

```html
<ul :class="$style.pageOrnaments" aria-hidden="true">
  <li
    v-for="(ornament, ornamentIndex) in getPageOrnaments(pageIndex, pages.length)"
    :key="`${page.key}-${ornamentIndex}`"
    :class="$style.pageOrnament"
    :style="{
      top: ornament.top,
      left: ornament.left,
      width: `${ornament.size}px`,
      height: `${ornament.size}px`,
      opacity: ornament.alpha,
      background: ornament.hue.replace('VAR', '1'),
      filter: `blur(${ornament.blur}px)`,
    }"
  />
</ul>
```

注意：`getPageOrnaments` 调用需要更新为传入 `pages.length`。

- [ ] **Step 5: 更新 `.pageOrnament` 的 CSS**

```less
.pageOrnament {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  animation: floatY 6.4s ease-in-out infinite;
}
```

移除原来的 `background: radial-gradient(...)` 和 `filter: blur(1px)`（因为现在通过 inline style 控制）。

- [ ] **Step 6: 运行 lint**

```bash
npx eslint src/renderer/views/ReportYearly/components/PosterStory.vue
```

预期: No lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/views/ReportYearly/components/PosterStory.vue
git commit -m "feat: refresh story mode color palette and dynamic blur orbs"
```

---

### Task 5: Story 模式卡片质感、字体与间距升级

**Files:**
- 修改: `src/renderer/views/ReportYearly/components/PosterStory.vue`

- [ ] **Step 1: 更新玻璃卡片 CSS 变量**

在模板中，所有 `.page` 的 `:style` 绑定改为只保留 `--page-gradient`（不再需要切换 light/dark 变量集）。同时更新 `.page` 默认 CSS 变量中 panel 相关：

确认 CSS 中 `.page` 的默认变量已更新（Task 4 Step 2 已做）。检查以下 CSS 类是否需要额外 `box-shadow`：

为 `.coverPanel`、`.metricCard`、`.listCard`、`.listRow`、`.freshnessRow`、`.chartRow`、`.timelineRow` 添加顶部高光：

```less
.coverPanel,
.metricCard,
.listCard {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12);
}

.listRow,
.freshnessRow,
.chartRow,
.timelineRow {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .10);
}
```

- [ ] **Step 2: 更新字体权重层次**

更新以下 CSS 类：

```less
.coverValue {
  font-weight: 900;
  font-family: "DIN Alternate", "SF Mono", "Menlo", "Segoe UI", monospace;
}

.metricValue {
  font-weight: 800;
}

.title {
  font-weight: 750;
}

.listMain {
  font-weight: 700;
}
```

- [ ] **Step 3: 更新间距**

```less
.page {
  padding: 32px 28px 24px;
}

.pageHead {
  /* gap is on .page, adjust the head bottom margin */
  margin-bottom: 22px;
}

.coverPanel,
.metricCard,
.listCard {
  padding: 18px;
}

.listRow {
  gap: 12px;
  padding: 12px 14px;
}

.chartRow {
  padding: 12px 14px;
}
```

注意 `.pageHead` 的下边距需要通过 `.page` 的 gap 控制。当前 `.page` 使用 `gap: 18px`，改为 `gap: 22px`。

- [ ] **Step 4: 更新面板背景透明度**

将 `.page` 的 `--panel-bg` 保持为 `rgba(255, 255, 255, .07)`（已在 Task 4 Step 2 设置），确保所有使用 `var(--panel-bg)` 的面板自动继承新的透明度。

- [ ] **Step 5: 运行 lint**

```bash
npx eslint src/renderer/views/ReportYearly/components/PosterStory.vue
```

预期: No lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/views/ReportYearly/components/PosterStory.vue
git commit -m "feat: upgrade story mode glass cards, typography, and spacing"
```

---

### Task 6: 验证

**Files:**
-（仅当预览调优需要时修改 action.ts 或 PosterStory.vue）

- [ ] **Step 1: 运行 lint**

```bash
npx eslint src/renderer/store/reportYearly/action.ts src/renderer/views/ReportYearly/components/PosterStory.vue
```

预期: No lint errors.

- [ ] **Step 2: 运行 build**

```bash
npm run build
```

预期: Build passes with no new errors.

- [ ] **Step 3: 手动验证导出 Poster**

启动应用 `npm run dev`，打开年报页面，切换到 Poster 导出预览。检查：

- 背景是深色液态光球风格，无方格阵列
- 玻璃卡片有微弱边框和顶部高光
- 区块之间有渐变分隔线
- 主数字使用等宽字体，字重 900
- 标签和数值层次分明
- 低/中/高数据量间距均正常

- [ ] **Step 4: 手动验证 Story 模式**

切换到 Story 模式，翻页检查：

- 每页背景是径向渐变 + 大光斑，颜色符合新配色表
- 玻璃卡片通透，有顶部高光线
- 字体层次分明
- 光斑位置每页不同，不重复

- [ ] **Step 5: 如有调优，Commit**

```bash
git add src/renderer/store/reportYearly/action.ts src/renderer/views/ReportYearly/components/PosterStory.vue
git commit -m "fix: polish yearly report visual refresh details"
```

如无需调优，跳过此 commit。

---

## 自检

**1. Spec 覆盖：**
- 3.1 导出 Poster 背景 → Task 1
- 3.2 Story 模式配色 → Task 4
- 4.1 字体栈 → Task 3, Task 5
- 4.2 三层权重体系 → Task 3
- 4.3 Story 字体调整 → Task 5
- 5.1 三级间距体系 → Task 3, Task 5
- 5.2 导出 Poster 间距 → Task 3
- 5.3 Story 间距 → Task 5
- 6.1 背景纹理（黑胶+噪点） → Task 1
- 6.2 玻璃卡片质感 → Task 2, Task 5
- 6.3 区块分隔线 → Task 2
- 6.4 Story 光斑重设 → Task 4

**2. 占位符扫描：** 无 TBD/TODO，所有步骤有完整代码。

**3. 类型一致性：**
- `OrnamentSeed` 接口在 Task 4 Step 4 定义，新增 `blur` 和 `hue` 字段
- `getPageOrnaments` 签名从 `(pageIndex: number)` 改为 `(pageIndex: number, totalPages: number)`
- 模板中 `getPageOrnaments(pageIndex, pages.length)` 调用匹配新签名
- `noisePatternCanvas` 模块级变量、`getNoisePattern()` 函数在 Task 1 定义，后续 Task 不变
