declare namespace LX {
  namespace ReportMonthly {
    type SourceType = 'online' | 'local' | 'onedrive' | 'smb' | 'webdav' | 'other'

    type EndReason = 'ended' | 'skipped' | 'paused' | 'error' | 'switched'

    interface TrackSessionPayload {
      songId: string
      songName: string
      artistName: string
      albumName: string
      sourceType: SourceType
      listId: string | null
      startedAt: number
      endedAt: number
      listenSeconds: number
      totalSeconds: number
      endReason: EndReason
    }

    interface DailyTrendItem {
      dateKey: string
      listenSeconds: number
      valid30Count: number
      complete80Count: number
      sessionCount: number
    }

    interface TopSongItem {
      songId: string
      songName: string
      artistName: string
      count: number
      seconds: number
      isNewDiscovery: boolean
    }

    interface TopArtistItem {
      artistName: string
      count: number
      seconds: number
    }

    interface SourceShareItem {
      sourceType: SourceType
      count: number
      seconds: number
    }

    interface OverviewDTO {
      startAt: number
      endAt: number
      reportGeneratedAt: number
      totalListenSeconds: number
      dailyAverageSeconds: number
      valid30Count: number
      complete80Count: number
      complete80Rate: number
      sessionCount: number
      skipCount: number
      skipRate: number
      streakDays: number
      activeDays: number
      newDiscoveryCount: number
    }

    interface CardsDTO {
      trend: DailyTrendItem[]
      topSongs: TopSongItem[]
      topArtists: TopArtistItem[]
      hourHistogram: number[]
      sourceShare: SourceShareItem[]
      newDiscovery: TopSongItem[]
    }

    interface ExportPngPayload {
      dataUrl: string
      defaultName: string
    }

    interface ExportPngResult {
      filePath: string | null
    }

    interface RebuildCacheResult {
      days: 30 | 90 | 400
      eventCount: number
      dayCount: number
      cleanedEventCount: number
    }
  }
}
