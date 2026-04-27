# Global UI Visual Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动现有信息架构与页面布局的前提下，统一桌面端主要页面的视觉语言与交互动效，消除“新旧样式并存”的割裂感。

**Architecture:** 采用“先基座、再页面、后收口”的三阶段改造。第一阶段统一全局 token 与基础控件行为；第二阶段对齐搜索、歌单、排行榜、下载、设置等高频页面；第三阶段做播放详情与主壳层衔接、可访问性与动效规范收尾。所有改造都保持 DOM 结构最小变更，优先样式与语义增强。

**Tech Stack:** Vue 3、Less Modules、Electron Renderer、ESLint、Webpack

---

## File Structure And Ownership

- `src/renderer/assets/styles/index.less`
  - 全局 CSS 变量入口，补齐 `--ui-*` 语义变量映射，减少组件直接依赖旧变量。
- `src/renderer/assets/styles/layout.less`
  - 全局尺寸、圆角、间距、阴影、动效 token，作为页面与组件统一尺度。
- `src/renderer/components/base/Selection.vue`
  - 旧风格最明显的基础控件之一，统一尺寸、圆角、下拉面板阴影、focus 样式。
- `src/renderer/components/base/Input.vue`
  - 输入框统一到 `--ui-*` 语义色与可见焦点规范。
- `src/renderer/components/base/Menu.vue`
  - 菜单面板与菜单项状态统一，避免页面间阴影和 hover 反馈不一致。
- `src/renderer/components/base/Popup.vue`
  - 弹出层与箭头面板统一视觉厚度和层级。
- `src/renderer/views/Search/index.vue`
  - 搜索页顶部筛选区与内容区间距基线。
- `src/renderer/views/songList/List/index.vue`
  - 歌单列表页选择器“硬覆盖”样式清理，回归统一控件体系。
- `src/renderer/views/Leaderboard/index.vue`
  - 排行榜顶部筛选区与左列列表的状态、阴影、行高对齐。
- `src/renderer/views/Download/index.vue`
  - 下载页容器节奏、头部间距、空态视觉层级对齐。
- `src/renderer/views/List/MyList/index.vue`
  - 我的列表侧栏状态色、行高、按钮可见性节奏对齐。
- `src/renderer/components/layout/Aside/NavBar.vue`
  - 主导航状态反馈与新体系色板统一。
- `src/renderer/components/layout/PlayBar/FullWidthProgress.vue`
- `src/renderer/components/layout/PlayBar/MiddleWidthProgress.vue`
- `src/renderer/components/layout/PlayBar/MiniWidthProgress.vue`
  - 播放栏主控按钮语义与键盘可达性统一。
- `src/renderer/App.vue`
  - 主壳层背景与阴影参数，减少与播放详情页视觉断层。
- `src/renderer/components/layout/PlayDetail/index.vue`
  - 保持既有 Apple Music 风格深挖成果，做壳层衔接微调。
- `docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md`
  - 增补“全局一致性规范”附录，避免后续页面回归旧风格。

---

### Task 1: 建立全局视觉 Token 基线（P0）

**Files:**
- Modify: `src/renderer/assets/styles/index.less`
- Modify: `src/renderer/assets/styles/layout.less`

- [ ] **Step 1: 记录现状并确认混用规模**

Run:

```powershell
rg -n -- "--ui-" src/renderer | Measure-Object | % {$_.Count}
rg -n "var\(--color-" src/renderer | Measure-Object | % {$_.Count}
```

Expected:
- 输出两个数字，且 `var(--color-*)` 明显高于 `--ui-*`
- 作为本轮改造前基线写入提交说明

- [ ] **Step 2: 在 `index.less` 补齐语义变量映射**

在 `:root` 中新增或收敛以下映射（保留原变量兼容）：

```less
:root {
  --ui-danger: var(--color-danger, #e85454);
  --ui-success: #1f8f55;
  --ui-warning: #b57a06;
  --ui-surface-3: color-mix(in srgb, var(--ui-surface-1) 88%, var(--ui-surface-2));
  --ui-divider: color-mix(in srgb, var(--color-list-header-border-bottom) 62%, transparent);
}
```

- [ ] **Step 3: 在 `layout.less` 统一尺寸与动效 token**

新增并收口到统一节奏：

```less
@ui-control-height-xl: 44px;
@ui-row-height-lg: 48px;

@ui-transition-slow: 0.32s ease;
@ui-ease-standard: cubic-bezier(.22, .61, .36, 1);
```

并将已有 `@ui-transition-fast/@ui-transition-normal` 用于后续页面和基础控件。

- [ ] **Step 4: 运行基础校验**

Run:

```powershell
npx eslint src/renderer/assets/styles/index.less src/renderer/assets/styles/layout.less
npm run build:renderer
```

Expected:
- 无语法错误
- renderer 构建通过

- [ ] **Step 5: 提交阶段成果**

```powershell
git add src/renderer/assets/styles/index.less src/renderer/assets/styles/layout.less
git commit -m "refactor: establish global ui token baseline"
```

---

### Task 2: 统一基础控件（Selection/Input/Menu/Popup）（P0）

**Files:**
- Modify: `src/renderer/components/base/Selection.vue`
- Modify: `src/renderer/components/base/Input.vue`
- Modify: `src/renderer/components/base/Menu.vue`
- Modify: `src/renderer/components/base/Popup.vue`

- [ ] **Step 1: 对齐 Selection 到新控件尺度**

将 `Selection.vue` 的核心尺寸与状态改为：

```less
@selection-height: @ui-control-height-md;

.label {
  border-radius: @ui-radius-md;
  background-color: var(--ui-control-bg);
  color: var(--ui-text-primary);
  transition: background-color @ui-transition-fast, color @ui-transition-fast, box-shadow @ui-transition-fast;
}

.list {
  border-radius: @ui-radius-md;
  box-shadow: @ui-shadow-1;
  background-color: var(--ui-popover-bg);
}
```

- [ ] **Step 2: 为 Selection 菜单项补齐焦点反馈**

在 `.listItem` 增加：

```less
.listItem {
  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--ui-focus-ring);
  }
}
```

- [ ] **Step 3: 对齐 Input 到 `--ui-*` 语义色**

在 `Input.vue` 中收口：

```less
.input {
  border-radius: @ui-radius-md;
  background-color: var(--ui-control-bg);
  color: var(--ui-text-primary);

  &:hover, &:focus {
    background-color: var(--ui-control-bg-hover);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px var(--ui-focus-ring);
  }
}
```

- [ ] **Step 4: 对齐 Menu 与 Popup 面板风格**

在 `Menu.vue`、`Popup.vue` 统一：

```less
border-radius: @ui-radius-md;
background-color: var(--ui-popover-bg);
box-shadow: @ui-shadow-1;
```

菜单项 hover/active 统一到：

```less
&:hover { background-color: var(--ui-popover-hover); }
&:active { background-color: var(--ui-popover-active); }
```

- [ ] **Step 5: 运行控件级校验**

Run:

```powershell
npx eslint src/renderer/components/base/Selection.vue src/renderer/components/base/Input.vue src/renderer/components/base/Menu.vue src/renderer/components/base/Popup.vue
npm run build:renderer
```

Expected:
- 四个组件无 lint 错误
- 构建通过

- [ ] **Step 6: 提交阶段成果**

```powershell
git add src/renderer/components/base/Selection.vue src/renderer/components/base/Input.vue src/renderer/components/base/Menu.vue src/renderer/components/base/Popup.vue
git commit -m "refactor: unify base form and popover controls"
```

---

### Task 3: 统一顶部筛选区（Search / SongList / Leaderboard）（P0）

**Files:**
- Modify: `src/renderer/views/Search/index.vue`
- Modify: `src/renderer/views/songList/List/index.vue`
- Modify: `src/renderer/views/Leaderboard/index.vue`

- [ ] **Step 1: 对齐页头间距与高度节奏**

将三页页头统一到同一节奏：

```less
.header {
  min-height: @ui-control-height-xl;
  gap: @ui-gap-md;
}
```

- [ ] **Step 2: 移除对 Selection 的“硬覆盖老样式”**

在 `songList/List/index.vue` 和 `Leaderboard/index.vue` 删除或重写这些旧样式覆盖：

```less
:global(.label-content) { border-radius: 0; line-height: 38px; }
:global(.selection-list) { max-height: 500px; box-shadow: 0 1px 4px ... / 0 1px 8px ...; }
```

替换为：

```less
:global(.label-content) {
  border-radius: @ui-radius-md;
  min-height: @ui-control-height-md;
}
```

- [ ] **Step 3: 统一筛选弹层阴影与列表项状态**

在两个页面都收口到：

```less
:global(.selection-list) {
  box-shadow: @ui-shadow-1;
  border-radius: @ui-radius-md;
}
```

- [ ] **Step 4: 运行页级校验**

Run:

```powershell
npx eslint src/renderer/views/Search/index.vue src/renderer/views/songList/List/index.vue src/renderer/views/Leaderboard/index.vue
npm run build:renderer
```

Expected:
- 三个页面 lint 通过
- 构建通过

- [ ] **Step 5: 提交阶段成果**

```powershell
git add src/renderer/views/Search/index.vue src/renderer/views/songList/List/index.vue src/renderer/views/Leaderboard/index.vue
git commit -m "style: align top filter bars across primary list pages"
```

---

### Task 4: 统一列表页容器节奏（Download / MyList / BoardList）（P1）

**Files:**
- Modify: `src/renderer/views/Download/index.vue`
- Modify: `src/renderer/views/List/MyList/index.vue`
- Modify: `src/renderer/views/Leaderboard/BoardList/index.vue`

- [ ] **Step 1: 统一列表行高与文本层级**

在相关容器中对齐至：

```less
:global(.list-item) {
  min-height: @ui-row-height-md;
}
```

标题与次要文本颜色分别使用 `--ui-text-primary` / `--ui-text-secondary`。

- [ ] **Step 2: 统一空态容器视觉**

`Download/index.vue` 空态改为与新体系一致：

```less
.noItemContent {
  padding: @ui-gap-xl;
  border-radius: @ui-radius-lg;
  background-color: var(--ui-surface-1);
  box-shadow: @ui-shadow-1;
}
```

- [ ] **Step 3: 统一左侧列表激活态与 hover 态**

`MyList/index.vue`、`BoardList/index.vue` 对齐：

```less
&.active { color: var(--ui-accent); }
&:hover:not(.active) { background-color: var(--ui-list-row-hover); }
&.clicked { background-color: var(--ui-list-row-selected); }
```

- [ ] **Step 4: 运行页级校验**

Run:

```powershell
npx eslint src/renderer/views/Download/index.vue src/renderer/views/List/MyList/index.vue src/renderer/views/Leaderboard/BoardList/index.vue
npm run build:renderer
```

Expected:
- lint 通过
- 构建通过

- [ ] **Step 5: 提交阶段成果**

```powershell
git add src/renderer/views/Download/index.vue src/renderer/views/List/MyList/index.vue src/renderer/views/Leaderboard/BoardList/index.vue
git commit -m "style: unify list container rhythm and side list states"
```

---

### Task 5: 统一导航与播放栏交互语义（P1）

**Files:**
- Modify: `src/renderer/components/layout/Aside/NavBar.vue`
- Modify: `src/renderer/components/layout/PlayBar/FullWidthProgress.vue`
- Modify: `src/renderer/components/layout/PlayBar/MiddleWidthProgress.vue`
- Modify: `src/renderer/components/layout/PlayBar/MiniWidthProgress.vue`

- [ ] **Step 1: 对齐侧边导航状态色到新语义变量**

在 `NavBar.vue` 中用 `--ui-*` 替换强耦合旧色：

```less
&.active { background-color: var(--ui-list-row-selected); }
&:hover:not(.active) { background-color: var(--ui-list-row-hover); }
```

- [ ] **Step 2: 把播放栏主控制器从 `div@click` 收口为语义按钮**

将三个播放栏文件中的主控制器改为：

```pug
button(:class="$style.playBtn" type="button" :aria-label="$t('player__prev')" @click="playPrev()")
```

并同步更新暂停、播放、下一首按钮。

- [ ] **Step 3: 补齐按钮焦点态**

在三个文件的 `.playBtn` 增加：

```less
&:focus-visible {
  box-shadow: 0 0 0 3px var(--ui-focus-ring);
}
```

- [ ] **Step 4: 运行交互相关校验**

Run:

```powershell
npx eslint src/renderer/components/layout/Aside/NavBar.vue src/renderer/components/layout/PlayBar/FullWidthProgress.vue src/renderer/components/layout/PlayBar/MiddleWidthProgress.vue src/renderer/components/layout/PlayBar/MiniWidthProgress.vue
npm run build:renderer
```

Expected:
- lint 通过
- 构建通过

- [ ] **Step 5: 提交阶段成果**

```powershell
git add src/renderer/components/layout/Aside/NavBar.vue src/renderer/components/layout/PlayBar/FullWidthProgress.vue src/renderer/components/layout/PlayBar/MiddleWidthProgress.vue src/renderer/components/layout/PlayBar/MiniWidthProgress.vue
git commit -m "refactor: normalize nav and playbar interaction semantics"
```

---

### Task 6: 主壳层与播放详情视觉衔接（P1）

**Files:**
- Modify: `src/renderer/App.vue`
- Modify: `src/renderer/components/layout/PlayDetail/index.vue`

- [ ] **Step 1: 统一主壳层表面层级**

在 `App.vue` 对齐主容器视觉厚度：

```less
#right {
  background-color: var(--ui-surface-2);
  box-shadow: @ui-shadow-1;
}
```

- [ ] **Step 2: 在播放详情中增加与主壳层一致的过渡参数**

在 `PlayDetail/index.vue` 收口过渡节奏：

```less
.main {
  transition: background-color @ui-transition-normal, box-shadow @ui-transition-normal;
}
```

并避免引入新的布局变化。

- [ ] **Step 3: 运行局部校验**

Run:

```powershell
npx eslint src/renderer/App.vue src/renderer/components/layout/PlayDetail/index.vue
npm run build:renderer
```

Expected:
- lint 通过
- 构建通过

- [ ] **Step 4: 提交阶段成果**

```powershell
git add src/renderer/App.vue src/renderer/components/layout/PlayDetail/index.vue
git commit -m "style: bridge shell and play detail visual language"
```

---

### Task 7: 全局动效与可访问性收口（P2）

**Files:**
- Modify: `src/renderer/assets/styles/index.less`
- Modify: `src/renderer/components/base/Selection.vue`
- Modify: `src/renderer/components/base/Input.vue`
- Modify: `src/renderer/components/base/Menu.vue`
- Modify: `src/renderer/components/base/Popup.vue`

- [ ] **Step 1: 增加 reduced-motion 全局兜底**

在 `index.less` 增加：

```less
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }
}
```

- [ ] **Step 2: 保证关键控件都有 `focus-visible`**

确认并补齐以下模式：

```less
&:focus-visible {
  box-shadow: 0 0 0 3px var(--ui-focus-ring);
}
```

目标覆盖 Selection、Input、Menu item、Popup 触发项。

- [ ] **Step 3: 运行无障碍回归校验**

Run:

```powershell
npx eslint src/renderer/assets/styles/index.less src/renderer/components/base/Selection.vue src/renderer/components/base/Input.vue src/renderer/components/base/Menu.vue src/renderer/components/base/Popup.vue
npm run build:renderer
```

Expected:
- lint 通过
- 构建通过

- [ ] **Step 4: 提交阶段成果**

```powershell
git add src/renderer/assets/styles/index.less src/renderer/components/base/Selection.vue src/renderer/components/base/Input.vue src/renderer/components/base/Menu.vue src/renderer/components/base/Popup.vue
git commit -m "chore: finalize motion and accessibility consistency"
```

---

### Task 8: 全量验收与文档收尾（P2）

**Files:**
- Verify: `src/renderer/**`（本计划变更文件）
- Modify: `docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md`

- [ ] **Step 1: 执行全量 lint**

Run:

```powershell
npm run lint
```

Expected:
- 不引入新的 lint 错误
- 若仓库已有历史问题，仅记录与本次变更无关项

- [ ] **Step 2: 执行 renderer 构建**

Run:

```powershell
npm run build:renderer
```

Expected:
- 构建成功
- 无 Less / Vue 模板语法错误

- [ ] **Step 3: 执行手动验收清单**

Run:

```powershell
npm run dev
```

Expected:
- 搜索、歌单、排行榜顶部筛选区视觉一致
- 下载页、我的列表、排行榜左列状态反馈一致
- 播放详情与主壳层切换时无明显“风格断层”
- 播放栏主控可键盘聚焦，焦点样式可见
- reduced-motion 开启后无突兀动画

- [ ] **Step 4: 更新规格文档附录**

在 `docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md` 追加“全局一致性规范”：

```md
## Global Consistency Addendum
- Components must prefer `--ui-*` semantic tokens.
- Focus-visible is required for interactive controls.
- Reduced-motion behavior must be preserved for major transitions.
```

- [ ] **Step 5: 提交收尾**

```powershell
git add docs/superpowers/specs/2026-04-20-play-detail-apple-music-design.md
git commit -m "docs: add global ui consistency addendum"
```

---

## Milestones

- `M1 (P0)`: Task 1-3 完成，基础控件与顶部筛选区统一。
- `M2 (P1)`: Task 4-6 完成，核心页面容器与播放交互一致。
- `M3 (P2)`: Task 7-8 完成，动效、可访问性、文档与验收闭环。

## Rollback Strategy

- 每个 Task 独立 commit，可按 Task 粒度回滚。
- 若页面回归出现风险，先 `git revert <task-commit>`，保留其余 Task 进度。
- 不做跨 Task 的混合提交，避免回滚时牵连。

## Spec Coverage Self-Check

- 页面视觉统一：Task 1、Task 3、Task 4、Task 6 覆盖。
- 交互动效统一：Task 1、Task 5、Task 7 覆盖。
- 可访问性底线：Task 2、Task 5、Task 7 覆盖。
- 验证与收口：Task 8 覆盖。

## Placeholder Scan Self-Check

- 本计划不含 TBD / TODO / “后续补充”字样。
- 每个 Task 都包含明确文件、执行命令、预期结果与提交动作。

## Type And Naming Consistency Self-Check

- 统一使用 `--ui-*` 作为新语义变量前缀。
- 统一使用 `@ui-*` 作为 Less token 前缀。
- Task 内提到的文件路径均为仓库现有路径。
