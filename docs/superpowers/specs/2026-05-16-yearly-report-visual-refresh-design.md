# 年报海报视觉翻新设计说明

## 1. 背景

当前年报的 Story 模式（PosterStory.vue）和导出 Poster（drawYearlyPoster）已完成自适应布局优化，但视觉质感不足。用户反馈配色氛围、字体排版、空间留白、装饰质感四个方面都需要提升，方向为"精致音乐感"（参考 Apple Music Replay 风格）。

## 2. 目标

- 提升海报整体质感，从"功能可用"到"视觉精致"
- 保持现有四段式结构（Hero / Middle / Replay / Footer）和 1080x1920 导出尺寸不变
- 保持自适应布局逻辑不变，视觉层与布局层解耦
- Story 模式和导出 Poster 共享同一套视觉语言

## 3. 色彩与氛围系统

### 3.1 导出 Poster 背景

移除当前方格阵列 + 2 个光晕方案，替换为：

- **底色**：纵向渐变 `#0f172a` → `#1e1b4b` → `#0f172a`
- **3 个液态光球**（径向渐变 + 高 blur）：
  - 右上：`rgba(255, 140, 80, .18)`，半径 ~600px
  - 左下：`rgba(56, 200, 240, .14)`，半径 ~500px
  - 中偏下：`rgba(130, 80, 220, .10)`，半径 ~480px
- **细微噪点纹理**：叠加一层低透明度噪点

### 3.2 Story 模式页面配色

每页公式：`底色径向渐变 + 1 个大型液态光球 + 顶部光弧`

5 组 Phase 配色：

| Phase | 底色基调 | 光球色 |
|-------|---------|--------|
| Warmup | `#1c1210` 深橙棕 | `#f97316` 暖橙 |
| Explore | `#0f1a1a` 深蓝绿 | `#22d3a8` 青绿 |
| Habit | `#0f1c2e` 深蓝 | `#38bdf8` 天蓝 |
| Deep | `#13112c` 深靛 | `#818cf8` 紫蓝 |
| Closure | `#1e1118` 深红棕 | `#f472b6` 玫红 |

## 4. 字体与排版层次

### 4.1 字体栈

- 数字/大数值：`"DIN Alternate", "SF Mono", "Menlo", monospace`（等宽数字，海报感）
- 中文/标题/正文：`"PingFang SC", "Microsoft YaHei", sans-serif`
- 英文章节标签：`"SF Pro Display", "Segoe UI", sans-serif`，加 letter-spacing

### 4.2 三层权重体系（导出 Poster）

| 层级 | 字号 | 字重 | 用途 | 颜色/透明度 |
|------|------|------|------|-------------|
| 主数值 | 88–110px | 900 | 总时长、活跃天数 | `#ffffff` |
| 标题 | 36–56px | 700 | 区块标题 | `#ffffff` |
| 副标题 | 28–34px | 700 | 歌名、歌手名 | `#ffffff` |
| 标签 | 20–26px | 500 | 标签文字 | `rgba(255,255,255,.72)` |
| 辅助 | 18–22px | 500 | 次要信息 | `rgba(255,255,255,.58)` |

关键变化：
- 主数值保持 100px，字重 900 + 等宽数字
- 标签与数值权重对比拉大
- 区块标题统一 42px/700
- 英文章节标签 letter-spacing +.08em，中文标题 +.02em

### 4.3 Story 模式对应调整

- `.coverValue`：900 字重 + 等宽数字
- `.metricValue`：字重 800，与 `.metricLabel` 拉开对比
- `.title`：字重从 820 → 750

## 5. 空间与留白节奏

### 5.1 三级间距体系

| 级别 | 值 | 用途 |
|------|-----|------|
| 紧凑间距 | 12–16px | 卡片内标签与数值之间 |
| 标准间距 | 20–28px | 卡片内边距、同类元素之间 |
| 区块间距 | 32–44px | Hero / Middle / Replay / Footer 之间 |

所有间距按 4px 基准对齐。

### 5.2 导出 Poster 间距调整

| 位置 | 当前 | 改为 |
|------|------|------|
| sectionGap | 34px | 38px |
| hero 主数字到副文案 | ~20px | 28px |
| middle 左栏行间距 | 96px | 88–100px 浮动 |
| middle 右栏卡片间距 | 106px | 100px |
| replay 标题到第一行 | ~48px | 52px |
| replay 行间距 | replayRowHeight | 保持自适应逻辑 |

### 5.3 Story 模式间距调整

- `.page` padding: `28px 28px 22px` → `32px 28px 24px`
- `.pageHead` gap: 18px → 22px
- `.coverPanel` / `.metricCard` / `.listCard` padding: 14px → 18px
- `.listRow` gap: 10px → 12px
- `.chartRow` padding: `10px 12px` → `12px 14px`

## 6. 装饰与质感

### 6.1 导出 Poster 背景纹理

移除 24 个半透明方格，替换为：
- 黑胶纹理：2-3 个同心圆环，`globalAlpha` ~.03
- 液态光球：见第 3 节

### 6.2 玻璃卡片质感升级

**Canvas (fillGlassCard)：**
- 填充 `rgba(255,255,255,.07)`（原 .06）
- 新增 1px 边框 `rgba(255,255,255,.10)`
- 新增顶部高光线 2px `rgba(255,255,255,.14)`

**Story 模式 CSS：**
- `background: rgba(255,255,255,.07)`
- `border: 1px solid rgba(255,255,255,.10)`
- `box-shadow: inset 0 1px 0 rgba(255,255,255,.12)`（顶部高光）
- `backdrop-filter: blur(12px)`

### 6.3 区块间装饰线

Hero/Middle/Replay/Footer 之间添加渐变透明分隔线：
```
rgba(255,255,255,0) → rgba(255,255,255,.06) → rgba(255,255,255,0)
```
长度约画布宽度 60%，居中。

### 6.4 Story 光斑重设

移除固定 3 套小圆模板，替换为每页：
- 1 个大光斑（跟随光球色），size 200-300px
- 1 个中光斑（对比色），size 120-180px
- 1 个小微光，size 60-100px
- 全部高 blur，alpha .12-.26
- 位置每页微调

## 7. 实施边界

**调整范围：**
- `src/renderer/store/reportYearly/action.ts`：导出 Poster 绘制逻辑
- `src/renderer/views/ReportYearly/components/PosterStory.vue`：Story 模式样式

**不调整：**
- 自适应布局规则（`getYearlyPosterLayoutMetrics`）
- 导出尺寸、导出入口、数据链路
- Grid 模式的卡片组件
- Classic 导出风格

## 8. 验收标准

- 导出 Poster 质感明显提升，不再有"生硬方格"痕迹
- Story 模式每页配色协调，渐变过渡自然
- 玻璃卡片有通透感和高光线
- 字体层次清晰，主数值突出、标签克制
- 间距均匀，区块之间呼吸感一致
- 低/中/高数据量场景下视觉均不崩坏
- Lint 和 build 通过
