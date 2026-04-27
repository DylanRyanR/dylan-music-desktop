<template>
  <CardShell :title="t('monthly_report__card_top_artists')" :subtitle="t('monthly_report__top_artist')">
    <template #headerExtra>
      <div :class="$style.modeSwitch">
        <button
          type="button"
          :class="[$style.modeBtn, sortMode === 'seconds' ? $style.modeBtn_active : '']"
          @click="sortMode = 'seconds'"
        >
          {{ t('monthly_report__sort_by_duration') }}
        </button>
        <button
          type="button"
          :class="[$style.modeBtn, sortMode === 'count' ? $style.modeBtn_active : '']"
          @click="sortMode = 'count'"
        >
          {{ t('monthly_report__sort_by_count') }}
        </button>
      </div>
    </template>
    <ul :class="$style.list">
      <li v-for="item in artists" :key="item.artistName" :class="$style.item" :title="item.artistName">
        <span :class="[$style.index, item.rank <= 3 ? $style[`index_${item.rank}`] : '']">{{ item.rank }}</span>
        <div :class="$style.info">
          <p :class="$style.name">{{ item.artistName }}</p>
          <p :class="$style.meta">
            <span>{{ item.playText }}</span>
            <span :class="$style.sep">|</span>
            <span>{{ item.durationText }}</span>
            <span :class="$style.sep">|</span>
            <span>{{ item.shareText }}</span>
          </p>
          <div :class="$style.barWrap">
            <span :class="$style.bar" :style="{ width: `${item.percent}%` }" />
          </div>
        </div>
      </li>
      <li v-if="!artists.length" :class="$style.empty">{{ t('monthly_report__no_data') }}</li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed, ref } from '@common/utils/vueTools'
import { formatPlayTime2 } from '@common/utils/common'
import { useI18n } from '@root/lang'
import CardShell from './CardShell.vue'

const props = defineProps<{
  cards: LX.ReportMonthly.CardsDTO | null
}>()

const t = useI18n()
const sortMode = ref<'seconds' | 'count'>('seconds')

const formatDuration = (seconds: number) => {
  return formatPlayTime2(Math.max(0, Math.floor(seconds)))
}

const formatPercent = (value: number) => {
  const fixed = Math.round(value * 10) / 10
  if (Number.isInteger(fixed)) return `${fixed}%`
  return `${fixed.toFixed(1)}%`
}

const artists = computed(() => {
  const list = props.cards?.topArtists ?? []
  const sorted = [...list].sort((a, b) => {
    if (sortMode.value === 'count') {
      if (b.count !== a.count) return b.count - a.count
      return b.seconds - a.seconds
    }
    if (b.seconds !== a.seconds) return b.seconds - a.seconds
    return b.count - a.count
  })

  const totalMetric = Math.max(1, sorted.reduce((sum: number, item: LX.ReportMonthly.TopArtistItem) => {
    return sum + (sortMode.value === 'count' ? item.count : item.seconds)
  }, 0))
  const maxMetric = Math.max(...sorted.map((item: LX.ReportMonthly.TopArtistItem) => {
    return sortMode.value === 'count' ? item.count : item.seconds
  }), 1)

  return sorted.map((item: LX.ReportMonthly.TopArtistItem, index: number) => ({
    ...item,
    rank: index + 1,
    percent: Math.max(8, Math.round(((sortMode.value === 'count' ? item.count : item.seconds) / maxMetric) * 100)),
    shareText: formatPercent(((sortMode.value === 'count' ? item.count : item.seconds) / totalMetric) * 100),
    durationText: formatDuration(item.seconds),
    playText: `x${item.count.toLocaleString()}`,
  }))
})
</script>

<style lang="less" module>
.modeSwitch {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 64%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 86%, rgba(255, 255, 255, .04));
}

.modeBtn {
  border: none;
  background: transparent;
  color: currentColor;
  font-size: 11px;
  line-height: 1;
  padding: 6px 9px;
  border-radius: 999px;
  cursor: pointer;
  opacity: .72;
  transition: opacity .2s ease, background-color .2s ease;

  &:hover {
    opacity: .92;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 36%, transparent);
  }
}

.modeBtn_active {
  opacity: 1;
  background: color-mix(in srgb, var(--color-primary-background-hover) 84%, rgba(255, 255, 255, .12));
}

.list {
  display: grid;
  gap: 10px;
}

.item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: flex-start;
  gap: 10px;
  padding-block: 1px;
}

.index {
  margin-top: 1px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  opacity: .82;
  background: color-mix(in srgb, var(--color-primary-background-hover) 72%, rgba(255, 255, 255, .12));
}

.index_1 {
  color: #ffd56a;
  background: color-mix(in srgb, #ffd56a 18%, transparent);
}

.index_2 {
  color: #d6deea;
  background: color-mix(in srgb, #d6deea 18%, transparent);
}

.index_3 {
  color: #f2b38a;
  background: color-mix(in srgb, #f2b38a 18%, transparent);
}

.info {
  min-width: 0;
}

.name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  max-height: calc(1.35em * 2);
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 11px;
  line-height: 1.35;
  opacity: .68;
}

.sep {
  opacity: .56;
}

.barWrap {
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, .1);
}

.bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 90%, rgba(255, 255, 255, .16)) 0%, color-mix(in srgb, var(--color-primary) 44%, transparent) 100%);
}

.empty {
  margin: 0;
  font-size: 12px;
  opacity: .64;
}
</style>
