<template>
  <CardShell :title="t('monthly_report__card_source_share')" :subtitle="t('monthly_report__card_source_share')">
    <ul :class="$style.list">
      <li v-for="item in sourceRows" :key="item.sourceType" :class="$style.row">
        <span :class="$style.name">{{ sourceLabel(item.sourceType) }}</span>
        <div :class="$style.barWrap">
          <span :class="$style.bar" :style="{ width: `${item.percent}%` }" />
        </div>
        <span :class="$style.percent">{{ item.percentText }}</span>
      </li>
      <li v-if="!sourceRows.length" :class="$style.empty">{{ t('monthly_report__no_data') }}</li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'
import { SOURCE_TYPES, formatPercent } from './utils'

const props = defineProps<{
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()

const sourceRows = computed(() => {
  const sourceMap = new Map<LX.ReportMonthly.SourceType, LX.ReportMonthly.SourceShareItem>()
  for (const item of props.cards?.sourceShare ?? []) sourceMap.set(item.sourceType, item)
  const allRows = SOURCE_TYPES.map(sourceType => {
    const info = sourceMap.get(sourceType)
    return {
      sourceType,
      seconds: info?.seconds ?? 0,
    }
  }).filter(item => item.seconds > 0)

  const totalSeconds = allRows.reduce((sum, item) => sum + item.seconds, 0)
  return allRows.map(item => {
    const percent = totalSeconds > 0 ? item.seconds / totalSeconds : 0
    return {
      ...item,
      percent: Math.max(5, Math.round(percent * 100)),
      percentText: formatPercent(percent),
    }
  }).sort((a, b) => b.seconds - a.seconds)
})

const sourceLabel = (sourceType: LX.ReportMonthly.SourceType) => {
  return t(`monthly_report__source_${sourceType}` as any)
}
</script>

<style lang="less" module>
.list {
  display: grid;
  gap: 9px;
}

.row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 12px;
  opacity: .74;
}

.barWrap {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, .1);
}

.bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 86%, rgba(255,255,255,.2)) 0%, color-mix(in srgb, var(--color-primary) 42%, transparent) 100%);
}

.percent {
  text-align: right;
  font-size: 12px;
}

.empty {
  font-size: 12px;
  opacity: .64;
}
</style>
