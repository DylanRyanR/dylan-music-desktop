<template>
  <CardShell :title="text('yearly_report__seasonal_favorites', 'Seasonal Favorites')" :subtitle="text('yearly_report__seasonal_favorites_subtitle', 'Top song in each season')">
    <ul :class="$style.list">
      <li v-for="item in seasonalRows" :key="item.season" :class="$style.listItem">
        <p :class="$style.itemMain">
          <span :class="$style.seasonTag">{{ item.seasonLabel }}</span>
          <span>{{ item.songName ?? '-' }}</span>
        </p>
        <p :class="$style.itemMinor">{{ item.artistName ?? text('monthly_report__no_data', 'No data') }}</p>
      </li>
    </ul>
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

const seasonMap: Record<LX.ReportYearly.SeasonalFavoriteItem['season'], string> = {
  spring: 'SPR',
  summer: 'SUM',
  autumn: 'AUT',
  winter: 'WIN',
}

const seasonalRows = computed(() => {
  return props.cards.seasonalFavorites.map((item: LX.ReportYearly.SeasonalFavoriteItem) => ({
    ...item,
    seasonLabel: seasonMap[item.season] ?? item.season.toUpperCase(),
  }))
})
</script>

<style lang="less" module>
.list {
  display: grid;
  gap: 8px;
}

.listItem {
  display: grid;
  gap: 3px;
}

.itemMain {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  display: flex;
  align-items: center;
  gap: 6px;
}

.itemMinor {
  margin: 0;
  font-size: 11px;
  opacity: .66;
}

.seasonTag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 18px;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 10px;
  background: color-mix(in srgb, var(--color-primary) 24%, transparent);
}
</style>
