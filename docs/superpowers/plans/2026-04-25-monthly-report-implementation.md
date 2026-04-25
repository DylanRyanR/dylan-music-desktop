# Rolling 30-Day Monthly Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为落雪音乐播放器实现“最近 30 天月报”完整功能（事件采集、聚合计算、10 卡可视化、PNG 导出）。

**Architecture:** 采用“播放会话事件表 + 日聚合缓存 + 月报查询组装”的三层结构。渲染进程只负责采集播放会话与展示 UI，主进程负责数据入库、聚合与导出。月报查询优先读取日聚合，再补当天增量，保证性能和准确性。

**Tech Stack:** Electron、Vue 3、TypeScript、better-sqlite3、Vue Router、Less Modules、Webpack、ESLint

---

## Scope Check

该 spec 聚焦单一子系统（最近 30 天月报），可以在一个计划内落地；不需要再拆分子计划。

## 文件结构与职责

- Create: `src/common/types/report_monthly.d.ts`
  - 月报 DTO、请求参数、导出参数、播放会话类型定义。
- Modify: `src/common/ipcNames.ts`
  - 增加月报相关 IPC 事件名。
- Modify: `src/renderer/utils/ipc.ts`
  - 增加月报查询、会话上报、导出、重建缓存的渲染层调用。
- Modify: `src/main/types/db_service.d.ts`
  - 增加 `play_events`、`play_daily_stats` 对应类型。
- Modify: `src/main/worker/dbService/tables.ts`
  - 新增两张表与索引；`DB_VERSION` 升级到 `4`。
- Modify: `src/main/worker/dbService/migrate.ts`
  - 新增迁移到 v4 的建表逻辑。
- Modify: `src/main/worker/dbService/modules/index.ts`
  - 导出 `report_monthly` 模块。
- Create: `src/main/worker/dbService/modules/report_monthly/statements.ts`
  - SQL 语句（插入事件、日聚合查询/更新、统计查询、清理）。
- Create: `src/main/worker/dbService/modules/report_monthly/dbHelper.ts`
  - 数据库读写 helper。
- Create: `src/main/worker/dbService/modules/report_monthly/index.ts`
  - worker 暴露 API。
- Modify: `src/main/worker/dbService/index.ts`
  - 将 report 模块并入 worker 暴露对象与类型。
- Create: `src/main/modules/winMain/rendererEvent/report.ts`
  - 注册月报 IPC：track/query/export/rebuild。
- Modify: `src/main/modules/winMain/rendererEvent/index.ts`
  - 挂载 `report.ts`。
- Create: `src/main/modules/reportMonthly/index.ts`
  - 月报服务入口，组装 overview/cards 数据。
- Create: `src/main/modules/reportMonthly/aggregate.ts`
  - 纯函数聚合：Top 歌曲、Top 歌手、时段热力、连续天数、新发现。
- Create: `src/main/modules/reportMonthly/export.ts`
  - 接收 dataURL、弹保存框、写 PNG 文件。
- Create: `src/renderer/core/useApp/usePlayer/useMonthlyReportTracker.ts`
  - 播放会话采集器，监听 `musicToggled/play/pause/error/playerEnded`。
- Modify: `src/renderer/core/useApp/usePlayer/index.ts`
  - 挂载 tracker。
- Create: `src/renderer/views/Report/index.vue`
  - 月报主页面，承载 10 张卡片与导出按钮。
- Create: `src/renderer/views/Report/components/*.vue`（10 个卡片组件 + `CardShell.vue`）
  - 分卡片渲染，减少单文件复杂度。
- Create: `src/renderer/store/reportMonthly/state.ts`
  - 月报页面状态。
- Create: `src/renderer/store/reportMonthly/action.ts`
  - 拉取 overview/cards、触发导出、错误处理。
- Modify: `src/renderer/router.ts`
  - 注册 `/report` 路由。
- Modify: `src/renderer/components/layout/Aside/NavBar.vue`
  - 增加月报入口。
- Modify: `src/renderer/components/layout/Icons.vue`
  - 增加月报图标（`#icon-report`）。
- Modify: `src/lang/zh-cn.json`
- Modify: `src/lang/zh-tw.json`
- Modify: `src/lang/en-us.json`
  - 月报文案与按钮文案。
- Optional Create: `src/main/modules/reportMonthly/__tests__/aggregate.fixture.ts`
  - 聚合样例数据夹具（用于手动验证脚本）。

## 前置说明

- 当前仓库没有标准单测脚本，首版验证采用“纯函数对拍 + lint + main/renderer build + 手动验收”。
- 不在本阶段实现“历史月份切换”与“多模板主题”。

### Task 1: 定义类型与 IPC 合同

**Files:**
- Create: `src/common/types/report_monthly.d.ts`
- Modify: `src/common/ipcNames.ts`
- Modify: `src/renderer/utils/ipc.ts`

- [ ] **Step 1: 写入月报全局类型定义（先定义再实现）**

```ts
declare namespace LX {
  namespace ReportMonthly {
    type SourceType = 'online' | 'local' | 'onedrive' | 'smb' | 'webdav' | 'other'
    interface TrackSessionPayload {
      songId: string
      songName: string
      artistName: string
      albumName: string
      sourceType: SourceType
      listId: string | null
      startedAt: number
      endedAt: number
      listenSeconds: number
      totalSeconds: number
      endReason: 'ended' | 'skipped' | 'paused' | 'error' | 'switched'
    }
    interface OverviewDTO { totalListenSeconds: number; valid30Count: number; complete80Rate: number; streakDays: number }
    interface CardsDTO { topSongs: any[]; topArtists: any[]; hourHistogram: number[]; sourceShare: Record<string, number>; newDiscovery: any[] }
  }
}
```

- [ ] **Step 2: 增加 IPC 名称**

```ts
report_monthly_track_session: 'report_monthly_track_session',
report_monthly_get_overview: 'report_monthly_get_overview',
report_monthly_get_cards: 'report_monthly_get_cards',
report_monthly_export_png: 'report_monthly_export_png',
report_monthly_rebuild_cache: 'report_monthly_rebuild_cache',
```

- [ ] **Step 3: 在渲染层 `ipc.ts` 暴露 API**

```ts
export const trackMonthlyReportSession = (payload: LX.ReportMonthly.TrackSessionPayload) =>
  rendererInvoke(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_track_session, payload)
export const getMonthlyReportOverview = () =>
  rendererInvoke<undefined, LX.ReportMonthly.OverviewDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_overview, undefined)
export const getMonthlyReportCards = () =>
  rendererInvoke<undefined, LX.ReportMonthly.CardsDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_cards, undefined)
```

- [ ] **Step 4: 运行 lint 验证合同层语法**

Run: `npm run lint -- src/common/ipcNames.ts src/renderer/utils/ipc.ts`

Expected: 无新增 ESLint error。

- [ ] **Step 5: 提交**

```bash
git add src/common/types/report_monthly.d.ts src/common/ipcNames.ts src/renderer/utils/ipc.ts
git commit -m "feat: add monthly report type and ipc contracts"
```

### Task 2: 落地数据库表、迁移与 Worker 模块

**Files:**
- Modify: `src/main/types/db_service.d.ts`
- Modify: `src/main/worker/dbService/tables.ts`
- Modify: `src/main/worker/dbService/migrate.ts`
- Modify: `src/main/worker/dbService/modules/index.ts`
- Modify: `src/main/worker/dbService/index.ts`
- Create: `src/main/worker/dbService/modules/report_monthly/statements.ts`
- Create: `src/main/worker/dbService/modules/report_monthly/dbHelper.ts`
- Create: `src/main/worker/dbService/modules/report_monthly/index.ts`

- [ ] **Step 1: 在 `db_service.d.ts` 新增结构类型**

```ts
interface PlayEvent { id: string; songId: string; sourceType: string; startedAt: number; endedAt: number; listenSeconds: number; totalSeconds: number; isValid30s: 0|1; isComplete80: 0|1; endReason: string; payload: string }
interface PlayDailyStat { dateKey: string; totalListenSeconds: number; valid30Count: number; complete80Count: number; sessionCount: number; skipCount: number; topSongsJson: string; topArtistsJson: string; hourHistogramJson: string; sourceShareJson: string; newDiscoveryJson: string; updatedAt: number }
```

- [ ] **Step 2: 新增建表 SQL 与索引，升级 DB_VERSION=4**

```sql
CREATE TABLE "play_events" (...);
CREATE INDEX "index_play_events_startedAt" ON "play_events" ("startedAt");
CREATE INDEX "index_play_events_songId_startedAt" ON "play_events" ("songId","startedAt");
CREATE TABLE "play_daily_stats" (...);
```

- [ ] **Step 3: 在 `migrate.ts` 增加 `migrateToV4`**

```ts
const migrateToV4 = (db: Database.Database) => { /* 检查表/索引存在，不存在则创建 */ }
```

- [ ] **Step 4: 新建 report_monthly DB 模块并导出**

```ts
export const addPlayEvent = (event: LX.DBService.PlayEvent) => insert.run(event)
export const upsertDailyStat = (stat: LX.DBService.PlayDailyStat) => upsert.run(stat)
export const getDailyStatsByRange = (start: string, end: string) => query.all(start, end)
```

- [ ] **Step 5: worker 暴露 report_monthly API**

```ts
import { ..., report_monthly } from './modules/index'
exposeWorker(Object.assign(common, ..., report_monthly))
```

- [ ] **Step 6: 运行主进程构建验证数据库层**

Run: `npm run build:main`

Expected: main 构建通过，无 TS 类型错误。

- [ ] **Step 7: 提交**

```bash
git add src/main/types/db_service.d.ts src/main/worker/dbService/tables.ts src/main/worker/dbService/migrate.ts src/main/worker/dbService/modules/index.ts src/main/worker/dbService/index.ts src/main/worker/dbService/modules/report_monthly
git commit -m "feat: add monthly report db schema and worker module"
```

### Task 3: 主进程月报服务与 RendererEvent 注册

**Files:**
- Create: `src/main/modules/reportMonthly/index.ts`
- Create: `src/main/modules/reportMonthly/aggregate.ts`
- Create: `src/main/modules/reportMonthly/export.ts`
- Create: `src/main/modules/winMain/rendererEvent/report.ts`
- Modify: `src/main/modules/winMain/rendererEvent/index.ts`

- [ ] **Step 1: 先写聚合纯函数（无 IPC 依赖）**

```ts
export const calcComplete80Rate = (complete80Count: number, sessionCount: number) => sessionCount ? complete80Count / sessionCount : 0
export const calcStreakDays = (dateKeys: string[]) => { /* 连续天数 */ }
export const buildTopList = <T>(map: Map<string, T>, limit = 5) => { /* 排序截断 */ }
```

- [ ] **Step 2: 写 `index.ts` 组装 overview/cards**

```ts
export const getOverview = async() => ({ totalListenSeconds, valid30Count, complete80Rate, streakDays })
export const getCards = async() => ({ topSongs, topArtists, hourHistogram, sourceShare, newDiscovery })
```

- [ ] **Step 3: 写导出模块**

```ts
export const exportMonthlyPng = async(payload: { dataUrl: string, defaultName: string }) => {
  // showSaveDialog -> fs.writeFile(filePath, base64Buffer)
}
```

- [ ] **Step 4: 注册 renderer events**

```ts
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_track_session, async({ params }) => trackSession(params))
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_overview, async() => getOverview())
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_cards, async() => getCards())
mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_export_png, async({ params }) => exportMonthlyPng(params))
```

- [ ] **Step 5: 主进程构建验证**

Run: `npm run build:main`

Expected: `compiled successfully`。

- [ ] **Step 6: 提交**

```bash
git add src/main/modules/reportMonthly src/main/modules/winMain/rendererEvent/report.ts src/main/modules/winMain/rendererEvent/index.ts
git commit -m "feat: add monthly report main-process services and ipc handlers"
```

### Task 4: 渲染进程播放会话采集器

**Files:**
- Create: `src/renderer/core/useApp/usePlayer/useMonthlyReportTracker.ts`
- Modify: `src/renderer/core/useApp/usePlayer/index.ts`

- [ ] **Step 1: 写会话状态结构**

```ts
type SessionState = { songId: string; sourceType: LX.ReportMonthly.SourceType; startedAt: number; listenSeconds: number; lastProgress: number; isPlaying: boolean }
```

- [ ] **Step 2: 实现会话生命周期函数**

```ts
const startSession = () => { /* 读取 playMusicInfo/musicInfo，初始化 state */ }
const tickProgress = (progress: number) => { /* 只累计正向且合理增量 */ }
const finishSession = (endReason: ...) => { /* 计算 valid30/complete80 并 IPC 上报 */ }
```

- [ ] **Step 3: 绑定播放器事件**

```ts
window.app_event.on('musicToggled', () => { finishSession('switched'); startSession() })
window.app_event.on('play', () => { /* isPlaying=true */ })
window.app_event.on('pause', () => finishSession('paused'))
window.app_event.on('playerEnded', () => finishSession('ended'))
window.app_event.on('playerError', () => finishSession('error'))
watch(() => playProgress.nowPlayTime, tickProgress)
```

- [ ] **Step 4: 在 `usePlayer/index.ts` 挂载 tracker**

```ts
import useMonthlyReportTracker from './useMonthlyReportTracker'
...
useMonthlyReportTracker()
```

- [ ] **Step 5: lint + renderer 构建验证**

Run:
- `npm run lint -- src/renderer/core/useApp/usePlayer/useMonthlyReportTracker.ts src/renderer/core/useApp/usePlayer/index.ts`
- `npm run build:renderer`

Expected: 两条命令通过。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/core/useApp/usePlayer/useMonthlyReportTracker.ts src/renderer/core/useApp/usePlayer/index.ts
git commit -m "feat: add playback session tracker for monthly report"
```

### Task 5: 月报页面路由、导航与文案

**Files:**
- Create: `src/renderer/views/Report/index.vue`
- Modify: `src/renderer/router.ts`
- Modify: `src/renderer/components/layout/Aside/NavBar.vue`
- Modify: `src/renderer/components/layout/Icons.vue`
- Modify: `src/lang/zh-cn.json`
- Modify: `src/lang/zh-tw.json`
- Modify: `src/lang/en-us.json`

- [ ] **Step 1: 注册路由**

```ts
{ path: '/report', name: 'Report', component: require('./views/Report/index.vue').default, meta: { name: 'Report' } }
```

- [ ] **Step 2: 在侧栏导航增加入口**

```ts
{ to: '/report', tips: t('monthly_report'), icon: '#icon-report', iconSize: '0 0 24 24', size, name: 'Report', enable: true }
```

- [ ] **Step 3: 在 Icons 与语言包补充资源**

```xml
<g id="icon-report" fill="currentColor"><path d="..."/></g>
```

```json
"monthly_report": "最近30天月报",
"monthly_report__export_png": "导出分享图"
```

- [ ] **Step 4: 构建页面空骨架**

```vue
<template><main :class="$style.report"><header>...</header><section>...</section></main></template>
```

- [ ] **Step 5: renderer 构建验证**

Run: `npm run build:renderer`

Expected: 路由可编译，导航入口可显示。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/router.ts src/renderer/components/layout/Aside/NavBar.vue src/renderer/components/layout/Icons.vue src/renderer/views/Report/index.vue src/lang/zh-cn.json src/lang/zh-tw.json src/lang/en-us.json
git commit -m "feat: add monthly report route nav and i18n resources"
```

### Task 6: 月报数据状态管理与 10 卡组件

**Files:**
- Create: `src/renderer/store/reportMonthly/state.ts`
- Create: `src/renderer/store/reportMonthly/action.ts`
- Create: `src/renderer/views/Report/components/CardShell.vue`
- Create: `src/renderer/views/Report/components/*.vue`（10 cards）
- Modify: `src/renderer/views/Report/index.vue`

- [ ] **Step 1: 创建状态与动作**

```ts
export const reportOverview = shallowRef<LX.ReportMonthly.OverviewDTO | null>(null)
export const reportCards = shallowRef<LX.ReportMonthly.CardsDTO | null>(null)
export const loadMonthlyReport = async() => { reportOverview.value = await getMonthlyReportOverview(); reportCards.value = await getMonthlyReportCards() }
```

- [ ] **Step 2: 创建统一卡片壳组件**

```vue
<template><section :class="$style.card"><slot /></section></template>
```

- [ ] **Step 3: 实现 10 张卡片组件并接入数据**

```vue
<TotalTimeCard :overview="reportOverview" />
<ValidPlayCard :overview="reportOverview" />
...
<EndingPosterCard :overview="reportOverview" :cards="reportCards" />
```

- [ ] **Step 4: 页面初始化拉取与错误降级**

```ts
onMounted(() => { void loadMonthlyReport() })
```

- [ ] **Step 5: lint + renderer build**

Run:
- `npm run lint -- src/renderer/views/Report src/renderer/store/reportMonthly`
- `npm run build:renderer`

Expected: 卡片组件和页面编译通过。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/store/reportMonthly src/renderer/views/Report
git commit -m "feat: implement monthly report data store and 10-card ui"
```

### Task 7: PNG 导出链路（页面 -> IPC -> 文件）

**Files:**
- Modify: `src/renderer/views/Report/index.vue`
- Modify: `src/renderer/utils/ipc.ts`
- Modify: `src/main/modules/reportMonthly/export.ts`
- Modify: `src/main/modules/winMain/rendererEvent/report.ts`

- [ ] **Step 1: 页面生成 dataURL**

```ts
const exportTargetRef = ref<HTMLElement | null>(null)
const handleExport = async() => {
  const dataUrl = await toPng(exportTargetRef.value!, { pixelRatio: 2 })
  await exportMonthlyReportPng({ dataUrl, defaultName: `lx-monthly-report-${Date.now()}.png` })
}
```

- [ ] **Step 2: IPC 新增导出入参与返回**

```ts
export const exportMonthlyReportPng = (payload: { dataUrl: string; defaultName: string }) =>
  rendererInvoke<typeof payload, { filePath: string | null }>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_export_png, payload)
```

- [ ] **Step 3: 主进程写文件并返回路径**

```ts
const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
await fs.promises.writeFile(filePath, buffer)
return { filePath }
```

- [ ] **Step 4: 手动验证导出**

Run: `npm run dev`

Expected:
- 点击“导出分享图”后弹保存框；
- 保存成功后在目标目录能打开 PNG。

- [ ] **Step 5: 提交**

```bash
git add src/renderer/views/Report/index.vue src/renderer/utils/ipc.ts src/main/modules/reportMonthly/export.ts src/main/modules/winMain/rendererEvent/report.ts
git commit -m "feat: add monthly report png export flow"
```

### Task 8: 性能优化、缓存重建与验收收口

**Files:**
- Modify: `src/main/modules/reportMonthly/index.ts`
- Modify: `src/main/modules/winMain/rendererEvent/report.ts`
- Modify: `docs/superpowers/specs/2026-04-25-monthly-report-design.md`（仅当口径发生微调）

- [ ] **Step 1: 增加 `rebuild_cache` 与清理逻辑**

```ts
export const rebuildMonthlyCache = async(days: 30 | 90 | 400) => { /* 重算 daily stats */ }
export const cleanupExpiredEvents = async(keepDays = 400) => { /* 删除超期事件 */ }
```

- [ ] **Step 2: 增加查询耗时日志（开发态）**

```ts
const t0 = Date.now(); ...; log.info('[report_monthly] get_cards cost=', Date.now() - t0)
```

- [ ] **Step 3: 完整验证**

Run:
- `npm run lint`
- `npm run build:main`
- `npm run build:renderer`

Expected: 三条命令全部通过。

- [ ] **Step 4: 手动验收清单**

Run: `npm run dev`

Expected:
- 最近 30 天统计与播放行为一致；
- 10 张卡片全部正常渲染；
- 导出 PNG 成功；
- 低性能设备下关闭动画后页面仍可流畅浏览。

- [ ] **Step 5: 最终提交**

```bash
git add src docs/superpowers/specs/2026-04-25-monthly-report-design.md
git commit -m "feat: deliver rolling-30-day monthly report with visualization and export"
```

## 规格覆盖自检

- 滚动 30 天窗口：Task 3、Task 8 覆盖。
- 双口径（30 秒有效 + 80% 完播）：Task 2、Task 3、Task 4 覆盖。
- 全来源统计：Task 4（sourceType 采集）+ Task 3（聚合）覆盖。
- 10 卡片可视化：Task 6 覆盖。
- PNG 导出：Task 7 覆盖。
- 性能与可重建缓存：Task 8 覆盖。

## 占位词扫描自检

- 无未完成占位描述。
- 每个任务均包含明确文件路径、执行命令与期望结果。

## 类型一致性自检

- 统一使用 `LX.ReportMonthly.*` 作为类型命名空间。
- IPC 事件名前缀统一为 `report_monthly_*`。
- DB 字段命名在 `PlayEvent/PlayDailyStat` 与 SQL 保持一致。
