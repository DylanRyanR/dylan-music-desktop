import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import { sendEvent } from '@main/modules/winMain'
import {
  scanConnection,
  mediaConnectionFromDb,
  mediaConnectionToDb,
  mediaItemToMusicInfo,
  getPlayUrl,
  type MediaScanProgress,
} from '@main/modules/mediaLibrary'

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

type ScanProgressStage = 'preparing' | 'discovering' | 'scanning' | 'saving' | 'done' | 'error'

interface MediaConnectionScanProgressPayload {
  connectionId: string
  stage: ScanProgressStage
  current: number
  total: number
  message: string
}

const createScanProgressReporter = (connectionId: string) => {
  let lastEmitAt = 0
  const emit = (payload: MediaConnectionScanProgressPayload) => {
    lastEmitAt = Date.now()
    sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_scan_progress, payload)
  }

  return {
    preparing() {
      emit({
        connectionId,
        stage: 'preparing',
        current: 0,
        total: 0,
        message: 'Preparing scan...',
      })
    },
    onScanProgress(progress: MediaScanProgress) {
      const now = Date.now()
      if (
        progress.stage === 'scanning' &&
        progress.total > 0 &&
        progress.current < progress.total &&
        progress.current > 1 &&
        progress.current % 10 !== 0 &&
        now - lastEmitAt < 220
      ) return

      let message = 'Scanning folders...'
      if (progress.stage === 'discovering') {
        message = progress.total > 0 ? `Found ${progress.total} audio files` : 'Scanning folders...'
      } else if (progress.stage === 'scanning') {
        message = progress.total > 0
          ? `Reading metadata ${progress.current}/${progress.total}`
          : 'Reading metadata...'
      }

      emit({
        connectionId,
        stage: progress.stage,
        current: progress.current,
        total: progress.total,
        message,
      })
    },
    saving(total: number) {
      emit({
        connectionId,
        stage: 'saving',
        current: total,
        total,
        message: `Saving ${total} items...`,
      })
    },
    done(total: number) {
      emit({
        connectionId,
        stage: 'done',
        current: total,
        total,
        message: `Scan finished: ${total} files`,
      })
    },
    error(message: string) {
      emit({
        connectionId,
        stage: 'error',
        current: 0,
        total: 0,
        message,
      })
    },
  }
}

export default () => {
  mainHandle<LX.DBService.MediaConnection[]>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_list, async() => {
    return global.lx.worker.dbService.getMediaConnections()
  })

  mainHandle<any, LX.DBService.MediaConnection>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_save, async({ params }) => {
    const now = Date.now()
    const dbConnection = mediaConnectionToDb({
      ...params,
      status: 'scanning',
      lastScanAt: now,
      lastScanStatus: 'scanning',
      lastScanSummary: 'Scanning...',
      isEnabled: params.isEnabled !== false,
    })
    await global.lx.worker.dbService.saveMediaConnection(dbConnection)
    const reporter = createScanProgressReporter(dbConnection.id)
    try {
      reporter.preparing()
      const items = await scanConnection(params, progress => {
        reporter.onScanProgress(progress)
      })
      reporter.saving(items.length)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(dbConnection.id, items)
      const scannedConnection = {
        ...dbConnection,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(scannedConnection)
      reporter.done(items.length)
      return scannedConnection
    } catch (error: any) {
      reporter.error(error?.message ?? 'Scan failed')
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

  mainHandle<string>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_remove, async({ params: id }) => {
    await global.lx.worker.dbService.removeMediaConnection(id)
  })

  mainHandle<string, LX.DBService.MediaConnection | null>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_scan, async({ params: id }) => {
    const connections = await global.lx.worker.dbService.getMediaConnections()
    const connection = connections.find((item: LX.DBService.MediaConnection) => item.id === id)
    if (!connection) return null
    await updateConnectionScanStatus(connection, 'scanning', 'Scanning...')
    const reporter = createScanProgressReporter(connection.id)
    try {
      const config = mediaConnectionFromDb(connection)
      reporter.preparing()
      const items = await scanConnection(config, progress => {
        reporter.onScanProgress(progress)
      })
      reporter.saving(items.length)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(connection.id, items)
      const updated = {
        ...connection,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
      }
      await global.lx.worker.dbService.updateMediaConnectionInfo(updated)
      reporter.done(items.length)
      return updated
    } catch (error: any) {
      reporter.error(error?.message ?? 'Scan failed')
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

  mainHandle<LX.Music.MusicInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.media_library_list, async() => {
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
