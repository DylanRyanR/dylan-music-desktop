<template>
  <CardShell :title="t('monthly_report__card_valid_play')" :subtitle="t('monthly_report__valid_plays')">
    <div :class="$style.main">
      <p :class="$style.value">{{ overview?.valid30Count ?? 0 }}</p>
      <div :class="$style.sparkline" role="img" :aria-label="t('monthly_report__card_valid_play')">
        <span v-for="(item, index) in barItems" :key="index" :class="$style.bar" :style="{ height: `${item}%` }" />
      </div>
      <p :class="$style.meta">
        {{ t('monthly_report__active_days') }} {{ overview?.activeDays ?? 0 }}
      </p>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'

const props = defineProps<{
  overview: LX.ReportMonthly.OverviewDTO | null
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()

const barItems = computed(() => {
  const values = props.cards?.trend?.map((item: LX.ReportMonthly.DailyTrendItem) => item.valid30Count) ?? []
  if (!values.length) return Array.from({ length: 30 }, () => 8)
  const max = Math.max(...values, 1)
  return values.map((value: number) => Math.max(8, Math.round((value / max) * 100)))
})
</script>

<style lang="less" module>
.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.value {
  margin: 0;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
}

.sparkline {
  height: 64px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 86%, rgba(255, 255, 255, .2)) 0%, color-mix(in srgb, var(--color-primary) 35%, transparent) 100%);
  transition: height .4s ease;
}

.meta {
  margin: 0;
  font-size: 12px;
  opacity: .74;
}
</style>
