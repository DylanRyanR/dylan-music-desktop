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

export default (db: Database.Database) => {
  const version = (db.prepare<[string]>('SELECT "field_value" FROM "main"."db_info" WHERE "field_name" = ?').get('version') as { field_value: string }).field_value
  switch (version) {
    case '1':
      migrateV1(db)
      migrateToV3(db)
      db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: DB_VERSION })
      break
    case '2':
      migrateToV3(db)
      db.prepare('UPDATE "main"."db_info" SET "field_value"=@value WHERE "field_name"=@name').run({ name: 'version', value: DB_VERSION })
      break
  }
}
