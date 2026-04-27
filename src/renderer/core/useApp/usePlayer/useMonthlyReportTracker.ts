import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { isPlay, playMusicInfo } from '@renderer/store/player/state'
import { playProgress } from '@renderer/store/player/playProgress'
import { trackMonthlyReportSession } from '@renderer/utils/ipc'

interface SessionState {
  songId: string
  songName: string
  artistName: string
  albumName: string
  sourceType: LX.ReportMonthly.SourceType
  listId: string | null
  startedAt: number
  lastProgress: number
  listenSeconds: number
  totalSeconds: number
  isPlaying: boolean
}

const SKIP_COMPLETION_THRESHOLD = 0.8

const parseIntervalSeconds = (interval: string | null | undefined) => {
  if (!interval) return 0
  const parts = interval.split(':').map(part => Number.parseInt(part, 10))
  if (parts.some(num => Number.isNaN(num))) return 0
  let seconds = 0
  let unit = 1
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    seconds += parts[i] * unit
    unit *= 60
  }
  return seconds
}

const mapSourceType = (musicInfo: LX.Download.ListItem | LX.Music.MusicInfo): LX.ReportMonthly.SourceType => {
  if ('progress' in musicInfo) return 'online'
  if (musicInfo.source === 'local') return 'local'
  if (musicInfo.source === 'media') {
    switch (musicInfo.meta.connectionType) {
      case 'local':
      case 'onedrive':
      case 'smb':
      case 'webdav':
        return musicInfo.meta.connectionType
      default:
        return 'other'
    }
  }
  if (musicInfo.source === 'kw' || musicInfo.source === 'kg' || musicInfo.source === 'tx' || musicInfo.source === 'wy' || musicInfo.source === 'mg') return 'online'
  return 'other'
}

const getCurrentMusicMeta = (): Omit<SessionState, 'startedAt' | 'lastProgress' | 'listenSeconds' | 'isPlaying'> | null => {
  const current = playMusicInfo.musicInfo
  if (!current) return null

  if ('progress' in current) {
    const info = current.metadata.musicInfo
    return {
      songId: info.id,
      songName: info.name,
      artistName: info.singer,
      albumName: info.meta.albumName ?? '',
      sourceType: mapSourceType(current),
      listId: current.metadata.listId ?? playMusicInfo.listId ?? null,
      totalSeconds: parseIntervalSeconds(info.interval),
    }
  }

  return {
    songId: current.id,
    songName: current.name,
    artistName: current.singer,
    albumName: current.meta.albumName ?? '',
    sourceType: mapSourceType(current),
    listId: playMusicInfo.listId ?? null,
    totalSeconds: parseIntervalSeconds(current.interval),
  }
}

const createSession = (): SessionState | null => {
  const current = getCurrentMusicMeta()
  if (!current) return null
  return {
    ...current,
    startedAt: Date.now(),
    lastProgress: playProgress.nowPlayTime,
    listenSeconds: 0,
    isPlaying: isPlay.value,
  }
}

export default () => {
  let session: SessionState | null = null

  const syncListenByProgress = () => {
    if (!session) return
    const currentProgress = playProgress.nowPlayTime
    if (currentProgress < 0 || session.lastProgress < 0) return
    const delta = currentProgress - session.lastProgress
    session.lastProgress = currentProgress
    if (delta <= 0 || delta > 4) return
    session.listenSeconds += delta
  }

  const startSession = () => {
    session = createSession()
  }

  const resolveSwitchEndReason = (): LX.ReportMonthly.EndReason => {
    if (!session) return 'switched'
    if (session.totalSeconds <= 0) return 'switched'
    const completionRate = session.listenSeconds / session.totalSeconds
    return completionRate < SKIP_COMPLETION_THRESHOLD ? 'skipped' : 'switched'
  }

  const finishSession = (endReason: LX.ReportMonthly.EndReason) => {
    if (!session) return
    syncListenByProgress()
    const endedAt = Date.now()
    const listenSeconds = Math.max(0, Math.floor(session.listenSeconds))
    if (listenSeconds > 0) {
      const payload: LX.ReportMonthly.TrackSessionPayload = {
        songId: session.songId,
        songName: session.songName,
        artistName: session.artistName,
        albumName: session.albumName,
        sourceType: session.sourceType,
        listId: session.listId,
        startedAt: session.startedAt,
        endedAt,
        listenSeconds,
        totalSeconds: session.totalSeconds,
        endReason,
      }
      void trackMonthlyReportSession(payload).catch(err => {
        console.warn('[report-monthly] track session failed', err)
      })
    }
    session = null
  }

  const ensureSession = () => {
    if (!session) startSession()
  }

  const handlePlay = () => {
    ensureSession()
    if (session) {
      session.isPlaying = true
      session.lastProgress = playProgress.nowPlayTime
    }
  }

  const handlePause = () => {
    syncListenByProgress()
    if (session) session.isPlaying = false
  }

  const handleEnded = () => {
    if (session) session.isPlaying = false
    finishSession('ended')
  }

  const handleError = () => {
    if (session) session.isPlaying = false
    finishSession('error')
  }

  const handleMusicToggled = () => {
    finishSession(resolveSwitchEndReason())
    startSession()
  }

  const handleStop = () => {
    finishSession('paused')
  }

  watch(() => playProgress.nowPlayTime, (newValue, oldValue) => {
    if (!session || !session.isPlaying) return
    if (newValue < 0 || oldValue < 0) return
    const delta = newValue - session.lastProgress
    session.lastProgress = newValue
    if (delta <= 0 || delta > 4) return
    session.listenSeconds += delta
  })

  window.app_event.on('play', handlePlay)
  window.app_event.on('pause', handlePause)
  window.app_event.on('playerEnded', handleEnded)
  window.app_event.on('playerError', handleError)
  window.app_event.on('musicToggled', handleMusicToggled)
  window.app_event.on('stop', handleStop)

  onBeforeUnmount(() => {
    finishSession('paused')
    window.app_event.off('play', handlePlay)
    window.app_event.off('pause', handlePause)
    window.app_event.off('playerEnded', handleEnded)
    window.app_event.off('playerError', handleError)
    window.app_event.off('musicToggled', handleMusicToggled)
    window.app_event.off('stop', handleStop)
  })
}
