import { getMediaLibraryPlayUrl, saveLyric } from '@renderer/utils/ipc'
import {
  buildLyricInfo,
  getCachedLyricInfo,
  getOnlineOtherSourceLyricByLocal,
  getOnlineOtherSourcePicByLocal,
  getOnlineOtherSourcePicUrl,
  getOnlineOtherSourceLyricInfo,
  getOtherSource,
} from './utils'

const getOtherSourceByMedia = async<T>(musicInfo: LX.Music.MusicInfoMedia, handler: (infos: LX.Music.MusicInfoOnline[]) => Promise<T>) => {
  let result: LX.Music.MusicInfoOnline[] = []
  result = await getOtherSource(musicInfo)
  if (result.length) try { return await handler(result) } catch {}
  if (musicInfo.name.includes('-')) {
    const [name, singer] = musicInfo.name.split('-').map(val => val.trim())
    result = await getOtherSource({
      ...musicInfo,
      name,
      singer,
    }, true)
    if (result.length) try { return await handler(result) } catch {}
    result = await getOtherSource({
      ...musicInfo,
      name: singer,
      singer: name,
    }, true)
    if (result.length) try { return await handler(result) } catch {}
  }
  let fileName = musicInfo.meta.filePath.split(/\/|\\/).at(-1)
  if (fileName) {
    fileName = fileName.substring(0, fileName.lastIndexOf('.'))
    if (fileName != musicInfo.name) {
      if (fileName.includes('-')) {
        const [name, singer] = fileName.split('-').map(val => val.trim())
        result = await getOtherSource({
          ...musicInfo,
          name,
          singer,
        }, true)
        if (result.length) try { return await handler(result) } catch {}
        result = await getOtherSource({
          ...musicInfo,
          name: singer,
          singer: name,
        }, true)
      } else {
        result = await getOtherSource({
          ...musicInfo,
          name: fileName,
          singer: '',
        }, true)
      }
      if (result.length) try { return await handler(result) } catch {}
    }
  }

  throw new Error('source not found')
}

export const getMusicUrl = async({ musicInfo }: {
  musicInfo: LX.Music.MusicInfoMedia
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  return getMediaLibraryPlayUrl(musicInfo.id)
}

export const getPicUrl = async({ musicInfo, listId, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoMedia
  listId?: string | null
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  const filePath = await getMediaLibraryPlayUrl(musicInfo.id)

  if (!isRefresh) {
    const pic = await window.lx.worker.main.getMusicFilePic(filePath)
    if (pic) return pic

    if (musicInfo.meta.picUrl) return musicInfo.meta.picUrl
  }

  try {
    return await getOnlineOtherSourcePicByLocal(musicInfo as unknown as LX.Music.MusicInfoLocal).then(({ url }) => {
      return url
    })
  } catch {}

  onToggleSource()
  return getOtherSourceByMedia(musicInfo, async(otherSource) => {
    return getOnlineOtherSourcePicUrl({ musicInfos: [...otherSource], onToggleSource, isRefresh }).then(({ url }) => {
      if (listId) musicInfo.meta.picUrl = url
      return url
    })
  })
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoMedia
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  const filePath = await getMediaLibraryPlayUrl(musicInfo.id)

  if (!isRefresh) {
    const [lyricInfo, fileLyricInfo] = await Promise.all([
      getCachedLyricInfo(musicInfo),
      window.lx.worker.main.getMusicFileLyric(filePath),
    ])

    if (lyricInfo?.lyric && lyricInfo.lyric != fileLyricInfo?.lyric) {
      return buildLyricInfo({ ...lyricInfo, rawlrcInfo: fileLyricInfo ?? lyricInfo.rawlrcInfo })
    }

    if (fileLyricInfo) return buildLyricInfo(fileLyricInfo)
    if (lyricInfo?.lyric) return buildLyricInfo(lyricInfo)
  }

  try {
    return await getOnlineOtherSourceLyricByLocal(musicInfo as unknown as LX.Music.MusicInfoLocal, isRefresh).then(({ lyricInfo, isFromCache }) => {
      if (!isFromCache) void saveLyric(musicInfo, lyricInfo)
      return buildLyricInfo(lyricInfo)
    })
  } catch {}

  onToggleSource()
  return getOtherSourceByMedia(musicInfo, async(otherSource) => {
    return getOnlineOtherSourceLyricInfo({ musicInfos: [...otherSource], onToggleSource, isRefresh }).then(async({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
      void saveLyric(musicInfo, lyricInfo)

      if (isFromCache) return buildLyricInfo(lyricInfo)
      void saveLyric(targetMusicInfo, lyricInfo)

      return buildLyricInfo(lyricInfo)
    })
  })
}
