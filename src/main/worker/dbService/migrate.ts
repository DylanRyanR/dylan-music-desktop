import type Database from 'better-sqlite3'
import tables, { DB_VERSION } from './tables'

const migrateV1 = (db: Database.Database) => {
  const existsTable = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'dislike_list\';').get()
  if (!existsTable) {
    const sql = tables.get('dislike_list')!
    db.exec(sql)
  }
}

const migrateToV3 = (db: Database.Database) => {
  const existsConnectionTable = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'media_connection\';').get()
  if (!existsConnectionTable) db.exec(tables.get('media_connection')!)

  const existsItemTable = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'media_item\';').get()
  if (!existsItemTable) db.exec(tables.get('media_item')!)

  const existsIndex = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'index\' AND name=\'index_media_item_connection\';').get()
  if (!existsIndex) db.exec(tables.get('index_media_item_connection')!)
}

const migrateToV4 = (db: Database.Database) => {
  const existsPlayEvents = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'play_events\';').get()
  if (!existsPlayEvents) db.exec(tables.get('play_events')!)

  const existsPlayEventsStartedAt = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'index\' AND name=\'index_play_events_startedAt\';').get()
  if (!existsPlayEventsStartedAt) db.exec(tables.get('index_play_events_startedAt')!)

  const existsPlayEventsSongId = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'index\' AND name=\'index_play_events_songId_startedAt\';').get()
  if (!existsPlayEventsSongId) db.exec(tables.get('index_play_events_songId_startedAt')!)

  const existsPlayEventsArtist = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'index\' AND name=\'index_play_events_artistName_startedAt\';').get()
  if (!existsPlayEventsArtist) db.exec(tables.get('index_play_events_artistName_startedAt')!)

  const existsPlayEventsSource = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'index\' AND name=\'index_play_events_sourceType_startedAt\';').get()
  if (!existsPlayEventsSource) db.exec(tables.get('index_play_events_sourceType_startedAt')!)

  const existsPlayDailyStats = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'play_daily_stats\';').get()
  if (!existsPlayDailyStats) db.exec(tables.get('play_daily_stats')!)
}

const migrateToV5 = (db: Database.Database) => {
  const existsPlayYearlyStats = db.prepare('SELECT name FROM "main".sqlite_master WHERE type=\'table\' AND name=\'play_yearly_stats\';').get()
  if (!existsPlayYearlyStats) db.exec(tables.get('play_yearly_stats')!)
}

export default (db: Database.Database) => {
  const versionResult = db.prepare<[string]>('SELECT "field_value" FROM "main"."db_info" WHERE "field_name" = ?').get('version') as { field_value?: string } | undefined
  const version = versionResult?.field_value ?? ''
  const setVersion = () => {
    db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: DB_VERSION })
  }
  switch (version) {
    case '1':
      migrateV1(db)
      migrateToV3(db)
      migrateToV4(db)
      migrateToV5(db)
      setVersion()
      break
    case '2':
      migrateToV3(db)
      migrateToV4(db)
      migrateToV5(db)
      setVersion()
      break
    case '3':
      migrateToV4(db)
      migrateToV5(db)
      setVersion()
      break
    case '4':
      migrateToV5(db)
      setVersion()
      break
    case DB_VERSION:
      break
    default:
      migrateV1(db)
      migrateToV3(db)
      migrateToV4(db)
      migrateToV5(db)
      setVersion()
      break
  }
}
