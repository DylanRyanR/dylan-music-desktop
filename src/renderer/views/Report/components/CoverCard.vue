<template>
  <CardShell :title="t('monthly_report__card_cover_title')" :subtitle="t('monthly_report__card_cover_subtitle')">
    <div :class="$style.hero">
      <p :class="$style.range">{{ rangeText }}</p>
      <h4 :class="$style.headline">{{ t('monthly_report__title') }}</h4>
      <ul :class="$style.tags">
        <li v-for="song in topSongNames" :key="song" :class="$style.tag">{{ song }}</li>
      </ul>
      <div :class="$style.meta">
        <span>{{ t('monthly_report__active_days') }} {{ overview?.activeDays ?? 0 }}</span>
        <span>{{ t('monthly_report__streak_days') }} {{ overview?.streakDays ?? 0 }}</span>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'
import { formatDateRange } from './utils'

const props = defineProps<{
  overview: LX.ReportMonthly.OverviewDTO | null
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()

const rangeText = computed(() => {
  if (!props.overview) return '--'
  return formatDateRange(props.overview.startAt, props.overview.endAt)
})

const topSongNames = computed(() => {
  if (!props.cards?.topSongs?.length) return [t('monthly_report__no_data')]
  return props.cards.topSongs.slice(0, 4).map((song: LX.ReportMonthly.TopSongItem) => song.songName)
})
</script>

<style lang="less" module>
.hero {
  min-height: 150px;
  border-radius: 14px;
  padding: 14px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 15% -5%, rgba(255, 255, 255, .22), transparent 45%),
    radial-gradient(circle at 95% 0%, color-mix(in srgb, var(--color-primary) 48%, transparent), transparent 42%),
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 36%, rgba(0, 0, 0, .22)) 0%, color-mix(in srgb, var(--color-primary-background) 82%, rgba(0, 0, 0, .26)) 100%);
}

.range {
  margin: 0;
  font-size: 12px;
  opacity: .74;
}

.headline {
  margin: 10px 0 0;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 800;
}

.tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  max-width: 170px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid rgba(255, 255, 255, .18);
  background: rgba(255, 255, 255, .12);
}

.meta {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  font-size: 12px;
  opacity: .86;
}
</style>
