import {
  insertPlayEvent,
  queryPlayEventsByRange,
  queryPlayEventsCountByRange,
  queryPlayEventsBefore,
  deletePlayEventsBefore,
  upsertPlayDailyStat,
  upsertPlayDailyStats,
  queryDailyStatsByRange,
  queryDailyStatByDateKey,
  deleteDailyStatsByRange,
  queryPlayYearlyStat,
  upsertPlayYearlyStatData,
  deletePlayYearlyStatByYear,
  queryPlayEventYears,
} from './dbHelper'

export const addPlayEvent = (event: LX.DBService.PlayEvent) => {
  insertPlayEvent(event)
}

export const getPlayEventsByRange = (startAt: number, endAt: number) => {
  return queryPlayEventsByRange(startAt, endAt)
}

export const getPlayEventsCountByRange = (startAt: number, endAt: number) => {
  return queryPlayEventsCountByRange(startAt, endAt)
}

export const getPlayEventsBefore = (beforeAt: number) => {
  return queryPlayEventsBefore(beforeAt)
}

export const removePlayEventsBefore = (beforeAt: number) => {
  deletePlayEventsBefore(beforeAt)
}

export const setPlayDailyStat = (stat: LX.DBService.PlayDailyStat) => {
  upsertPlayDailyStat(stat)
}

export const setPlayDailyStats = (stats: LX.DBService.PlayDailyStat[]) => {
  upsertPlayDailyStats(stats)
}

export const getPlayDailyStatsByRange = (startDateKey: string, endDateKey: string) => {
  return queryDailyStatsByRange(startDateKey, endDateKey)
}

export const getPlayDailyStatByDateKey = (dateKey: string) => {
  return queryDailyStatByDateKey(dateKey)
}

export const removePlayDailyStatsByRange = (startDateKey: string, endDateKey: string) => {
  deleteDailyStatsByRange(startDateKey, endDateKey)
}

export const getPlayYearlyStat = (yearKey: string) => {
  return queryPlayYearlyStat(yearKey)
}

export const setPlayYearlyStat = (stat: LX.DBService.PlayYearlyStat) => {
  upsertPlayYearlyStatData(stat)
}

export const removePlayYearlyStat = (yearKey: string) => {
  deletePlayYearlyStatByYear(yearKey)
}

export const getPlayEventYears = () => {
  return queryPlayEventYears()
}
