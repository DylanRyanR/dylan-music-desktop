<template>
  <CardShell :title="t('monthly_report__card_hour_heat')" :subtitle="peakLabel">
    <div :class="$style.chart">
      <div v-for="item in bars" :key="item.hour" :class="$style.column">
        <span :class="$style.bar" :style="{ height: `${item.height}%` }" />
        <span v-if="item.hour % 6 === 0" :class="$style.label">{{ item.hour }}</span>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'
import { formatHourLabel, getPeakHour } from './utils'

const props = defineProps<{
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()

const histogram = computed(() => props.cards?.hourHistogram ?? Array.from({ length: 24 }, () => 0))

const bars = computed(() => {
  const max = Math.max(...histogram.value, 1)
  return histogram.value.map((value: number, hour: number) => ({
    hour,
    height: Math.max(6, Math.round((value / max) * 100)),
  }))
})

const peakLabel = computed(() => {
  const peak = getPeakHour(histogram.value)
  return `${t('monthly_report__peak_hour')} ${formatHourLabel(peak.hour)}`
})
</script>

<style lang="less" module>
.chart {
  height: 124px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.column {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 82%, rgba(255, 255, 255, .22)) 0%, color-mix(in srgb, var(--color-primary) 34%, transparent) 100%);
  transition: height .4s ease;
}

.label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  opacity: .58;
}
</style>
