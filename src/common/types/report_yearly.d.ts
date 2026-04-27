declare namespace LX {
  namespace ReportYearly {
    interface SeasonalFavoriteItem {
      season: 'spring' | 'summer' | 'autumn' | 'winter'
      songId: string
      songName: string
      artistName: string
      count: number
      seconds: number
    }

    interface WeekdayDistributionItem {
      weekday: number
      count: number
      seconds: number
    }

    interface MonthlyArtistTimelineItem {
      month: number
      artistName: string
      count: number
      seconds: number
    }

    interface ReplaySongItem {
      songId: string
      songName: string
      artistName: string
      count: number
      seconds: number
    }

    interface YearFavoriteSongItem {
      songId: string
      songName: string
      artistName: string
      count: number
      seconds: number
    }

    interface YearFavoriteArtistItem {
      artistName: string
      count: number
      seconds: number
    }

    interface YearFavoriteAlbumItem {
      albumName: string
      artistName: string
      count: number
      seconds: number
    }

    interface YearFavorites {
      song: YearFavoriteSongItem
      artist: YearFavoriteArtistItem
      album: YearFavoriteAlbumItem
    }

    interface NightOwlStats {
      nightSessionCount: number
      nightListenSeconds: number
      totalSessionCount: number
      ratio: number
      latestNightStartedAt: number | null
      latestNightHour: number | null
    }

    interface YearlyRankItem {
      year: number
      totalListenSeconds: number
      sessionCount: number
      activeDays: number
      rank: number
    }

    interface EnrichmentPlaceholder {
      status: 'placeholder'
      fields: string[]
    }

    interface YearOption {
      year: number
      label: string
    }

    interface OverviewDTO {
      year: number
      totalListenSeconds: number
      sessionCount: number
      activeDays: number
      newSongRatio: number
      newArtistRatio: number
    }

    interface CardsDTO {
      yearFavorites: YearFavorites
      seasonalFavorites: SeasonalFavoriteItem[]
      weekdayDistribution: WeekdayDistributionItem[]
      nightOwlStats: NightOwlStats
      monthlyArtistTimeline: MonthlyArtistTimelineItem[]
      replaySongs: ReplaySongItem[]
      yearlyRank: YearlyRankItem[]
      enrichmentPlaceholder: EnrichmentPlaceholder
    }

    interface GetPayload {
      year: number
    }

    interface RebuildPayload {
      year: number
    }

    interface ExportPngPayload {
      dataUrl: string
      defaultName: string
    }

    interface ExportPngResult {
      filePath: string | null
    }

    interface RebuildCacheResult {
      year: number
    }
  }
}
