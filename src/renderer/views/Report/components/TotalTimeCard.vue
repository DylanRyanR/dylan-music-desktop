<template>
  <CardShell :title="t('monthly_report__card_total_time')" :subtitle="t('monthly_report__total_time')">
    <div :class="$style.main">
      <p :class="$style.time">{{ totalTimeText }}</p>
      <div :class="$style.metaGrid">
        <p :class="$style.metaItem">
          <span>{{ t('monthly_report__daily_average') }}</span>
          <strong>{{ avgTimeText }}</strong>
        </p>
        <p :class="$style.metaItem">
          <span>{{ t('monthly_report__session_count') }}</span>
          <strong>{{ overview?.sessionCount ?? 0 }}</strong>
        </p>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'
import { formatDuration } from './utils'

const props = defineProps<{
  overview: LX.ReportMonthly.OverviewDTO | null
}>()

const t = useI18n()

const totalTimeText = computed(() => formatDuration(props.overview?.totalListenSeconds ?? 0))
const avgTimeText = computed(() => formatDuration(props.overview?.dailyAverageSeconds ?? 0))
</script>

<style lang="less" module>
.main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.time {
  margin: 0;
  font-size: 40px;
  line-height: 1.05;
  font-weight: 800;
}

.metaGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metaItem {
  margin: 0;
  padding: 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 76%, rgba(255, 255, 255, .08));

  > span {
    display: block;
    font-size: 12px;
    opacity: .7;
  }

  > strong {
    display: block;
    margin-top: 4px;
    font-size: 15px;
    line-height: 1.3;
  }
}
</style>
