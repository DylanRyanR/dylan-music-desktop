declare namespace LX {
  namespace DBService {

    interface MusicInfo {
      id: string
      listId: string
      name: string
      singer: string
      interval: string | null
      source: LX.Music.MusicInfo['source']
      meta: string
      order: number
    }

    interface MusicInfoOrder {
      listId: string
      musicInfoId: string
      order: number
    }

    interface MusicInfoQuery {
      listId: string
    }

    interface MusicInfoRemove {
      listId: string
      id: string
    }

    interface ListMusicInfoQuery {
      listId: string
      musicInfoId: string
    }

    interface UserListInfo {
      id: string
      name: string
      source?: LX.OnlineSource
      sourceListId?: string
      position: number
      locationUpdateTime: number | null
    }

    type Lyricnfo = {
      id: string
      type: 'lyric'
      text: string
      source: 'raw' | 'edited'
    } | {
      id: string
      type: keyof Omit<LX.Music.LyricInfo, 'lyric'>
      text: string | null
      source: 'raw' | 'edited'
    }

    interface MusicUrlInfo {
      id: string
      url: string
    }

    interface DownloadMusicInfo {
      id: string
      isComplate: 0 | 1
      status: LX.Download.DownloadTaskStatus
      statusText: string
      progress_downloaded: number
      progress_total: number
      url: string | null
      quality: LX.Quality
      ext: LX.Download.FileExt
      fileName: string
      filePath: string
      musicInfo: string
      position: number
    }

    interface DislikeInfo {
      content: string
    }

    interface MusicInfoOtherSource extends Omit<MusicInfoOnline, 'listId'> {
      source_id: string
      order: number
    }

    interface MediaConnection {
      id: string
      type: 'smb' | 'webdav' | 'local'
      name: string
      config: string
      status: string | null
      lastScanAt: number | null
      lastScanStatus: string | null
      lastScanSummary: string | null
      isEnabled: 0 | 1
    }

    interface MediaItem {
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

  }
}
