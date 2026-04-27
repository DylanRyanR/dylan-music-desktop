import { getDB } from '../../db'

export const createPlayEventInsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.PlayEvent]>(`
    INSERT INTO "main"."play_events" (
      "id", "songId", "songName", "artistName", "albumName", "sourceType", "listId",
      "startedAt", "endedAt", "listenSeconds", "totalSeconds", "isValid30s", "isComplete80",
      "endReason", "createdAt"
    )
    VALUES (
      @id, @songId, @songName, @artistName, @albumName, @sourceType, @listId,
      @startedAt, @endedAt, @listenSeconds, @totalSeconds, @isValid30s, @isComplete80,
      @endReason, @createdAt
    )
  `)
}

export const createPlayEventsRangeQueryStatement = () => {
  const db = getDB()
  return db.prepare<[number, number]>(`
    SELECT
      "id", "songId", "songName", "artistName", "albumName", "sourceType", "listId",
      "startedAt", "endedAt", "listenSeconds", "totalSeconds", "isValid30s", "isComplete80",
      "endReason", "createdAt"
    FROM "main"."play_events"
    WHERE "startedAt" >= ? AND "startedAt" < ?
    ORDER BY "startedAt" ASC
  `)
}

export const createPlayEventsCountByRangeStatement = () => {
  const db = getDB()
  return db.prepare<[number, number]>(`
    SELECT COUNT(*) AS "count"
    FROM "main"."play_events"
    WHERE "startedAt" >= ? AND "startedAt" < ?
  `)
}

export const createPlayEventsBeforeQueryStatement = () => {
  const db = getDB()
  return db.prepare<[number]>(`
    SELECT
      "id", "songId", "songName", "artistName", "albumName", "sourceType", "listId",
      "startedAt", "endedAt", "listenSeconds", "totalSeconds", "isValid30s", "isComplete80",
      "endReason", "createdAt"
    FROM "main"."play_events"
    WHERE "startedAt" < ?
    ORDER BY "startedAt" DESC
  `)
}

export const createPlayEventsDeleteBeforeStatement = () => {
  const db = getDB()
  return db.prepare<[number]>(`
    DELETE FROM "main"."play_events"
    WHERE "startedAt" < ?
  `)
}

export const createDailyStatUpsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.PlayDailyStat]>(`
    INSERT INTO "main"."play_daily_stats" (
      "dateKey", "totalListenSeconds", "valid30Count", "complete80Count", "sessionCount", "skipCount",
      "topSongsJson", "topArtistsJson", "hourHistogramJson", "sourceShareJson", "newDiscoveryJson", "updatedAt"
    )
    VALUES (
      @dateKey, @totalListenSeconds, @valid30Count, @complete80Count, @sessionCount, @skipCount,
      @topSongsJson, @topArtistsJson, @hourHistogramJson, @sourceShareJson, @newDiscoveryJson, @updatedAt
    )
    ON CONFLICT("dateKey") DO UPDATE SET
      "totalListenSeconds"=excluded."totalListenSeconds",
      "valid30Count"=excluded."valid30Count",
      "complete80Count"=excluded."complete80Count",
      "sessionCount"=excluded."sessionCount",
      "skipCount"=excluded."skipCount",
      "topSongsJson"=excluded."topSongsJson",
      "topArtistsJson"=excluded."topArtistsJson",
      "hourHistogramJson"=excluded."hourHistogramJson",
      "sourceShareJson"=excluded."sourceShareJson",
      "newDiscoveryJson"=excluded."newDiscoveryJson",
      "updatedAt"=excluded."updatedAt"
  `)
}

export const createDailyStatsRangeQueryStatement = () => {
  const db = getDB()
  return db.prepare<[string, string]>(`
    SELECT
      "dateKey", "totalListenSeconds", "valid30Count", "complete80Count", "sessionCount", "skipCount",
      "topSongsJson", "topArtistsJson", "hourHistogramJson", "sourceShareJson", "newDiscoveryJson", "updatedAt"
    FROM "main"."play_daily_stats"
    WHERE "dateKey" >= ? AND "dateKey" <= ?
    ORDER BY "dateKey" ASC
  `)
}

export const createDailyStatByDateKeyQueryStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    SELECT
      "dateKey", "totalListenSeconds", "valid30Count", "complete80Count", "sessionCount", "skipCount",
      "topSongsJson", "topArtistsJson", "hourHistogramJson", "sourceShareJson", "newDiscoveryJson", "updatedAt"
    FROM "main"."play_daily_stats"
    WHERE "dateKey" = ?
  `)
}

export const createDailyStatsDeleteRangeStatement = () => {
  const db = getDB()
  return db.prepare<[string, string]>(`
    DELETE FROM "main"."play_daily_stats"
    WHERE "dateKey" >= ? AND "dateKey" <= ?
  `)
}

export const createPlayYearlyStatQueryStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    SELECT
      "yearKey", "overviewJson", "cardsJson", "updatedAt"
    FROM "main"."play_yearly_stats"
    WHERE "yearKey" = ?
  `)
}

export const createPlayYearlyStatUpsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.PlayYearlyStat]>(`
    INSERT INTO "main"."play_yearly_stats" (
      "yearKey", "overviewJson", "cardsJson", "updatedAt"
    )
    VALUES (
      @yearKey, @overviewJson, @cardsJson, @updatedAt
    )
    ON CONFLICT("yearKey") DO UPDATE SET
      "overviewJson"=excluded."overviewJson",
      "cardsJson"=excluded."cardsJson",
      "updatedAt"=excluded."updatedAt"
  `)
}

export const createPlayYearlyStatDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    DELETE FROM "main"."play_yearly_stats"
    WHERE "yearKey" = ?
  `)
}

export const createPlayEventYearsQueryStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    SELECT DISTINCT CAST(strftime('%Y', "startedAt" / 1000, 'unixepoch') AS INTEGER) AS "year"
    FROM "main"."play_events"
    ORDER BY "year" DESC
  `)
}
