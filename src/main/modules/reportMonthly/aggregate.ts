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

interface SourceCounter {
  sourceType: LX.ReportMonthly.SourceType
  count: number
  seconds: number
}

interface DayAggregate {
  dateKey: string
  totalListenSeconds: number
  valid30Count: number
  complete80Count: number
  sessionCount: number
  skipCount: number
  hourHistogram: number[]
  songs: Map<string, SongCounter>
  artists: Map<string, ArtistCounter>
  sources: Map<LX.ReportMonthly.SourceType, SourceCounter>
  newDiscoveries: Map<string, SongCounter>
}

interface DaySnapshot {
  dateKey: string
  totalListenSeconds: number
  valid30Count: number
  complete80Count: number
  sessionCount: number
  skipCount: number
  hourHistogram: number[]
  songs: SongCounter[]
  artists: ArtistCounter[]
  sources: SourceCounter[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_HISTOGRAM = Array.from({ length: 24 }, () => 0)

const pad2 = (num: number) => (num < 10 ? `0${num}` : `${num}`)

export const toDateKey = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const normalizeSourceType = (sourceType: string): LX.ReportMonthly.SourceType => {
  switch (sourceType) {
    case 'local':
    case 'onedrive':
    case 'smb':
    case 'webdav':
      return sourceType
    case 'online':
      return 'online'
    default:
      return 'other'
  }
}

const createDayAggregate = (dateKey: string): DayAggregate => {
  return {
    dateKey,
    totalListenSeconds: 0,
    valid30Count: 0,
    complete80Count: 0,
    sessionCount: 0,
    skipCount: 0,
    hourHistogram: [...DEFAULT_HISTOGRAM],
    songs: new Map(),
    artists: new Map(),
    sources: new Map(),
    newDiscoveries: new Map(),
  }
}

const createDaySnapshot = (dateKey: string): DaySnapshot => {
  return {
    dateKey,
    totalListenSeconds: 0,
    valid30Count: 0,
    complete80Count: 0,
    sessionCount: 0,
    skipCount: 0,
    hourHistogram: [...DEFAULT_HISTOGRAM],
    songs: [],
    artists: [],
    sources: [],
  }
}

const addSongCounter = (target: Map<string, SongCounter>, event: LX.DBService.PlayEvent) => {
  const id = event.songId
  const song = target.get(id)
  if (song) {
    song.count += 1
    song.seconds += event.listenSeconds
    return song
  }
  const next: SongCounter = {
    songId: event.songId,
    songName: event.songName,
    artistName: event.artistName,
    count: 1,
    seconds: event.listenSeconds,
  }
  target.set(id, next)
  return next
}

const addArtistCounter = (target: Map<string, ArtistCounter>, event: LX.DBService.PlayEvent) => {
  const key = event.artistName || 'Unknown Artist'
  const artist = target.get(key)
  if (artist) {
    artist.count += 1
    artist.seconds += event.listenSeconds
    return
  }
  target.set(key, {
    artistName: key,
    count: 1,
    seconds: event.listenSeconds,
  })
}

const addSourceCounter = (target: Map<LX.ReportMonthly.SourceType, SourceCounter>, sourceType: LX.ReportMonthly.SourceType, listenSeconds: number) => {
  const source = target.get(sourceType)
  if (source) {
    source.count += 1
    source.seconds += listenSeconds
    return
  }
  target.set(sourceType, {
    sourceType,
    count: 1,
    seconds: listenSeconds,
  })
}

const mergeSongCounter = (target: Map<string, SongCounter>, item: SongCounter) => {
  const exists = target.get(item.songId)
  if (exists) {
    exists.count += item.count
    exists.seconds += item.seconds
    return
  }
  target.set(item.songId, { ...item })
}

const mergeArtistCounter = (target: Map<string, ArtistCounter>, item: ArtistCounter) => {
  const key = item.artistName || 'Unknown Artist'
  const exists = target.get(key)
  if (exists) {
    exists.count += item.count
    exists.seconds += item.seconds
    return
  }
  target.set(key, {
    artistName: key,
    count: item.count,
    seconds: item.seconds,
  })
}

const mergeSourceCounter = (target: Map<LX.ReportMonthly.SourceType, SourceCounter>, item: SourceCounter) => {
  const sourceType = normalizeSourceType(item.sourceType)
  const exists = target.get(sourceType)
  if (exists) {
    exists.count += item.count
    exists.seconds += item.seconds
    return
  }
  target.set(sourceType, {
    sourceType,
    count: item.count,
    seconds: item.seconds,
  })
}

const sortByScore = <T extends { seconds: number, count: number }>(a: T, b: T) => {
  if (b.seconds !== a.seconds) return b.seconds - a.seconds
  return b.count - a.count
}

const topList = <T extends { seconds: number, count: number }>(items: Iterable<T>, limit: number) => {
  return Array.from(items).sort(sortByScore).slice(0, limit)
}

const sortedList = <T extends { seconds: number, count: number }>(items: Iterable<T>) => {
  return Array.from(items).sort(sortByScore)
}

export const calcComplete80Rate = (complete80Count: number, sessionCount: number) => {
  if (!sessionCount) return 0
  return complete80Count / sessionCount
}

export const calcSkipRate = (skipCount: number, sessionCount: number) => {
  if (!sessionCount) return 0
  return skipCount / sessionCount
}

export const calcStreakDays = (dateKeys: string[]) => {
  if (!dateKeys.length) return 0
  const sorted = [...dateKeys].sort()
  let max = 1
  let current = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`).getTime()
    const next = new Date(`${sorted[i]}T00:00:00`).getTime()
    if (next - prev === DAY_MS) current += 1
    else current = 1
    if (current > max) max = current
  }
  return max
}

export const getDateKeysBetween = (startAt: number, endAt: number) => {
  const result: string[] = []
  const cursor = new Date(startAt)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endAt)
  end.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= end.getTime()) {
    result.push(toDateKey(cursor.getTime()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

const toSafeInt = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.floor(num))
}

const parseJsonArray = (json: string) => {
  try {
    const result = JSON.parse(json) as unknown
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

const parseSongCounterList = (json: string): SongCounter[] => {
  const rawList = parseJsonArray(json)
  const result: SongCounter[] = []
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const songId = 'songId' in item && typeof item.songId === 'string' ? item.songId : ''
    const songName = 'songName' in item && typeof item.songName === 'string' ? item.songName : ''
    const artistName = 'artistName' in item && typeof item.artistName === 'string' ? item.artistName : 'Unknown Artist'
    if (!songId || !songName) continue
    result.push({
      songId,
      songName,
      artistName,
      count: toSafeInt('count' in item ? item.count : 0),
      seconds: toSafeInt('seconds' in item ? item.seconds : 0),
    })
  }
  return result
}

const parseArtistCounterList = (json: string): ArtistCounter[] => {
  const rawList = parseJsonArray(json)
  const result: ArtistCounter[] = []
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const artistName = 'artistName' in item && typeof item.artistName === 'string' ? item.artistName : ''
    if (!artistName) continue
    result.push({
      artistName,
      count: toSafeInt('count' in item ? item.count : 0),
      seconds: toSafeInt('seconds' in item ? item.seconds : 0),
    })
  }
  return result
}

const parseSourceCounterList = (json: string): SourceCounter[] => {
  const rawList = parseJsonArray(json)
  const result: SourceCounter[] = []
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const sourceType = normalizeSourceType('sourceType' in item && typeof item.sourceType === 'string' ? item.sourceType : 'other')
    result.push({
      sourceType,
      count: toSafeInt('count' in item ? item.count : 0),
      seconds: toSafeInt('seconds' in item ? item.seconds : 0),
    })
  }
  return result
}

const parseHourHistogram = (json: string) => {
  const raw = parseJsonArray(json)
  const histogram = [...DEFAULT_HISTOGRAM]
  for (let i = 0; i < Math.min(24, raw.length); i += 1) {
    histogram[i] = toSafeInt(raw[i])
  }
  return histogram
}

const parseDailyStatSnapshot = (stat: LX.DBService.PlayDailyStat): DaySnapshot => {
  return {
    dateKey: stat.dateKey,
    totalListenSeconds: toSafeInt(stat.totalListenSeconds),
    valid30Count: toSafeInt(stat.valid30Count),
    complete80Count: toSafeInt(stat.complete80Count),
    sessionCount: toSafeInt(stat.sessionCount),
    skipCount: toSafeInt(stat.skipCount),
    hourHistogram: parseHourHistogram(stat.hourHistogramJson),
    songs: parseSongCounterList(stat.topSongsJson),
    artists: parseArtistCounterList(stat.topArtistsJson),
    sources: parseSourceCounterList(stat.sourceShareJson),
  }
}

const mergeEventIntoSnapshot = (snapshot: DaySnapshot, event: LX.DBService.PlayEvent) => {
  const sourceType = normalizeSourceType(event.sourceType)
  const hour = new Date(event.startedAt).getHours()

  snapshot.totalListenSeconds += event.listenSeconds
  snapshot.valid30Count += event.isValid30s ? 1 : 0
  snapshot.complete80Count += event.isComplete80 ? 1 : 0
  snapshot.sessionCount += 1
  snapshot.skipCount += event.endReason === 'skipped' ? 1 : 0
  snapshot.hourHistogram[hour] += 1

  const songs = new Map(snapshot.songs.map(item => [item.songId, { ...item }]))
  const artists = new Map(snapshot.artists.map(item => [item.artistName, { ...item }]))
  const sources = new Map(snapshot.sources.map(item => [item.sourceType, { ...item }]))
  mergeSongCounter(songs, {
    songId: event.songId,
    songName: event.songName,
    artistName: event.artistName || 'Unknown Artist',
    count: 1,
    seconds: event.listenSeconds,
  })
  mergeArtistCounter(artists, {
    artistName: event.artistName || 'Unknown Artist',
    count: 1,
    seconds: event.listenSeconds,
  })
  mergeSourceCounter(sources, {
    sourceType,
    count: 1,
    seconds: event.listenSeconds,
  })
  snapshot.songs = sortedList(songs.values())
  snapshot.artists = sortedList(artists.values())
  snapshot.sources = sortedList(sources.values())
}

const toDailyStat = (snapshot: DaySnapshot, updatedAt: number): LX.DBService.PlayDailyStat => {
  return {
    dateKey: snapshot.dateKey,
    totalListenSeconds: snapshot.totalListenSeconds,
    valid30Count: snapshot.valid30Count,
    complete80Count: snapshot.complete80Count,
    sessionCount: snapshot.sessionCount,
    skipCount: snapshot.skipCount,
    topSongsJson: JSON.stringify(snapshot.songs),
    topArtistsJson: JSON.stringify(snapshot.artists),
    hourHistogramJson: JSON.stringify(snapshot.hourHistogram),
    sourceShareJson: JSON.stringify(snapshot.sources),
    newDiscoveryJson: '[]',
    updatedAt,
  }
}

export const isPlayDailyStatUsable = (stat: LX.DBService.PlayDailyStat) => {
  const snapshot = parseDailyStatSnapshot(stat)
  const songCountTotal = snapshot.songs.reduce((count, item) => count + item.count, 0)
  if (songCountTotal !== snapshot.sessionCount) return false
  return true
}

const buildResultFromSnapshots = (
  snapshots: Iterable<DaySnapshot>,
  historySongIds: Set<string>,
  startAt: number,
  endAt: number,
  reportGeneratedAt: number,
) => {
  const dayMap = new Map<string, DaySnapshot>()
  for (const snapshot of snapshots) {
    dayMap.set(snapshot.dateKey, snapshot)
  }

  const globalSongs = new Map<string, SongCounter>()
  const globalArtists = new Map<string, ArtistCounter>()
  const globalSources = new Map<LX.ReportMonthly.SourceType, SourceCounter>()
  const globalHourHistogram = [...DEFAULT_HISTOGRAM]
  const newDiscoverySongs = new Map<string, SongCounter>()

  let totalListenSeconds = 0
  let valid30Count = 0
  let complete80Count = 0
  let sessionCount = 0
  let skipCount = 0

  for (const day of dayMap.values()) {
    totalListenSeconds += day.totalListenSeconds
    valid30Count += day.valid30Count
    complete80Count += day.complete80Count
    sessionCount += day.sessionCount
    skipCount += day.skipCount

    day.songs.forEach(item => mergeSongCounter(globalSongs, item))
    day.artists.forEach(item => mergeArtistCounter(globalArtists, item))
    day.sources.forEach(item => mergeSourceCounter(globalSources, item))
    for (let i = 0; i < 24; i += 1) {
      globalHourHistogram[i] += day.hourHistogram[i] ?? 0
    }
  }

  for (const item of globalSongs.values()) {
    if (!historySongIds.has(item.songId)) newDiscoverySongs.set(item.songId, { ...item })
  }

  const allDateKeys = getDateKeysBetween(startAt, endAt)
  const trend: LX.ReportMonthly.DailyTrendItem[] = allDateKeys.map(dateKey => {
    const day = dayMap.get(dateKey)
    return {
      dateKey,
      listenSeconds: day?.totalListenSeconds ?? 0,
      valid30Count: day?.valid30Count ?? 0,
      complete80Count: day?.complete80Count ?? 0,
      sessionCount: day?.sessionCount ?? 0,
    }
  })

  const activeDateKeys = Array.from(dayMap.values()).filter(day => day.sessionCount > 0).map(day => day.dateKey)
  const activeDays = activeDateKeys.length
  const streakDays = calcStreakDays(activeDateKeys)

  const topSongs = topList(globalSongs.values(), 5).map(item => ({
    ...item,
    isNewDiscovery: newDiscoverySongs.has(item.songId),
  }))
  const topArtists = topList(globalArtists.values(), 5)
  const sourceShare = topList(globalSources.values(), 10)
  const newDiscovery = topList(newDiscoverySongs.values(), 5).map(item => ({
    ...item,
    isNewDiscovery: true,
  }))

  const overview: LX.ReportMonthly.OverviewDTO = {
    startAt,
    endAt,
    reportGeneratedAt,
    totalListenSeconds,
    dailyAverageSeconds: Math.floor(totalListenSeconds / 30),
    valid30Count,
    complete80Count,
    complete80Rate: calcComplete80Rate(complete80Count, sessionCount),
    sessionCount,
    skipCount,
    skipRate: calcSkipRate(skipCount, sessionCount),
    streakDays,
    activeDays,
    newDiscoveryCount: newDiscoverySongs.size,
  }

  const cards: LX.ReportMonthly.CardsDTO = {
    trend,
    topSongs,
    topArtists,
    hourHistogram: globalHourHistogram,
    sourceShare,
    newDiscovery,
  }

  const dailyStats = Array.from(dayMap.values())
    .filter(day => day.sessionCount > 0)
    .map(day => toDailyStat(day, reportGeneratedAt))

  return {
    overview,
    cards,
    dailyStats,
    eventCount: sessionCount,
  }
}

export const aggregateReport = (
  events: LX.DBService.PlayEvent[],
  historySongIds: Set<string>,
  startAt: number,
  endAt: number,
  reportGeneratedAt: number,
) => {
  const dayMap = new Map<string, DayAggregate>()
  const globalSongs = new Map<string, SongCounter>()
  const globalArtists = new Map<string, ArtistCounter>()
  const globalSources = new Map<LX.ReportMonthly.SourceType, SourceCounter>()
  const globalHourHistogram = [...DEFAULT_HISTOGRAM]
  const newDiscoverySongs = new Map<string, SongCounter>()

  let totalListenSeconds = 0
  let valid30Count = 0
  let complete80Count = 0
  let sessionCount = 0
  let skipCount = 0
  const knownSongIds = new Set(historySongIds)

  for (const event of events) {
    const dateKey = toDateKey(event.startedAt)
    let day = dayMap.get(dateKey)
    if (!day) {
      day = createDayAggregate(dateKey)
      dayMap.set(dateKey, day)
    }

    const sourceType = normalizeSourceType(event.sourceType)
    const hour = new Date(event.startedAt).getHours()

    totalListenSeconds += event.listenSeconds
    sessionCount += 1
    valid30Count += event.isValid30s ? 1 : 0
    complete80Count += event.isComplete80 ? 1 : 0
    skipCount += event.endReason === 'skipped' ? 1 : 0

    day.totalListenSeconds += event.listenSeconds
    day.sessionCount += 1
    day.valid30Count += event.isValid30s ? 1 : 0
    day.complete80Count += event.isComplete80 ? 1 : 0
    day.skipCount += event.endReason === 'skipped' ? 1 : 0
    day.hourHistogram[hour] += 1

    globalHourHistogram[hour] += 1

    addSongCounter(globalSongs, event)
    addSongCounter(day.songs, event)
    addArtistCounter(globalArtists, event)
    addArtistCounter(day.artists, event)
    addSourceCounter(globalSources, sourceType, event.listenSeconds)
    addSourceCounter(day.sources, sourceType, event.listenSeconds)

    if (!knownSongIds.has(event.songId)) {
      addSongCounter(newDiscoverySongs, event)
      addSongCounter(day.newDiscoveries, event)
      knownSongIds.add(event.songId)
    }
  }

  const allDateKeys = getDateKeysBetween(startAt, endAt)
  const trend: LX.ReportMonthly.DailyTrendItem[] = allDateKeys.map(dateKey => {
    const day = dayMap.get(dateKey)
    return {
      dateKey,
      listenSeconds: day?.totalListenSeconds ?? 0,
      valid30Count: day?.valid30Count ?? 0,
      complete80Count: day?.complete80Count ?? 0,
      sessionCount: day?.sessionCount ?? 0,
    }
  })

  const activeDateKeys = Array.from(dayMap.values()).filter(day => day.sessionCount > 0).map(day => day.dateKey)
  const activeDays = activeDateKeys.length
  const streakDays = calcStreakDays(activeDateKeys)

  const topSongs = topList(globalSongs.values(), 5).map(item => ({
    ...item,
    isNewDiscovery: newDiscoverySongs.has(item.songId),
  }))
  const topArtists = topList(globalArtists.values(), 5)
  const sourceShare = topList(globalSources.values(), 10)
  const newDiscovery = topList(newDiscoverySongs.values(), 5).map(item => ({
    ...item,
    isNewDiscovery: true,
  }))

  const overview: LX.ReportMonthly.OverviewDTO = {
    startAt,
    endAt,
    reportGeneratedAt,
    totalListenSeconds,
    dailyAverageSeconds: Math.floor(totalListenSeconds / 30),
    valid30Count,
    complete80Count,
    complete80Rate: calcComplete80Rate(complete80Count, sessionCount),
    sessionCount,
    skipCount,
    skipRate: calcSkipRate(skipCount, sessionCount),
    streakDays,
    activeDays,
    newDiscoveryCount: newDiscoverySongs.size,
  }

  const cards: LX.ReportMonthly.CardsDTO = {
    trend,
    topSongs,
    topArtists,
    hourHistogram: globalHourHistogram,
    sourceShare,
    newDiscovery,
  }

  const dailyStats: LX.DBService.PlayDailyStat[] = Array.from(dayMap.values()).map(day => {
    return {
      dateKey: day.dateKey,
      totalListenSeconds: day.totalListenSeconds,
      valid30Count: day.valid30Count,
      complete80Count: day.complete80Count,
      sessionCount: day.sessionCount,
      skipCount: day.skipCount,
      topSongsJson: JSON.stringify(sortedList(day.songs.values())),
      topArtistsJson: JSON.stringify(sortedList(day.artists.values())),
      hourHistogramJson: JSON.stringify(day.hourHistogram),
      sourceShareJson: JSON.stringify(sortedList(day.sources.values())),
      newDiscoveryJson: JSON.stringify(sortedList(day.newDiscoveries.values())),
      updatedAt: reportGeneratedAt,
    }
  })

  return {
    overview,
    cards,
    dailyStats,
    eventCount: events.length,
  }
}

export const aggregateReportFromDailyStats = (
  dailyStats: LX.DBService.PlayDailyStat[],
  todayEvents: LX.DBService.PlayEvent[],
  historySongIds: Set<string>,
  startAt: number,
  endAt: number,
  reportGeneratedAt: number,
) => {
  const snapshotMap = new Map<string, DaySnapshot>()
  for (const stat of dailyStats) {
    snapshotMap.set(stat.dateKey, parseDailyStatSnapshot(stat))
  }

  for (const event of todayEvents) {
    const dateKey = toDateKey(event.startedAt)
    const snapshot = snapshotMap.get(dateKey) ?? createDaySnapshot(dateKey)
    mergeEventIntoSnapshot(snapshot, event)
    snapshotMap.set(dateKey, snapshot)
  }

  return buildResultFromSnapshots(snapshotMap.values(), historySongIds, startAt, endAt, reportGeneratedAt)
}
