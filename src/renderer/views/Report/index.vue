<template>
  <main :class="$style.report">
    <header :class="$style.header">
      <div :class="$style.headInfo">
        <p :class="$style.eyebrow">{{ reportEyebrow }}</p>
        <h1 :class="$style.title">{{ reportTitle }}</h1>
        <p :class="$style.subtitle">{{ reportSubtitle }}</p>
        <p v-if="activeLastUpdatedAt" :class="$style.updatedAt">
          {{ t('monthly_report__updated_at') }} {{ updatedAtText }}
        </p>
      </div>
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
        <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleReload">{{ t('monthly_report__refresh') }}</base-btn>
        <template v-if="isYearlyMode">
          <base-btn outline min :disabled="activeLoading || rebuilding" @click="handleRebuildYearly">
            {{ rebuilding ? rebuildYearlyLoadingText : rebuildYearlyText }}
          </base-btn>
        </template>
        <template v-else>
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
    </header>

    <section v-if="actionNotice" :class="[$style.actionNotice, actionNoticeClass]">
      <div :class="$style.actionNoticeBody">
        <p :class="$style.actionNoticeText" :title="actionNoticeText">{{ actionNoticeText }}</p>
        <button type="button" :class="$style.actionNoticeClose" :aria-label="t('close')" :title="t('close')" @click="hideActionNotice">
          ×
        </button>
      </div>
    </section>

    <section v-if="activeError && !activeHasData" :class="$style.emptyState">
      <p :class="$style.emptyTitle">{{ t('monthly_report__load_failed') }}</p>
      <p :class="$style.emptyDesc">{{ activeError }}</p>
      <base-btn min @click="handleReload">{{ t('monthly_report__retry') }}</base-btn>
    </section>

    <section v-else-if="activeLoading && !activeHasData" :class="$style.skeletonGrid">
      <article v-for="idx in 8" :key="idx" :class="$style.skeletonCard" />
    </section>

    <section v-else-if="isYearlyMode && hasYearlyData">
      <ReportYearly :overview="yearlyOverview" :cards="yearlyCards" />
    </section>

    <section v-else-if="hasMonthlyData" :class="$style.grid">
      <CoverCard :overview="reportOverview" :cards="reportCards" :class="$style.cardSpan2" />
      <TotalTimeCard :overview="reportOverview" />
      <ValidPlayCard :overview="reportOverview" :cards="reportCards" />
      <CompletionCard :overview="reportOverview" />
      <TopSongsCard :cards="reportCards" :class="$style.cardSpan2" />
      <TopArtistsCard :cards="reportCards" />
      <HourHeatCard :cards="reportCards" />
      <SourceShareCard :cards="reportCards" />
      <DiscoveryCard :overview="reportOverview" :cards="reportCards" />
      <EndingPosterCard :overview="reportOverview" :cards="reportCards" :class="$style.cardSpan2" />
    </section>

    <section v-else :class="$style.emptyState">
      <p :class="$style.emptyTitle">{{ activeEmptyText }}</p>
      <base-btn min @click="handleReload">{{ t('monthly_report__refresh') }}</base-btn>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, watch } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import {
  reportOverview,
  reportCards,
  reportLoading,
  reportError,
  reportLastUpdatedAt,
} from '@renderer/store/reportMonthly/state'
import {
  loadMonthlyReport,
  exportMonthlyReport,
  rebuildAndReloadMonthlyReport,
} from '@renderer/store/reportMonthly/action'
import {
  yearlyYearOptions,
  yearlySelectedYear,
  yearlyOverview,
  yearlyCards,
  yearlyLoading,
  yearlyError,
  yearlyLastUpdatedAt,
} from '@renderer/store/reportYearly/state'
import {
  loadYearlyReport,
  exportYearlyReport,
  rebuildAndReloadYearlyReport,
} from '@renderer/store/reportYearly/action'
import CoverCard from './components/CoverCard.vue'
import TotalTimeCard from './components/TotalTimeCard.vue'
import ValidPlayCard from './components/ValidPlayCard.vue'
import CompletionCard from './components/CompletionCard.vue'
import TopSongsCard from './components/TopSongsCard.vue'
import TopArtistsCard from './components/TopArtistsCard.vue'
import HourHeatCard from './components/HourHeatCard.vue'
import SourceShareCard from './components/SourceShareCard.vue'
import DiscoveryCard from './components/DiscoveryCard.vue'
import EndingPosterCard from './components/EndingPosterCard.vue'
import ReportYearly from '@renderer/views/ReportYearly/index.vue'

type ReportMode = 'monthly' | 'yearly'

const t = useI18n()
const translate = t as unknown as (key: string, params?: Record<string, string | number>) => string
const style = useCssModule()

const reportMode = ref<ReportMode>('monthly')
const exporting = ref(false)
const rebuilding = ref(false)
const rebuildingDays = ref<30 | 90 | 400 | null>(null)
const actionNotice = ref<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

let actionNoticeTimer: ReturnType<typeof setTimeout> | null = null
const hideActionNotice = () => {
  actionNotice.value = null
  if (!actionNoticeTimer) return
  clearTimeout(actionNoticeTimer)
  actionNoticeTimer = null
}

const showActionNotice = (type: 'success' | 'error' | 'info', text: string) => {
  actionNotice.value = { type, text }
  if (actionNoticeTimer) clearTimeout(actionNoticeTimer)
  actionNoticeTimer = setTimeout(() => {
    hideActionNotice()
  }, 5200)
}

const getText = (key: string, fallback: string, params?: Record<string, string | number>) => {
  const value = translate(key, params)
  if (!value || value === key) return fallback
  return value
}

const formatNoticePath = (path: string, maxLength = 72) => {
  if (path.length <= maxLength) return path
  return `...${path.slice(-(maxLength - 3))}`
}

const isYearlyMode = computed(() => reportMode.value === 'yearly')
const hasMonthlyData = computed(() => !!reportOverview.value && !!reportCards.value)
const hasYearlyData = computed(() => !!yearlyOverview.value && !!yearlyCards.value)

const activeHasData = computed(() => isYearlyMode.value ? hasYearlyData.value : hasMonthlyData.value)
const activeLoading = computed(() => isYearlyMode.value ? yearlyLoading.value : reportLoading.value)
const activeError = computed(() => isYearlyMode.value ? yearlyError.value : reportError.value)
const activeLastUpdatedAt = computed(() => isYearlyMode.value ? yearlyLastUpdatedAt.value : reportLastUpdatedAt.value)

const yearlyModeText = computed(() => getText('yearly_report', '年报'))
const modeList = computed(() => [
  { id: 'monthly', label: t('monthly_report') },
  { id: 'yearly', label: yearlyModeText.value },
])

const yearSelectionList = computed(() => {
  return yearlyYearOptions.value.map(item => ({
    id: item.year,
    label: item.label,
  }))
})

const reportEyebrow = computed(() => {
  if (isYearlyMode.value) return yearlyModeText.value
  return t('monthly_report')
})

const reportTitle = computed(() => {
  if (!isYearlyMode.value) return t('monthly_report__title')
  const year = yearlySelectedYear.value || new Date().getFullYear()
  return getText('yearly_report__title', `${year} 年听歌年报`, { year })
})

const reportSubtitle = computed(() => {
  if (!isYearlyMode.value) return t('monthly_report__subtitle')
  return getText('yearly_report__subtitle', '从年度总览到听歌习惯，回顾你的自然年节奏。')
})

const updatedAtText = computed(() => {
  if (!activeLastUpdatedAt.value) return '--'
  return new Date(activeLastUpdatedAt.value).toLocaleString()
})

const activeEmptyText = computed(() => {
  if (isYearlyMode.value) {
    return getText('yearly_report__empty', '所选年份还没有可用听歌数据')
  }
  return t('monthly_report__empty')
})

const rebuildYearlyText = computed(() => getText('yearly_report__rebuild_current', '重建当年'))
const rebuildYearlyLoadingText = computed(() => getText('yearly_report__rebuilding', '重建中...'))

const actionNoticeClass = computed(() => {
  if (!actionNotice.value) return style.actionNotice_info
  switch (actionNotice.value.type) {
    case 'success':
      return style.actionNotice_success
    case 'error':
      return style.actionNotice_error
    default:
      return style.actionNotice_info
  }
})

const actionNoticeText = computed(() => actionNotice.value?.text ?? '')

const handleReload = async(silent = false) => {
  try {
    if (isYearlyMode.value) {
      await loadYearlyReport(yearlySelectedYear.value)
      if (!silent) showActionNotice('success', getText('yearly_report__notice_refresh_success', '年报已刷新'))
      return
    }
    await loadMonthlyReport()
    if (!silent) showActionNotice('success', t('monthly_report__notice_refresh_success'))
  } catch (err: any) {
    if (silent) return
    const message = err?.message ?? String(err)
    if (isYearlyMode.value) {
      showActionNotice('error', `${getText('yearly_report__notice_refresh_failed', '年报刷新失败')}: ${message}`)
      return
    }
    showActionNotice('error', `${t('monthly_report__notice_refresh_failed')}: ${message}`)
  }
}

const handleExport = async() => {
  exporting.value = true
  try {
    const result = isYearlyMode.value
      ? await exportYearlyReport()
      : await exportMonthlyReport()
    if (result.filePath) {
      const successText = isYearlyMode.value
        ? getText('yearly_report__notice_export_success', '导出成功：{path}', { path: formatNoticePath(result.filePath) })
        : t('monthly_report__notice_export_success', { path: formatNoticePath(result.filePath) })
      showActionNotice('success', successText)
    } else {
      const canceledText = isYearlyMode.value
        ? getText('yearly_report__notice_export_canceled', '已取消导出')
        : t('monthly_report__notice_export_canceled')
      showActionNotice('info', canceledText)
    }
  } catch (err: any) {
    const failedText = isYearlyMode.value
      ? getText('yearly_report__notice_export_failed', '导出失败')
      : t('monthly_report__notice_export_failed')
    showActionNotice('error', `${failedText}: ${err?.message ?? String(err)}`)
  } finally {
    exporting.value = false
  }
}

const handleRebuildMonthly = async(days: 30 | 90 | 400) => {
  rebuilding.value = true
  rebuildingDays.value = days
  try {
    const result = await rebuildAndReloadMonthlyReport(days)
    showActionNotice('success', t('monthly_report__notice_rebuild_success', {
      days: result.days,
      eventCount: result.eventCount,
      dayCount: result.dayCount,
    }))
  } catch (err: any) {
    showActionNotice('error', `${t('monthly_report__notice_rebuild_failed')}: ${err?.message ?? String(err)}`)
  } finally {
    rebuilding.value = false
    rebuildingDays.value = null
  }
}

const handleRebuildYearly = async() => {
  rebuilding.value = true
  try {
    const result = await rebuildAndReloadYearlyReport(yearlySelectedYear.value)
    showActionNotice('success', getText('yearly_report__notice_rebuild_success', `年报已重建：${result.year}`))
  } catch (err: any) {
    showActionNotice('error', `${getText('yearly_report__notice_rebuild_failed', '年报重建失败')}: ${err?.message ?? String(err)}`)
  } finally {
    rebuilding.value = false
  }
}

const handleYearChange = async(year: number) => {
  if (!Number.isInteger(year)) return
  if (year === yearlySelectedYear.value && hasYearlyData.value) return
  yearlySelectedYear.value = year
  try {
    await loadYearlyReport(year)
    showActionNotice('success', getText('yearly_report__notice_year_changed', `已切换到 ${year} 年`, { year }))
  } catch (err: any) {
    showActionNotice('error', `${getText('yearly_report__notice_refresh_failed', '年报刷新失败')}: ${err?.message ?? String(err)}`)
  }
}

watch(reportMode, (mode) => {
  if (mode === 'yearly') {
    if (!hasYearlyData.value && !yearlyLoading.value) {
      void handleReload(true)
    }
    return
  }
  if (!hasMonthlyData.value && !reportLoading.value) {
    void handleReload(true)
  }
})

onMounted(() => {
  if (!hasMonthlyData.value && !reportLoading.value) {
    void handleReload(true)
  }
})

onBeforeUnmount(() => {
  hideActionNotice()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.report {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
}

.header {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 62%, transparent);
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 32%, transparent), transparent 46%),
    linear-gradient(130deg, color-mix(in srgb, var(--color-primary-background-hover) 74%, rgba(255, 255, 255, .06)) 0%, color-mix(in srgb, var(--color-primary-background) 94%, transparent) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 14px 30px rgba(0, 0, 0, .08);
}

.headInfo {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .6;
}

.title {
  margin: 8px 0 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 800;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  opacity: .72;
}

.updatedAt {
  margin: 10px 0 0;
  font-size: 11px;
  opacity: .56;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.modeTab {
  margin-right: 2px;
}

.yearSelection {
  --selection-width: 112px;
}

.grid {
  flex: auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.actionNotice {
  flex: none;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .06),
    0 8px 18px rgba(0, 0, 0, .05);
}

.actionNotice_success {
  border-color: color-mix(in srgb, var(--color-primary) 38%, transparent);
  background: color-mix(in srgb, var(--color-primary-background-hover) 78%, rgba(255, 255, 255, .08));
}

.actionNotice_error {
  border-color: color-mix(in srgb, #ef4444 56%, transparent);
  background: color-mix(in srgb, #ef4444 14%, transparent);
}

.actionNotice_info {
  border-color: color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 90%, rgba(255, 255, 255, .04));
}

.actionNoticeText {
  margin: 0;
  font-size: 12px;
  line-height: 1.46;
  min-width: 0;
  flex: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actionNoticeBody {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actionNoticeClose {
  flex: none;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: currentColor;
  opacity: .72;
  cursor: pointer;
  transition: opacity .2s ease, background-color .2s ease;

  &:hover {
    opacity: 1;
    background-color: color-mix(in srgb, currentColor 16%, transparent);
  }

  &:focus-visible {
    outline: none;
    opacity: 1;
    box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 32%, transparent);
  }
}

.cardSpan2 {
  grid-column: span 2;
}

.emptyState {
  flex: auto;
  min-height: 280px;
  border-radius: 20px;
  border: 1px dashed color-mix(in srgb, var(--color-list-header-border-bottom) 66%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(255, 255, 255, .04));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}

.emptyTitle {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.emptyDesc {
  margin: 0;
  font-size: 12px;
  opacity: .7;
  max-width: 560px;
  text-align: center;
  word-break: break-word;
}

.skeletonGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.skeletonCard {
  min-height: 170px;
  border-radius: 18px;
  background:
    linear-gradient(100deg, rgba(255, 255, 255, .03) 30%, rgba(255, 255, 255, .18) 45%, rgba(255, 255, 255, .03) 60%),
    color-mix(in srgb, var(--color-primary-background-hover) 66%, transparent);
  background-size: 180% 100%;
  animation: loading 1.4s linear infinite;
}

@keyframes loading {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -80% 0;
  }
}

@media (max-width: 1380px) {
  .grid,
  .skeletonGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1060px) {
  .grid,
  .skeletonGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cardSpan2 {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .report {
    padding: 12px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    justify-content: flex-start;
  }

  .grid,
  .skeletonGrid {
    grid-template-columns: 1fr;
  }

  .cardSpan2 {
    grid-column: span 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeletonCard {
    animation: none;
    background-position: 0 0;
  }
}
</style>
