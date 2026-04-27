<template>
  <CardShell :title="text('yearly_report__freshness', 'Freshness')" :subtitle="text('yearly_report__freshness_subtitle', 'New songs and artists ratio')">
    <div :class="$style.ratioList">
      <div :class="$style.ratioRow">
        <p :class="$style.ratioLabel">{{ text('yearly_report__new_song_ratio', 'New Song Ratio') }}</p>
        <p :class="$style.ratioValue">{{ formatPercent(overview.newSongRatio) }}</p>
        <div :class="$style.ratioTrack"><span :class="$style.ratioFill" :style="{ width: `${Math.max(0, Math.min(1, overview.newSongRatio)) * 100}%` }" /></div>
      </div>
      <div :class="$style.ratioRow">
        <p :class="$style.ratioLabel">{{ text('yearly_report__new_artist_ratio', 'New Artist Ratio') }}</p>
        <p :class="$style.ratioValue">{{ formatPercent(overview.newArtistRatio) }}</p>
        <div :class="$style.ratioTrack"><span :class="$style.ratioFill" :style="{ width: `${Math.max(0, Math.min(1, overview.newArtistRatio)) * 100}%` }" /></div>
      </div>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatPercent, useSafeI18n } from './utils'

defineProps<{
  overview: LX.ReportYearly.OverviewDTO
}>()

const text = useSafeI18n()
</script>

<style lang="less" module>
.ratioList {
  display: grid;
  gap: 12px;
}

.ratioRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 10px;
  align-items: center;
}

.ratioLabel,
.ratioValue {
  margin: 0;
  font-size: 12px;
}

.ratioValue {
  font-weight: 700;
}

.ratioTrack {
  grid-column: span 2;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
  overflow: hidden;
}

.ratioFill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 84%, rgba(255, 255, 255, .08)) 0%, color-mix(in srgb, var(--color-primary) 58%, transparent) 100%);
}
</style>
