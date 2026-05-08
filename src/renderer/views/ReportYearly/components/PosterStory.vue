<template>
  <section
    ref="rootRef"
    :class="$style.storyRoot"
    :style="rootToneStyle"
    :data-phase="activePage?.phase ?? 'warmup'"
    tabindex="0"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <div :class="$style.viewport">
      <div
        :key="`phase-wave-${phasePulseSeed}`"
        :class="[
          $style.phaseWave,
          phaseWaveDirection === 'forward' ? $style.phaseWaveForward : $style.phaseWaveBackward,
        ]"
      />
      <div :class="$style.storyTopBar">
        <div :key="`top-head-${phasePulseSeed}`" :class="$style.storyTopHead">
          <p :class="$style.storyTopTitle">{{ activePage?.eyebrow ?? '' }}</p>
          <p :class="$style.storyTopPhase">{{ activePhaseLabel }}</p>
        </div>
        <div :class="$style.storyProgressTrack">
          <div :class="$style.storyProgressFill" :style="{ width: chapterProgressPercent }" />
        </div>
      </div>
      <div
        :key="`flash-${transitionFlashSeed}`"
        :class="[
          $style.transitionFlash,
          transitionDirection === 'prev' ? $style.transitionFlashPrev : $style.transitionFlashNext,
        ]"
      />
      <div
        :class="$style.track"
        :style="trackStyle"
      >
        <article
          v-for="(page, pageIndex) in pages"
          :key="page.key"
          :class="[$style.page, pageIndex === activeIndex && $style.pageActive]"
          :data-kind="page.kind"
          :data-theme="page.theme"
          :style="{
            '--page-gradient': page.gradient,
            '--page-ink': page.theme === 'dark' ? '#f3f7ff' : '#091629',
            '--page-ink-soft': page.theme === 'dark' ? 'rgba(243, 247, 255, .78)' : 'rgba(9, 22, 41, .76)',
            '--panel-bg': page.theme === 'dark' ? 'rgba(15, 27, 52, .52)' : 'rgba(255, 255, 255, .58)',
            '--panel-stroke': page.theme === 'dark' ? 'rgba(194, 215, 255, .24)' : 'rgba(9, 22, 41, .08)',
          }"
        >
          <div :class="$style.pageBackdrop" />
          <ul :class="$style.pageOrnaments" aria-hidden="true">
            <li
              v-for="(ornament, ornamentIndex) in getPageOrnaments(pageIndex)"
              :key="`${page.key}-${ornamentIndex}`"
              :class="$style.pageOrnament"
              :style="{
                top: ornament.top,
                left: ornament.left,
                width: `${ornament.size}px`,
                height: `${ornament.size}px`,
                opacity: `${ornament.alpha}`,
              }"
            />
          </ul>
          <div :class="$style.pageMeta">
            <p :class="$style.pageChapter">CHAPTER {{ String(pageIndex + 1).padStart(2, '0') }}</p>
            <p :class="$style.pageCounter">{{ pageIndex + 1 }} / {{ pages.length }}</p>
          </div>
          <header :class="$style.pageHead">
            <p :class="$style.eyebrow">{{ page.eyebrow }}</p>
            <h2 :class="$style.title">{{ page.title }}</h2>
            <p :class="$style.subtitle">{{ page.subtitle }}</p>
            <p :class="$style.insight">{{ page.insight }}</p>
          </header>
          <div :class="$style.pageMain" data-scroll-region="true">

          <section v-if="page.kind === 'cover'" :class="$style.coverPanel">
            <p :class="$style.coverValue">{{ page.heroValue }}</p>
            <p :class="$style.coverLabel">{{ page.heroLabel }}</p>
            <p :class="$style.coverDesc">{{ page.description }}</p>
          </section>

          <section v-else-if="page.kind === 'kpi'" :class="$style.metricGrid">
            <article v-for="item in page.metrics" :key="item.label" :class="$style.metricCard">
              <p :class="$style.metricLabel">{{ item.label }}</p>
              <p :class="$style.metricValue">{{ item.value }}</p>
            </article>
          </section>

          <section v-else-if="page.kind === 'freshness'" :class="$style.freshnessPanel">
            <article v-for="item in page.items" :key="item.label" :class="$style.freshnessRow">
              <div :class="$style.freshnessHeader">
                <p :class="$style.metricLabel">{{ item.label }}</p>
                <p :class="$style.metricValue">{{ item.value }}</p>
              </div>
              <div :class="$style.progressTrack">
                <div :class="$style.progressFill" :style="{ width: item.percent }" />
              </div>
            </article>
          </section>

          <section v-else-if="page.kind === 'favorites'" :class="$style.listPanel">
            <article v-for="item in page.items" :key="item.label" :class="$style.listCard">
              <p :class="$style.metricLabel">{{ item.label }}</p>
              <p :class="$style.listMain">{{ item.main }}</p>
              <p :class="$style.listSub">{{ item.sub }}</p>
            </article>
          </section>

          <section v-else-if="page.kind === 'season'" :class="$style.listPanel">
            <article v-for="item in page.items" :key="item.label" :class="$style.listRow">
              <p :class="$style.listTag">{{ item.label }}</p>
              <div :class="$style.listBody">
                <p :class="$style.listMain">{{ item.main }}</p>
                <p :class="$style.listSub">{{ item.sub }}</p>
              </div>
            </article>
          </section>

          <section v-else-if="page.kind === 'weekly'" :class="$style.chartPanel">
            <article v-for="item in page.items" :key="item.label" :class="$style.chartRow">
              <p :class="$style.chartLabel">{{ item.label }}</p>
              <div :class="$style.chartTrack">
                <div :class="$style.chartBar" :style="{ width: item.percent }" />
              </div>
              <p :class="$style.chartValue">{{ item.value }}</p>
            </article>
          </section>

          <section v-else-if="page.kind === 'night'" :class="$style.metricGrid">
            <article v-for="item in page.items" :key="item.label" :class="$style.metricCard">
              <p :class="$style.metricLabel">{{ item.label }}</p>
              <p :class="$style.metricValue">{{ item.value }}</p>
            </article>
          </section>

          <section v-else-if="page.kind === 'replay'" :class="$style.listPanel">
            <article v-for="(item, index) in page.items" :key="`${item.main}-${index}`" :class="$style.listRow">
              <p :class="$style.listTag">#{{ index + 1 }}</p>
              <div :class="$style.listBody">
                <p :class="$style.listMain">{{ item.main }}</p>
                <p :class="$style.listSub">{{ item.sub }}</p>
              </div>
            </article>
          </section>

          <section v-else-if="page.kind === 'timeline'" :class="$style.timelinePanel">
            <article v-for="item in page.items" :key="item.month" :class="$style.timelineRow">
              <p :class="$style.timelineMonth">{{ item.monthLabel }}</p>
              <div :class="$style.timelineLine">
                <div :class="$style.timelineDot" />
              </div>
              <div :class="$style.timelineBody">
                <p :class="$style.listMain">{{ item.main }}</p>
                <p :class="$style.listSub">{{ item.sub }}</p>
              </div>
            </article>
          </section>

          <section v-else-if="page.kind === 'rank'" :class="$style.chartPanel">
            <article v-for="item in page.items" :key="item.label" :class="$style.chartRow">
              <p :class="$style.chartLabel">{{ item.label }}</p>
              <div :class="$style.chartTrack">
                <div :class="$style.chartBar" :style="{ width: item.percent }" />
              </div>
              <p :class="$style.chartValue">{{ item.value }}</p>
            </article>
          </section>

          <section v-else-if="page.kind === 'ending'" :class="$style.coverPanel">
            <p :class="$style.coverValue">{{ page.heroValue }}</p>
            <p :class="$style.coverLabel">{{ page.heroLabel }}</p>
            <p :class="$style.coverDesc">{{ page.description }}</p>
          </section>

          <section v-else :class="$style.coverPanel">
            <p :class="$style.coverLabel">{{ text('monthly_report__no_data', '暂无数据') }}</p>
          </section>
          </div>
        </article>
      </div>
    </div>

    <section :class="$style.storyDock">
      <div :class="$style.controls">
      <button type="button" :class="$style.navBtn" :disabled="activeIndex <= 0" @click="step(-1)">
        {{ text('yearly_report__story_prev', '上一页') }}
      </button>
      <p :class="$style.pageIndex">{{ activeIndex + 1 }} / {{ pages.length }}</p>
      <button type="button" :class="$style.navBtn" :disabled="activeIndex >= pages.length - 1" @click="step(1)">
        {{ text('yearly_report__story_next', '下一页') }}
      </button>
      <ul :class="$style.dots">
        <li v-for="(page, index) in pages" :key="page.key">
          <button
            type="button"
            :class="[$style.dot, index === activeIndex && $style.dotActive]"
            :aria-label="`${text('yearly_report__story_jump', 'jump')} ${index + 1}`"
            @click="jump(index)"
          />
        </li>
      </ul>
      </div>
    <ul :class="$style.phaseRail">
      <li v-for="item in phaseItems" :key="item.phase">
        <button
          type="button"
          :class="[$style.phaseChip, item.phase === activePage?.phase && $style.phaseChipActive]"
          @click="jump(item.startIndex)"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>

    <ul :class="$style.chapterRail">
      <li v-for="(page, index) in pages" :key="`${page.key}-chip`">
        <button
          type="button"
          :class="[$style.chapterChip, index === activeIndex && $style.chapterChipActive]"
          @click="jump(index)"
        >
          {{ page.eyebrow }}
        </button>
      </li>
    </ul>
  </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from '@common/utils/vueTools'
import { formatDuration, formatPercent, useSafeI18n } from './utils'

interface StoryMetric {
  label: string
  value: string
}

interface StoryListItem {
  label?: string
  main: string
  sub: string
}

interface StoryChartItem {
  label: string
  value: string
  percent: string
}

interface StoryTimelineItem {
  month: number
  monthLabel: string
  main: string
  sub: string
}

type StoryPage =
  | (StoryPageBase & {
    kind: 'cover' | 'ending'
    heroValue: string
    heroLabel: string
    description: string
  })
  | (StoryPageBase & {
    kind: 'kpi'
    metrics: StoryMetric[]
  })
  | (StoryPageBase & {
    kind: 'freshness'
    items: Array<StoryMetric & { percent: string }>
  })
  | (StoryPageBase & {
    kind: 'favorites'
    items: Array<{ label: string, main: string, sub: string }>
  })
  | (StoryPageBase & {
    kind: 'season' | 'replay'
    items: StoryListItem[]
  })
  | (StoryPageBase & {
    kind: 'weekly' | 'rank'
    items: StoryChartItem[]
  })
  | (StoryPageBase & {
    kind: 'night'
    items: StoryMetric[]
  })
  | (StoryPageBase & {
    kind: 'timeline'
    items: StoryTimelineItem[]
  })

interface StoryPageBase {
  key: string
  kind: 'cover' | 'ending' | 'kpi' | 'freshness' | 'favorites' | 'season' | 'replay' | 'weekly' | 'rank' | 'night' | 'timeline'
  phase: 'warmup' | 'explore' | 'habit' | 'deep' | 'closure'
  eyebrow: string
  title: string
  subtitle: string
  gradient: string
  theme: 'light' | 'dark'
  insight: string
}

const props = defineProps<{
  overview: LX.ReportYearly.OverviewDTO
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()
const rootRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const lastFlipAt = ref(0)
const wheelAcc = ref(0)
const lastWheelAt = ref(0)
const pointerStartX = ref<number | null>(null)
const transitionDirection = ref<'next' | 'prev'>('next')
const transitionFlashSeed = ref(0)
const phasePulseSeed = ref(0)
const phaseWaveDirection = ref<'forward' | 'backward'>('forward')

const dayMs = 24 * 60 * 60 * 1000
const clampPercent = (value: number) => `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
const normalizeName = (value: string, fallback: string) => value || fallback

const weekdayLabels = [
  text('week_0', '周日'),
  text('week_1', '周一'),
  text('week_2', '周二'),
  text('week_3', '周三'),
  text('week_4', '周四'),
  text('week_5', '周五'),
  text('week_6', '周六'),
]

const seasonalLabelMap: Record<LX.ReportYearly.SeasonalFavoriteItem['season'], string> = {
  spring: text('yearly_report__season_spring', '春天'),
  summer: text('yearly_report__season_summer', '夏天'),
  autumn: text('yearly_report__season_autumn', '秋天'),
  winter: text('yearly_report__season_winter', '冬天'),
}

interface OrnamentSeed {
  top: string
  left: string
  size: number
  alpha: number
}

const ornamentSets: OrnamentSeed[][] = [
  [
    { top: '9%', left: '76%', size: 88, alpha: 0.28 },
    { top: '68%', left: '10%', size: 132, alpha: 0.18 },
    { top: '78%', left: '78%', size: 74, alpha: 0.2 },
  ],
  [
    { top: '12%', left: '82%', size: 96, alpha: 0.22 },
    { top: '62%', left: '14%', size: 148, alpha: 0.16 },
    { top: '76%', left: '66%', size: 82, alpha: 0.18 },
  ],
  [
    { top: '10%', left: '70%', size: 92, alpha: 0.26 },
    { top: '66%', left: '8%', size: 126, alpha: 0.17 },
    { top: '74%', left: '84%', size: 76, alpha: 0.2 },
  ],
]

const getPageOrnaments = (pageIndex: number) => ornamentSets[pageIndex % ornamentSets.length]

const pages = computed<StoryPage[]>(() => {
  const now = Date.now()
  const year = props.overview.year
  const firstYear = Math.min(year, ...props.cards.yearlyRank.map((item: LX.ReportYearly.YearlyRankItem) => item.year))
  const daysSinceFirstYear = Math.max(1, Math.floor((now - new Date(firstYear, 0, 1).getTime()) / dayMs))
  const yearSpan = Math.max(1, year - firstYear + 1)

  const topSong = props.cards.yearFavorites.song
  const topArtist = props.cards.yearFavorites.artist
  const topAlbum = props.cards.yearFavorites.album

  const weekdayMax = props.cards.weekdayDistribution.reduce((max: number, item: LX.ReportYearly.WeekdayDistributionItem) => Math.max(max, item.count), 0)
  const rankMax = props.cards.yearlyRank.reduce((max: number, item: LX.ReportYearly.YearlyRankItem) => Math.max(max, item.totalListenSeconds), 0)

  const favoriteHourRange = (() => {
    const hour = props.cards.nightOwlStats.latestNightHour
    if (hour == null || hour < 0 || hour > 23) return text('monthly_report__no_data', '暂无数据')
    const end = (hour + 1) % 24
    return `${hour.toString().padStart(2, '0')}:00-${end.toString().padStart(2, '0')}:00`
  })()

  const pageItems: StoryPage[] = [
    {
      key: 'cover',
      kind: 'cover',
      phase: 'warmup',
      eyebrow: text('yearly_report', '年度报告'),
      title: text('yearly_report__story_cover_title', `${year} 听歌旅程回顾`, { year }),
      subtitle: text('yearly_report__story_cover_subtitle', '像海报一样，一页页重走你的音乐一年'),
      gradient: 'linear-gradient(135deg, #ff8a6b 0%, #ffcb6b 48%, #ffe8b1 100%)',
      theme: 'light',
      insight: text('yearly_report__story_cover_insight', '每一页都来自你真实的播放记录。'),
      heroValue: `${daysSinceFirstYear.toLocaleString()}`,
      heroLabel: text('yearly_report__story_days', '天音乐陪伴'),
      description: text('yearly_report__story_cover_desc', `从 ${firstYear} 到 ${year}，已经走过 ${yearSpan} 个听歌年份`, { firstYear, year, years: yearSpan }),
    },
    {
      key: 'kpi',
      kind: 'kpi',
      phase: 'warmup',
      eyebrow: text('yearly_report__story_chapter_overview', '年度总览'),
      title: text('yearly_report__story_kpi_title', '这一年你听了多少'),
      subtitle: text('yearly_report__story_kpi_subtitle', '总时长、总播放、活跃天数'),
      gradient: 'linear-gradient(135deg, #58a6ff 0%, #80d0ff 45%, #d2ecff 100%)',
      theme: 'light',
      insight: text('yearly_report__story_kpi_insight', '这是你一年音乐能量的核心读数。'),
      metrics: [
        { label: text('monthly_report__total_time', '总时长'), value: formatDuration(props.overview.totalListenSeconds) },
        { label: text('monthly_report__session_count', '总播放'), value: props.overview.sessionCount.toLocaleString() },
        { label: text('monthly_report__active_days', '活跃天数'), value: props.overview.activeDays.toLocaleString() },
      ],
    },
    {
      key: 'freshness',
      kind: 'freshness',
      phase: 'explore',
      eyebrow: text('yearly_report__story_chapter_discovery', '探索偏好'),
      title: text('yearly_report__story_freshness_title', '你有多爱发现新音乐'),
      subtitle: text('yearly_report__story_freshness_subtitle', '新歌、新歌手占比'),
      gradient: 'linear-gradient(135deg, #67c58f 0%, #85e1ad 45%, #d4f8e1 100%)',
      theme: 'light',
      insight: text('yearly_report__story_freshness_insight', '新鲜度越高，代表你越常主动走出舒适区。'),
      items: [
        {
          label: text('yearly_report__new_song_ratio', '新歌占比'),
          value: formatPercent(props.overview.newSongRatio),
          percent: clampPercent(props.overview.newSongRatio * 100),
        },
        {
          label: text('yearly_report__new_artist_ratio', '新歌手占比'),
          value: formatPercent(props.overview.newArtistRatio),
          percent: clampPercent(props.overview.newArtistRatio * 100),
        },
      ],
    },
    {
      key: 'favorites',
      kind: 'favorites',
      phase: 'explore',
      eyebrow: text('yearly_report__story_chapter_favorites', '年度最爱'),
      title: text('yearly_report__story_favorites_title', '你最常回到这些声音'),
      subtitle: text('yearly_report__story_favorites_subtitle', '歌曲 / 歌手 / 专辑'),
      gradient: 'linear-gradient(135deg, #b58cff 0%, #d1a5ff 45%, #f0ddff 100%)',
      theme: 'light',
      insight: text('yearly_report__story_favorites_insight', '这是你最稳定、最有记忆点的听歌偏好。'),
      items: [
        {
          label: text('yearly_report__top_song', '年度歌曲'),
          main: normalizeName(topSong.songName, text('monthly_report__no_data', '暂无数据')),
          sub: `${normalizeName(topSong.artistName, text('monthly_report__no_data', '暂无数据'))} · ${topSong.count}x`,
        },
        {
          label: text('yearly_report__top_artist', '年度歌手'),
          main: normalizeName(topArtist.artistName, text('monthly_report__no_data', '暂无数据')),
          sub: `${topArtist.count} 次 · ${formatDuration(topArtist.seconds)}`,
        },
        {
          label: text('yearly_report__top_album', '年度专辑'),
          main: normalizeName(topAlbum.albumName, text('monthly_report__no_data', '暂无数据')),
          sub: `${normalizeName(topAlbum.artistName, text('monthly_report__no_data', '暂无数据'))} · ${topAlbum.count}x`,
        },
      ],
    },
    {
      key: 'season',
      kind: 'season',
      phase: 'habit',
      eyebrow: text('yearly_report__story_chapter_season', '四季偏爱'),
      title: text('yearly_report__story_season_title', '你的春夏秋冬播放列表'),
      subtitle: text('yearly_report__story_season_subtitle', '每个季节最常听的一首'),
      gradient: 'linear-gradient(135deg, #ffa26b 0%, #ffc48f 45%, #ffe5c8 100%)',
      theme: 'light',
      insight: text('yearly_report__story_season_insight', '同一首歌，在不同季节会有不同情绪。'),
      items: props.cards.seasonalFavorites.map((item: LX.ReportYearly.SeasonalFavoriteItem) => ({
        label: seasonalLabelMap[item.season] || item.season,
        main: normalizeName(item.songName, text('monthly_report__no_data', '暂无数据')),
        sub: `${normalizeName(item.artistName, text('monthly_report__no_data', '暂无数据'))} · ${item.count}x`,
      })),
    },
    {
      key: 'weekly',
      kind: 'weekly',
      phase: 'habit',
      eyebrow: text('yearly_report__story_chapter_habit', '听歌习惯'),
      title: text('yearly_report__story_weekly_title', '你最常在哪一天听歌'),
      subtitle: text('yearly_report__story_weekly_subtitle', `最活跃时段：${favoriteHourRange}`),
      gradient: 'linear-gradient(135deg, #4db7d8 0%, #75d4eb 45%, #d3f4fb 100%)',
      theme: 'light',
      insight: text('yearly_report__story_weekly_insight', '你的节奏里，工作日与周末的听歌重心并不一样。'),
      items: props.cards.weekdayDistribution.map((item: LX.ReportYearly.WeekdayDistributionItem) => ({
        label: weekdayLabels[item.weekday] ?? `${item.weekday}`,
        value: `${item.count}`,
        percent: weekdayMax > 0 ? clampPercent((item.count / weekdayMax) * 100) : '0%',
      })),
    },
    {
      key: 'night',
      kind: 'night',
      phase: 'deep',
      eyebrow: text('yearly_report__story_chapter_night', '夜猫子指数'),
      title: text('yearly_report__story_night_title', '当城市睡去，你还在听'),
      subtitle: text('yearly_report__story_night_subtitle', '00:00-05:00 听歌统计'),
      gradient: 'linear-gradient(135deg, #2f3f77 0%, #3b5798 45%, #8ba4d8 100%)',
      theme: 'dark',
      insight: text('yearly_report__story_night_insight', '深夜时段的播放，通常最能反映当下心情。'),
      items: [
        { label: text('yearly_report__night_ratio', '深夜占比'), value: formatPercent(props.cards.nightOwlStats.ratio) },
        { label: text('yearly_report__night_duration', '深夜时长'), value: formatDuration(props.cards.nightOwlStats.nightListenSeconds) },
        {
          label: text('yearly_report__night_latest_time', '最晚一次'),
          value: props.cards.nightOwlStats.latestNightStartedAt
            ? new Date(props.cards.nightOwlStats.latestNightStartedAt).toLocaleString()
            : text('monthly_report__no_data', '暂无数据'),
        },
      ],
    },
    {
      key: 'replay',
      kind: 'replay',
      phase: 'deep',
      eyebrow: text('yearly_report__story_chapter_replay', '反复心动'),
      title: text('yearly_report__story_replay_title', '这些歌你忍不住循环播放'),
      subtitle: text('yearly_report__story_replay_subtitle', '播放次数 >= 3'),
      gradient: 'linear-gradient(135deg, #7f8cf7 0%, #9da7ff 45%, #dbe0ff 100%)',
      theme: 'light',
      insight: text('yearly_report__story_replay_insight', '反复听，不只是喜欢，更像是一种情绪回访。'),
      items: props.cards.replaySongs.slice(0, 8).map((item: LX.ReportYearly.ReplaySongItem) => ({
        main: normalizeName(item.songName, text('monthly_report__no_data', '暂无数据')),
        sub: `${normalizeName(item.artistName, text('monthly_report__no_data', '暂无数据'))} · ${item.count}x`,
      })),
    },
    {
      key: 'timeline',
      kind: 'timeline',
      phase: 'closure',
      eyebrow: text('yearly_report__story_chapter_timeline', '歌手轨迹'),
      title: text('yearly_report__story_timeline_title', '每个月最常陪伴你的声音'),
      subtitle: text('yearly_report__story_timeline_subtitle', '按月主导歌手'),
      gradient: 'linear-gradient(135deg, #5aa8f0 0%, #84c6ff 45%, #d8ecff 100%)',
      theme: 'light',
      insight: text('yearly_report__story_timeline_insight', '你的歌手偏好会随月份缓慢迁移。'),
      items: props.cards.monthlyArtistTimeline.map((item: LX.ReportYearly.MonthlyArtistTimelineItem) => ({
        month: item.month,
        monthLabel: `${item.month}`,
        main: normalizeName(item.artistName, text('monthly_report__no_data', '暂无数据')),
        sub: `${item.count} 次 · ${formatDuration(item.seconds)}`,
      })),
    },
    {
      key: 'rank',
      kind: 'rank',
      phase: 'closure',
      eyebrow: text('yearly_report__story_chapter_rank', '历年排行'),
      title: text('yearly_report__story_rank_title', '这一年在你的历年里排第几'),
      subtitle: text('yearly_report__story_rank_subtitle', '按年度总听歌时长比较'),
      gradient: 'linear-gradient(135deg, #6f86ef 0%, #9aa9ff 45%, #dce2ff 100%)',
      theme: 'light',
      insight: text('yearly_report__story_rank_insight', '这一页可以看到今年在历年中的位置变化。'),
      items: props.cards.yearlyRank.slice(0, 8).map((item: LX.ReportYearly.YearlyRankItem) => ({
        label: `${item.year}`,
        value: `#${item.rank} · ${formatDuration(item.totalListenSeconds)}`,
        percent: rankMax > 0 ? clampPercent((item.totalListenSeconds / rankMax) * 100) : '0%',
      })),
    },
    {
      key: 'ending',
      kind: 'ending',
      phase: 'closure',
      eyebrow: text('yearly_report__story_chapter_ending', '年度总结'),
      title: text('yearly_report__story_ending_title', `${year} 听歌年终回顾`, { year }),
      subtitle: text('yearly_report__story_ending_subtitle', '下一页，继续发现新的旋律'),
      gradient: 'linear-gradient(135deg, #ff7b7b 0%, #ffab8c 45%, #ffe0cb 100%)',
      theme: 'light',
      insight: text('yearly_report__story_ending_insight', '你的音乐轨迹还在继续，下一年会更有故事。'),
      heroValue: formatDuration(props.overview.totalListenSeconds),
      heroLabel: text('yearly_report__story_total_duration', '年度总时长'),
      description: text('yearly_report__story_ending_desc', `活跃 ${props.overview.activeDays} 天，播放 ${props.overview.sessionCount} 次`, {
        days: props.overview.activeDays,
        count: props.overview.sessionCount,
      }),
    },
  ]

  return pageItems.filter(page => {
    if (page.kind === 'replay') return page.items.length > 0
    if (page.kind === 'timeline') return page.items.length > 0
    if (page.kind === 'season') return page.items.length > 0
    if (page.kind === 'rank') return page.items.length > 0
    return true
  })
})

const trackStyle = computed(() => ({
  transform: `translateX(calc(${activeIndex.value} * -100%))`,
}))

const activePage = computed(() => pages.value[activeIndex.value] ?? null)
const phaseMetaMap = computed<Record<StoryPageBase['phase'], { label: string, start: string, end: string }>>(() => ({
  warmup: {
    label: text('yearly_report__story_phase_warmup', '开场'),
    start: '#fb923c',
    end: '#f59e0b',
  },
  explore: {
    label: text('yearly_report__story_phase_explore', '探索'),
    start: '#34d399',
    end: '#10b981',
  },
  habit: {
    label: text('yearly_report__story_phase_habit', '习惯'),
    start: '#38bdf8',
    end: '#3b82f6',
  },
  deep: {
    label: text('yearly_report__story_phase_deep', '深夜'),
    start: '#818cf8',
    end: '#6366f1',
  },
  closure: {
    label: text('yearly_report__story_phase_closure', '收束'),
    start: '#fb7185',
    end: '#f97316',
  },
}))
const activePhaseLabel = computed(() => {
  const phase = activePage.value?.phase ?? 'warmup'
  return phaseMetaMap.value[phase].label
})
const rootToneStyle = computed(() => {
  const phase = activePage.value?.phase ?? 'warmup'
  const meta = phaseMetaMap.value[phase]
  return {
    '--story-accent-start': meta.start,
    '--story-accent-end': meta.end,
  }
})
const chapterProgressPercent = computed(() => {
  if (pages.value.length <= 1) return '100%'
  return `${((activeIndex.value / (pages.value.length - 1)) * 100).toFixed(1)}%`
})
const phaseItems = computed(() => {
  const seen = new Set<StoryPageBase['phase']>()
  return pages.value.reduce<Array<{ phase: StoryPageBase['phase'], label: string, startIndex: number }>>((list, page, index) => {
    if (seen.has(page.phase)) return list
    seen.add(page.phase)
    list.push({
      phase: page.phase,
      label: phaseMetaMap.value[page.phase].label,
      startIndex: index,
    })
    return list
  }, [])
})

const phaseOrderMap: Record<StoryPageBase['phase'], number> = {
  warmup: 0,
  explore: 1,
  habit: 2,
  deep: 3,
  closure: 4,
}

const triggerTransition = (direction: 'next' | 'prev') => {
  transitionDirection.value = direction
  transitionFlashSeed.value += 1
}

const jump = (index: number) => {
  if (!pages.value.length) return
  const nextIndex = Math.max(0, Math.min(pages.value.length - 1, index))
  if (nextIndex === activeIndex.value) return
  triggerTransition(nextIndex > activeIndex.value ? 'next' : 'prev')
  activeIndex.value = nextIndex
}

const step = (delta: number) => {
  jump(activeIndex.value + delta)
}

const canFlip = () => {
  const now = Date.now()
  if (now - lastFlipAt.value < 340) return false
  lastFlipAt.value = now
  return true
}

const resolveScrollRegion = (event: WheelEvent): HTMLElement | null => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return null
  const region = target.closest('[data-scroll-region="true"]')
  return region instanceof HTMLElement ? region : null
}

const canRegionScrollByDelta = (region: HTMLElement, deltaY: number): boolean => {
  if (Math.abs(deltaY) < 1) return false
  const maxScrollTop = region.scrollHeight - region.clientHeight
  if (maxScrollTop <= 1) return false
  if (deltaY > 0) return region.scrollTop < maxScrollTop - 1
  return region.scrollTop > 1
}

const handleWheel = (event: Event) => {
  const wheelEvent = event as WheelEvent
  const scrollRegion = resolveScrollRegion(wheelEvent)
  if (scrollRegion && canRegionScrollByDelta(scrollRegion, wheelEvent.deltaY)) {
    wheelAcc.value = 0
    return
  }

  wheelEvent.preventDefault()
  const now = Date.now()
  if (now - lastWheelAt.value > 180) wheelAcc.value = 0
  lastWheelAt.value = now
  wheelAcc.value += wheelEvent.deltaY
  if (Math.abs(wheelAcc.value) < 82) return
  if (!canFlip()) return
  step(wheelAcc.value > 0 ? 1 : -1)
  wheelAcc.value = 0
}

const handlePointerDown = (event: PointerEvent) => {
  pointerStartX.value = event.clientX
}

const handlePointerUp = (event: PointerEvent) => {
  if (pointerStartX.value == null) return
  const diff = event.clientX - pointerStartX.value
  pointerStartX.value = null
  if (Math.abs(diff) < 52) return
  step(diff < 0 ? 1 : -1)
}

const handlePointerCancel = () => {
  pointerStartX.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault()
    step(1)
  }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    step(-1)
  }
  if (event.key === 'Home') {
    event.preventDefault()
    jump(0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    jump(pages.value.length - 1)
  }
}

onMounted(() => {
  rootRef.value?.focus()
  window.addEventListener('keydown', handleKeydown)
})

watch(pages, (nextPages) => {
  if (!nextPages.length) {
    activeIndex.value = 0
    return
  }
  if (activeIndex.value > nextPages.length - 1) {
    activeIndex.value = nextPages.length - 1
  }
})

watch(() => activePage.value?.phase, (nextPhase, prevPhase) => {
  if (!nextPhase || !prevPhase || nextPhase === prevPhase) return
  phaseWaveDirection.value = phaseOrderMap[nextPhase] >= phaseOrderMap[prevPhase] ? 'forward' : 'backward'
  phasePulseSeed.value += 1
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="less" module>
.storyRoot {
  --story-accent-start: #fb923c;
  --story-accent-end: #f59e0b;
  position: relative;
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  outline: none;
  touch-action: pan-y;
}

.viewport {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 62%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 22px 48px rgba(0, 0, 0, .16);
}

.storyTopBar {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 12px;
  z-index: 4;
  display: grid;
  gap: 8px;
  pointer-events: none;
}

.storyTopHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  animation: phaseHeadPop .44s ease;
}

.storyTopTitle {
  margin: 0;
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .88);
  text-shadow: 0 1px 6px rgba(0, 0, 0, .24);
}

.storyTopPhase {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, .94);
  text-shadow: 0 1px 6px rgba(0, 0, 0, .24);
}

.storyProgressTrack {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .32);
  overflow: hidden;
}

.storyProgressFill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--story-accent-start) 0%, var(--story-accent-end) 100%);
  transition: width .34s cubic-bezier(.22, .61, .36, 1);
}

.phaseWave {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
}

.phaseWaveForward {
  background: linear-gradient(100deg, transparent 0%, color-mix(in srgb, var(--story-accent-start) 24%, transparent) 36%, color-mix(in srgb, var(--story-accent-end) 42%, transparent) 52%, transparent 70%);
  animation: phaseWaveForward .58s ease;
}

.phaseWaveBackward {
  background: linear-gradient(260deg, transparent 0%, color-mix(in srgb, var(--story-accent-start) 24%, transparent) 36%, color-mix(in srgb, var(--story-accent-end) 42%, transparent) 52%, transparent 70%);
  animation: phaseWaveBackward .58s ease;
}

.transitionFlash {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  animation: pageFlash .42s ease;
}

.transitionFlashNext {
  background: linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, .1) 36%, rgba(255, 255, 255, .28) 50%, transparent 64%);
}

.transitionFlashPrev {
  background: linear-gradient(260deg, transparent 0%, rgba(255, 255, 255, .1) 36%, rgba(255, 255, 255, .28) 50%, transparent 64%);
}

.track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform .46s cubic-bezier(.22, .61, .36, 1);
}

.page {
  --page-gradient: linear-gradient(135deg, #6893ff 0%, #8db2ff 45%, #dce7ff 100%);
  --page-ink: #091629;
  --page-ink-soft: rgba(9, 22, 41, .76);
  --panel-bg: rgba(255, 255, 255, .58);
  --panel-stroke: rgba(9, 22, 41, .08);
  position: relative;
  flex: none;
  width: 100%;
  min-height: 0;
  padding: 28px 28px 22px;
  box-sizing: border-box;
  color: var(--page-ink);
  background: var(--page-gradient);
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}

.pageActive {
  .pageHead,
  .coverPanel,
  .metricGrid,
  .freshnessPanel,
  .listPanel,
  .chartPanel,
  .timelinePanel {
    opacity: 1;
    transform: translateY(0);
  }
}

.pageBackdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 12%, rgba(255, 255, 255, .45), transparent 36%),
    radial-gradient(circle at 92% 84%, rgba(255, 255, 255, .28), transparent 42%);
  pointer-events: none;
}

.pageOrnaments {
  list-style: none;
  margin: 0;
  padding: 0;
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pageOrnament {
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, .76), rgba(255, 255, 255, .18) 68%, rgba(255, 255, 255, .04) 100%);
  filter: blur(1px);
  animation: floatY 5.8s ease-in-out infinite;
}

.pageMeta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pageChapter,
.pageCounter {
  margin: 0;
  font-size: 11px;
  letter-spacing: .06em;
  opacity: .66;
}

.pageHead {
  position: relative;
  z-index: 1;
  transition: transform .4s ease, opacity .4s ease;
}

.pageMain {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--page-ink-soft);
}

.title {
  margin: 8px 0 0;
  font-size: clamp(24px, 3.3vw, 42px);
  line-height: 1.16;
  font-weight: 820;
}

.subtitle {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--page-ink-soft);
}

.insight {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.46;
  color: var(--page-ink-soft);
}

.coverPanel {
  position: relative;
  z-index: 1;
  margin-top: 0;
  border-radius: 20px;
  padding: 20px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
  backdrop-filter: blur(8px);
  transition: transform .46s ease, opacity .46s ease;
}

.coverValue {
  margin: 0;
  font-size: clamp(38px, 7vw, 84px);
  line-height: 1;
  font-weight: 900;
}

.coverLabel {
  margin: 10px 0 0;
  font-size: clamp(15px, 2vw, 22px);
  font-weight: 700;
}

.coverDesc {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--page-ink-soft);
}

.metricGrid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 0;
  transition: transform .46s ease, opacity .46s ease;
}

.metricCard {
  border-radius: 16px;
  padding: 14px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
  backdrop-filter: blur(6px);
}

.metricLabel {
  margin: 0;
  font-size: 12px;
  color: var(--page-ink-soft);
}

.metricValue {
  margin: 8px 0 0;
  font-size: clamp(17px, 2vw, 28px);
  font-weight: 800;
  line-height: 1.2;
}

.freshnessPanel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  margin-top: 0;
  transition: transform .46s ease, opacity .46s ease;
}

.freshnessRow {
  border-radius: 16px;
  padding: 14px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
  backdrop-filter: blur(6px);
}

.freshnessHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progressTrack {
  margin-top: 12px;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-ink) 18%, transparent);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--page-ink) 56%, transparent) 0%, color-mix(in srgb, var(--page-ink) 88%, transparent) 100%);
  transition: width .5s ease;
}

.listPanel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-top: 0;
  transition: transform .46s ease, opacity .46s ease;
}

.listCard {
  border-radius: 16px;
  padding: 14px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
  backdrop-filter: blur(6px);
}

.listRow {
  border-radius: 14px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
  backdrop-filter: blur(6px);
}

.listTag {
  margin: 0;
  min-width: 46px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--page-ink) 12%, transparent);
}

.listBody {
  min-width: 0;
}

.listMain {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listSub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--page-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chartPanel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-top: 0;
  transition: transform .46s ease, opacity .46s ease;
}

.chartRow {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 10px;
  align-items: center;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
}

.chartLabel {
  margin: 0;
  font-size: 12px;
  color: var(--page-ink-soft);
}

.chartTrack {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-ink) 18%, transparent);
  overflow: hidden;
}

.chartBar {
  height: 100%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-ink) 82%, transparent);
  transition: width .5s ease;
}

.chartValue {
  margin: 0;
  font-size: 12px;
  color: var(--page-ink-soft);
}

.timelinePanel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin-top: 0;
  transition: transform .46s ease, opacity .46s ease;
}

.page:not(.pageActive) {
  .pageHead,
  .coverPanel,
  .metricGrid,
  .freshnessPanel,
  .listPanel,
  .chartPanel,
  .timelinePanel {
    opacity: .34;
    transform: translateY(12px);
  }
}

.timelineRow {
  display: grid;
  grid-template-columns: 50px 24px 1fr;
  gap: 10px;
  align-items: center;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-stroke);
}

.timelineMonth {
  margin: 0;
  font-size: 12px;
  color: var(--page-ink-soft);
}

.timelineLine {
  position: relative;
  width: 2px;
  height: 22px;
  justify-self: center;
  background: color-mix(in srgb, var(--page-ink) 24%, transparent);
}

.timelineDot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--page-ink) 82%, transparent);
  transform: translate(-50%, -50%);
}

.page[data-kind='night'] {
  .pageBackdrop {
    background:
      radial-gradient(circle at 18% 14%, rgba(178, 210, 255, .24), transparent 42%),
      radial-gradient(circle at 90% 84%, rgba(120, 156, 230, .24), transparent 46%);
  }

  .chartBar,
  .progressFill {
    background: linear-gradient(90deg, rgba(209, 228, 255, .66) 0%, rgba(244, 248, 255, .96) 100%);
  }
}

.page[data-kind='rank'] {
  .chartRow:first-child {
    border-color: color-mix(in srgb, #f59e0b 58%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #f59e0b 22%, transparent);
  }

  .chartRow:first-child .chartBar {
    background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
  }
}

.page[data-kind='season'] {
  .listTag {
    letter-spacing: .02em;
    background: color-mix(in srgb, #fb923c 26%, transparent);
  }
}

.storyDock {
  flex: none;
  display: grid;
  gap: 6px;
  padding: 0 2px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.navBtn {
  min-width: 88px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 90%, rgba(255, 255, 255, .08));
  color: var(--color-font);
  cursor: pointer;
  transition: background-color .2s ease, opacity .2s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary-background-hover) 78%, rgba(255, 255, 255, .1));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: .44;
  }
}

.pageIndex {
  margin: 0;
  min-width: 92px;
  text-align: center;
  font-size: 12px;
  opacity: .72;
}

.dots {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.dot {
  width: 8px;
  height: 8px;
  border: none;
  padding: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-list-header-border-bottom) 72%, transparent);
  cursor: pointer;
  transition: transform .2s ease, background-color .2s ease;

  &:hover {
    transform: scale(1.1);
  }
}

.dotActive {
  width: 18px;
  background: color-mix(in srgb, var(--color-primary) 80%, #fff);
}

.phaseRail {
  list-style: none;
  margin: -2px 0 0;
  padding: 0 2px 2px;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.phaseChip {
  height: 24px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(255, 255, 255, .08));
  color: var(--color-font);
  padding: 0 10px;
  font-size: 11px;
  cursor: pointer;
  transition: border-color .2s ease, background-color .2s ease;
}

.phaseChipActive {
  border-color: color-mix(in srgb, var(--story-accent-end) 62%, transparent);
  background: color-mix(in srgb, var(--story-accent-start) 24%, transparent);
}

.chapterRail {
  list-style: none;
  margin: -2px 0 0;
  padding: 0 2px 2px;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.chapterChip {
  height: 26px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(255, 255, 255, .08));
  color: var(--color-font);
  padding: 0 10px;
  font-size: 11px;
  cursor: pointer;
  transition: border-color .2s ease, background-color .2s ease, transform .2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  }
}

.chapterChipActive {
  border-color: color-mix(in srgb, var(--color-primary) 62%, transparent);
  background: color-mix(in srgb, var(--color-primary-background-hover) 76%, rgba(255, 255, 255, .1));
}

@keyframes floatY {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes pageFlash {
  0% {
    opacity: 0;
    transform: translateX(18%);
  }
  38% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-18%);
  }
}

@keyframes phaseHeadPop {
  0% {
    opacity: .6;
    transform: translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes phaseWaveForward {
  0% {
    opacity: 0;
    transform: translateX(18%);
  }
  36% {
    opacity: .9;
  }
  100% {
    opacity: 0;
    transform: translateX(-18%);
  }
}

@keyframes phaseWaveBackward {
  0% {
    opacity: 0;
    transform: translateX(-18%);
  }
  36% {
    opacity: .9;
  }
  100% {
    opacity: 0;
    transform: translateX(18%);
  }
}

@media (max-width: 1024px) {
  .page {
    padding: 22px 18px 18px;
  }

  .metricGrid {
    grid-template-columns: 1fr;
  }

  .chartRow {
    grid-template-columns: 52px 1fr;
  }

  .chartValue {
    grid-column: 2;
  }

  .chapterRail {
    display: none;
  }
}

@media (max-height: 860px) {
  .storyRoot {
    gap: 8px;
  }
}

@media (max-height: 900px) {
  .page {
    padding: 22px 20px 16px;
    gap: 14px;
  }

  .storyTopBar {
    top: 10px;
  }

  .title {
    font-size: clamp(22px, 3vw, 34px);
  }

  .storyDock {
    gap: 4px;
  }
}

@media (max-height: 760px) {
  .storyRoot {
    gap: 6px;
  }

  .storyTopBar {
    display: none;
  }

  .page {
    padding: 16px 14px 12px;
    gap: 10px;
  }

  .pageMeta {
    display: none;
  }

  .subtitle,
  .insight {
    margin-top: 6px;
    font-size: 12px;
  }

  .chapterRail {
    display: none;
  }

  .phaseRail {
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .track,
  .progressFill,
  .chartBar,
  .dot,
  .navBtn,
  .phaseChip,
  .chapterChip,
  .pageHead,
  .coverPanel,
  .metricGrid,
  .freshnessPanel,
  .listPanel,
  .chartPanel,
  .timelinePanel {
    transition: none;
  }

  .storyProgressFill {
    transition: none;
  }

  .storyTopHead,
  .phaseWave {
    animation: none;
  }

  .transitionFlash {
    animation: none;
  }

  .pageOrnament {
    animation: none;
  }

  .page:not(.pageActive) {
    .pageHead,
    .coverPanel,
    .metricGrid,
    .freshnessPanel,
    .listPanel,
    .chartPanel,
    .timelinePanel {
      opacity: 1;
      transform: none;
    }
  }
}
</style>


