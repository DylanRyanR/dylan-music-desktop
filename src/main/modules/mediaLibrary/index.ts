
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import cp from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { createClient } from 'webdav'
import SMB2 from '@marsaud/smb2'
import { parseFile } from 'music-metadata'
import { formatPlayTime } from '@common/utils/common'

const AUDIO_EXTS = new Set(['mp3', 'flac', 'm4a', 'aac', 'wav', 'ogg', 'opus'])
const CACHE_DIR = path.join(os.tmpdir(), 'lxmusic_media_cache')
const execFile = promisify(cp.execFile)

export interface MediaConnectionConfig {
  id: string
  type: 'smb' | 'webdav'
  name: string
  host?: string
  port?: number
  share?: string
  rootPath?: string
  url?: string
  username?: string
  password?: string
  domain?: string
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

const normalizeRemotePath = (inputPath: string) => {
  if (!inputPath) return '/'
  const normalized = inputPath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
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
    const fullPath = path.win32.join(dirPath, entry.name)
    if (entry.isDirectory()) await walkNativeDir(fullPath, result)
    else result.push(fullPath)
  }
  return result
}

const nativePathToRemotePath = (connection: MediaConnectionConfig, nativePath: string) => {
  const normalizedNativePath = path.win32.normalize(nativePath)
  const normalizedRoot = path.win32.normalize(getSmbUncRoot(connection))
  const relative = normalizedNativePath.toLowerCase().startsWith(normalizedRoot.toLowerCase())
    ? normalizedNativePath.slice(normalizedRoot.length)
    : path.win32.relative(normalizedRoot, normalizedNativePath)
  return normalizeRemotePath(relative.replace(/\\/g, '/'))
}

const tryScanSmbNativeWindows = async(connection: MediaConnectionConfig): Promise<MediaScannedItem[] | null> => {
  if (process.platform !== 'win32') return null
  await connectWindowsSmb(connection)
  const cacheDir = await ensureCacheDir()
  const root = getSmbUncPath(connection, connection.rootPath ?? '/')
  const files = await walkNativeDir(root)
  const result: MediaScannedItem[] = []
  for (const nativePath of files) {
    const fileName = path.win32.basename(nativePath)
    if (!isAudioFile(fileName)) continue
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
  const meta = JSON.parse(item.meta) as Record<string, any>
  return {
    id: item.id,
    name: item.title,
    singer: item.artist,
    source: 'media' as LX.Source,
    interval: item.interval,
    meta: {
      songId: item.id,
      albumName: item.album,
      filePath: item.path,
      ext: item.ext,
      connectionId: item.connectionId,
      connectionName: connectionNameMap.get(item.connectionId) ?? '',
      type: meta.type,
      versionToken: item.versionToken,
      picUrl: null,
    } as any,
  } as LX.Music.MusicInfo
}

const readMetadata = async(filePath: string) => {
  try {
    const metadata = await parseFile(filePath)
    return {
      title: (metadata.common.title || path.basename(filePath, path.extname(filePath))).trim(),
      artist: metadata.common.artists?.length ? metadata.common.artists.join('、') : '',
      album: metadata.common.album?.trim() ?? '',
      interval: metadata.format.duration ? formatPlayTime(metadata.format.duration) : null,
    }
  } catch {
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: '',
      album: '',
      interval: null,
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

  // Compatibility enhancement:
  // 1. If domain is provided, use it.
  // 2. If domain is empty but username is present, default to 'WORKGROUP'.
  //    This avoids the INVALID_PARAMETER error and covers standard Samba setups.
  // 3. If username is also empty (anonymous), domain remains empty.
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

const mapItem = (connection: MediaConnectionConfig, itemPath: string, fileName: string, fileSize: number, mtime: number, metadata: Awaited<ReturnType<typeof readMetadata>>): MediaScannedItem => {
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
    }),
  }
}

const scanWebdav = async(connection: MediaConnectionConfig): Promise<MediaScannedItem[]> => {
  const client = createWebdavClient(connection)
  const root = normalizeRemotePath(connection.rootPath ?? '/')
  const contents = await client.getDirectoryContents(root, { deep: true }) as any[]
  const cacheDir = await ensureCacheDir()
  const result: MediaScannedItem[] = []
  for (const entry of contents) {
    if (entry.type !== 'file') continue
    const filename = String(entry.basename || path.basename(entry.filename || ''))
    if (!isAudioFile(filename)) continue
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

const scanSmb = async(connection: MediaConnectionConfig): Promise<MediaScannedItem[]> => {
  if (process.platform === 'win32') {
    try {
      const result = await tryScanSmbNativeWindows(connection)
      if (result) return result
    } catch {}
  }

  const client = createSmbClient(connection)
  const cacheDir = await ensureCacheDir()
  const root = normalizeRemotePath(connection.rootPath ?? '/')
  try {
    const files = await walkSmb(client, root)
    const result: MediaScannedItem[] = []
    for (const remotePath of files) {
      const fileName = path.posix.basename(remotePath)
      if (!isAudioFile(fileName)) continue
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

export const scanConnection = async(connection: MediaConnectionConfig): Promise<MediaScannedItem[]> => {
  if (connection.type === 'webdav') return scanWebdav(connection)
  if (connection.type === 'smb') return scanSmb(connection)
  throw new Error(`Unsupported media connection type: ${connection.type}`)
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

  throw new Error('Unsupported media source')
}

export const mediaConnectionToDb = toDbConnection
export const mediaConnectionFromDb = fromDbConnection
export const mediaItemToMusicInfo = toMediaMusicInfo
