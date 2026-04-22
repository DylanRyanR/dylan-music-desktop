
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import cp from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { createClient } from 'webdav'
import SMB2 from '@marsaud/smb2'
import { parseFile } from 'music-metadata'
import { formatPlayTime, encodePath } from '@common/utils/common'
import { httpFetch } from '@main/utils/request'

const AUDIO_EXTS = new Set(['mp3', 'flac', 'm4a', 'aac', 'wav', 'ogg', 'opus'])
const CACHE_DIR = path.join(os.tmpdir(), 'lxmusic_media_cache')
const execFile = promisify(cp.execFile)

export interface MediaConnectionConfig {
  id: string
  type: 'smb' | 'webdav' | 'local' | 'onedrive'
  name: string
  host?: string
  port?: number
  share?: string
  rootPath?: string
  url?: string
  localPath?: string
  username?: string
  password?: string
  domain?: string
  clientId?: string
  tenant?: string
  shareLink?: string
  refreshToken?: string
  accountName?: string
  accountId?: string
  status?: string | null
  lastScanAt?: number | null
  lastScanStatus?: string | null
  lastScanSummary?: string | null
  isEnabled?: boolean
}

export interface MediaScannedItem {
  id: string
  connectionId: string
  path: string
  fileName: string
  title: string
  artist: string
  album: string
  interval: string | null
  fileSize: number
  mtime: number
  ext: string
  versionToken: string
  meta: string
}

interface MediaParsedMetadata {
  title: string
  artist: string
  album: string
  interval: string | null
  picUrl: string | null
}

export interface MediaScanProgress {
  stage: 'discovering' | 'scanning'
  current: number
  total: number
}

export type MediaScanProgressHandler = (progress: MediaScanProgress) => void

interface OnedriveTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface OnedriveGraphErrorResponse {
  error?: {
    code?: string
    message?: string
  }
}

interface OnedriveAudioFacet {
  album?: string
  artist?: string
  duration?: number
}

interface OnedriveParentReference {
  driveId?: string
  id?: string
  path?: string
}

interface OnedriveDriveItem {
  id: string
  name: string
  size?: number
  file?: {
    mimeType?: string
  }
  folder?: {
    childCount?: number
  }
  audio?: OnedriveAudioFacet
  lastModifiedDateTime?: string
  webUrl?: string
  parentReference?: OnedriveParentReference
}

interface OnedriveDriveChildrenResponse {
  value?: OnedriveDriveItem[]
  '@odata.nextLink'?: string
}

const ONEDRIVE_GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'
const ONEDRIVE_SCOPE = 'offline_access User.Read Files.Read Files.Read.All Sites.Read.All'
const ONEDRIVE_DEFAULT_TENANT = 'common'

const normalizeRemotePath = (inputPath: string) => {
  if (!inputPath) return '/'
  const normalized = inputPath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const normalizeLocalPath = (inputPath?: string) => {
  if (!inputPath) return ''
  return path.normalize(inputPath)
}

const getLocalRootPath = (connection: MediaConnectionConfig) => {
  const localRoot = normalizeLocalPath(connection.localPath)
  if (!localRoot) throw new Error('local folder path is required')
  return localRoot
}

const normalizeSmbShareName = (share?: string) => {
  if (!share) return ''
  return share.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '')
}

const getSmbUncRoot = (connection: MediaConnectionConfig) => {
  if (!connection.host || !connection.share) throw new Error('smb host/share is required')
  const shareName = normalizeSmbShareName(connection.share)
  return `\\\\${connection.host}\\${shareName}`
}

const getSmbUncPath = (connection: MediaConnectionConfig, remotePath: string) => {
  const uncRoot = getSmbUncRoot(connection)
  const normalized = normalizeRemotePath(remotePath).replace(/^\//, '').replace(/\//g, '\\')
  return normalized ? `${uncRoot}\\${normalized}` : uncRoot
}

const connectWindowsSmb = async(connection: MediaConnectionConfig) => {
  const uncRoot = getSmbUncRoot(connection)
  const args = ['use', uncRoot]
  if (connection.password) args.push(connection.password)
  if (connection.username) args.push(`/user:${connection.username}`)
  args.push('/persistent:no')
  try {
    await execFile('net', args, { windowsHide: true })
  } catch (err: any) {
    const output = [err?.stdout, err?.stderr, err?.message].filter(Boolean).join('\n')
    if (!/multiple connections|The command completed successfully|已成功完成|1219/i.test(output)) throw err
  }
}

const walkNativeDir = async(dirPath: string, result: string[] = []) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) await walkNativeDir(fullPath, result)
    else result.push(fullPath)
  }
  return result
}

const nativePathToRemotePath = (connection: MediaConnectionConfig, nativePath: string) => {
  const normalizedNativePath = path.normalize(nativePath)
  const normalizedRoot = path.normalize(getSmbUncRoot(connection))
  const relative = normalizedNativePath.toLowerCase().startsWith(normalizedRoot.toLowerCase())
    ? normalizedNativePath.slice(normalizedRoot.length)
    : path.relative(normalizedRoot, normalizedNativePath)
  return normalizeRemotePath(relative.replace(/\\/g, '/'))
}

const nativePathToLocalRelativePath = (connection: MediaConnectionConfig, nativePath: string) => {
  const normalizedNativePath = path.normalize(nativePath)
  const normalizedRoot = path.normalize(getLocalRootPath(connection))
  const relative = path.relative(normalizedRoot, normalizedNativePath)
  return normalizeRemotePath(relative.replace(/\\/g, '/'))
}

const tryScanSmbNativeWindows = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[] | null> => {
  if (process.platform !== 'win32') return null
  await connectWindowsSmb(connection)
  const cacheDir = await ensureCacheDir()
  const root = getSmbUncPath(connection, connection.rootPath ?? '/')
  const files = await walkNativeDir(root)
  const audioFiles = files.filter(nativePath => isAudioFile(path.basename(nativePath)))
  onProgress?.({
    stage: 'discovering',
    current: 0,
    total: audioFiles.length,
  })
  const result: MediaScannedItem[] = []
  let current = 0
  for (const nativePath of audioFiles) {
    current += 1
    onProgress?.({
      stage: 'scanning',
      current,
      total: audioFiles.length,
    })
    const fileName = path.basename(nativePath)
    const stat = await fs.stat(nativePath)
    const data = await fs.readFile(nativePath)
    const tempPath = path.join(cacheDir, `${connection.id}_${sanitizeName(fileName)}`)
    await fs.writeFile(tempPath, data)
    const metadata = await readMetadata(tempPath)
    const remotePath = nativePathToRemotePath(connection, nativePath)
    result.push(mapItem(connection, remotePath, fileName, stat.size, stat.mtimeMs, metadata))
  }
  return result
}

const tryGetSmbPlayUrlNativeWindows = async(connection: MediaConnectionConfig, item: LX.DBService.MediaItem) => {
  if (process.platform !== 'win32') return null
  await connectWindowsSmb(connection)
  const nativePath = getSmbUncPath(connection, item.path)
  const cacheDir = await ensureCacheDir()
  const cachePath = path.join(cacheDir, `${item.id}.${item.ext || 'tmp'}`)
  const data = await fs.readFile(nativePath)
  await fs.writeFile(cachePath, data)
  return cachePath
}

const getExt = (filePath: string) => filePath.split('.').pop()?.toLowerCase() ?? ''
const isAudioFile = (filePath: string) => AUDIO_EXTS.has(getExt(filePath))
const getVersionToken = (filePath: string, size: number, mtime: number) => `${filePath}__${size}__${mtime}`
const getItemId = (connectionId: string, filePath: string) => createHash('md5').update(`${connectionId}:${filePath}`).digest('hex')
const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]+/g, '_')

const ensureCacheDir = async() => {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  return CACHE_DIR
}

const writeBufferToFile = async(filePath: string, data: Buffer | string) => {
  await fs.writeFile(filePath, Buffer.isBuffer(data) ? data : Buffer.from(data))
}

const toDbConnection = (connection: MediaConnectionConfig): LX.DBService.MediaConnection => ({
  id: connection.id,
  type: connection.type,
  name: connection.name,
  config: JSON.stringify(connection),
  status: connection.status ?? null,
  lastScanAt: connection.lastScanAt ?? null,
  lastScanStatus: connection.lastScanStatus ?? null,
  lastScanSummary: connection.lastScanSummary ?? null,
  isEnabled: connection.isEnabled === false ? 0 : 1,
})

const fromDbConnection = (connection: LX.DBService.MediaConnection): MediaConnectionConfig => {
  const parsed = JSON.parse(connection.config) as MediaConnectionConfig
  return {
    ...parsed,
    id: connection.id,
    type: connection.type,
    name: connection.name,
    status: connection.status,
    lastScanAt: connection.lastScanAt,
    lastScanStatus: connection.lastScanStatus,
    lastScanSummary: connection.lastScanSummary,
    isEnabled: !!connection.isEnabled,
  }
}

const toMediaMusicInfo = (item: LX.DBService.MediaItem, connectionNameMap: Map<string, string>): LX.Music.MusicInfo => {
  const meta = JSON.parse(item.meta) as Record<string, unknown>
  const connectionType = (typeof meta.type === 'string' ? meta.type : 'smb') as LX.Music.MusicInfoMeta_media['connectionType']
  const picUrl = typeof meta.picUrl === 'string' ? meta.picUrl : null
  const musicMeta: LX.Music.MusicInfoMeta_media = {
    songId: item.id,
    albumName: item.album,
    filePath: item.path,
    ext: item.ext,
    connectionId: item.connectionId,
    connectionName: connectionNameMap.get(item.connectionId) ?? '',
    connectionType,
    versionToken: item.versionToken,
    picUrl,
  }
  return {
    id: item.id,
    name: item.title,
    singer: item.artist,
    source: 'media',
    interval: item.interval,
    meta: musicMeta,
  }
}

const readMetadata = async(filePath: string): Promise<MediaParsedMetadata> => {
  try {
    const metadata = await parseFile(filePath)
    const picture = metadata.common.picture?.[0]
    return {
      title: (metadata.common.title ?? path.basename(filePath, path.extname(filePath))).trim(),
      artist: metadata.common.artists?.length ? metadata.common.artists.join('、') : '',
      album: metadata.common.album?.trim() ?? '',
      interval: metadata.format.duration ? formatPlayTime(metadata.format.duration) : null,
      picUrl: picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : null,
    }
  } catch {
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: '',
      album: '',
      interval: null,
      picUrl: null,
    }
  }
}

const createWebdavClient = (connection: MediaConnectionConfig) => {
  if (!connection.url) throw new Error('webdav url is required')
  return createClient(connection.url, {
    username: connection.username,
    password: connection.password,
  })
}

const createSmbClient = (connection: MediaConnectionConfig) => {
  if (!connection.host || !connection.share) throw new Error('smb host/share is required')
  const sharePath = `\\\\${connection.host}${connection.port ? `:${connection.port}` : ''}\\${connection.share}`

  let domain_for_smb2 = connection.domain
  if (!domain_for_smb2 && connection.username) {
    domain_for_smb2 = 'WORKGROUP'
  }

  return new SMB2({
    share: sharePath,
    domain: domain_for_smb2 ?? '',
    username: connection.username ?? '',
    password: connection.password ?? '',
    autoCloseTimeout: 0,
  })
}

const isHttpFailureStatus = (statusCode?: number) => (statusCode ?? 500) >= 400

const getOnedriveTenant = (connection: MediaConnectionConfig) => (connection.tenant ?? ONEDRIVE_DEFAULT_TENANT).trim() || ONEDRIVE_DEFAULT_TENANT

const getOnedriveTokenEndpoint = (tenant: string) => `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`

const ensureOnedriveAuthConfig = (connection: MediaConnectionConfig) => {
  const clientId = connection.clientId?.trim()
  const refreshToken = connection.refreshToken?.trim()
  if (!clientId) throw new Error('OneDrive client ID is required')
  if (!refreshToken) throw new Error('OneDrive authorization is required, please authorize again')
  return {
    clientId,
    refreshToken,
    tenant: getOnedriveTenant(connection),
  }
}

const getOnedriveErrorMessage = (body: OnedriveTokenResponse | OnedriveGraphErrorResponse | null | undefined, fallback: string) => {
  if (!body) return fallback
  if ('error_description' in body && typeof body.error_description === 'string' && body.error_description) {
    return body.error_description
  }
  if ('error' in body) {
    const error = body.error
    if (typeof error === 'string' && error) return error
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message) {
      return error.message
    }
  }
  return fallback
}

const refreshOnedriveAccessToken = async(connection: MediaConnectionConfig) => {
  const auth = ensureOnedriveAuthConfig(connection)
  const response = await httpFetch<OnedriveTokenResponse>(getOnedriveTokenEndpoint(auth.tenant), {
    method: 'POST',
    form: {
      client_id: auth.clientId,
      scope: ONEDRIVE_SCOPE,
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
    },
    headers: {
      Accept: 'application/json',
    },
    timeout: 25000,
  })
  if (isHttpFailureStatus(response.statusCode) || !response.body?.access_token) {
    const body = response.body
    if (body?.error === 'invalid_grant') {
      throw new Error('OneDrive token expired, please authorize again')
    }
    throw new Error(getOnedriveErrorMessage(body, 'Failed to refresh OneDrive token'))
  }
  if (response.body.refresh_token?.trim()) {
    connection.refreshToken = response.body.refresh_token.trim()
  }
  return response.body.access_token
}

const onedriveGraphGetJson = async<T>(accessToken: string, url: string) => {
  const response = await httpFetch<T | OnedriveGraphErrorResponse>(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    timeout: 30000,
  })
  if (isHttpFailureStatus(response.statusCode)) {
    const body = response.body as OnedriveGraphErrorResponse
    if (response.statusCode === 401 || body?.error?.code === 'InvalidAuthenticationToken') {
      throw new Error('OneDrive authorization expired, please authorize again')
    }
    throw new Error(getOnedriveErrorMessage(body, `OneDrive API request failed (${response.statusCode})`))
  }
  return response.body as T
}

const onedriveGraphGetBytes = async(accessToken: string, url: string) => {
  const response = await httpFetch<unknown>(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    needRaw: true,
    timeout: 120000,
  })
  if (isHttpFailureStatus(response.statusCode)) {
    throw new Error(`OneDrive file download failed (${response.statusCode})`)
  }
  return Buffer.from(response.raw ?? new Uint8Array())
}

const toOnedriveShareId = (shareLink: string) => {
  const encoded = Buffer.from(shareLink).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `u!${encoded}`
}

const getOnedriveRoot = async(connection: MediaConnectionConfig, accessToken: string) => {
  const shareLink = connection.shareLink?.trim()
  if (shareLink) {
    const shareId = toOnedriveShareId(shareLink)
    const item = await onedriveGraphGetJson<OnedriveDriveItem>(accessToken, `${ONEDRIVE_GRAPH_ROOT}/shares/${shareId}/driveItem?$select=id,name,size,file,folder,audio,lastModifiedDateTime,parentReference,webUrl`)
    const driveId = item.parentReference?.driveId
    if (!driveId) throw new Error('Cannot resolve drive info from share link')
    return {
      driveId,
      item,
    }
  }
  const item = await onedriveGraphGetJson<OnedriveDriveItem>(accessToken, `${ONEDRIVE_GRAPH_ROOT}/me/drive/root?$select=id,name,size,file,folder,audio,lastModifiedDateTime,parentReference,webUrl`)
  let driveId = item.parentReference?.driveId
  if (!driveId) {
    const drive = await onedriveGraphGetJson<{ id?: string }>(accessToken, `${ONEDRIVE_GRAPH_ROOT}/me/drive?$select=id`)
    driveId = drive.id
  }
  if (!driveId) throw new Error('Cannot resolve OneDrive drive ID')
  return {
    driveId,
    item,
  }
}

const listOnedriveChildren = async(accessToken: string, driveId: string, itemId: string) => {
  let nextLink: string | undefined = `${ONEDRIVE_GRAPH_ROOT}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$top=200&$select=id,name,size,file,folder,audio,lastModifiedDateTime,parentReference,webUrl`
  const result: OnedriveDriveItem[] = []
  while (nextLink) {
    const page: OnedriveDriveChildrenResponse = await onedriveGraphGetJson<OnedriveDriveChildrenResponse>(accessToken, nextLink)
    if (Array.isArray(page.value)) result.push(...page.value)
    nextLink = page['@odata.nextLink']
  }
  return result
}

const onedriveMetadataFromItem = (item: OnedriveDriveItem): MediaParsedMetadata => {
  const title = path.basename(item.name, path.extname(item.name)).trim() || item.name
  const duration = Number(item.audio?.duration ?? 0)
  return {
    title,
    artist: item.audio?.artist?.trim() ?? '',
    album: item.audio?.album?.trim() ?? '',
    interval: duration > 0 ? formatPlayTime(duration / 1000) : null,
    picUrl: null,
  }
}

const mapItem = (
  connection: MediaConnectionConfig,
  itemPath: string,
  fileName: string,
  fileSize: number,
  mtime: number,
  metadata: MediaParsedMetadata,
  extraMeta: Record<string, unknown> = {},
): MediaScannedItem => {
  const ext = getExt(fileName)
  const versionToken = getVersionToken(itemPath, fileSize, mtime)
  return {
    id: getItemId(connection.id, itemPath),
    connectionId: connection.id,
    path: itemPath,
    fileName,
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    interval: metadata.interval,
    fileSize,
    mtime,
    ext,
    versionToken,
    meta: JSON.stringify({
      type: connection.type,
      connectionName: connection.name,
      rootPath: connection.rootPath ?? '/',
      localPath: connection.localPath ?? '',
      picUrl: metadata.picUrl,
      ...extraMeta,
    }),
  }
}

const scanWebdav = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[]> => {
  const client = createWebdavClient(connection)
  const root = normalizeRemotePath(connection.rootPath ?? '/')
  const contents = await client.getDirectoryContents(root, { deep: true }) as any[]
  const files = contents.filter(entry => {
    if (entry.type !== 'file') return false
    const filename = String(entry.basename || path.basename(entry.filename || ''))
    return isAudioFile(filename)
  })
  onProgress?.({
    stage: 'discovering',
    current: 0,
    total: files.length,
  })
  const cacheDir = await ensureCacheDir()
  const result: MediaScannedItem[] = []
  let current = 0
  for (const entry of files) {
    current += 1
    onProgress?.({
      stage: 'scanning',
      current,
      total: files.length,
    })
    const filename = String(entry.basename || path.basename(entry.filename || ''))
    const remotePath = normalizeRemotePath(String(entry.filename || filename))
    const tempPath = path.join(cacheDir, `${connection.id}_${sanitizeName(filename)}`)
    const data = await client.getFileContents(remotePath)
    await writeBufferToFile(tempPath, data as Buffer | string)
    const metadata = await readMetadata(tempPath)
    const statMtime = entry.lastmod ? new Date(entry.lastmod).getTime() : Date.now()
    const size = Number(entry.size ?? 0)
    result.push(mapItem(connection, remotePath, filename, size, statMtime, metadata))
  }
  return result
}

const scanLocal = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[]> => {
  const root = getLocalRootPath(connection)
  const stats = await fs.stat(root)
  if (!stats.isDirectory()) throw new Error('Local folder path must be a directory')
  const files = await walkNativeDir(root)
  const audioFiles = files.filter(filePath => isAudioFile(path.basename(filePath)))
  onProgress?.({
    stage: 'discovering',
    current: 0,
    total: audioFiles.length,
  })
  const result: MediaScannedItem[] = []
  let current = 0
  for (const filePath of audioFiles) {
    current += 1
    onProgress?.({
      stage: 'scanning',
      current,
      total: audioFiles.length,
    })
    const fileName = path.basename(filePath)
    const stat = await fs.stat(filePath)
    const metadata = await readMetadata(filePath)
    result.push(mapItem(connection, nativePathToLocalRelativePath(connection, filePath), fileName, stat.size, stat.mtimeMs, metadata))
  }
  return result
}

const smbReaddir = async(client: any, targetPath: string): Promise<string[]> => new Promise((resolve, reject) => {
  client.readdir(targetPath, (err: Error | null, files: string[]) => {
    if (err) reject(err)
    else resolve(files)
  })
})

const smbStat = async(client: any, targetPath: string): Promise<any> => new Promise((resolve, reject) => {
  client.stat(targetPath, (err: Error | null, stats: any) => {
    if (err) reject(err)
    else resolve(stats)
  })
})

const smbReadFile = async(client: any, targetPath: string): Promise<Buffer> => new Promise((resolve, reject) => {
  client.readFile(targetPath, (err: Error | null, data: Buffer) => {
    if (err) reject(err)
    else resolve(data)
  })
})

const walkSmb = async(client: any, currentPath: string, result: string[] = []) => {
  const names = await smbReaddir(client, currentPath)
  for (const name of names) {
    const nextPath = path.posix.join(currentPath.replace(/\\/g, '/'), name)
    const stats = await smbStat(client, nextPath)
    if (stats.isDirectory?.()) await walkSmb(client, nextPath, result)
    else result.push(nextPath)
  }
  return result
}

const scanSmb = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[]> => {
  if (process.platform === 'win32') {
    try {
      const result = await tryScanSmbNativeWindows(connection, onProgress)
      if (result) return result
    } catch {}
  }

  const client = createSmbClient(connection)
  const cacheDir = await ensureCacheDir()
  const root = normalizeRemotePath(connection.rootPath ?? '/')
  try {
    const files = await walkSmb(client, root)
    const audioFiles = files.filter(remotePath => isAudioFile(path.posix.basename(remotePath)))
    onProgress?.({
      stage: 'discovering',
      current: 0,
      total: audioFiles.length,
    })
    const result: MediaScannedItem[] = []
    let current = 0
    for (const remotePath of audioFiles) {
      current += 1
      onProgress?.({
        stage: 'scanning',
        current,
        total: audioFiles.length,
      })
      const fileName = path.posix.basename(remotePath)
      const stats = await smbStat(client, remotePath)
      const data = await smbReadFile(client, remotePath)
      const tempPath = path.join(cacheDir, `${connection.id}_${sanitizeName(fileName)}`)
      await fs.writeFile(tempPath, data)
      const metadata = await readMetadata(tempPath)
      result.push(mapItem(connection, remotePath, fileName, Number(stats.size ?? data.length), new Date(stats.mtime ?? Date.now()).getTime(), metadata))
    }
    return result
  } catch (err: any) {
    if (err.message?.includes('STATUS_ACCESS_DENIED')) {
      throw new Error("Access Denied: Bad username, password, or domain. In the 'Domain' field, try your server's name (e.g., 'MYNAS') or its workgroup (e.g., 'WORKGROUP').")
    }
    throw err
  } finally {
    client.disconnect()
  }
}

const scanOnedrive = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[]> => {
  const accessToken = await refreshOnedriveAccessToken(connection)
  const root = await getOnedriveRoot(connection, accessToken)
  const pendingFolders: Array<{ driveId: string, itemId: string, parentPath: string }> = []
  const audioItems: Array<{ driveId: string, item: OnedriveDriveItem, filePath: string }> = []

  const pushAudioItem = (driveId: string, item: OnedriveDriveItem, filePath: string) => {
    if (!item.file || !isAudioFile(item.name)) return
    audioItems.push({
      driveId,
      item,
      filePath: normalizeRemotePath(filePath),
    })
  }

  if (root.item.folder) {
    pendingFolders.push({
      driveId: root.driveId,
      itemId: root.item.id,
      parentPath: '',
    })
  } else {
    pushAudioItem(root.driveId, root.item, root.item.name)
  }

  while (pendingFolders.length) {
    const current = pendingFolders.shift()!
    const children = await listOnedriveChildren(accessToken, current.driveId, current.itemId)
    for (const child of children) {
      const childPath = path.posix.join(current.parentPath, child.name)
      if (child.folder) {
        pendingFolders.push({
          driveId: current.driveId,
          itemId: child.id,
          parentPath: childPath,
        })
        continue
      }
      pushAudioItem(current.driveId, child, childPath)
    }
  }

  onProgress?.({
    stage: 'discovering',
    current: 0,
    total: audioItems.length,
  })

  const result: MediaScannedItem[] = []
  let current = 0
  for (const itemInfo of audioItems) {
    current += 1
    onProgress?.({
      stage: 'scanning',
      current,
      total: audioItems.length,
    })
    const metadata = onedriveMetadataFromItem(itemInfo.item)
    const mtime = itemInfo.item.lastModifiedDateTime ? new Date(itemInfo.item.lastModifiedDateTime).getTime() : Date.now()
    result.push(mapItem(
      connection,
      itemInfo.filePath,
      itemInfo.item.name,
      Number(itemInfo.item.size ?? 0),
      mtime,
      metadata,
      {
        onedriveDriveId: itemInfo.driveId,
        onedriveItemId: itemInfo.item.id,
        onedriveWebUrl: itemInfo.item.webUrl ?? '',
        onedriveShareLink: connection.shareLink?.trim() ?? '',
      },
    ))
  }

  return result
}

export const scanConnection = async(connection: MediaConnectionConfig, onProgress?: MediaScanProgressHandler): Promise<MediaScannedItem[]> => {
  if (connection.type === 'webdav') return scanWebdav(connection, onProgress)
  if (connection.type === 'smb') return scanSmb(connection, onProgress)
  if (connection.type === 'local') return scanLocal(connection, onProgress)
  if (connection.type === 'onedrive') return scanOnedrive(connection, onProgress)
  throw new Error('Unsupported media connection type')
}

const getLocalFilePath = (connection: MediaConnectionConfig, itemPath: string) => {
  const root = getLocalRootPath(connection)
  const relative = normalizeRemotePath(itemPath).replace(/^\//, '')
  return path.join(root, relative)
}

const readOnedriveMeta = (item: LX.DBService.MediaItem) => {
  try {
    const meta = JSON.parse(item.meta) as Record<string, unknown>
    const driveId = typeof meta.onedriveDriveId === 'string' ? meta.onedriveDriveId : ''
    const itemId = typeof meta.onedriveItemId === 'string' ? meta.onedriveItemId : ''
    return {
      driveId,
      itemId,
    }
  } catch {
    return {
      driveId: '',
      itemId: '',
    }
  }
}

export const getPlayUrl = async(connection: MediaConnectionConfig, item: LX.DBService.MediaItem) => {
  const cacheDir = await ensureCacheDir()
  const cachePath = path.join(cacheDir, `${item.id}.${item.ext || 'tmp'}`)
  try {
    await fs.access(cachePath)
    return cachePath
  } catch {}

  if (connection.type === 'webdav') {
    const client = createWebdavClient(connection)
    const data = await client.getFileContents(item.path)
    await writeBufferToFile(cachePath, data as Buffer | string)
    return cachePath
  }

  if (connection.type === 'smb') {
    if (process.platform === 'win32') {
      try {
        const nativePath = await tryGetSmbPlayUrlNativeWindows(connection, item)
        if (nativePath) return nativePath
      } catch {}
    }

    const client = createSmbClient(connection)
    try {
      const data = await smbReadFile(client, item.path)
      await fs.writeFile(cachePath, data)
      return cachePath
    } finally {
      client.disconnect()
    }
  }

  if (connection.type === 'local') {
    const filePath = getLocalFilePath(connection, item.path)
    await fs.access(filePath, fsSync.constants.R_OK)
    return `file:///${encodePath(filePath)}`
  }

  if (connection.type === 'onedrive') {
    const meta = readOnedriveMeta(item)
    if (!meta.driveId || !meta.itemId) {
      throw new Error('OneDrive media item metadata is missing, please rescan this connection')
    }
    const accessToken = await refreshOnedriveAccessToken(connection)
    const data = await onedriveGraphGetBytes(
      accessToken,
      `${ONEDRIVE_GRAPH_ROOT}/drives/${encodeURIComponent(meta.driveId)}/items/${encodeURIComponent(meta.itemId)}/content`,
    )
    await fs.writeFile(cachePath, data)
    return cachePath
  }

  throw new Error('Unsupported media source')
}

export const mediaConnectionToDb = toDbConnection
export const mediaConnectionFromDb = fromDbConnection
export const mediaItemToMusicInfo = toMediaMusicInfo
