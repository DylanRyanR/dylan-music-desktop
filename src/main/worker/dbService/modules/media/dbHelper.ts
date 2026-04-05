import { getDB } from '../../db'
import {
  createConnectionQueryStatement,
  createConnectionInsertStatement,
  createConnectionDeleteStatement,
  createConnectionUpdateStatement,
  createConnectionCountStatement,
  createItemQueryStatement,
  createItemsByConnectionQueryStatement,
  createItemInsertStatement,
  createItemsDeleteByConnectionStatement,
  createItemDeleteByIdStatement,
} from './statements'

export const queryMediaConnections = () => {
  const query = createConnectionQueryStatement()
  return query.all() as LX.DBService.MediaConnection[]
}

export const upsertMediaConnections = (connections: LX.DBService.MediaConnection[]) => {
  const db = getDB()
  const insert = createConnectionInsertStatement()
  const update = createConnectionUpdateStatement()
  const remove = createConnectionDeleteStatement()
  db.transaction((items: LX.DBService.MediaConnection[]) => {
    for (const item of items) {
      remove.run(item.id)
      insert.run(item)
    }
  })(connections)
}

export const updateMediaConnection = (connection: LX.DBService.MediaConnection) => {
  const update = createConnectionUpdateStatement()
  update.run(connection)
}

export const deleteMediaConnection = (id: string) => {
  const db = getDB()
  const removeConnection = createConnectionDeleteStatement()
  const removeItems = createItemsDeleteByConnectionStatement()
  db.transaction((id: string) => {
    removeItems.run(id)
    removeConnection.run(id)
  })(id)
}

export const countMediaConnections = () => {
  const query = createConnectionCountStatement()
  return (query.get() as { count: number }).count
}

export const queryMediaItems = () => {
  const query = createItemQueryStatement()
  return query.all() as LX.DBService.MediaItem[]
}

export const queryMediaItemsByConnection = (connectionId: string) => {
  const query = createItemsByConnectionQueryStatement()
  return query.all(connectionId) as LX.DBService.MediaItem[]
}

export const replaceMediaItemsByConnection = (connectionId: string, items: LX.DBService.MediaItem[]) => {
  const db = getDB()
  const clear = createItemsDeleteByConnectionStatement()
  const insert = createItemInsertStatement()
  db.transaction((connectionId: string, items: LX.DBService.MediaItem[]) => {
    clear.run(connectionId)
    for (const item of items) insert.run(item)
  })(connectionId, items)
}

export const deleteMediaItemById = (id: string) => {
  const remove = createItemDeleteByIdStatement()
  remove.run(id)
}
