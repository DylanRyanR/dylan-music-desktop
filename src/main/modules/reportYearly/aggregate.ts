type Season = LX.ReportYearly.SeasonalFavoriteItem['season']

interface SongCounter {
  songId: string
  songName: string
  artistName: string
  count: number
  seconds: number
}

interface ArtistCounter {
  artistName: string
  count: number
  seconds: number
}

interface AlbumCounter {
  albumName: string
  artistName: string
  count: number
  seconds: number
}

interface YearRankSummary {
  year: number
  totalListenSeconds: number
  sessionCount: number
  activeDays: number
}

export interface NightOwlStats {
  nightSessionCount: number
  nightListenSeconds: number
  totalSessionCount: number
  ratio: number
  latestNightStartedAt: number | null
  latestNightHour: number | null
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
const UNKNOWN_ARTIST = 'Unknown Artist'
const UNKNOWN_ALBUM = 'Unknown Album'
const toSafeListenSeconds = (listenSeconds: number) => {
  if (!Number.isFinite(listenSeconds)) return 0
  return Math.max(0, Math.floor(listenSeconds))
}

const sortBySecondsAndCount = <T extends { seconds: number, count: number }>(a: T, b: T) => {
  if (b.seconds !== a.seconds) return b.seconds - a.seconds
  return b.count - a.count
}

const sortByCountAndSeconds = <T extends { count: number, seconds: number }>(a: T, b: T) => {
  if (b.count !== a.count) return b.count - a.count
  return b.seconds - a.seconds
}

const toDateKey = (timestamp: number) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getSeason = (timestamp: number): Season => {
  const month = new Date(timestamp).getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

const addSongCounter = (target: Map<string, SongCounter>, event: LX.DBService.PlayEvent) => {
  const listenSeconds = toSafeListenSeconds(event.listenSeconds)
  const exists = target.get(event.songId)
  if (exists) {
    exists.count += 1
    exists.seconds += listenSeconds
    return
  }

  target.set(event.songId, {
    songId: event.songId,
    songName: event.songName,
    artistName: event.artistName || UNKNOWN_ARTIST,
    count: 1,
    seconds: listenSeconds,
  })
}

const addArtistCounter = (target: Map<string, ArtistCounter>, event: LX.DBService.PlayEvent) => {
  const listenSeconds = toSafeListenSeconds(event.listenSeconds)
  const artistName = event.artistName || UNKNOWN_ARTIST
  const exists = target.get(artistName)
  if (exists) {
    exists.count += 1
    exists.seconds += listenSeconds
    return
  }

  target.set(artistName, {
    artistName,
    count: 1,
    seconds: listenSeconds,
  })
}

const addAlbumCounter = (target: Map<string, AlbumCounter>, event: LX.DBService.PlayEvent) => {
  const listenSeconds = toSafeListenSeconds(event.listenSeconds)
  const albumName = event.albumName?.trim() || UNKNOWN_ALBUM
  const artistName = event.artistName || UNKNOWN_ARTIST
  const albumKey = `${albumName}__${artistName}`
  const exists = target.get(albumKey)
  if (exists) {
    exists.count += 1
    exists.seconds += listenSeconds
    return
  }

  target.set(albumKey, {
    albumName,
    artistName,
    count: 1,
    seconds: listenSeconds,
  })
}

const countActiveDays = (events: LX.DBService.PlayEvent[]) => {
  const dateKeys = new Set<string>()
  for (const event of events) {
    dateKeys.add(toDateKey(event.startedAt))
  }
  return dateKeys.size
}

export const aggregateYearlyOverview = (
  year: number,
  yearEvents: LX.DBService.PlayEvent[],
  historyEvents: LX.DBService.PlayEvent[],
): LX.ReportYearly.OverviewDTO => {
  const totalListenSeconds = yearEvents.reduce((sum, item) => sum + Math.max(0, item.listenSeconds), 0)
  const sessionCount = yearEvents.length
  const activeDays = countActiveDays(yearEvents)

  const historySongIds = new Set<string>()
  const historyArtistNames = new Set<string>()
  for (const event of historyEvents) {
    historySongIds.add(event.songId)
    historyArtistNames.add(event.artistName || 'Unknown Artist')
  }

  const yearlySongIds = new Set<string>()
  const yearlyArtistNames = new Set<string>()
  for (const event of yearEvents) {
    yearlySongIds.add(event.songId)
    yearlyArtistNames.add(event.artistName || 'Unknown Artist')
  }

  let newSongCount = 0
  for (const songId of yearlySongIds) {
    if (!historySongIds.has(songId)) newSongCount += 1
  }

  let newArtistCount = 0
  for (const artistName of yearlyArtistNames) {
    if (!historyArtistNames.has(artistName)) newArtistCount += 1
  }

  return {
    year,
    totalListenSeconds,
    sessionCount,
    activeDays,
    newSongRatio: yearlySongIds.size ? newSongCount / yearlySongIds.size : 0,
    newArtistRatio: yearlyArtistNames.size ? newArtistCount / yearlyArtistNames.size : 0,
  }
}

export const aggregateSeasonalFavorites = (
  events: LX.DBService.PlayEvent[],
): LX.ReportYearly.SeasonalFavoriteItem[] => {
  const seasonSongCounter = new Map<Season, Map<string, SongCounter>>()
  for (const season of SEASONS) seasonSongCounter.set(season, new Map())

  for (const event of events) {
    const season = getSeason(event.startedAt)
    const counter = seasonSongCounter.get(season)
    if (!counter) continue
    addSongCounter(counter, event)
  }

  return SEASONS.map(season => {
    const items = Array.from(seasonSongCounter.get(season)?.values() ?? []).sort(sortBySecondsAndCount)
    const top = items[0]
    return {
      season,
      songId: top?.songId ?? '',
      songName: top?.songName ?? '',
      artistName: top?.artistName ?? '',
      count: top?.count ?? 0,
      seconds: top?.seconds ?? 0,
    }
  })
}

export const aggregateWeeklyHabits = (
  events: LX.DBService.PlayEvent[],
): LX.ReportYearly.WeekdayDistributionItem[] => {
  const result: LX.ReportYearly.WeekdayDistributionItem[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: 0,
    seconds: 0,
  }))

  for (const event of events) {
    const weekday = new Date(event.startedAt).getDay()
    const target = result[weekday]
    if (!target) continue
    const listenSeconds = toSafeListenSeconds(event.listenSeconds)
    target.count += 1
    target.seconds += listenSeconds
  }

  return result
}

export const aggregateNightOwlStats = (events: LX.DBService.PlayEvent[]): NightOwlStats => {
  let nightSessionCount = 0
  let nightListenSeconds = 0
  let latestNightStartedAt: number | null = null

  for (const event of events) {
    const hour = new Date(event.startedAt).getHours()
    if (hour >= 6) continue
    const listenSeconds = toSafeListenSeconds(event.listenSeconds)
    nightSessionCount += 1
    nightListenSeconds += listenSeconds
    if (latestNightStartedAt == null || event.startedAt > latestNightStartedAt) {
      latestNightStartedAt = event.startedAt
    }
  }

  const totalSessionCount = events.length
  return {
    nightSessionCount,
    nightListenSeconds,
    totalSessionCount,
    ratio: totalSessionCount ? nightSessionCount / totalSessionCount : 0,
    latestNightStartedAt,
    latestNightHour: latestNightStartedAt == null ? null : new Date(latestNightStartedAt).getHours(),
  }
}

export const aggregateReplaySongs = (
  events: LX.DBService.PlayEvent[],
): LX.ReportYearly.ReplaySongItem[] => {
  const songCounter = new Map<string, SongCounter>()
  for (const event of events) addSongCounter(songCounter, event)

  return Array.from(songCounter.values())
    .filter(item => item.count >= 3)
    .sort(sortByCountAndSeconds)
    .map(item => ({
      songId: item.songId,
      songName: item.songName,
      artistName: item.artistName,
      count: item.count,
      seconds: item.seconds,
    }))
}

export const aggregateYearFavorites = (
  events: LX.DBService.PlayEvent[],
): LX.ReportYearly.YearFavorites => {
  const songCounter = new Map<string, SongCounter>()
  const artistCounter = new Map<string, ArtistCounter>()
  const albumCounter = new Map<string, AlbumCounter>()

  for (const event of events) {
    addSongCounter(songCounter, event)
    addArtistCounter(artistCounter, event)
    addAlbumCounter(albumCounter, event)
  }

  const topSong = Array.from(songCounter.values()).sort(sortBySecondsAndCount)[0]
  const topArtist = Array.from(artistCounter.values()).sort(sortBySecondsAndCount)[0]
  const topAlbum = Array.from(albumCounter.values()).sort(sortBySecondsAndCount)[0]

  return {
    song: {
      songId: topSong?.songId ?? '',
      songName: topSong?.songName ?? '',
      artistName: topSong?.artistName ?? '',
      count: topSong?.count ?? 0,
      seconds: topSong?.seconds ?? 0,
    },
    artist: {
      artistName: topArtist?.artistName ?? '',
      count: topArtist?.count ?? 0,
      seconds: topArtist?.seconds ?? 0,
    },
    album: {
      albumName: topAlbum?.albumName ?? '',
      artistName: topAlbum?.artistName ?? '',
      count: topAlbum?.count ?? 0,
      seconds: topAlbum?.seconds ?? 0,
    },
  }
}

const summarizeYear = (year: number, events: LX.DBService.PlayEvent[]): YearRankSummary => {
  return {
    year,
    totalListenSeconds: events.reduce((sum, item) => sum + Math.max(0, item.listenSeconds), 0),
    sessionCount: events.length,
    activeDays: countActiveDays(events),
  }
}

const sortYearRank = (a: YearRankSummary, b: YearRankSummary) => {
  if (b.totalListenSeconds !== a.totalListenSeconds) return b.totalListenSeconds - a.totalListenSeconds
  if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount
  if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays
  return b.year - a.year
}

export const aggregateYearRank = (
  targetYear: number,
  yearEventMap: Map<number, LX.DBService.PlayEvent[]>,
): LX.ReportYearly.YearlyRankItem[] => {
  const summaries = Array.from(yearEventMap.entries()).map(([year, events]) => summarizeYear(year, events))
  if (!yearEventMap.has(targetYear)) {
    summaries.push({
      year: targetYear,
      totalListenSeconds: 0,
      sessionCount: 0,
      activeDays: 0,
    })
  }
  const ranked = [...summaries].sort(sortYearRank)
  const rankMap = new Map<number, number>()
  ranked.forEach((item, index) => {
    rankMap.set(item.year, index + 1)
  })

  return ranked.map(item => ({
    year: item.year,
    totalListenSeconds: item.totalListenSeconds,
    sessionCount: item.sessionCount,
    activeDays: item.activeDays,
    rank: rankMap.get(item.year) ?? 0,
  }))
}
