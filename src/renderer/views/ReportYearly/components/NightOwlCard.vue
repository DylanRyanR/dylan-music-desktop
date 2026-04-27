<template>
  <CardShell :title="text('yearly_report__night_owl', 'Night Owl')" :subtitle="text('yearly_report__night_owl_subtitle', 'Late night listening snapshot')">
    <ul :class="$style.list">
      <li :class="$style.item">
        <p :class="$style.label">{{ text('yearly_report__night_ratio', '00:00-05:00 Ratio') }}</p>
        <p :class="$style.value">{{ formatPercent(stats.ratio) }}</p>
        <p :class="$style.desc">{{ nightSessionsText }}</p>
      </li>
      <li :class="$style.item">
        <p :class="$style.label">{{ text('yearly_report__night_duration', 'Late Night Duration') }}</p>
        <p :class="$style.value">{{ formatDuration(stats.nightListenSeconds) }}</p>
      </li>
      <li :class="$style.item">
        <p :class="$style.label">{{ text('yearly_report__night_latest_time', 'Latest Night Session') }}</p>
        <p :class="$style.value">{{ latestNightText }}</p>
      </li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatDuration, formatPercent, useSafeI18n } from './utils'

const props = defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()

const stats = computed(() => props.cards.nightOwlStats)

const nightSessionsText = computed(() => {
  return `${stats.value.nightSessionCount.toLocaleString()} / ${stats.value.totalSessionCount.toLocaleString()}`
})

const formatLatestNightTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

const latestNightText = computed(() => {
  const latest = stats.value.latestNightStartedAt
  if (latest == null) return text('monthly_report__no_data', 'No data')
  return formatLatestNightTime(latest)
})
</script>

<style lang="less" module>
.list {
  display: grid;
  gap: 10px;
}

.item {
  display: grid;
  gap: 4px;
}

.label {
  margin: 0;
  font-size: 11px;
  opacity: .66;
}

.value {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
}

.desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  opacity: .74;
}
</style>
