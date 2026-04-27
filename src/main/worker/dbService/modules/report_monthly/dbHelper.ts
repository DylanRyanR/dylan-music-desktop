import { getDB } from '../../db'
import {
  createPlayEventInsertStatement,
  createPlayEventsRangeQueryStatement,
  createPlayEventsCountByRangeStatement,
  createPlayEventsBeforeQueryStatement,
  createPlayEventsDeleteBeforeStatement,
  createDailyStatUpsertStatement,
  createDailyStatsRangeQueryStatement,
  createDailyStatByDateKeyQueryStatement,
  createDailyStatsDeleteRangeStatement,
  createPlayYearlyStatQueryStatement,
  createPlayYearlyStatUpsertStatement,
  createPlayYearlyStatDeleteStatement,
  createPlayEventYearsQueryStatement,
} from './statements'

export const insertPlayEvent = (event: LX.DBService.PlayEvent) => {
  const insert = createPlayEventInsertStatement()
  insert.run(event)
}

export const queryPlayEventsByRange = (startAt: number, endAt: number) => {
  const query = createPlayEventsRangeQueryStatement()
  return query.all(startAt, endAt) as LX.DBService.PlayEvent[]
}

export const queryPlayEventsCountByRange = (startAt: number, endAt: number) => {
  const query = createPlayEventsCountByRangeStatement()
  const result = query.get(startAt, endAt) as { count?: number | null } | undefined
  return Number(result?.count ?? 0)
}

export const queryPlayEventsBefore = (beforeAt: number) => {
  const query = createPlayEventsBeforeQueryStatement()
  return query.all(beforeAt) as LX.DBService.PlayEvent[]
}

export const deletePlayEventsBefore = (beforeAt: number) => {
  const remove = createPlayEventsDeleteBeforeStatement()
  remove.run(beforeAt)
}

export const upsertPlayDailyStat = (stat: LX.DBService.PlayDailyStat) => {
  const upsert = createDailyStatUpsertStatement()
  upsert.run(stat)
}

export const upsertPlayDailyStats = (stats: LX.DBService.PlayDailyStat[]) => {
  const db = getDB()
  const upsert = createDailyStatUpsertStatement()
  db.transaction((stats: LX.DBService.PlayDailyStat[]) => {
    for (const stat of stats) upsert.run(stat)
  })(stats)
}

export const queryDailyStatsByRange = (startDateKey: string, endDateKey: string) => {
  const query = createDailyStatsRangeQueryStatement()
  return query.all(startDateKey, endDateKey) as LX.DBService.PlayDailyStat[]
}

export const queryDailyStatByDateKey = (dateKey: string) => {
  const query = createDailyStatByDateKeyQueryStatement()
  return query.get(dateKey) as LX.DBService.PlayDailyStat | undefined
}

export const deleteDailyStatsByRange = (startDateKey: string, endDateKey: string) => {
  const remove = createDailyStatsDeleteRangeStatement()
  remove.run(startDateKey, endDateKey)
}

export const queryPlayYearlyStat = (yearKey: string) => {
  const query = createPlayYearlyStatQueryStatement()
  return query.get(yearKey) as LX.DBService.PlayYearlyStat | undefined
}

export const upsertPlayYearlyStatData = (stat: LX.DBService.PlayYearlyStat) => {
  const upsert = createPlayYearlyStatUpsertStatement()
  upsert.run(stat)
}

export const deletePlayYearlyStatByYear = (yearKey: string) => {
  const remove = createPlayYearlyStatDeleteStatement()
  remove.run(yearKey)
}

export const queryPlayEventYears = () => {
  const query = createPlayEventYearsQueryStatement()
  return (query.all() as Array<{ year: number | null }>).map(item => item.year).filter((year): year is number => Number.isInteger(year))
}
