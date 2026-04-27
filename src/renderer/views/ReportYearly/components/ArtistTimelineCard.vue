<template>
  <CardShell :title="text('yearly_report__artist_timeline', 'Artist Timeline')" :subtitle="text('yearly_report__artist_timeline_subtitle', 'Monthly dominant artist')">
    <ul :class="$style.list">
      <li v-for="item in timelineRows" :key="item.month" :class="$style.listItem">
        <p :class="$style.itemMain">{{ item.month.toString().padStart(2, '0') }} - {{ item.artistName }}</p>
        <p :class="$style.itemMinor">{{ formatDuration(item.seconds) }}</p>
      </li>
      <li v-if="!timelineRows.length" :class="$style.empty">{{ text('monthly_report__no_data', 'No data') }}</li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatDuration, useSafeI18n } from './utils'

const props = defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()

const timelineRows = computed(() => {
  return props.cards.monthlyArtistTimeline
    .filter((item: LX.ReportYearly.MonthlyArtistTimelineItem) => Boolean(item.artistName))
    .slice(0, 8)
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

.itemMain,
.itemMinor {
  margin: 0;
}

.itemMain {
  font-size: 12px;
  line-height: 1.35;
}

.itemMinor {
  font-size: 11px;
  opacity: .66;
}

.empty {
  margin: 0;
  font-size: 12px;
  opacity: .64;
}
</style>
