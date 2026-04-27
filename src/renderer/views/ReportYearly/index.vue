<template>
  <section v-if="hasData" :class="$style.grid">
    <OverviewKpiCard :overview="overviewData" :class="$style.span2" />
    <FreshnessCard :overview="overviewData" />
    <YearFavoritesCard :cards="cardsData" />

    <SeasonalFavoritesCard :cards="cardsData" />
    <WeeklyHabitCard :cards="cardsData" />
    <NightOwlCard :cards="cardsData" />
    <ReplaySongsCard :cards="cardsData" :class="$style.span2" />
    <ArtistTimelineCard :cards="cardsData" />
    <YearRankCard :cards="cardsData" />
    <EnrichmentPlaceholderCard :cards="cardsData" :class="$style.span2" />
  </section>

  <section v-else :class="$style.emptyState">
    <p :class="$style.emptyTitle">{{ text('monthly_report__no_data', 'No data') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import OverviewKpiCard from './components/OverviewKpiCard.vue'
import FreshnessCard from './components/FreshnessCard.vue'
import YearFavoritesCard from './components/YearFavoritesCard.vue'
import SeasonalFavoritesCard from './components/SeasonalFavoritesCard.vue'
import WeeklyHabitCard from './components/WeeklyHabitCard.vue'
import NightOwlCard from './components/NightOwlCard.vue'
import ReplaySongsCard from './components/ReplaySongsCard.vue'
import ArtistTimelineCard from './components/ArtistTimelineCard.vue'
import YearRankCard from './components/YearRankCard.vue'
import EnrichmentPlaceholderCard from './components/EnrichmentPlaceholderCard.vue'
import { useSafeI18n } from './components/utils'

const props = defineProps<{
  overview: LX.ReportYearly.OverviewDTO | null
  cards: LX.ReportYearly.CardsDTO | null
}>()

const text = useSafeI18n()

const hasData = computed(() => !!props.overview && !!props.cards)

const overviewData = computed<LX.ReportYearly.OverviewDTO>(() => props.overview ?? {
  year: new Date().getFullYear(),
  totalListenSeconds: 0,
  sessionCount: 0,
  activeDays: 0,
  newSongRatio: 0,
  newArtistRatio: 0,
})

const cardsData = computed<LX.ReportYearly.CardsDTO>(() => props.cards ?? {
  yearFavorites: {
    song: {
      songId: '',
      songName: '',
      artistName: '',
      count: 0,
      seconds: 0,
    },
    artist: {
      artistName: '',
      count: 0,
      seconds: 0,
    },
    album: {
      albumName: '',
      artistName: '',
      count: 0,
      seconds: 0,
    },
  },
  seasonalFavorites: [],
  weekdayDistribution: [],
  nightOwlStats: {
    nightSessionCount: 0,
    nightListenSeconds: 0,
    totalSessionCount: 0,
    ratio: 0,
    latestNightStartedAt: null,
    latestNightHour: null,
  },
  monthlyArtistTimeline: [],
  replaySongs: [],
  yearlyRank: [],
  enrichmentPlaceholder: {
    status: 'placeholder',
    fields: [],
  },
})
</script>

<style lang="less" module>
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.span2 {
  grid-column: span 2;
}

.emptyState {
  min-height: 260px;
  border-radius: 18px;
  border: 1px dashed color-mix(in srgb, var(--color-list-header-border-bottom) 68%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(255, 255, 255, .04));
  display: flex;
  align-items: center;
  justify-content: center;
}

.emptyTitle {
  margin: 0;
  font-size: 13px;
  opacity: .72;
}

@media (max-width: 1380px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1060px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .span2 {
    grid-column: span 1;
  }
}
</style>
