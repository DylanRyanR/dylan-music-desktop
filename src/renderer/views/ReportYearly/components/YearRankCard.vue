<template>
  <CardShell :title="text('yearly_report__year_rank', 'Year Rank')" :subtitle="text('yearly_report__year_rank_subtitle', 'Rank by total listen time')">
    <ul :class="$style.list">
      <li v-for="item in rankRows" :key="item.year" :class="$style.listItem">
        <p :class="$style.itemMain">
          <span :class="$style.rankBadge">#{{ item.rank }}</span>
          <span>{{ item.year }}</span>
        </p>
        <p :class="$style.itemMinor">{{ formatDuration(item.totalListenSeconds) }}</p>
      </li>
      <li v-if="!rankRows.length" :class="$style.empty">{{ text('monthly_report__no_data', 'No data') }}</li>
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
const rankRows = computed(() => props.cards.yearlyRank.slice(0, 6))
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

.rankBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 18px;
  border-radius: 999px;
  font-size: 11px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 72%, rgba(255, 255, 255, .08));
}

.empty {
  margin: 0;
  font-size: 12px;
  opacity: .64;
}
</style>
