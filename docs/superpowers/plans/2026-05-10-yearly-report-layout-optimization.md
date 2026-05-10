# Yearly Report Layout Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the yearly report page so the outer report header stays lean while yearly-only view/export actions live inside the yearly report content area.

**Architecture:** Keep `src/renderer/views/Report/index.vue` as the owner of report loading, rebuild, preview, and export behavior. Move only the yearly-specific controls into `src/renderer/views/ReportYearly/index.vue` through explicit props and emitted events, so data flow remains one-way and no IPC/store contracts change. Make `grid` the default yearly view and keep `PosterStory` as an immersive mode.

**Tech Stack:** Electron, Vue 3 Composition API, TypeScript, Less Modules, existing base UI components, ESLint

---

## Scope Check

This plan covers one front-end layout refactor. It does not change yearly aggregation, cache schema, IPC names, export image generation, translations, or monthly report behavior.

## File Structure And Ownership

- Modify: `src/renderer/views/Report/index.vue`
  - Owns loading/rebuild/export/preview functions and shared report header.
  - Passes yearly-only control state and callbacks to `ReportYearly`.
  - Removes yearly export style, preview, and rebuild controls from the outer header.
- Modify: `src/renderer/views/ReportYearly/index.vue`
  - Owns yearly local view mode (`grid` / `story`).
  - Renders the yearly content toolbar with view switch, export style selection, preview, and rebuild.
  - Emits `update:exportStyle`, `preview`, and `rebuild`.
- Modify: `src/renderer/views/ReportYearly/components/PosterStory.vue`
  - Lightens bottom navigation density for the embedded story mode, especially on lower-height windows.
- No changes expected: `src/renderer/store/reportYearly/state.ts`
  - Existing `yearlyExportPosterStyle` persistence remains in parent-owned state.

---

### Task 1: Slim The Outer Report Header

**Files:**
- Modify: `src/renderer/views/Report/index.vue`

- [ ] **Step 1: Remove yearly-only controls from the outer header**

In `src/renderer/views/Report/index.vue`, replace the yearly controls block in the `<div :class="$style.actions">` with this structure:

```vue
<div :class="$style.actions">
  <base-tab
    v-model="reportMode"
    :list="modeList"
    :class="$style.modeTab"
    item-key="id"
    item-label="label"
  />
  <base-selection
    v-if="isYearlyMode"
    :model-value="yearlySelectedYear"
    :list="yearSelectionList"
    :class="$style.yearSelection"
    item-key="id"
    item-name="label"
    @update:model-value="handleYearChange"
  />
  <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleReload">
    {{ t('monthly_report__refresh') }}
  </base-btn>
  <template v-if="!isYearlyMode">
    <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleRebuildMonthly(30)">
      {{ rebuildingDays === 30 ? t('monthly_report__rebuilding') : t('monthly_report__rebuild_30') }}
    </base-btn>
    <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleRebuildMonthly(90)">
      {{ rebuildingDays === 90 ? t('monthly_report__rebuilding') : t('monthly_report__rebuild_90') }}
    </base-btn>
    <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleRebuildMonthly(400)">
      {{ rebuildingDays === 400 ? t('monthly_report__rebuilding') : t('monthly_report__rebuild_400') }}
    </base-btn>
  </template>
  <base-btn :disabled="!activeHasData || exporting || activeLoading" @click="handleExport">
    {{ exporting ? `${t('monthly_report__export_png')}...` : t('monthly_report__export_png') }}
  </base-btn>
</div>
```

This keeps the outer header focused on report type, year, refresh, monthly rebuilds, and export.

- [ ] **Step 2: Pass yearly toolbar state into `ReportYearly`**

Replace the current yearly section:

```vue
<section v-else-if="isYearlyMode && hasYearlyData" :class="$style.yearlySection">
  <ReportYearly :overview="yearlyOverview" :cards="yearlyCards" />
</section>
```

with:

```vue
<section v-else-if="isYearlyMode && hasYearlyData" :class="$style.yearlySection">
  <ReportYearly
    :overview="yearlyOverview"
    :cards="yearlyCards"
    :export-style="yearlyExportPosterStyle"
    :export-style-list="yearlyPosterStyleList"
    :exporting="exporting"
    :loading="activeLoading"
    :rebuilding="rebuilding"
    :preview-text="yearlyPreviewBtnText"
    :rebuild-text="rebuildYearlyText"
    :rebuild-loading-text="rebuildYearlyLoadingText"
    @update:export-style="handleYearlyPosterStyleChange"
    @preview="openYearlyExportPreview"
    @rebuild="handleRebuildYearly"
  />
</section>
```

- [ ] **Step 3: Keep parent functions unchanged**

Do not move these functions from `Report/index.vue`:

```ts
const handleYearlyPosterStyleChange = (styleId: string | number) => {
  if (!isYearlyMode.value) return
  if (styleId !== 'poster' && styleId !== 'classic') return
  setYearlyExportPosterStyle(styleId)
}

const openYearlyExportPreview = async() => {
  if (!isYearlyMode.value || !hasYearlyData.value) return
  showYearlyExportPreview.value = true
  await refreshYearlyExportPreview()
}

const handleRebuildYearly = async() => {
  rebuilding.value = true
  try {
    const result = await rebuildAndReloadYearlyReport(yearlySelectedYear.value)
    showActionNotice('success', `${rebuildYearlyDoneText.value}: ${result.year}`)
  } catch (err: any) {
    showActionNotice('error', `${rebuildYearlyFailedText.value}: ${err?.message ?? String(err)}`)
  } finally {
    rebuilding.value = false
  }
}
```

The exact success/error text can remain as currently implemented in the file.

- [ ] **Step 4: Run lint for the parent file**

Run:

```bash
npx eslint src/renderer/views/Report/index.vue
```

Expected:

```text
No lint errors.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/renderer/views/Report/index.vue
git commit -m "refactor: slim yearly report header controls"
```

---

### Task 2: Add The Yearly Content Toolbar

**Files:**
- Modify: `src/renderer/views/ReportYearly/index.vue`

- [ ] **Step 1: Replace the existing mode header template**

Replace the current `<header :class="$style.modeHead">...</header>` block with:

```vue
<header :class="$style.toolbar">
  <div :class="$style.toolbarPrimary">
    <p :class="$style.modeLabel">{{ text('yearly_report__story_mode_label', '展示模式') }}</p>
    <div :class="$style.modeActions">
      <button
        type="button"
        :class="[$style.modeBtn, viewMode === 'grid' && $style.modeBtnActive]"
        @click="viewMode = 'grid'"
      >
        {{ text('yearly_report__story_mode_grid', '数据报告') }}
      </button>
      <button
        type="button"
        :class="[$style.modeBtn, viewMode === 'story' && $style.modeBtnActive]"
        @click="viewMode = 'story'"
      >
        {{ text('yearly_report__story_mode_story', '海报流') }}
      </button>
    </div>
  </div>
  <div :class="$style.toolbarSecondary">
    <base-selection
      :model-value="exportStyle"
      :list="exportStyleList"
      :class="$style.exportStyleSelection"
      item-key="id"
      item-name="label"
      @update:model-value="emit('update:exportStyle', $event)"
    />
    <base-btn outline min :disabled="loading || exporting" @click="emit('preview')">
      {{ previewText }}
    </base-btn>
    <base-btn outline min :disabled="loading || rebuilding" @click="emit('rebuild')">
      {{ rebuilding ? rebuildLoadingText : rebuildText }}
    </base-btn>
  </div>
</header>
```

- [ ] **Step 2: Add props and emits**

In the `<script setup lang="ts">` block, replace the existing `defineProps` and `viewMode` declarations with:

```ts
const props = defineProps<{
  overview: LX.ReportYearly.OverviewDTO | null
  cards: LX.ReportYearly.CardsDTO | null
  exportStyle: 'classic' | 'poster'
  exportStyleList: Array<{ id: 'classic' | 'poster', label: string }>
  exporting: boolean
  loading: boolean
  rebuilding: boolean
  previewText: string
  rebuildText: string
  rebuildLoadingText: string
}>()

const emit = defineEmits<{
  (event: 'update:exportStyle', style: string | number): void
  (event: 'preview'): void
  (event: 'rebuild'): void
}>()

const text = useSafeI18n()
const viewMode = ref<'story' | 'grid'>('grid')
```

This makes `grid` the default yearly view.

- [ ] **Step 3: Rename toolbar styles and keep the layout light**

Replace `.modeHead` with `.toolbar` and add split toolbar regions:

```less
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 2px;
}

.toolbarPrimary,
.toolbarSecondary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbarSecondary {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.exportStyleSelection {
  --selection-width: 120px;
}
```

Keep `.modeLabel`, `.modeActions`, `.modeBtn`, and `.modeBtnActive`, but remove the heavy border/background from the old header container. The toolbar should feel like controls above content, not a card.

- [ ] **Step 4: Update responsive styles**

Replace the current `@media (max-width: 760px)` mode header rules with:

```less
@media (max-width: 760px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbarPrimary,
  .toolbarSecondary {
    width: 100%;
    justify-content: flex-start;
  }

  .toolbarSecondary {
    gap: 8px;
  }

  .modeActions {
    flex: auto;
  }

  .modeBtn {
    flex: 1;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .span2 {
    grid-column: span 1;
  }
}
```

- [ ] **Step 5: Run lint for the yearly component**

Run:

```bash
npx eslint src/renderer/views/ReportYearly/index.vue
```

Expected:

```text
No lint errors.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/renderer/views/ReportYearly/index.vue
git commit -m "refactor: move yearly controls into report toolbar"
```

---

### Task 3: Lighten Poster Story Embedded Navigation

**Files:**
- Modify: `src/renderer/views/ReportYearly/components/PosterStory.vue`

- [ ] **Step 1: Make the bottom dock less tall by default**

In `.storyDock`, reduce the gap:

```less
.storyDock {
  flex: none;
  display: grid;
  gap: 4px;
  padding: 0 2px;
}
```

- [ ] **Step 2: Hide the chapter rail earlier on medium-height windows**

In the existing `@media (max-height: 900px)` block, add:

```less
.chapterRail {
  display: none;
}
```

The full block should include the existing `.page`, `.storyTopBar`, `.title`, and `.storyDock` rules plus the new chapter rail rule.

- [ ] **Step 3: Keep phase navigation available at low height**

In the existing `@media (max-height: 760px)` block, keep `.phaseRail` visible and ensure it does not add extra top space:

```less
.phaseRail {
  margin-top: 0;
}
```

This rule already exists in the current file; leave it in place.

- [ ] **Step 4: Run lint for the poster component**

Run:

```bash
npx eslint src/renderer/views/ReportYearly/components/PosterStory.vue
```

Expected:

```text
No lint errors.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/renderer/views/ReportYearly/components/PosterStory.vue
git commit -m "style: reduce yearly poster story navigation density"
```

---

### Task 4: Final Verification

**Files:**
- Verify: `src/renderer/views/Report/index.vue`
- Verify: `src/renderer/views/ReportYearly/index.vue`
- Verify: `src/renderer/views/ReportYearly/components/PosterStory.vue`

- [ ] **Step 1: Run focused lint**

Run:

```bash
npx eslint src/renderer/views/Report/index.vue src/renderer/views/ReportYearly/index.vue src/renderer/views/ReportYearly/components/PosterStory.vue
```

Expected:

```text
No lint errors.
```

- [ ] **Step 2: Run the project lint command**

Run:

```bash
npm run lint
```

Expected:

```text
The command completes without ESLint errors.
```

- [ ] **Step 3: Manual UI acceptance pass**

Run the app:

```bash
npm run dev
```

Check these behaviors:

- In yearly mode, the outer header shows report mode, year selection, refresh, and export only.
- In yearly mode, export style, preview, and rebuild appear in the yearly content toolbar.
- Yearly mode opens to the grid/data report view.
- Switching to poster story does not refetch data.
- Switching export style in the yearly toolbar affects the outer `导出 PNG` behavior.
- Preview still opens the existing preview modal.
- Rebuild still shows the existing success/error notice.
- On a narrow window, the yearly toolbar wraps without covering the report content.
- On a low-height window, poster story keeps the current page readable and hides the chapter rail.

- [ ] **Step 4: Commit any final fixes**

If final verification required adjustments, commit them:

```bash
git add src/renderer/views/Report/index.vue src/renderer/views/ReportYearly/index.vue src/renderer/views/ReportYearly/components/PosterStory.vue
git commit -m "fix: polish yearly report layout optimization"
```

If no final fixes were required, skip this commit.

---

## Self-Review

- Spec coverage: Task 1 covers outer header slimming. Task 2 covers the yearly content toolbar, default data report view, and yearly-only actions. Task 3 covers reduced poster story navigation density. Task 4 covers lint and manual acceptance.
- Placeholder scan: No deferred implementation markers remain.
- Type consistency: `exportStyle` uses `'classic' | 'poster'`, emitted style accepts `string | number` to match `base-selection` and parent `handleYearlyPosterStyleChange`.
