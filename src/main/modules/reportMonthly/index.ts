import {
  aggregateReport,
  aggregateReportFromDailyStats,
  isPlayDailyStatUsable,
  toDateKey,
} from './aggregate'
import { exportMonthlyPng } from './export'

const DAY_MS = 24 * 60 * 60 * 1000
const REPORT_DAYS = 30
const KEEP_EVENT_DAYS = 400
const CACHE_TTL = 15_000
const IS_DEV = process.env.NODE_ENV !== 'production'

interface CachedReport {
  at: number
  startAt: number
  endAt: number
  overview: LX.ReportMonthly.OverviewDTO
  cards: LX.ReportMonthly.CardsDTO
  dailyStats: LX.DBService.PlayDailyStat[]
  eventCount: number
}

let cachedReport: CachedReport | null = null
const setCachedReport = (report: CachedReport | null) => {
  cachedReport = report
}

const logDebug = (...args: Array<string | number | boolean>) => {
  if (!IS_DEV) return
  console.info('[report_monthly]', ...args)
}

const now = () => Date.now()
const getStartOfDayAt = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const getRange = (days: number = REPORT_DAYS) => {
  const endAt = now()
  return {
    startAt: endAt - days * DAY_MS,
    endAt,
  }
}

const normalizeSourceType = (sourceType: LX.ReportMonthly.SourceType): LX.ReportMonthly.SourceType => {
  switch (sourceType) {
    case 'online':
    case 'local':
    case 'onedrive':
    case 'smb':
    case 'webdav':
    case 'other':
      return sourceType
    default:
      return 'other'
  }
}

const createEventId = (payload: LX.ReportMonthly.TrackSessionPayload, createdAt: number) => {
  return `${payload.songId}__${payload.startedAt}__${createdAt}__${Math.random().toString(36).slice(2, 8)}`
}

const toPlayEvent = (payload: LX.ReportMonthly.TrackSessionPayload): LX.DBService.PlayEvent | null => {
  if (!payload.songId || !payload.songName) return null

  const createdAt = now()
  const startedAt = Number.isFinite(payload.startedAt) ? Math.floor(payload.startedAt) : createdAt
  let endedAt = Number.isFinite(payload.endedAt) ? Math.floor(payload.endedAt) : createdAt
  if (endedAt < startedAt) endedAt = startedAt

  const listenSeconds = Math.max(0, Math.floor(payload.listenSeconds))
  if (!listenSeconds) return null

  const totalSeconds = Math.max(0, Math.floor(payload.totalSeconds))
  const isValid30s: 0 | 1 = listenSeconds >= 30 ? 1 : 0
  const isComplete80: 0 | 1 = totalSeconds > 0 && listenSeconds / totalSeconds >= 0.8 ? 1 : 0

  return {
    id: createEventId(payload, createdAt),
    songId: payload.songId,
    songName: payload.songName,
    artistName: payload.artistName || 'Unknown Artist',
    albumName: payload.albumName || '',
    sourceType: normalizeSourceType(payload.sourceType),
    listId: payload.listId ?? null,
    startedAt,
    endedAt,
    listenSeconds,
    totalSeconds,
    isValid30s,
    isComplete80,
    endReason: payload.endReason,
    createdAt,
  }
}

const getHistorySongIds = async(startAt: number) => {
  const historyEvents = await global.lx.worker.dbService.getPlayEventsBefore(startAt)
  return new Set(historyEvents.map(event => event.songId))
}

const createCachedReport = (
  result: ReturnType<typeof aggregateReport>,
  startAt: number,
  endAt: number,
  generatedAt: number,
) => {
  return {
    at: generatedAt,
    startAt,
    endAt,
    overview: result.overview,
    cards: result.cards,
    dailyStats: result.dailyStats,
    eventCount: result.eventCount,
  } satisfies CachedReport
}

const buildReport = async(startAt: number, endAt: number) => {
  const [events, historySongIds] = await Promise.all([
    global.lx.worker.dbService.getPlayEventsByRange(startAt, endAt),
    getHistorySongIds(startAt),
  ])
  const generatedAt = now()
  const result = aggregateReport(events, historySongIds, startAt, endAt, generatedAt)
  return createCachedReport(result, startAt, endAt, generatedAt)
}

const buildReportByDailyStats = async(startAt: number, endAt: number): Promise<CachedReport | null> => {
  const todayStartAt = getStartOfDayAt(endAt)
  const todayRangeStartAt = Math.max(startAt, todayStartAt)
  const hasPreviousDays = todayRangeStartAt > startAt

  const [historySongIds, totalEventCount, todayEvents, dailyStats] = await Promise.all([
    getHistorySongIds(startAt),
    global.lx.worker.dbService.getPlayEventsCountByRange(startAt, endAt),
    global.lx.worker.dbService.getPlayEventsByRange(todayRangeStartAt, endAt),
    hasPreviousDays
      ? global.lx.worker.dbService.getPlayDailyStatsByRange(toDateKey(startAt), toDateKey(todayRangeStartAt - 1))
      : Promise.resolve([] as LX.DBService.PlayDailyStat[]),
  ])

  if (dailyStats.some(stat => !isPlayDailyStatUsable(stat))) return null

  const dailySessionCount = dailyStats.reduce((count, stat) => count + stat.sessionCount, 0)
  if (dailySessionCount + todayEvents.length !== totalEventCount) return null

  const generatedAt = now()
  const result = aggregateReportFromDailyStats(dailyStats, todayEvents, historySongIds, startAt, endAt, generatedAt)
  return createCachedReport(result, startAt, endAt, generatedAt)
}

const rebuildDayCacheByEvent = async(timestamp: number) => {
  const dayStartAt = getStartOfDayAt(timestamp)
  const dayEndAt = dayStartAt + DAY_MS
  const dateKey = toDateKey(dayStartAt)
  const events = await global.lx.worker.dbService.getPlayEventsByRange(dayStartAt, dayEndAt)
  if (!events.length) {
    await global.lx.worker.dbService.removePlayDailyStatsByRange(dateKey, dateKey)
    return
  }
  const generatedAt = now()
  const report = aggregateReport(events, new Set(), dayStartAt, dayEndAt, generatedAt)
  const dayStat = report.dailyStats.find(item => item.dateKey === dateKey)
  if (!dayStat) return
  await global.lx.worker.dbService.setPlayDailyStat(dayStat)
}

const getMonthlyReportData = async(force = false) => {
  const t0 = now()
  const { startAt, endAt } = getRange(REPORT_DAYS)
  if (
    !force &&
    cachedReport &&
    now() - cachedReport.at < CACHE_TTL &&
    cachedReport.startAt <= startAt &&
    cachedReport.endAt >= endAt
  ) {
    logDebug('get_report_data', 'source=memory_cache', `cost=${now() - t0}ms`, `events=${cachedReport.eventCount}`)
    return cachedReport
  }

  const reportByDailyStats = await buildReportByDailyStats(startAt, endAt)
  const report = reportByDailyStats ?? await buildReport(startAt, endAt)
  logDebug(
    'get_report_data',
    reportByDailyStats ? 'source=daily_stats' : 'source=full_events',
    `cost=${now() - t0}ms`,
    `events=${report.eventCount}`,
    `days=${report.dailyStats.length}`,
  )
  setCachedReport(report)
  return report
}

export const trackSession = async(payload: LX.ReportMonthly.TrackSessionPayload) => {
  const event = toPlayEvent(payload)
  if (!event) return false
  await global.lx.worker.dbService.addPlayEvent(event)
  void rebuildDayCacheByEvent(event.startedAt).catch(err => {
    console.warn('[report-monthly] rebuild day cache failed', err)
  })
  setCachedReport(null)
  return true
}

export const getOverview = async() => {
  const t0 = now()
  const report = await getMonthlyReportData()
  logDebug('get_overview', `cost=${now() - t0}ms`)
  return report.overview
}

export const getCards = async() => {
  const t0 = now()
  const report = await getMonthlyReportData()
  logDebug('get_cards', `cost=${now() - t0}ms`)
  return report.cards
}

export const exportPng = async(payload: LX.ReportMonthly.ExportPngPayload) => {
  return exportMonthlyPng(payload)
}

export const rebuildCache = async(days: 30 | 90 | 400): Promise<LX.ReportMonthly.RebuildCacheResult> => {
  const t0 = now()
  const endAt = now()
  const startAt = endAt - days * DAY_MS
  const report = await buildReport(startAt, endAt)
  const startKey = toDateKey(startAt)
  const endKey = toDateKey(endAt)

  await global.lx.worker.dbService.removePlayDailyStatsByRange(startKey, endKey)
  if (report.dailyStats.length) {
    await global.lx.worker.dbService.setPlayDailyStats(report.dailyStats)
  }

  const cleanupBeforeAt = endAt - KEEP_EVENT_DAYS * DAY_MS
  const cleanedItems = await global.lx.worker.dbService.getPlayEventsBefore(cleanupBeforeAt)
  if (cleanedItems.length) {
    await global.lx.worker.dbService.removePlayEventsBefore(cleanupBeforeAt)
  }

  if (days === REPORT_DAYS) setCachedReport(report)
  else setCachedReport(null)

  logDebug(
    'rebuild_cache',
    `days=${days}`,
    `cost=${now() - t0}ms`,
    `events=${report.eventCount}`,
    `dayStats=${report.dailyStats.length}`,
    `cleaned=${cleanedItems.length}`,
  )

  return {
    days,
    eventCount: report.eventCount,
    dayCount: report.dailyStats.length,
    cleanedEventCount: cleanedItems.length,
  }
}
