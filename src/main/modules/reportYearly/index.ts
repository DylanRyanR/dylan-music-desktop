import {
  aggregateYearlyOverview,
  aggregateYearFavorites,
  aggregateSeasonalFavorites,
  aggregateWeeklyHabits,
  aggregateNightOwlStats,
  aggregateReplaySongs,
  aggregateYearRank,
} from './aggregate'
import { exportYearlyPng as exportPngToFile } from '@main/modules/reportMonthly/export'

const CACHE_TTL = 15_000
const YEAR_RANK_MAX_YEARS = 10
const IS_DEV = process.env.NODE_ENV !== 'production'
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

type Season = LX.ReportYearly.SeasonalFavoriteItem['season']

interface ArtistCounter {
  artistName: string
  count: number
  seconds: number
}

interface YearReportData {
  year: number
  overview: LX.ReportYearly.OverviewDTO
  cards: LX.ReportYearly.CardsDTO
  eventCount: number
  updatedAt: number
}

interface MemoryCacheEntry {
  at: number
  data: YearReportData
}

interface YearRankSummary {
  year: number
  totalListenSeconds: number
  sessionCount: number
  activeDays: number
}

const memoryCache = new Map<number, MemoryCacheEntry>()

const logDebug = (...args: Array<string | number | boolean>) => {
  if (!IS_DEV) return
  console.info('[report_yearly]', ...args)
}

const now = () => Date.now()
const getCurrentYear = () => new Date().getFullYear()

const toSafeInt = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const toSafeRatio = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  if (num < 0) return 0
  if (num > 1) return 1
  return num
}

const toSafeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback
}
const toSafeListenSeconds = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value != null
}

const isSeason = (value: unknown): value is Season => {
  return value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter'
}

const normalizeYear = (rawYear: number) => {
  const currentYear = getCurrentYear()
  if (!Number.isInteger(rawYear)) return currentYear
  if (rawYear < 1970 || rawYear > currentYear) return currentYear
  return rawYear
}

const normalizeYearList = (rawYears: number[], ensureYear?: number, includeCurrent = false) => {
  const currentYear = getCurrentYear()
  const yearSet = new Set<number>()

  for (const year of rawYears) {
    if (!Number.isInteger(year)) continue
    if (year < 1970 || year > currentYear) continue
    yearSet.add(year)
  }

  if (Number.isInteger(ensureYear)) yearSet.add(ensureYear!)
  if (includeCurrent) yearSet.add(currentYear)

  return Array.from(yearSet).sort((a, b) => b - a)
}

const getYearRange = (year: number) => {
  const startAt = new Date(year, 0, 1, 0, 0, 0, 0).getTime()
  const endAt = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime()
  return { startAt, endAt }
}

const createDefaultYearRank = (year: number): LX.ReportYearly.YearlyRankItem[] => {
  return [
    {
      year,
      totalListenSeconds: 0,
      sessionCount: 0,
      activeDays: 0,
      rank: 1,
    },
  ]
}

const sortYearRankSummary = (a: YearRankSummary, b: YearRankSummary) => {
  if (b.totalListenSeconds !== a.totalListenSeconds) return b.totalListenSeconds - a.totalListenSeconds
  if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount
  if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays
  return b.year - a.year
}

const buildYearRankFromSummaries = (
  targetYear: number,
  summaries: YearRankSummary[],
): LX.ReportYearly.YearlyRankItem[] => {
  const summaryMap = new Map<number, YearRankSummary>()
  for (const summary of summaries) {
    if (!Number.isInteger(summary.year)) continue
    summaryMap.set(summary.year, summary)
  }
  if (!summaryMap.has(targetYear)) {
    summaryMap.set(targetYear, {
      year: targetYear,
      totalListenSeconds: 0,
      sessionCount: 0,
      activeDays: 0,
    })
  }

  const ranked = Array.from(summaryMap.values()).sort(sortYearRankSummary)
  return ranked.map((item, index) => ({
    ...item,
    rank: index + 1,
  }))
}

const createEnrichmentPlaceholder = (): LX.ReportYearly.EnrichmentPlaceholder => {
  return {
    status: 'placeholder',
    fields: ['genre', 'language', 'bpm', 'keywords', 'coverColor'],
  }
}

const createEmptyYearFavorites = (): LX.ReportYearly.YearFavorites => {
  return {
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
  }
}

const createEmptyNightOwlStats = (): LX.ReportYearly.NightOwlStats => {
  return {
    nightSessionCount: 0,
    nightListenSeconds: 0,
    totalSessionCount: 0,
    ratio: 0,
    latestNightStartedAt: null,
    latestNightHour: null,
  }
}

const addArtistCounter = (target: Map<string, ArtistCounter>, event: LX.DBService.PlayEvent) => {
  const artistName = event.artistName || 'Unknown Artist'
  const listenSeconds = toSafeListenSeconds(event.listenSeconds)
  const exists = target.get(artistName)
  if (exists) {
    exists.count += 1
    exists.seconds += listenSeconds
    return
  }
  target.set(artistName, {
    artistName,
    count: 1,
    seconds: listenSeconds,
  })
}

const sortArtistCounter = (a: ArtistCounter, b: ArtistCounter) => {
  if (b.seconds !== a.seconds) return b.seconds - a.seconds
  return b.count - a.count
}

const aggregateMonthlyArtistTimeline = (
  events: LX.DBService.PlayEvent[],
): LX.ReportYearly.MonthlyArtistTimelineItem[] => {
  const monthArtistCounter = new Map<number, Map<string, ArtistCounter>>()
  for (let month = 1; month <= 12; month += 1) {
    monthArtistCounter.set(month, new Map())
  }

  for (const event of events) {
    const month = new Date(event.startedAt).getMonth() + 1
    const target = monthArtistCounter.get(month)
    if (!target) continue
    addArtistCounter(target, event)
  }

  const result: LX.ReportYearly.MonthlyArtistTimelineItem[] = []
  for (let month = 1; month <= 12; month += 1) {
    const counters = Array.from(monthArtistCounter.get(month)?.values() ?? []).sort(sortArtistCounter)
    const top = counters[0]
    result.push({
      month,
      artistName: top?.artistName ?? '',
      count: top?.count ?? 0,
      seconds: top?.seconds ?? 0,
    })
  }
  return result
}

const createEmptyOverview = (year: number): LX.ReportYearly.OverviewDTO => {
  return {
    year,
    totalListenSeconds: 0,
    sessionCount: 0,
    activeDays: 0,
    newSongRatio: 0,
    newArtistRatio: 0,
  }
}

const createEmptyCards = (year: number): LX.ReportYearly.CardsDTO => {
  return {
    yearFavorites: createEmptyYearFavorites(),
    seasonalFavorites: aggregateSeasonalFavorites([]),
    weekdayDistribution: aggregateWeeklyHabits([]),
    nightOwlStats: createEmptyNightOwlStats(),
    monthlyArtistTimeline: aggregateMonthlyArtistTimeline([]),
    replaySongs: [],
    yearlyRank: createDefaultYearRank(year),
    enrichmentPlaceholder: createEnrichmentPlaceholder(),
  }
}

const parseJson = (json: string): unknown => {
  try {
    return JSON.parse(json) as unknown
  } catch {
    return null
  }
}

const normalizeOverview = (raw: unknown, year: number): LX.ReportYearly.OverviewDTO => {
  if (!isRecord(raw)) return createEmptyOverview(year)

  return {
    year: normalizeYear('year' in raw ? Number(raw.year) : year),
    totalListenSeconds: toSafeInt('totalListenSeconds' in raw ? raw.totalListenSeconds : 0),
    sessionCount: toSafeInt('sessionCount' in raw ? raw.sessionCount : 0),
    activeDays: toSafeInt('activeDays' in raw ? raw.activeDays : 0),
    newSongRatio: toSafeRatio('newSongRatio' in raw ? raw.newSongRatio : 0),
    newArtistRatio: toSafeRatio('newArtistRatio' in raw ? raw.newArtistRatio : 0),
  }
}

const normalizeSeasonalFavorites = (raw: unknown): LX.ReportYearly.SeasonalFavoriteItem[] => {
  if (!Array.isArray(raw)) return aggregateSeasonalFavorites([])

  const seasonMap = new Map<Season, LX.ReportYearly.SeasonalFavoriteItem>()
  for (const item of raw) {
    const row = isRecord(item) ? item : {}
    const rawSeason = 'season' in row ? row.season : null
    if (!isSeason(rawSeason)) continue
    if (seasonMap.has(rawSeason)) continue
    seasonMap.set(rawSeason, {
      season: rawSeason,
      songId: toSafeString('songId' in row ? row.songId : ''),
      songName: toSafeString('songName' in row ? row.songName : ''),
      artistName: toSafeString('artistName' in row ? row.artistName : ''),
      count: toSafeInt('count' in row ? row.count : 0),
      seconds: toSafeInt('seconds' in row ? row.seconds : 0),
    })
  }

  return SEASONS.map(season => seasonMap.get(season) ?? {
    season,
    songId: '',
    songName: '',
    artistName: '',
    count: 0,
    seconds: 0,
  })
}

const normalizeWeekdayDistribution = (raw: unknown): LX.ReportYearly.WeekdayDistributionItem[] => {
  if (!Array.isArray(raw)) return aggregateWeeklyHabits([])

  const result: LX.ReportYearly.WeekdayDistributionItem[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: 0,
    seconds: 0,
  }))

  for (const item of raw) {
    const row = isRecord(item) ? item : {}
    const weekday = Number('weekday' in row ? row.weekday : -1)
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue
    result[weekday] = {
      weekday,
      count: toSafeInt('count' in row ? row.count : 0),
      seconds: toSafeInt('seconds' in row ? row.seconds : 0),
    }
  }

  return result
}

const normalizeMonthlyArtistTimeline = (raw: unknown): LX.ReportYearly.MonthlyArtistTimelineItem[] => {
  const result: LX.ReportYearly.MonthlyArtistTimelineItem[] = Array.from({ length: 12 }, (_, monthIndex) => ({
    month: monthIndex + 1,
    artistName: '',
    count: 0,
    seconds: 0,
  }))

  if (!Array.isArray(raw)) return result
  for (const item of raw) {
    const row = isRecord(item) ? item : {}
    const month = Number('month' in row ? row.month : 0)
    if (!Number.isInteger(month) || month < 1 || month > 12) continue
    result[month - 1] = {
      month,
      artistName: toSafeString('artistName' in row ? row.artistName : ''),
      count: toSafeInt('count' in row ? row.count : 0),
      seconds: toSafeInt('seconds' in row ? row.seconds : 0),
    }
  }
  return result
}

const normalizeReplaySongs = (raw: unknown): LX.ReportYearly.ReplaySongItem[] => {
  if (!Array.isArray(raw)) return []

  return raw.map(item => {
    const row = isRecord(item) ? item : {}
    return {
      songId: toSafeString('songId' in row ? row.songId : ''),
      songName: toSafeString('songName' in row ? row.songName : ''),
      artistName: toSafeString('artistName' in row ? row.artistName : ''),
      count: toSafeInt('count' in row ? row.count : 0),
      seconds: toSafeInt('seconds' in row ? row.seconds : 0),
    }
  })
}

const normalizeYearFavorites = (raw: unknown): LX.ReportYearly.YearFavorites => {
  if (!isRecord(raw)) return createEmptyYearFavorites()
  const songRaw = isRecord(raw.song) ? raw.song : {}
  const artistRaw = isRecord(raw.artist) ? raw.artist : {}
  const albumRaw = isRecord(raw.album) ? raw.album : {}
  return {
    song: {
      songId: toSafeString('songId' in songRaw ? songRaw.songId : ''),
      songName: toSafeString('songName' in songRaw ? songRaw.songName : ''),
      artistName: toSafeString('artistName' in songRaw ? songRaw.artistName : ''),
      count: toSafeInt('count' in songRaw ? songRaw.count : 0),
      seconds: toSafeInt('seconds' in songRaw ? songRaw.seconds : 0),
    },
    artist: {
      artistName: toSafeString('artistName' in artistRaw ? artistRaw.artistName : ''),
      count: toSafeInt('count' in artistRaw ? artistRaw.count : 0),
      seconds: toSafeInt('seconds' in artistRaw ? artistRaw.seconds : 0),
    },
    album: {
      albumName: toSafeString('albumName' in albumRaw ? albumRaw.albumName : ''),
      artistName: toSafeString('artistName' in albumRaw ? albumRaw.artistName : ''),
      count: toSafeInt('count' in albumRaw ? albumRaw.count : 0),
      seconds: toSafeInt('seconds' in albumRaw ? albumRaw.seconds : 0),
    },
  }
}

const normalizeNightOwlStats = (raw: unknown): LX.ReportYearly.NightOwlStats => {
  if (!isRecord(raw)) return createEmptyNightOwlStats()
  const latestNightHour = Number('latestNightHour' in raw ? raw.latestNightHour : NaN)
  return {
    nightSessionCount: toSafeInt('nightSessionCount' in raw ? raw.nightSessionCount : 0),
    nightListenSeconds: toSafeInt('nightListenSeconds' in raw ? raw.nightListenSeconds : 0),
    totalSessionCount: toSafeInt('totalSessionCount' in raw ? raw.totalSessionCount : 0),
    ratio: toSafeRatio('ratio' in raw ? raw.ratio : 0),
    latestNightStartedAt: Number.isInteger('latestNightStartedAt' in raw ? raw.latestNightStartedAt : NaN)
      ? toSafeInt('latestNightStartedAt' in raw ? raw.latestNightStartedAt : 0)
      : null,
    latestNightHour: Number.isInteger(latestNightHour) && latestNightHour >= 0 && latestNightHour <= 23
      ? latestNightHour
      : null,
  }
}

const normalizeYearRank = (raw: unknown, targetYear: number): LX.ReportYearly.YearlyRankItem[] => {
  if (!Array.isArray(raw) || !raw.length) return createDefaultYearRank(targetYear)

  const result: LX.ReportYearly.YearlyRankItem[] = raw.map(item => {
    const row = isRecord(item) ? item : {}
    return {
      year: Number.isInteger('year' in row ? row.year : NaN) ? Number(row.year) : targetYear,
      totalListenSeconds: toSafeInt('totalListenSeconds' in row ? row.totalListenSeconds : 0),
      sessionCount: toSafeInt('sessionCount' in row ? row.sessionCount : 0),
      activeDays: toSafeInt('activeDays' in row ? row.activeDays : 0),
      rank: toSafeInt('rank' in row ? row.rank : 0),
    }
  })

  result.sort((a, b) => {
    if (b.totalListenSeconds !== a.totalListenSeconds) return b.totalListenSeconds - a.totalListenSeconds
    if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount
    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays
    return b.year - a.year
  })

  result.forEach((item, index) => {
    item.rank = index + 1
  })

  return result
}

const normalizeEnrichmentPlaceholder = (raw: unknown): LX.ReportYearly.EnrichmentPlaceholder => {
  if (!isRecord(raw)) return createEnrichmentPlaceholder()
  const fields = Array.isArray(raw.fields) ? raw.fields.filter((item): item is string => typeof item === 'string') : []
  return {
    status: 'placeholder',
    fields: fields.length ? fields : createEnrichmentPlaceholder().fields,
  }
}

const normalizeCards = (raw: unknown, year: number): LX.ReportYearly.CardsDTO => {
  if (!isRecord(raw)) return createEmptyCards(year)
  return {
    yearFavorites: normalizeYearFavorites('yearFavorites' in raw ? raw.yearFavorites : null),
    seasonalFavorites: normalizeSeasonalFavorites('seasonalFavorites' in raw ? raw.seasonalFavorites : []),
    weekdayDistribution: normalizeWeekdayDistribution('weekdayDistribution' in raw ? raw.weekdayDistribution : []),
    nightOwlStats: normalizeNightOwlStats('nightOwlStats' in raw ? raw.nightOwlStats : null),
    monthlyArtistTimeline: normalizeMonthlyArtistTimeline('monthlyArtistTimeline' in raw ? raw.monthlyArtistTimeline : []),
    replaySongs: normalizeReplaySongs('replaySongs' in raw ? raw.replaySongs : []),
    yearlyRank: normalizeYearRank('yearlyRank' in raw ? raw.yearlyRank : [], year),
    enrichmentPlaceholder: normalizeEnrichmentPlaceholder('enrichmentPlaceholder' in raw ? raw.enrichmentPlaceholder : null),
  }
}

const toYearKey = (year: number) => `${year}`

const getMemoryCache = (year: number): YearReportData | null => {
  const cache = memoryCache.get(year)
  if (!cache) return null
  if (now() - cache.at >= CACHE_TTL) {
    memoryCache.delete(year)
    return null
  }
  return cache.data
}

const setMemoryCache = (report: YearReportData) => {
  memoryCache.set(report.year, {
    at: now(),
    data: report,
  })
}

const buildYearReport = async(year: number): Promise<YearReportData> => {
  const t0 = now()
  const { startAt, endAt } = getYearRange(year)
  const [yearEvents, historyEvents, rawYears] = await Promise.all([
    global.lx.worker.dbService.getPlayEventsByRange(startAt, endAt),
    global.lx.worker.dbService.getPlayEventsBefore(startAt),
    global.lx.worker.dbService.getPlayEventYears(),
  ])

  const overview = aggregateYearlyOverview(year, yearEvents, historyEvents)
  const currentYearRank = aggregateYearRank(year, new Map<number, LX.DBService.PlayEvent[]>([[year, yearEvents]]))[0] ?? {
    year,
    totalListenSeconds: 0,
    sessionCount: 0,
    activeDays: 0,
    rank: 1,
  }
  const normalizedRankYears = normalizeYearList(rawYears, year)
  const rankYears = normalizedRankYears.filter(item => item !== year).slice(0, YEAR_RANK_MAX_YEARS - 1)
  const cachedRankSummaries = await Promise.all(rankYears.map(async item => {
    const stat = await global.lx.worker.dbService.getPlayYearlyStat(toYearKey(item))
    if (!stat) return null
    const itemOverview = normalizeOverview(parseJson(stat.overviewJson), item)
    return {
      year: item,
      totalListenSeconds: itemOverview.totalListenSeconds,
      sessionCount: itemOverview.sessionCount,
      activeDays: itemOverview.activeDays,
    } satisfies YearRankSummary
  }))
  const yearlyRank = buildYearRankFromSummaries(year, [
    {
      year: currentYearRank.year,
      totalListenSeconds: currentYearRank.totalListenSeconds,
      sessionCount: currentYearRank.sessionCount,
      activeDays: currentYearRank.activeDays,
    },
    ...cachedRankSummaries.filter((item): item is YearRankSummary => item != null),
  ])

  const cards: LX.ReportYearly.CardsDTO = {
    yearFavorites: aggregateYearFavorites(yearEvents),
    seasonalFavorites: aggregateSeasonalFavorites(yearEvents),
    weekdayDistribution: aggregateWeeklyHabits(yearEvents),
    nightOwlStats: aggregateNightOwlStats(yearEvents),
    monthlyArtistTimeline: aggregateMonthlyArtistTimeline(yearEvents),
    replaySongs: aggregateReplaySongs(yearEvents),
    yearlyRank,
    enrichmentPlaceholder: createEnrichmentPlaceholder(),
  }

  const report: YearReportData = {
    year,
    overview,
    cards,
    eventCount: yearEvents.length,
    updatedAt: now(),
  }

  if (IS_DEV) {
    logDebug(
      'build_report',
      `year=${year}`,
      `cost=${now() - t0}ms`,
      `events=${yearEvents.length}`,
      `nightRatio=${cards.nightOwlStats.ratio.toFixed(3)}`,
    )
  } else {
    logDebug('build_report', `year=${year}`, `cost=${now() - t0}ms`, `events=${yearEvents.length}`)
  }
  return report
}

const persistReport = async(report: YearReportData) => {
  await global.lx.worker.dbService.setPlayYearlyStat({
    yearKey: toYearKey(report.year),
    overviewJson: JSON.stringify(report.overview),
    cardsJson: JSON.stringify(report.cards),
    updatedAt: report.updatedAt,
  })
}

const getReportFromDbCache = async(year: number): Promise<YearReportData | null> => {
  const stat = await global.lx.worker.dbService.getPlayYearlyStat(toYearKey(year))
  if (!stat) return null

  const overview = normalizeOverview(parseJson(stat.overviewJson), year)
  const cards = normalizeCards(parseJson(stat.cardsJson), year)
  return {
    year,
    overview,
    cards,
    eventCount: overview.sessionCount,
    updatedAt: toSafeInt(stat.updatedAt),
  }
}

const getYearReportData = async(rawYear: number, forceRealtime = false): Promise<YearReportData> => {
  const year = normalizeYear(rawYear)
  const t0 = now()

  if (!forceRealtime) {
    const memoryData = getMemoryCache(year)
    if (memoryData) {
      logDebug('get_report_data', `year=${year}`, 'source=memory_cache', `cost=${now() - t0}ms`)
      return memoryData
    }

    const dbData = await getReportFromDbCache(year)
    if (dbData) {
      setMemoryCache(dbData)
      logDebug('get_report_data', `year=${year}`, 'source=play_yearly_stats', `cost=${now() - t0}ms`)
      return dbData
    }
  }

  const report = await buildYearReport(year)
  await persistReport(report)
  setMemoryCache(report)
  logDebug('get_report_data', `year=${year}`, 'source=realtime', `cost=${now() - t0}ms`)
  return report
}

export const getYearOptions = async(): Promise<LX.ReportYearly.YearOption[]> => {
  const t0 = now()
  const rawYears = await global.lx.worker.dbService.getPlayEventYears()
  const years = normalizeYearList(rawYears, undefined, true)
  const result = years.map(year => ({
    year,
    label: `${year}`,
  }))
  logDebug('get_year_options', `cost=${now() - t0}ms`, `years=${result.length}`)
  return result
}

export const getOverview = async(year: number): Promise<LX.ReportYearly.OverviewDTO> => {
  const t0 = now()
  const report = await getYearReportData(year)
  logDebug('get_overview', `year=${report.year}`, `cost=${now() - t0}ms`)
  return report.overview
}

export const getCards = async(year: number): Promise<LX.ReportYearly.CardsDTO> => {
  const t0 = now()
  const report = await getYearReportData(year)
  logDebug('get_cards', `year=${report.year}`, `cost=${now() - t0}ms`)
  return report.cards
}

export const rebuildYearCache = async(year: number): Promise<LX.ReportYearly.RebuildCacheResult> => {
  const normalizedYear = normalizeYear(year)
  const t0 = now()
  memoryCache.delete(normalizedYear)
  await global.lx.worker.dbService.removePlayYearlyStat(toYearKey(normalizedYear))
  const report = await getYearReportData(normalizedYear, true)
  logDebug('rebuild_year_cache', `year=${normalizedYear}`, `cost=${now() - t0}ms`, `events=${report.eventCount}`)
  return {
    year: report.year,
  }
}

export const exportPng = async(payload: LX.ReportYearly.ExportPngPayload): Promise<LX.ReportYearly.ExportPngResult> => {
  return exportPngToFile(payload)
}
