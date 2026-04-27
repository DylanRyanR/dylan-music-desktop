<template>
  <CardShell :title="t('monthly_report__card_discovery')" :subtitle="discoveryCountText">
    <div :class="$style.main">
      <ul v-if="newDiscovery.length" :class="$style.list">
        <li v-for="item in newDiscovery" :key="item.songId" :class="$style.item">
          <p :class="$style.name">{{ item.songName }}</p>
          <p :class="$style.artist">{{ item.artistName }}</p>
        </li>
      </ul>
      <p v-else :class="$style.empty">{{ t('monthly_report__no_data') }}</p>
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

const newDiscovery = computed(() => props.cards?.newDiscovery ?? [])
const discoveryCountText = computed(() => `${t('monthly_report__new_discovery_count')} ${props.overview?.newDiscoveryCount ?? 0}`)
</script>

<style lang="less" module>
.main {
  min-height: 120px;
}

.list {
  display: grid;
  gap: 8px;
}

.item {
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 76%, rgba(255, 255, 255, .08));
}

.name,
.artist {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name {
  font-size: 13px;
  font-weight: 600;
}

.artist {
  margin-top: 3px;
  font-size: 12px;
  opacity: .66;
}

.empty {
  margin: 0;
  font-size: 12px;
  opacity: .64;
}
</style>
