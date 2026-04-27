<template>
  <CardShell :title="text('yearly_report__weekday_habit', 'Weekly Habit')" :subtitle="text('yearly_report__weekday_habit_subtitle', 'Distribution by weekday')">
    <div :class="$style.weekdayList">
      <div v-for="item in weekdayRows" :key="item.weekday" :class="$style.weekdayRow">
        <span :class="$style.weekdayLabel">{{ item.label }}</span>
        <span :class="$style.weekdayTrack"><span :class="$style.weekdayFill" :style="{ width: `${item.percent}%` }" /></span>
        <span :class="$style.weekdayValue">{{ item.count }}</span>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { useSafeI18n } from './utils'

const props = defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()

const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const weekdayRows = computed(() => {
  const maxCount = Math.max(...props.cards.weekdayDistribution.map((item: LX.ReportYearly.WeekdayDistributionItem) => item.count), 1)
  return props.cards.weekdayDistribution.map((item: LX.ReportYearly.WeekdayDistributionItem) => ({
    ...item,
    label: weekdayMap[item.weekday] ?? `${item.weekday}`,
    percent: Math.max(6, Math.round((item.count / maxCount) * 100)),
  }))
})
</script>

<style lang="less" module>
.weekdayList {
  display: grid;
  gap: 7px;
}

.weekdayRow {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: center;
}

.weekdayLabel,
.weekdayValue {
  font-size: 11px;
  opacity: .72;
}

.weekdayTrack {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, .1);
}

.weekdayFill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, #22d3ee 78%, rgba(255, 255, 255, .08)) 0%, color-mix(in srgb, #06b6d4 62%, transparent) 100%);
}
</style>
