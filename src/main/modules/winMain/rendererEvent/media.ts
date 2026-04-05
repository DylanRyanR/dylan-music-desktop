import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import { scanConnection, mediaConnectionFromDb, mediaConnectionToDb, mediaItemToMusicInfo, getPlayUrl } from '@main/modules/mediaLibrary'

const updateConnectionScanStatus = async(connection: LX.DBService.MediaConnection, status: string, summary: string | null) => {
  await global.lx.worker.dbService.updateMediaConnectionInfo({
    ...connection,
    status,
    lastScanAt: Date.now(),
    lastScanStatus: status,
    lastScanSummary: summary,
  })
}

const getConnectionNameMap = async() => {
  const connections = await global.lx.worker.dbService.getMediaConnections()
  return new Map(connections.map(item => [item.id, item.name]))
}

export default () => {
  mainHandle<void, LX.DBService.MediaConnection[]>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_list, async() => {
    return global.lx.worker.dbService.getMediaConnections()
  })

  mainHandle<any, LX.DBService.MediaConnection>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_save, async({ params }) => {
    const now = Date.now()
    const dbConnection = mediaConnectionToDb({
      ...params,
      status: 'scanning',
      lastScanAt: now,
      lastScanStatus: 'scanning',
      lastScanSummary: 'Scanning…',
      isEnabled: params.isEnabled !== false,
    })
    await global.lx.worker.dbService.saveMediaConnection(dbConnection)
    try {
      const items = await scanConnection(params)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(dbConnection.id, items)
      const scannedConnection = {
        ...dbConnection,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(scannedConnection)
      return scannedConnection
    } catch (error: any) {
      const failedConnection = {
        ...dbConnection,
        status: 'error',
        lastScanAt: Date.now(),
        lastScanStatus: 'error',
        lastScanSummary: error?.message ?? 'Scan failed',
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(failedConnection)
      return failedConnection
    }
  })

  mainHandle<string, void>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_remove, async({ params: id }) => {
    await global.lx.worker.dbService.removeMediaConnection(id)
  })

  mainHandle<string, LX.DBService.MediaConnection | null>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_scan, async({ params: id }) => {
    const connections = await global.lx.worker.dbService.getMediaConnections()
    const connection = connections.find((item: LX.DBService.MediaConnection) => item.id === id)
    if (!connection) return null
    await updateConnectionScanStatus(connection, 'scanning', 'Scanning…')
    try {
      const config = mediaConnectionFromDb(connection)
      const items = await scanConnection(config)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(connection.id, items)
      const updated = {
        ...connection,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(updated)
      return updated
    } catch (error: any) {
      const updated = {
        ...connection,
        status: 'error',
        lastScanAt: Date.now(),
        lastScanStatus: 'error',
        lastScanSummary: error?.message ?? 'Scan failed',
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(updated)
      return updated
    }
  })

  mainHandle<void, LX.Music.MusicInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.media_library_list, async() => {
    const connectionNameMap = await getConnectionNameMap()
    const items = await global.lx.worker.dbService.getMediaItems()
    return items.map(item => mediaItemToMusicInfo(item, connectionNameMap))
  })

  mainHandle<string, LX.Music.MusicInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.media_library_list_by_connection, async({ params: connectionId }) => {
    const connectionNameMap = await getConnectionNameMap()
    const items = await global.lx.worker.dbService.getMediaItemsByConnection(connectionId)
    return items.map(item => mediaItemToMusicInfo(item, connectionNameMap))
  })

  mainHandle<string, string>(WIN_MAIN_RENDERER_EVENT_NAME.media_library_get_play_url, async({ params: id }) => {
    const items = await global.lx.worker.dbService.getMediaItems()
    const item = items.find((it: LX.DBService.MediaItem) => it.id === id)
    if (!item) throw new Error('Media item not found')
    const connections = await global.lx.worker.dbService.getMediaConnections()
    const connection = connections.find((it: LX.DBService.MediaConnection) => it.id === item.connectionId)
    if (!connection) throw new Error('Media connection not found')
    return getPlayUrl(mediaConnectionFromDb(connection), item)
  })
}
