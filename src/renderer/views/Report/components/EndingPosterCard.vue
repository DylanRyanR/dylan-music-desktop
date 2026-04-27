<template>
  <CardShell :title="t('monthly_report__card_ending')" :subtitle="t('monthly_report__share_tip')">
    <div :class="$style.main">
      <p :class="$style.summary">{{ summaryText }}</p>
      <p :class="$style.tip">{{ t('monthly_report__share_tip') }}</p>
      <div :class="$style.badges">
        <span :class="$style.badge">{{ t('monthly_report__session_count') }} {{ overview?.sessionCount ?? 0 }}</span>
        <span :class="$style.badge">{{ t('monthly_report__valid_plays') }} {{ overview?.valid30Count ?? 0 }}</span>
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
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()

const topSongName = computed(() => props.cards?.topSongs[0]?.songName ?? t('monthly_report__no_data'))
const summaryText = computed(() => {
  const totalTime = formatDuration(props.overview?.totalListenSeconds ?? 0)
  return `${t('monthly_report__total_time')} ${totalTime} · ${t('monthly_report__top_song')} ${topSongName.value}`
})
</script>

<style lang="less" module>
.main {
  min-height: 132px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 14px;
  padding: 12px;
  background:
    radial-gradient(circle at right top, color-mix(in srgb, var(--color-primary) 48%, transparent), transparent 44%),
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary-background-hover) 80%, rgba(255,255,255,.08)) 0%, color-mix(in srgb, var(--color-primary-background) 94%, rgba(0,0,0,.08)) 100%);
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 58%, transparent);
}

.summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 600;
}

.tip {
  margin: 0;
  font-size: 12px;
  opacity: .74;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  font-size: 12px;
  line-height: 1.3;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, .16);
  background: rgba(255, 255, 255, .1);
}
</style>
