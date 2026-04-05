import { getDB } from '../../db'

export const createConnectionQueryStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    SELECT "id", "type", "name", "config", "status", "lastScanAt", "lastScanStatus", "lastScanSummary", "isEnabled"
    FROM "main"."media_connection"
    ORDER BY "name" ASC
  `)
}

export const createConnectionInsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.MediaConnection]>(`
    INSERT INTO "main"."media_connection" ("id", "type", "name", "config", "status", "lastScanAt", "lastScanStatus", "lastScanSummary", "isEnabled")
    VALUES (@id, @type, @name, @config, @status, @lastScanAt, @lastScanStatus, @lastScanSummary, @isEnabled)
  `)
}

export const createConnectionDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    DELETE FROM "main"."media_connection"
    WHERE "id"=?
  `)
}

export const createConnectionUpdateStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.MediaConnection]>(`
    UPDATE "main"."media_connection"
    SET "type"=@type, "name"=@name, "config"=@config, "status"=@status, "lastScanAt"=@lastScanAt, "lastScanStatus"=@lastScanStatus, "lastScanSummary"=@lastScanSummary, "isEnabled"=@isEnabled
    WHERE "id"=@id
  `)
}

export const createConnectionCountStatement = () => {
  const db = getDB()
  return db.prepare<[]>('SELECT COUNT(*) as count FROM "main"."media_connection"')
}

export const createItemQueryStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    SELECT "id", "connectionId", "path", "fileName", "title", "artist", "album", "interval", "fileSize", "mtime", "ext", "versionToken", "meta"
    FROM "main"."media_item"
    ORDER BY "title" COLLATE NOCASE ASC, "artist" COLLATE NOCASE ASC
  `)
}

export const createItemsByConnectionQueryStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    SELECT "id", "connectionId", "path", "fileName", "title", "artist", "album", "interval", "fileSize", "mtime", "ext", "versionToken", "meta"
    FROM "main"."media_item"
    WHERE "connectionId"=?
    ORDER BY "title" COLLATE NOCASE ASC, "artist" COLLATE NOCASE ASC
  `)
}

export const createItemInsertStatement = () => {
  const db = getDB()
  return db.prepare<[LX.DBService.MediaItem]>(`
    INSERT INTO "main"."media_item" ("id", "connectionId", "path", "fileName", "title", "artist", "album", "interval", "fileSize", "mtime", "ext", "versionToken", "meta")
    VALUES (@id, @connectionId, @path, @fileName, @title, @artist, @album, @interval, @fileSize, @mtime, @ext, @versionToken, @meta)
  `)
}

export const createItemsDeleteByConnectionStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    DELETE FROM "main"."media_item"
    WHERE "connectionId"=?
  `)
}

export const createItemDeleteByIdStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`
    DELETE FROM "main"."media_item"
    WHERE "id"=?
  `)
}
