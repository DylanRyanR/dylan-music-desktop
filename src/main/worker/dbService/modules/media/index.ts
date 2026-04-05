import {
  queryMediaConnections,
  upsertMediaConnections,
  updateMediaConnection,
  deleteMediaConnection,
  countMediaConnections,
  queryMediaItems,
  queryMediaItemsByConnection,
  replaceMediaItemsByConnection,
  deleteMediaItemById,
} from './dbHelper'

export const getMediaConnections = () => {
  return queryMediaConnections()
}

export const saveMediaConnection = (connection: LX.DBService.MediaConnection) => {
  upsertMediaConnections([connection])
}

export const saveMediaConnections = (connections: LX.DBService.MediaConnection[]) => {
  upsertMediaConnections(connections)
}

export const updateMediaConnectionInfo = (connection: LX.DBService.MediaConnection) => {
  updateMediaConnection(connection)
}

export const removeMediaConnection = (id: string) => {
  deleteMediaConnection(id)
}

export const mediaConnectionCount = () => {
  return countMediaConnections()
}

export const getMediaItems = () => {
  return queryMediaItems()
}

export const getMediaItemsByConnection = (connectionId: string) => {
  return queryMediaItemsByConnection(connectionId)
}

export const overwriteMediaItemsByConnection = (connectionId: string, items: LX.DBService.MediaItem[]) => {
  replaceMediaItemsByConnection(connectionId, items)
}

export const removeMediaItem = (id: string) => {
  deleteMediaItemById(id)
}
