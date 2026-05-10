<template>
  <section
    v-if="hasData"
    :class="[
      $style.layout,
      viewMode === 'story' ? $style.layoutStory : $style.layoutGrid,
    ]"
  >
    <header :class="$style.toolbar">
      <div :class="$style.toolbarPrimary">
        <p :class="$style.modeLabel">{{ text('yearly_report__story_mode_label', '展示模式') }}</p>
        <div :class="$style.modeActions">
          <button
            type="button"
            :class="[$style.modeBtn, viewMode === 'grid' && $style.modeBtnActive]"
            @click="viewMode = 'grid'"
          >
            {{ text('yearly_report__story_mode_grid', '数据报告') }}
          </button>
          <button
            type="button"
            :class="[$style.modeBtn, viewMode === 'story' && $style.modeBtnActive]"
            @click="viewMode = 'story'"
          >
            {{ text('yearly_report__story_mode_story', '海报流') }}
          </button>
        </div>
      </div>
      <div :class="$style.toolbarSecondary">
        <base-selection
          :model-value="exportStyle"
          :list="exportStyleList"
          :class="$style.exportStyleSelection"
          item-key="id"
          item-name="label"
          @update:model-value="emit('update:exportStyle', $event)"
        />
        <base-btn outline min :disabled="loading || exporting" @click="emit('preview')">
          {{ previewText }}
        </base-btn>
        <base-btn outline min :disabled="loading || rebuilding" @click="emit('rebuild')">
          {{ rebuilding ? rebuildLoadingText : rebuildText }}
        </base-btn>
      </div>
    </header>

    <PosterStory v-if="viewMode === 'story'" :overview="overviewData" :cards="cardsData" />

    <section v-else :class="$style.grid">
      <OverviewKpiCard :overview="overviewData" :class="$style.span2" />
      <FreshnessCard :overview="overviewData" />
      <YearFavoritesCard :cards="cardsData" />

      <ReplaySongsCard :cards="cardsData" :class="$style.spanFull" />
      <SeasonalFavoritesCard :cards="cardsData" />
      <WeeklyHabitCard :cards="cardsData" />
      <NightOwlCard :cards="cardsData" />
      <ArtistTimelineCard :cards="cardsData" />
      <YearRankCard :cards="cardsData" :class="$style.span2" />
      <EnrichmentPlaceholderCard :cards="cardsData" :class="$style.span2" />
    </section>
  </section>

  <section v-else :class="$style.emptyState">
    <p :class="$style.emptyTitle">{{ text('monthly_report__no_data', 'No data') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from '@common/utils/vueTools'
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
import PosterStory from './components/PosterStory.vue'
import { useSafeI18n } from './components/utils'

const props = defineProps<{
  overview: LX.ReportYearly.OverviewDTO | null
  cards: LX.ReportYearly.CardsDTO | null
  exportStyle: 'classic' | 'poster'
  exportStyleList: Array<{ id: 'classic' | 'poster', label: string }>
  exporting: boolean
  loading: boolean
  rebuilding: boolean
  previewText: string
  rebuildText: string
  rebuildLoadingText: string
}>()

const emit = defineEmits<{
  (event: 'update:exportStyle', style: string | number): void
  (event: 'preview'): void
  (event: 'rebuild'): void
}>()

const text = useSafeI18n()
const viewMode = ref<'story' | 'grid'>('grid')

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
.layout {
  min-height: 0;
  min-width: 0;
  display: grid;
  gap: 12px;
  width: 100%;
}

.layoutStory {
  height: 100%;
  grid-template-rows: auto minmax(0, 1fr);
}

.layoutGrid {
  height: auto;
  grid-template-rows: auto auto;
  align-content: start;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 2px;
}

.toolbarPrimary,
.toolbarSecondary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbarSecondary {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.modeLabel {
  margin: 0;
  font-size: 12px;
  opacity: .68;
}

.modeActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modeBtn {
  height: 30px;
  min-width: 78px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  background: transparent;
  color: var(--color-font);
  font-size: 12px;
  cursor: pointer;
  transition: background-color .2s ease, border-color .2s ease;

  &:hover {
    background: color-mix(in srgb, var(--color-primary-background-hover) 78%, rgba(255, 255, 255, .1));
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 36%, transparent);
  }
}

.modeBtnActive {
  border-color: color-mix(in srgb, var(--color-primary) 52%, transparent);
  background: color-mix(in srgb, var(--color-primary-background-hover) 74%, rgba(255, 255, 255, .1));
}

.exportStyleSelection {
  --selection-width: 120px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
  width: 100%;
}

.span2 {
  grid-column: span 2;
}

.spanFull {
  grid-column: 1 / -1;
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

  .spanFull {
    grid-column: span 2;
  }
}

@media (max-width: 1060px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbarPrimary,
  .toolbarSecondary {
    width: 100%;
    justify-content: flex-start;
  }

  .toolbarSecondary {
    gap: 8px;
  }

  .modeActions {
    flex: auto;
  }

  .modeBtn {
    flex: 1;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .span2 {
    grid-column: span 1;
  }

  .spanFull {
    grid-column: span 1;
  }
}
</style>
