# 播放详情页 Apple Music 风格深化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变播放详情页现有布局和功能结构的前提下，深化背景、封面、歌词区和底部控制栏的视觉层级与交互反馈，让整体体验更接近 Apple Music。

**Architecture:** 本次实现基于现有 `PlayDetail` 组件族逐步微调，不做结构性重写。样式调整集中在 `index.vue`、`LyricPlayer.vue`、`PlayBar.vue` 和 `ControlBtns.vue`，必要时补少量共享 token 或统一过渡参数；验证方式以 `eslint`、构建检查和手动视觉验收为主。

**Tech Stack:** Vue 3、Pug 模板、Less Modules、Webpack、ESLint、Electron Renderer

---

## 文件结构与职责

- `src/renderer/components/layout/PlayDetail/index.vue`
  - 播放详情页主容器、背景层、左侧封面与元信息区、评论区布局。
- `src/renderer/components/layout/PlayDetail/LyricPlayer.vue`
  - 歌词区容器、激活态样式、歌词辅助浮层与歌词选择态。
- `src/renderer/components/layout/PlayDetail/PlayBar.vue`
  - 底部主播放控制、进度与时间信息、底部壳层样式。
- `src/renderer/components/layout/PlayDetail/components/ControlBtns.vue`
  - 底部次级操作按钮组，包括桌面歌词、评论、文本、音效、音量、播放模式等。
- `src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue`
  - 右上角窗口控制按钮，可选微调以与底部质感统一。
- `src/renderer/assets/styles/layout.less`
  - 若实现中发现过渡参数或通用视觉变量不足，再补少量可复用 token。

## 前置说明

- 当前仓库没有现成的单元测试脚本，本计划采用“最小代码改动 + lint/构建检查 + 手动视觉验收”策略。
- 本轮不新增功能，只优化视觉层级、动态节奏和交互反馈。
- 每个任务完成后都应提交一次小 commit，方便回滚与对比。

### Task 1: 背景、封面与元信息层级优化

**Files:**
- Modify: `src/renderer/components/layout/PlayDetail/index.vue`
- Optional: `src/renderer/assets/styles/layout.less`
- Verify: `package.json`

- [ ] **Step 1: 记录基线并确认当前主样式作用域**

Run:

```powershell
Get-Content 'src/renderer/components/layout/PlayDetail/index.vue' -TotalCount 320
```

Expected:
- 能看到 `.bgTheme`、`.bgCover`、`.bgOverlay`、`.bgVignette`
- 能看到 `.coverFrame`、`.description`、`.metaRow`、`.metaLabel`、`.metaValue`

- [ ] **Step 2: 先写出要落地的视觉修改片段**

在 `src/renderer/components/layout/PlayDetail/index.vue` 的 `<style lang="less" module>` 中，将背景与左侧信息区样式朝下面片段收敛：

```less
.bgTheme {
  opacity: .32;
}

.bgCover {
  filter: blur(48px) saturate(1.12);
  transform: scale(1.12);
  opacity: .88;
}

.bgOverlay {
  background:
    radial-gradient(circle at 24% 28%, rgba(255, 255, 255, .12) 0%, rgba(255, 255, 255, 0) 28%),
    linear-gradient(180deg, rgba(6, 8, 16, .18) 0%, rgba(6, 8, 16, .42) 100%),
    color-mix(in srgb, var(--color-app-background) 72%, transparent);
  backdrop-filter: blur(12px);
}

.bgVignette {
  background:
    radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, .06) 58%, rgba(0, 0, 0, .24) 100%);
}

.coverFrame {
  border-radius: 26px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .07) 0%, rgba(255, 255, 255, .03) 100%);
  box-shadow:
    0 28px 70px rgba(0, 0, 0, .22),
    inset 0 1px 0 rgba(255, 255, 255, .10);
}

.img {
  box-shadow: 0 22px 48px rgba(0, 0, 0, .24);
}

.description {
  margin-top: 22px;
  padding: 14px 4px 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  backdrop-filter: none;
}

.metaLabel {
  color: rgba(255, 255, 255, .42);
}

.metaValue {
  color: rgba(255, 255, 255, .94);
}
```

- [ ] **Step 3: 实现最小代码改动并补齐标题层级**

在同一文件模板区，把歌曲名从普通字段展示提升为更强标题块，保留原结构但减少“表格感”。目标片段如下：

```pug
div.description(:class="['scroll', $style.description]")
  h1(:class="$style.title") {{ musicInfo.name }}
  p(:class="$style.subtitle") {{ musicInfo.singer }}
  div(v-if="musicInfo.album" :class="$style.metaRow")
    span(:class="$style.metaLabel") {{ $t('player__music_album') }}
    span(:class="$style.metaValue") {{ musicInfo.album }}
  div(:class="$style.metaAccent")
    span(:class="$style.metaAccentLine")
    span(:class="$style.metaAccentText") {{ status || $t('player__play') }} · {{ nowPlayTimeStr }} / {{ maxPlayTimeStr }}
```

并在样式中新增：

```less
.title {
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 4px 18px rgba(0, 0, 0, .22);
}

.subtitle {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  color: rgba(255, 255, 255, .74);
}
```

- [ ] **Step 4: 运行 lint 验证模板和样式没有语法问题**

Run:

```powershell
npm run lint -- src/renderer/components/layout/PlayDetail/index.vue
```

Expected:
- 没有 `Parsing error`
- 没有 `vue/no-parsing-error`
- 如果仓库脚本不支持单文件参数，退回执行 `npm run lint`

- [ ] **Step 5: 手动验收背景与左侧信息区**

Run:

```powershell
npm run dev
```

Expected:
- 背景颜色比原来更通透，不是一整层厚灰遮罩
- 封面更像主视觉主体，外框感减弱
- 左侧信息更像内容展示，歌名和歌手层级清晰

- [ ] **Step 6: 提交这一阶段**

```powershell
git add src/renderer/components/layout/PlayDetail/index.vue src/renderer/assets/styles/layout.less
git commit -m "refactor: deepen play detail background and metadata hierarchy"
```

### Task 2: 歌词区空间感与当前行聚焦优化

**Files:**
- Modify: `src/renderer/components/layout/PlayDetail/LyricPlayer.vue`
- Verify: `src/renderer/utils/compositions/useLyric.js`

- [ ] **Step 1: 确认当前歌词区类名与激活态结构**

Run:

```powershell
Get-Content 'src/renderer/components/layout/PlayDetail/LyricPlayer.vue' -TotalCount 360
```

Expected:
- 能看到 `.right::before`、`.lyric`、`.line-content`、`.extended`、`.active`
- 能确认现有逐字高亮结构仍由 `useLyric` 驱动

- [ ] **Step 2: 先写出歌词容器弱化面板感的样式片段**

在 `src/renderer/components/layout/PlayDetail/LyricPlayer.vue` 中，把右侧外框收淡，避免大玻璃卡片感：

```less
.right {
  &::before {
    inset: 6% 1% 6% 4%;
    border-radius: 34px;
    background: linear-gradient(180deg, rgba(8, 10, 18, .06) 0%, rgba(8, 10, 18, .14) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .05),
      0 16px 38px rgba(0, 0, 0, .10);
    backdrop-filter: blur(12px);
    opacity: .72;
  }
}

.lyric {
  -webkit-mask-image: linear-gradient(transparent 0%, rgba(255, 255, 255, .62) 16%, #fff 30%, #fff 70%, rgba(255, 255, 255, .62) 84%, transparent 100%);
}
```

- [ ] **Step 3: 实现当前歌词与非当前歌词更清晰的层级差**

继续在同文件中调整当前行与非当前行：

```less
:global {
  .line-content {
    padding: calc(var(--playDetail-lrc-font-size, 16px) / 2.4) 12px;
    color: rgba(255, 255, 255, .56);
    opacity: .78;
    filter: saturate(.82) blur(.2px);

    .extended {
      font-size: 0.78em;
      margin-top: 8px;
      opacity: .62;
    }

    &.active {
      opacity: 1;
      transform: scale(1.018);
      filter: saturate(1.04);

      .font-lrc {
        color: #fff;
        text-shadow:
          0 0 28px rgba(255, 255, 255, .16),
          0 4px 22px rgba(0, 0, 0, .34);
      }

      .extended {
        opacity: .78;
      }
    }
  }
}
```

- [ ] **Step 4: 优化跳转辅助控件和歌词滚动观感**

在 `LyricPlayer.vue` 中把跳转控件处理成更轻的辅助浮层，不改逻辑，只调视觉：

```less
.skip {
  top: calc(38% + var(--playDetail-lrc-font-size, 16px) + 8px);
}

.line {
  opacity: .32;
}

.label {
  color: rgba(255, 255, 255, .72);
  text-shadow: 0 2px 10px rgba(0, 0, 0, .18);
}

.skipBtn {
  background: rgba(255, 255, 255, .10);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 8px 20px rgba(0, 0, 0, .16);
}
```

- [ ] **Step 5: 运行 lint 并做歌词场景手动验收**

Run:

```powershell
npm run lint -- src/renderer/components/layout/PlayDetail/LyricPlayer.vue
```

Expected:
- 样式与模板无语法错误
- 手动查看时当前歌词更易锁定，非当前行明显退后
- 长歌词、扩展歌词和逐字歌词仍然可读

- [ ] **Step 6: 提交这一阶段**

```powershell
git add src/renderer/components/layout/PlayDetail/LyricPlayer.vue
git commit -m "style: refine play detail lyric focus and motion"
```

### Task 3: 底部控制栏主次层级与主播放键强化

**Files:**
- Modify: `src/renderer/components/layout/PlayDetail/PlayBar.vue`

- [ ] **Step 1: 确认当前底部控制区模板结构**

Run:

```powershell
Get-Content 'src/renderer/components/layout/PlayDetail/PlayBar.vue' -TotalCount 320
```

Expected:
- 能看到 `footerShell`、`footerLeft`、`playControl`、`playBtn`、`playBtnPrimary`
- 能确认模板不需要重排，只需要视觉强化

- [ ] **Step 2: 先写出底部壳层减厚、主次更明确的样式片段**

在 `src/renderer/components/layout/PlayDetail/PlayBar.vue` 中按如下方向收敛：

```less
.footerShell {
  min-height: 84px;
  padding: 12px 16px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(8, 10, 18, .12) 0%, rgba(8, 10, 18, .20) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .07),
    0 18px 34px rgba(0, 0, 0, .12);
  backdrop-filter: blur(14px);
}

.timeLabel {
  color: rgba(255, 255, 255, .72);
}

.status {
  color: rgba(255, 255, 255, .58);
}
```

- [ ] **Step 3: 强化主播放按钮作为中心锚点**

继续在同一文件中调整按钮关系：

```less
.playControl {
  gap: 8px;
  padding: 0 4px 0 10px;
}

.playBtn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, .10);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .06),
    0 8px 18px rgba(0, 0, 0, .10);

  &:hover {
    transform: translateY(0) scale(1.02);
    background: rgba(255, 255, 255, .16);
  }
}

.playBtnPrimary {
  width: 54px;
  height: 54px;
  background: color-mix(in srgb, var(--color-primary) 88%, rgba(255, 255, 255, .10));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .16),
    0 16px 28px rgba(0, 0, 0, .18);

  &:hover {
    transform: scale(1.03);
  }

  &:active {
    transform: scale(.97);
  }
}
```

- [ ] **Step 4: 微调进度条与时间信息，避免抢主控焦点**

补一组轻量调整：

```less
.progressContent {
  height: 14px;
  padding: 4px 0;
}

.timeValue,
.timeDivider {
  font-size: 12px;
}
```

- [ ] **Step 5: 运行 lint 并手动检查播放控制反馈**

Run:

```powershell
npm run lint -- src/renderer/components/layout/PlayDetail/PlayBar.vue
```

Expected:
- 没有语法错误
- 主播放按钮比前后曲更有分量，但三者仍然像同一组控件
- 底部整体更轻，不再像单独一块厚玻璃面板

- [ ] **Step 6: 提交这一阶段**

```powershell
git add src/renderer/components/layout/PlayDetail/PlayBar.vue
git commit -m "style: strengthen play detail footer control hierarchy"
```

### Task 4: 次级按钮与头部按钮一致性微调

**Files:**
- Modify: `src/renderer/components/layout/PlayDetail/components/ControlBtns.vue`
- Modify: `src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue`

- [ ] **Step 1: 检查次级按钮和头部按钮的默认/激活状态**

Run:

```powershell
Get-Content 'src/renderer/components/layout/PlayDetail/components/ControlBtns.vue' -TotalCount 260
Get-Content 'src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue' -TotalCount 240
```

Expected:
- 能看到次级按钮默认背景、激活态颜色、hover/active 反馈
- 能看到头部按钮的当前悬浮与按压处理

- [ ] **Step 2: 收淡次级按钮默认存在感并统一激活语言**

在 `ControlBtns.vue` 中改成以下方向：

```less
.footerLeftControlBtns {
  gap: 7px;

  button {
    width: 32px;
    height: 32px;
    color: rgba(255, 255, 255, .62);
  }

  .footerLeftControlBtn {
    background-color: rgba(255, 255, 255, .06);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05);

    &:hover {
      transform: scale(1.02);
      background-color: rgba(255, 255, 255, .12);
      color: rgba(255, 255, 255, .88);
    }

    &.active {
      color: #fff;
      background-color: color-mix(in srgb, var(--color-primary) 74%, rgba(255, 255, 255, .10));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .10),
        0 8px 18px rgba(0, 0, 0, .14);
    }
  }
}
```

- [ ] **Step 3: 轻微统一头部按钮质感**

在 `ControlBtnsRightHeader.vue` 中只做一致性修饰，不改变功能：

```less
.controBtn {
  button {
    background: rgba(255, 255, 255, .06);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .06),
      0 6px 14px rgba(0, 0, 0, .10);

    &.hover {
      transform: scale(1.02);
      background-color: rgba(255, 255, 255, .12);
    }
  }
}
```

- [ ] **Step 4: 运行 lint 检查两个文件**

Run:

```powershell
npm run lint -- src/renderer/components/layout/PlayDetail/components/ControlBtns.vue src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue
```

Expected:
- 两个文件都没有样式或模板语法错误
- 次级按钮默认更低调，激活态统一
- 头部按钮不会比底部主控更抢眼

- [ ] **Step 5: 提交这一阶段**

```powershell
git add src/renderer/components/layout/PlayDetail/components/ControlBtns.vue src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue
git commit -m "style: unify play detail secondary and header controls"
```

### Task 5: 全局回归验证与收尾

**Files:**
- Verify: `src/renderer/components/layout/PlayDetail/index.vue`
- Verify: `src/renderer/components/layout/PlayDetail/LyricPlayer.vue`
- Verify: `src/renderer/components/layout/PlayDetail/PlayBar.vue`
- Verify: `src/renderer/components/layout/PlayDetail/components/ControlBtns.vue`
- Verify: `src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue`
- Update if needed: `docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md`

- [ ] **Step 1: 运行一次完整 lint**

Run:

```powershell
npm run lint
```

Expected:
- 不引入新的 ESLint 报错
- 如果仓库已有历史 warning，仅记录与本次变更相关项

- [ ] **Step 2: 运行一次 renderer 构建检查**

Run:

```powershell
npm run build:renderer
```

Expected:
- Renderer 构建通过
- 没有 Less、Vue 模板或模块导入错误

- [ ] **Step 3: 做完整手动视觉验收**

Run:

```powershell
npm run dev
```

Expected:
- 普通模式和全屏模式下页面都正常
- 背景、封面、歌词区、底部控制栏形成统一场景感
- 评论区打开后没有破坏页面层级
- 长歌名、长歌手名、长专辑名没有明显断层或重叠
- 当前歌词行更容易识别，长歌词和扩展歌词仍可读
- 底部主按钮最醒目，但次级操作依然易用
- reduced-motion 下界面仍可用，没有不必要动画

- [ ] **Step 4: 如验收中发现偏差，做最后的小范围回调**

允许的小修范围：

```text
- 调整背景遮罩透明度
- 调整歌词当前行缩放幅度
- 调整次级按钮默认不透明度
- 调整底部壳层阴影和模糊强度
```

完成后重复：

```powershell
npm run lint
npm run build:renderer
```

- [ ] **Step 5: 更新文档状态并提交收尾**

```powershell
git add src/renderer/components/layout/PlayDetail/index.vue src/renderer/components/layout/PlayDetail/LyricPlayer.vue src/renderer/components/layout/PlayDetail/PlayBar.vue src/renderer/components/layout/PlayDetail/components/ControlBtns.vue src/renderer/components/layout/PlayDetail/ControlBtnsRightHeader.vue docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md
git commit -m "feat: deepen play detail apple music inspired polish"
```

## 规格覆盖自检

- `背景`：Task 1 覆盖。
- `封面区域`：Task 1 覆盖。
- `元信息区域`：Task 1 覆盖。
- `歌词区域`：Task 2 覆盖。
- `歌词动效`：Task 2 覆盖。
- `底部控制栏`：Task 3 覆盖。
- `次级操作`：Task 4 覆盖。
- `动效规范 / reduced motion / 验收标准`：Task 5 覆盖。

## 占位符扫描自检

- 计划中未使用未完成占位描述。
- 每个任务都给出了明确文件、命令和目标代码片段。
- 需要人工判断的地方都写明了预期观察结果，没有只写“自行调整”。

## 类型与命名一致性自检

- 所有文件路径均使用当前仓库实际存在的路径。
- 所有样式类名均来自现有组件，新增类名只在对应任务中同步声明。
- 验证命令统一使用当前仓库已有脚本：`npm run lint`、`npm run build:renderer`、`npm run dev`。
