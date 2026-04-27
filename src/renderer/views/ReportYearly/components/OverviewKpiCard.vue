<template>
  <CardShell :title="`${overview.year} ${text('yearly_report', 'Yearly Report')}`" :subtitle="text('yearly_report__title', 'Natural year listening overview')">
    <div :class="$style.kpiGrid">
      <article :class="$style.kpiItem">
        <p :class="$style.kpiLabel">{{ text('monthly_report__total_time', 'Total Time') }}</p>
        <p :class="$style.kpiValue">{{ formatDuration(overview.totalListenSeconds) }}</p>
      </article>
      <article :class="$style.kpiItem">
        <p :class="$style.kpiLabel">{{ text('monthly_report__session_count', 'Sessions') }}</p>
        <p :class="$style.kpiValue">{{ overview.sessionCount.toLocaleString() }}</p>
      </article>
      <article :class="$style.kpiItem">
        <p :class="$style.kpiLabel">{{ text('monthly_report__active_days', 'Active Days') }}</p>
        <p :class="$style.kpiValue">{{ overview.activeDays.toLocaleString() }}</p>
      </article>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatDuration, useSafeI18n } from './utils'

defineProps<{
  overview: LX.ReportYearly.OverviewDTO
}>()

const text = useSafeI18n()
</script>

<style lang="less" module>
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.kpiItem {
  border-radius: 14px;
  padding: 10px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 68%, rgba(255, 255, 255, .08));
}

.kpiLabel {
  margin: 0;
  font-size: 11px;
  opacity: .64;
}

.kpiValue {
  margin: 8px 0 0;
  font-size: 18px;
  line-height: 1.2;
  font-weight: 700;
}

@media (max-width: 760px) {
  .kpiGrid {
    grid-template-columns: 1fr;
  }
}
</style>
