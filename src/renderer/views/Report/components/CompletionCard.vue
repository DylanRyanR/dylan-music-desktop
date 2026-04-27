<template>
  <CardShell :title="t('monthly_report__card_completion')" :subtitle="t('monthly_report__completion_rate')">
    <div :class="$style.main">
      <div :class="$style.ring" :style="ringStyle">
        <span>{{ completionText }}</span>
      </div>
      <div :class="$style.rows">
        <p :class="$style.row">
          <span>{{ t('monthly_report__completion_rate') }}</span>
          <strong>{{ completionText }}</strong>
        </p>
        <p :class="$style.row">
          <span>{{ t('monthly_report__skip_rate') }}</span>
          <strong>{{ skipText }}</strong>
        </p>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'
import { clamp, formatPercent } from './utils'

const props = defineProps<{
  overview: LX.ReportMonthly.OverviewDTO | null
}>()

const t = useI18n()

const completionRate = computed(() => clamp(props.overview?.complete80Rate ?? 0, 0, 1))
const skipRate = computed(() => clamp(props.overview?.skipRate ?? 0, 0, 1))

const completionText = computed(() => formatPercent(completionRate.value))
const skipText = computed(() => formatPercent(skipRate.value))
const ringStyle = computed(() => ({
  background: `conic-gradient(color-mix(in srgb, var(--color-primary) 88%, rgba(255,255,255,.22)) 0 ${completionRate.value * 360}deg, rgba(255,255,255,.12) ${completionRate.value * 360}deg 360deg)`,
}))
</script>

<style lang="less" module>
.main {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
}

.ring {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: var(--color-font);
  font-size: 13px;
  font-weight: 700;

  &::before {
    content: '';
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(0, 0, 0, .1));
    border: 1px solid rgba(255, 255, 255, .1);
  }

  > span {
    position: relative;
    z-index: 1;
  }
}

.rows {
  display: grid;
  gap: 8px;
}

.row {
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--color-primary-background-hover) 72%, rgba(255, 255, 255, .08));

  > span {
    font-size: 12px;
    opacity: .74;
  }

  > strong {
    font-size: 13px;
  }
}
</style>
