<template>
  <CardShell :title="text('yearly_report__replay_songs', 'Replay Songs')" :subtitle="text('yearly_report__replay_songs_subtitle', 'Songs played at least 3 times')">
    <ul :class="$style.list">
      <li v-for="item in replayRows" :key="item.songId" :class="$style.item" :title="`${item.songName} | ${item.artistName}`">
        <span :class="[$style.index, item.rank <= 3 ? $style[`index_${item.rank}`] : '']">{{ item.rank }}</span>
        <div :class="$style.info">
          <p :class="$style.name">{{ item.songName }}</p>
          <p :class="$style.artist">{{ item.artistName }}</p>
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
      <li v-if="!replayRows.length" :class="$style.empty">{{ text('monthly_report__no_data', 'No data') }}</li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatDuration, formatPercent, useSafeI18n } from './utils'

const props = defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()

const replayRows = computed(() => {
  const rows = [...props.cards.replaySongs]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.seconds - a.seconds
    })
    .slice(0, 8)

  const totalCount = Math.max(1, rows.reduce((sum, item) => sum + item.count, 0))
  const maxCount = Math.max(...rows.map(item => item.count), 1)

  return rows.map((item, index) => ({
    ...item,
    rank: index + 1,
    playText: `x${item.count.toLocaleString()}`,
    durationText: formatDuration(item.seconds),
    shareText: formatPercent(item.count / totalCount),
    percent: Math.max(8, Math.round((item.count / maxCount) * 100)),
  }))
})
</script>

<style lang="less" module>
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

.name,
.artist {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  white-space: normal;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
  max-height: calc(1.35em * 2);
}

.artist {
  margin-top: 2px;
  font-size: 12px;
  opacity: .66;
  white-space: nowrap;
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
