# Yearly Hybrid Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有报告页内新增“自然年可切换”的年报能力，采用“总览驾驶舱 + 叙事卡片流”混合双层结构，并保留外部 enrichment 占位边界。

**Architecture:** 复用现有 `play_events` 事实层，新增 `play_yearly_stats` 年度缓存层，主进程增加年报聚合服务（overview + cards + 可用年份列表），渲染层在现有 `Report` 页面内增加“月报/年报”模式切换与年份筛选。UI 延续当前月报视觉语言，强调数据可读性与叙事顺序。

**Tech Stack:** Electron、Vue 3、TypeScript、better-sqlite3、Less Modules、Webpack、ESLint

---

## Scope Check

本 spec 聚焦单一子系统（年报），可在一个计划内落地；外部 enrichment 实接不在本计划内，仅实现占位与适配接口边界。

## File Structure And Ownership

- Create: `src/common/types/report_yearly.d.ts`
  - 定义年报 DTO、卡片数据结构、IPC 参数。
- Modify: `src/main/types/common.d.ts`
- Modify: `src/renderer/types/common.d.ts`
  - 注入 `report_yearly` 全局类型声明。
- Modify: `src/common/ipcNames.ts`
- Modify: `src/renderer/utils/ipc.ts`
  - 增加年报 IPC 事件名和渲染层调用。
- Modify: `src/main/types/db_service.d.ts`
- Modify: `src/main/worker/dbService/tables.ts`
- Modify: `src/main/worker/dbService/migrate.ts`
  - 新增 `play_yearly_stats` 表并升级 `DB_VERSION`。
- Modify: `src/main/worker/dbService/modules/report_monthly/statements.ts`
- Modify: `src/main/worker/dbService/modules/report_monthly/dbHelper.ts`
- Modify: `src/main/worker/dbService/modules/report_monthly/index.ts`
  - 增补年度缓存读写 SQL 与 worker 暴露 API（复用现有 report_monthly 模块承载）。
- Create: `src/main/modules/reportYearly/aggregate.ts`
- Create: `src/main/modules/reportYearly/index.ts`
  - 年报核心聚合与缓存策略。
- Create: `src/main/modules/winMain/rendererEvent/reportYearly.ts`
- Modify: `src/main/modules/winMain/rendererEvent/index.ts`
  - 注册年报 IPC 处理器。
- Create: `src/renderer/store/reportYearly/state.ts`
- Create: `src/renderer/store/reportYearly/action.ts`
  - 年报状态、拉取、导出、重建动作。
- Modify: `src/renderer/views/Report/index.vue`
  - 页面模式切换、年份筛选、月报/年报容器编排。
- Create: `src/renderer/views/ReportYearly/index.vue`
- Create: `src/renderer/views/ReportYearly/components/*.vue`
  - 年报 10 卡组件（驾驶舱 + 叙事流 + enrichment 占位）。
- Modify: `src/lang/zh-cn.json`
- Modify: `src/lang/zh-tw.json`
- Modify: `src/lang/en-us.json`
  - 年报文案与交互文案。
- Modify: `docs/superpowers/specs/2026-04-26-yearly-report-hybrid-design.md`
  - 若实现口径有微调，回写文档。

---

### Task 1: 年报类型与 IPC 合同

**Files:**
- Create: `src/common/types/report_yearly.d.ts`
- Modify: `src/main/types/common.d.ts`
- Modify: `src/renderer/types/common.d.ts`
- Modify: `src/common/ipcNames.ts`
- Modify: `src/renderer/utils/ipc.ts`

- [ ] **Step 1: 新建年报全局类型声明**

```ts
declare namespace LX {
  namespace ReportYearly {
    interface YearOption { year: number, label: string }
    interface OverviewDTO { year: number, totalListenSeconds: number, sessionCount: number, activeDays: number, newSongRatio: number, newArtistRatio: number }
    interface CardsDTO { seasonalFavorites: any[], weekdayDistribution: number[], monthlyArtistTimeline: any[], replaySongs: any[], yearlyRank: any, enrichmentPlaceholder: Record<string, string> }
    interface GetPayload { year: number }
    interface RebuildPayload { year: number }
  }
}
```

- [ ] **Step 2: 增加年报 IPC 事件名**

```ts
report_yearly_get_year_options: 'report_yearly_get_year_options',
report_yearly_get_overview: 'report_yearly_get_overview',
report_yearly_get_cards: 'report_yearly_get_cards',
report_yearly_export_png: 'report_yearly_export_png',
report_yearly_rebuild_cache: 'report_yearly_rebuild_cache',
```

- [ ] **Step 3: 在渲染层新增 IPC 调用封装**

```ts
export const getYearlyReportYearOptions = () => rendererInvoke<undefined, LX.ReportYearly.YearOption[]>(...)
export const getYearlyReportOverview = (payload: LX.ReportYearly.GetPayload) => rendererInvoke<typeof payload, LX.ReportYearly.OverviewDTO>(...)
export const getYearlyReportCards = (payload: LX.ReportYearly.GetPayload) => rendererInvoke<typeof payload, LX.ReportYearly.CardsDTO>(...)
```

- [ ] **Step 4: 运行合同层校验**

Run:
- `npx eslint src/common/ipcNames.ts src/renderer/utils/ipc.ts src/common/types/report_yearly.d.ts`

Expected:
- 语法与类型无错误。

- [ ] **Step 5: 提交**

```bash
git add src/common/types/report_yearly.d.ts src/main/types/common.d.ts src/renderer/types/common.d.ts src/common/ipcNames.ts src/renderer/utils/ipc.ts
git commit -m "feat: add yearly report type and ipc contracts"
```

---

### Task 2: 年度缓存表与 DB Service 扩展

**Files:**
- Modify: `src/main/types/db_service.d.ts`
- Modify: `src/main/worker/dbService/tables.ts`
- Modify: `src/main/worker/dbService/migrate.ts`
- Modify: `src/main/worker/dbService/modules/report_monthly/statements.ts`
- Modify: `src/main/worker/dbService/modules/report_monthly/dbHelper.ts`
- Modify: `src/main/worker/dbService/modules/report_monthly/index.ts`

- [ ] **Step 1: 扩展 DB 类型**

```ts
interface PlayYearlyStat {
  yearKey: string
  overviewJson: string
  cardsJson: string
  updatedAt: number
}
```

- [ ] **Step 2: 新增 `play_yearly_stats` 建表语句并升级 DB 版本**

```sql
CREATE TABLE "play_yearly_stats" (
  "yearKey" TEXT NOT NULL,
  "overviewJson" TEXT NOT NULL,
  "cardsJson" TEXT NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  PRIMARY KEY("yearKey")
);
```

- [ ] **Step 3: 在 migrate 中增加新表检查创建**

```ts
const existsPlayYearlyStats = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='play_yearly_stats'").get()
if (!existsPlayYearlyStats) db.exec(tables.get('play_yearly_stats')!)
```

- [ ] **Step 4: 增加年度缓存 CRUD SQL 与 helper**

```ts
export const getPlayYearlyStat = ...
export const setPlayYearlyStat = ...
export const removePlayYearlyStat = ...
export const getPlayEventYears = ...
```

- [ ] **Step 5: 主进程构建验证**

Run:
- `npm run build:main`

Expected:
- main 编译成功。

- [ ] **Step 6: 提交**

```bash
git add src/main/types/db_service.d.ts src/main/worker/dbService/tables.ts src/main/worker/dbService/migrate.ts src/main/worker/dbService/modules/report_monthly/statements.ts src/main/worker/dbService/modules/report_monthly/dbHelper.ts src/main/worker/dbService/modules/report_monthly/index.ts
git commit -m "feat: add yearly report cache schema and db service apis"
```

---

### Task 3: 主进程年报聚合与缓存服务

**Files:**
- Create: `src/main/modules/reportYearly/aggregate.ts`
- Create: `src/main/modules/reportYearly/index.ts`

- [ ] **Step 1: 新建聚合纯函数**

```ts
export const aggregateYearlyOverview = (...)
export const aggregateSeasonalFavorites = (...)
export const aggregateWeeklyHabits = (...)
export const aggregateNightOwlStats = (...)
export const aggregateReplaySongs = (...)
export const aggregateYearRank = (...)
```

- [ ] **Step 2: 实现年报查询服务（缓存优先 + 回退重算）**

```ts
export const getYearOptions = async() => ...
export const getOverview = async(year: number) => ...
export const getCards = async(year: number) => ...
export const rebuildYearCache = async(year: number) => ...
```

- [ ] **Step 3: 加入开发态耗时日志**

```ts
if (process.env.NODE_ENV !== 'production') console.info('[report_yearly]', ...)
```

- [ ] **Step 4: 主进程构建验证**

Run:
- `npm run build:main`

Expected:
- 编译通过，类型一致。

- [ ] **Step 5: 提交**

```bash
git add src/main/modules/reportYearly
git commit -m "feat: implement yearly report aggregation and cache service"
```

---

### Task 4: 注册年报 IPC 事件

**Files:**
- Create: `src/main/modules/winMain/rendererEvent/reportYearly.ts`
- Modify: `src/main/modules/winMain/rendererEvent/index.ts`

- [ ] **Step 1: 新建年报事件处理器**

```ts
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_year_options, ...)
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_overview, ...)
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_cards, ...)
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_export_png, ...)
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_rebuild_cache, ...)
```

- [ ] **Step 2: 在 `rendererEvent/index.ts` 挂载**

```ts
import reportYearlyEvent from './reportYearly'
...
reportYearlyEvent()
```

- [ ] **Step 3: 主进程构建验证**

Run:
- `npm run build:main`

Expected:
- IPC 注册编译通过。

- [ ] **Step 4: 提交**

```bash
git add src/main/modules/winMain/rendererEvent/reportYearly.ts src/main/modules/winMain/rendererEvent/index.ts
git commit -m "feat: register yearly report ipc handlers"
```

---

### Task 5: 渲染层年报 store 与页面模式切换

**Files:**
- Create: `src/renderer/store/reportYearly/state.ts`
- Create: `src/renderer/store/reportYearly/action.ts`
- Modify: `src/renderer/views/Report/index.vue`

- [ ] **Step 1: 新建年报状态容器**

```ts
export const yearlyYearOptions = shallowRef<LX.ReportYearly.YearOption[]>([])
export const yearlySelectedYear = ref<number>(new Date().getFullYear())
export const yearlyOverview = shallowRef<LX.ReportYearly.OverviewDTO | null>(null)
export const yearlyCards = shallowRef<LX.ReportYearly.CardsDTO | null>(null)
```

- [ ] **Step 2: 新建年报 action**

```ts
export const loadYearOptions = async() => ...
export const loadYearlyReport = async(year: number) => ...
export const rebuildAndReloadYearlyReport = async(year: number) => ...
```

- [ ] **Step 3: 在现有报告页增加 `month/year` 模式切换 + 年份选择器**

```vue
<base-tab ... />
<base-selection v-if="mode==='yearly'" ... />
```

- [ ] **Step 4: 保持现有月报逻辑不回归**

Run:
- `npx eslint src/renderer/views/Report/index.vue src/renderer/store/reportYearly/state.ts src/renderer/store/reportYearly/action.ts`
- `npm run build:renderer`

Expected:
- 月报与年报状态互不污染，构建通过。

- [ ] **Step 5: 提交**

```bash
git add src/renderer/store/reportYearly src/renderer/views/Report/index.vue
git commit -m "feat: add yearly report store and report mode switch"
```

---

### Task 6: 年报混合双层页面与 10 卡组件

**Files:**
- Create: `src/renderer/views/ReportYearly/index.vue`
- Create: `src/renderer/views/ReportYearly/components/OverviewKpiCard.vue`
- Create: `src/renderer/views/ReportYearly/components/FreshnessCard.vue`
- Create: `src/renderer/views/ReportYearly/components/YearFavoritesCard.vue`
- Create: `src/renderer/views/ReportYearly/components/SeasonalFavoritesCard.vue`
- Create: `src/renderer/views/ReportYearly/components/WeeklyHabitCard.vue`
- Create: `src/renderer/views/ReportYearly/components/NightOwlCard.vue`
- Create: `src/renderer/views/ReportYearly/components/ReplaySongsCard.vue`
- Create: `src/renderer/views/ReportYearly/components/ArtistTimelineCard.vue`
- Create: `src/renderer/views/ReportYearly/components/YearRankCard.vue`
- Create: `src/renderer/views/ReportYearly/components/EnrichmentPlaceholderCard.vue`

- [ ] **Step 1: 实现页面容器与双层布局**

```vue
<section class="dashboardLayer">...</section>
<section class="storyLayer">...</section>
```

- [ ] **Step 2: 完成驾驶舱 3 卡**

```vue
<OverviewKpiCard ... />
<FreshnessCard ... />
<YearFavoritesCard ... />
```

- [ ] **Step 3: 完成叙事流 7 卡**

```vue
<SeasonalFavoritesCard ... />
...
<EnrichmentPlaceholderCard ... />
```

- [ ] **Step 4: 增加空态/错误态/加载骨架**

```vue
<section v-if="error && !hasData">...</section>
```

- [ ] **Step 5: 渲染层构建验证**

Run:
- `npx eslint src/renderer/views/ReportYearly src/renderer/views/Report/index.vue`
- `npm run build:renderer`

Expected:
- 组件编译通过，样式无冲突。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/views/ReportYearly src/renderer/views/Report/index.vue
git commit -m "feat: implement yearly report hybrid dashboard and story cards"
```

---

### Task 7: 年报导出与 enrichment 占位边界

**Files:**
- Modify: `src/main/modules/reportYearly/index.ts`
- Modify: `src/main/modules/reportMonthly/export.ts`
- Modify: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: 复用导出能力支持年报海报**

```ts
export const exportYearlyPng = async(payload) => exportMonthlyPng(payload)
```

- [ ] **Step 2: 在年报 action 生成导出 dataURL（年度文案与年份标识）**

```ts
const defaultName = `lx-yearly-report-${year}.png`
```

- [ ] **Step 3: 定义 enrichment 占位接口约定（不接真实数据）**

```ts
interface EnrichmentSnapshot { status: 'placeholder', fields: string[] }
```

- [ ] **Step 4: 渲染层与主进程构建验证**

Run:
- `npm run build:main`
- `npm run build:renderer`

Expected:
- 年报导出链路可编译。

- [ ] **Step 5: 提交**

```bash
git add src/main/modules/reportYearly/index.ts src/main/modules/reportMonthly/export.ts src/renderer/store/reportYearly/action.ts
git commit -m "feat: add yearly report export and enrichment placeholder contract"
```

---

### Task 8: 文案、多语言与验收收口

**Files:**
- Modify: `src/lang/zh-cn.json`
- Modify: `src/lang/zh-tw.json`
- Modify: `src/lang/en-us.json`
- Modify: `docs/superpowers/specs/2026-04-26-yearly-report-hybrid-design.md`（仅口径变化时）

- [ ] **Step 1: 补全年报文案键值**

```json
"yearly_report": "年度报告",
"yearly_report__sort_by_duration": "...",
"yearly_report__night_owl": "...",
"yearly_report__enrichment_placeholder": "..."
```

- [ ] **Step 2: 全量检查构建**

Run:
- `npm run build:main`
- `npm run build:renderer`

Expected:
- 双端构建通过。

- [ ] **Step 3: 手动验收**

Run:
- `npm run dev`

Expected:
- 报告页可切换月报/年报
- 年份下拉可切换且数据刷新
- 年报 10 卡正常展示
- 导出年报 PNG 成功
- 外部 enrichment 占位卡可见

- [ ] **Step 4: 最终提交**

```bash
git add src/lang/zh-cn.json src/lang/zh-tw.json src/lang/en-us.json docs/superpowers/specs/2026-04-26-yearly-report-hybrid-design.md
git commit -m "feat: deliver yearly hybrid report in report page"
```

---

## Milestones

- `M1`: Task 1-4（合同、缓存、主进程与 IPC 完成）
- `M2`: Task 5-6（前端模式切换与年报页面完成）
- `M3`: Task 7-8（导出、占位边界、文案与验收完成）

## Rollback Strategy

- 每个 Task 独立 commit，可按任务粒度回滚。
- 出现 UI 回归优先回滚 Task 6；出现性能问题优先回滚 Task 3/Task 2。

## Spec Coverage Self-Check

- 自然年 + 任意年份：Task 3、Task 5 覆盖
- 混合双层页面：Task 6 覆盖
- 年度缓存与性能：Task 2、Task 3 覆盖
- 导出与占位 enrichment：Task 7 覆盖

## Placeholder Scan Self-Check

- 无 TBD/TODO 占位项。
- 每个 Task 均含文件路径、执行命令、预期结果与提交动作。

## Type And Naming Consistency Self-Check

- 年报类型统一使用 `LX.ReportYearly.*`。
- IPC 前缀统一 `report_yearly_*`。
- 年度缓存表统一 `play_yearly_stats`。

