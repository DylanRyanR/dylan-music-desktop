import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import { sendEvent } from '@main/modules/winMain'
import {
  scanConnection,
  mediaConnectionFromDb,
  mediaConnectionToDb,
  mediaItemToMusicInfo,
  getPlayUrl,
  type MediaConnectionConfig,
  type MediaScanProgress,
} from '@main/modules/mediaLibrary'
import { httpFetch } from '@main/utils/request'

const ONEDRIVE_SCOPE = 'offline_access User.Read Files.Read Files.Read.All Sites.Read.All'
const ONEDRIVE_DEFAULT_TENANT = 'common'

interface OnedriveDeviceCodeResponse {
  device_code?: string
  user_code?: string
  verification_uri?: string
  verification_uri_complete?: string
  expires_in?: number
  interval?: number
  message?: string
  error?: string
  error_description?: string
}

interface OnedriveTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

const sleep = async(ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getOnedriveTenant = (tenant?: string) => (tenant ?? ONEDRIVE_DEFAULT_TENANT).trim() || ONEDRIVE_DEFAULT_TENANT
const getOnedriveTokenEndpoint = (tenant?: string) => `https://login.microsoftonline.com/${encodeURIComponent(getOnedriveTenant(tenant))}/oauth2/v2.0/token`

const toOnedriveDeviceCodeResult = (body: OnedriveDeviceCodeResponse) => {
  if (!body.device_code || !body.user_code || !body.verification_uri || !body.expires_in) {
    throw new Error(body.error_description ?? body.error ?? 'Invalid device code response')
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    verificationUriComplete: body.verification_uri_complete,
    expiresIn: body.expires_in,
    interval: body.interval ?? 5,
    message: body.message ?? '',
  }
}

const persistConnectionConfigIfChanged = async(connection: LX.DBService.MediaConnection, config: MediaConnectionConfig) => {
  const nextConfig = JSON.stringify(config)
  if (nextConfig === connection.config) return
  await global.lx.worker.dbService.updateMediaConnectionInfo({
    ...connection,
    config: nextConfig,
  })
}

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

  mainHandle<{ clientId: string, tenant?: string }, {
    deviceCode: string
    userCode: string
    verificationUri: string
    verificationUriComplete?: string
    expiresIn: number
    interval: number
    message?: string
  }>(WIN_MAIN_RENDERER_EVENT_NAME.media_onedrive_device_code_start, async({ params }) => {
    const clientId = params.clientId?.trim()
    if (!clientId) throw new Error('OneDrive client ID is required')
    const response = await httpFetch<OnedriveDeviceCodeResponse>(getOnedriveTokenEndpoint(params.tenant).replace('/token', '/devicecode'), {
      method: 'POST',
      form: {
        client_id: clientId,
        scope: ONEDRIVE_SCOPE,
      },
      headers: {
        Accept: 'application/json',
      },
      timeout: 25000,
    })
    if ((response.statusCode ?? 500) >= 400) {
      throw new Error(response.body.error_description ?? response.body.error ?? 'Failed to start OneDrive device code flow')
    }
    return toOnedriveDeviceCodeResult(response.body)
  })

  mainHandle<{ clientId: string, tenant?: string, deviceCode: string, interval?: number, expiresIn?: number }, {
    accessToken: string
    refreshToken: string
    expiresIn: number
    accountName: string
    accountId: string
  }>(WIN_MAIN_RENDERER_EVENT_NAME.media_onedrive_device_code_poll, async({ params }) => {
    const clientId = params.clientId?.trim()
    const deviceCode = params.deviceCode?.trim()
    if (!clientId || !deviceCode) throw new Error('OneDrive device code info is missing')
    const pollIntervalSec = Math.max(2, params.interval ?? 5)
    const expiresIn = Math.max(60, params.expiresIn ?? 900)
    const deadline = Date.now() + expiresIn * 1000

    while (Date.now() < deadline) {
      const tokenRes = await httpFetch<OnedriveTokenResponse>(getOnedriveTokenEndpoint(params.tenant), {
        method: 'POST',
        form: {
          client_id: clientId,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
        },
        headers: {
          Accept: 'application/json',
        },
        timeout: 25000,
      })
      const tokenBody = tokenRes.body
      if ((tokenRes.statusCode ?? 500) < 400 && tokenBody.access_token && tokenBody.refresh_token) {
        const profileRes = await httpFetch<{ id?: string, displayName?: string }>('https://graph.microsoft.com/v1.0/me?$select=id,displayName', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenBody.access_token}`,
            Accept: 'application/json',
          },
          timeout: 20000,
        })
        return {
          accessToken: tokenBody.access_token,
          refreshToken: tokenBody.refresh_token,
          expiresIn: tokenBody.expires_in ?? 3600,
          accountName: profileRes.body.displayName ?? '',
          accountId: profileRes.body.id ?? '',
        }
      }

      if (tokenBody.error === 'authorization_pending') {
        await sleep(pollIntervalSec * 1000)
        continue
      }
      if (tokenBody.error === 'slow_down') {
        await sleep((pollIntervalSec + 3) * 1000)
        continue
      }
      if (tokenBody.error === 'authorization_declined') {
        throw new Error('Authorization declined on Microsoft page')
      }
      if (tokenBody.error === 'expired_token') {
        throw new Error('Device code expired, please restart authorization')
      }
      throw new Error(tokenBody.error_description ?? tokenBody.error ?? 'OneDrive authorization failed')
    }

    throw new Error('Device code authorization timed out, please retry')
  })

  mainHandle<any, LX.DBService.MediaConnection>(WIN_MAIN_RENDERER_EVENT_NAME.media_connection_save, async({ params }) => {
    const now = Date.now()
    const config: MediaConnectionConfig = {
      ...params,
      status: 'scanning',
      lastScanAt: now,
      lastScanStatus: 'scanning',
      lastScanSummary: 'Scanning...',
      isEnabled: params.isEnabled !== false,
    }
    const dbConnection = mediaConnectionToDb(config)
    await global.lx.worker.dbService.saveMediaConnection(dbConnection)
    const reporter = createScanProgressReporter(dbConnection.id)
    try {
      reporter.preparing()
      const items = await scanConnection(config, progress => {
        reporter.onScanProgress(progress)
      })
      reporter.saving(items.length)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(dbConnection.id, items)
      const scannedConnection = mediaConnectionToDb({
        ...config,
        id: dbConnection.id,
        name: dbConnection.name,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
        isEnabled: !!dbConnection.isEnabled,
      })
      await global.lx.worker.dbService.updateMediaConnectionInfo(scannedConnection)
      reporter.done(items.length)
      return scannedConnection
    } catch (error: any) {
      reporter.error(error?.message ?? 'Scan failed')
      const failedConnection = mediaConnectionToDb({
        ...config,
        id: dbConnection.id,
        name: dbConnection.name,
        status: 'error',
        lastScanAt: Date.now(),
        lastScanStatus: 'error',
        lastScanSummary: error?.message ?? 'Scan failed',
        isEnabled: !!dbConnection.isEnabled,
      })
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
    const config = mediaConnectionFromDb(connection)
    try {
      reporter.preparing()
      const items = await scanConnection(config, progress => {
        reporter.onScanProgress(progress)
      })
      reporter.saving(items.length)
      await global.lx.worker.dbService.overwriteMediaItemsByConnection(connection.id, items)
      const updated = mediaConnectionToDb({
        ...config,
        id: connection.id,
        name: connection.name,
        status: 'idle',
        lastScanAt: Date.now(),
        lastScanStatus: 'success',
        lastScanSummary: `${items.length} files`,
        isEnabled: !!connection.isEnabled,
      })
      await global.lx.worker.dbService.updateMediaConnectionInfo(updated)
      reporter.done(items.length)
      return updated
    } catch (error: any) {
      reporter.error(error?.message ?? 'Scan failed')
      const updated = mediaConnectionToDb({
        ...config,
        id: connection.id,
        name: connection.name,
        status: 'error',
        lastScanAt: Date.now(),
        lastScanStatus: 'error',
        lastScanSummary: error?.message ?? 'Scan failed',
        isEnabled: !!connection.isEnabled,
      })
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
    const config = mediaConnectionFromDb(connection)
    const playUrl = await getPlayUrl(config, item)
    await persistConnectionConfigIfChanged(connection, config)
    return playUrl
  })
}
