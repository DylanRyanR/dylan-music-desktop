import { formatPlayTime2, filterFileName } from '@common/utils/common'
import { useI18n } from '@root/lang'
import {
  getYearlyReportYearOptions,
  getYearlyReportOverview,
  getYearlyReportCards,
  exportYearlyReportPng,
  rebuildYearlyReportCache,
} from '@renderer/utils/ipc'
import {
  yearlyYearOptions,
  yearlySelectedYear,
  yearlyOverview,
  yearlyCards,
  yearlyLoading,
  yearlyError,
  yearlyLastUpdatedAt,
} from './state'

const t = useI18n()
const translate = t as unknown as (key: string, params?: Record<string, string | number>) => string

const getCurrentYear = () => new Date().getFullYear()

const normalizeYear = (year: number) => {
  if (!Number.isInteger(year)) return getCurrentYear()
  const currentYear = getCurrentYear()
  if (year < 1970 || year > currentYear) return currentYear
  return year
}

const resolveI18n = (key: string, fallback: string, params?: Record<string, string | number>) => {
  const text = translate(key, params)
  if (!text || text === key) return fallback
  return text
}

const formatDuration = (seconds: number) => {
  const sec = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return formatPlayTime2(sec)
}

const formatPercent = (value: number) => `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`

const trimText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

const fillGlassCard = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 24,
) => {
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = 'rgba(255, 255, 255, .12)'
  ctx.fill()

  ctx.save()
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  const shine = ctx.createLinearGradient(x, y, x + width, y + height)
  shine.addColorStop(0, 'rgba(255, 255, 255, .24)')
  shine.addColorStop(0.44, 'rgba(255, 255, 255, .06)')
  shine.addColorStop(1, 'rgba(255, 255, 255, .01)')
  ctx.fillStyle = shine
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = 'rgba(255, 255, 255, .22)'
  ctx.lineWidth = 1.4
  ctx.stroke()
}

const drawYearlyPosterClassic = (overview: LX.ReportYearly.OverviewDTO, cards: LX.ReportYearly.CardsDTO) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#0b1220')
  gradient.addColorStop(0.5, '#12243d')
  gradient.addColorStop(1, '#1f1e3c')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255, 255, 255, .08)'
  for (let i = 0; i < 20; i += 1) {
    const x = 64 + (i % 5) * 190
    const y = 260 + Math.floor(i / 5) * 190
    ctx.fillRect(x, y, 120, 120)
  }

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 62px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_title', '洛雪音乐年度报告'), 80, 150)
  ctx.font = '500 36px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(248, 250, 252, .84)'
  ctx.fillText(resolveI18n('yearly_report__poster_subtitle', `${overview.year} 听歌回顾`, { year: overview.year }), 80, 208)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 94px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(formatDuration(overview.totalListenSeconds), 80, 390)
  ctx.font = '500 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.fillText(resolveI18n('yearly_report__poster_total_line', `总收听 ${overview.sessionCount} 次`, { sessions: overview.sessionCount }), 84, 446)

  const statRows: Array<[string, string]> = [
    [resolveI18n('yearly_report__active_days', '活跃天数'), `${overview.activeDays}`],
    [resolveI18n('yearly_report__new_song_ratio', '新歌占比'), formatPercent(overview.newSongRatio)],
    [resolveI18n('yearly_report__new_artist_ratio', '新歌手占比'), formatPercent(overview.newArtistRatio)],
  ]

  let rowY = 548
  for (const [label, value] of statRows) {
    ctx.fillStyle = 'rgba(255, 255, 255, .66)'
    ctx.font = '500 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(label, 84, rowY)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 38px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(value, 730, rowY)
    rowY += 88
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 44px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_replay_title', '年度反复听'), 80, 958)

  const replaySongs = cards.replaySongs.slice(0, 6)
  let replayY = 1028
  replaySongs.forEach((item, index) => {
    ctx.fillStyle = 'rgba(255, 255, 255, .72)'
    ctx.font = '600 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`${index + 1}`, 84, replayY)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 32px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(item.songName.slice(0, 26), 136, replayY)
    ctx.fillStyle = 'rgba(255, 255, 255, .68)'
    ctx.font = '500 26px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`${item.artistName.slice(0, 16)} · x${item.count}`, 612, replayY)
    replayY += 72
  })

  ctx.fillStyle = 'rgba(255, 255, 255, .62)'
  ctx.font = '500 26px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `生成于 ${new Date().toLocaleString()}`, { time: new Date().toLocaleString() }), 82, 1778)
  ctx.fillText(resolveI18n('yearly_report__poster_share_line', '用洛雪音乐分享你的年度节奏'), 82, 1830)

  return canvas.toDataURL('image/png')
}

const drawYearlyPoster = (overview: LX.ReportYearly.OverviewDTO, cards: LX.ReportYearly.CardsDTO) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  bg.addColorStop(0, '#1f2937')
  bg.addColorStop(0.45, '#1d4ed8')
  bg.addColorStop(1, '#3b1f5f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const haloA = ctx.createRadialGradient(820, 220, 80, 820, 220, 560)
  haloA.addColorStop(0, 'rgba(255, 170, 120, .34)')
  haloA.addColorStop(1, 'rgba(255, 170, 120, 0)')
  ctx.fillStyle = haloA
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const haloB = ctx.createRadialGradient(180, 1540, 90, 180, 1540, 580)
  haloB.addColorStop(0, 'rgba(96, 232, 255, .26)')
  haloB.addColorStop(1, 'rgba(96, 232, 255, 0)')
  ctx.fillStyle = haloB
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255, 255, 255, .06)'
  for (let i = 0; i < 24; i += 1) {
    const x = 34 + (i % 6) * 170
    const y = 260 + Math.floor(i / 6) * 172
    ctx.fillRect(x, y, 110, 110)
  }

  const mainTop = 76
  fillGlassCard(ctx, 58, mainTop, 964, 448, 34)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 58px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_title', '洛雪音乐年度报告'), 96, 172)
  ctx.font = '500 34px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(248, 250, 252, .84)'
  ctx.fillText(resolveI18n('yearly_report__poster_subtitle', `${overview.year} 听歌回顾`, { year: overview.year }), 96, 224)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 102px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(formatDuration(overview.totalListenSeconds), 96, 374)
  ctx.font = '500 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.fillText(resolveI18n('yearly_report__poster_total_line', `总收听 ${overview.sessionCount} 次`, { sessions: overview.sessionCount }), 98, 430)

  const statCards: Array<{ label: string, value: string }> = [
    { label: resolveI18n('yearly_report__active_days', '活跃天数'), value: `${overview.activeDays}` },
    { label: resolveI18n('yearly_report__new_song_ratio', '新歌占比'), value: formatPercent(overview.newSongRatio) },
    { label: resolveI18n('yearly_report__new_artist_ratio', '新歌手占比'), value: formatPercent(overview.newArtistRatio) },
  ]
  let statX = 96
  const statY = 454
  for (const item of statCards) {
    fillGlassCard(ctx, statX, statY, 298, 126, 20)
    ctx.fillStyle = 'rgba(240, 248, 255, .74)'
    ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(item.label, statX + 18, statY + 46)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 40px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(item.value, statX + 18, statY + 96)
    statX += 322
  }

  fillGlassCard(ctx, 58, 560, 964, 294, 30)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 42px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__favorites', 'Year Favorites'), 92, 636)

  const topSong = cards.yearFavorites.song
  const topArtist = cards.yearFavorites.artist
  const topAlbum = cards.yearFavorites.album
  const favoriteRows = [
    [
      resolveI18n('yearly_report__top_song', '年度歌曲'),
      trimText(topSong.songName || resolveI18n('monthly_report__no_data', '暂无数据'), 20),
      trimText(topSong.artistName || resolveI18n('monthly_report__no_data', '暂无数据'), 18),
    ],
    [
      resolveI18n('yearly_report__top_artist', '年度歌手'),
      trimText(topArtist.artistName || resolveI18n('monthly_report__no_data', '暂无数据'), 20),
      `${topArtist.count}次 · ${formatDuration(topArtist.seconds)}`,
    ],
    [
      resolveI18n('yearly_report__top_album', '年度专辑'),
      trimText(topAlbum.albumName || resolveI18n('monthly_report__no_data', '暂无数据'), 20),
      trimText(`${topAlbum.artistName || resolveI18n('monthly_report__no_data', '暂无数据')} · ${topAlbum.count}次`, 24),
    ],
  ]

  let favoriteY = 694
  for (const [label, main, sub] of favoriteRows) {
    ctx.fillStyle = 'rgba(232, 242, 255, .66)'
    ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(label, 96, favoriteY)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(main, 282, favoriteY)
    ctx.fillStyle = 'rgba(232, 242, 255, .72)'
    ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(sub, 282, favoriteY + 36)
    favoriteY += 80
  }

  fillGlassCard(ctx, 58, 888, 964, 634, 30)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 44px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_replay_title', '年度反复听'), 92, 966)

  const replaySongs = cards.replaySongs.slice(0, 3)
  let replayY = 1048
  replaySongs.forEach((item, index) => {
    fillGlassCard(ctx, 90, replayY - 34, 900, 140, 18)
    ctx.fillStyle = 'rgba(255, 255, 255, .84)'
    ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`#${index + 1}`, 120, replayY + 12)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(trimText(item.songName, 24), 232, replayY + 6)
    ctx.fillStyle = 'rgba(255, 255, 255, .68)'
    ctx.font = '500 25px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`${trimText(item.artistName, 18)} · x${item.count} · ${formatDuration(item.seconds)}`, 232, replayY + 44)
    replayY += 166
  })

  const footerTop = 1570
  fillGlassCard(ctx, 58, footerTop, 964, 250, 26)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 40px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__story_ending_title', `${overview.year}，谢谢音乐继续陪你`, { year: overview.year }), 92, footerTop + 74)
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.font = '500 28px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_share_line', '用洛雪音乐分享你的年度节奏'), 92, footerTop + 126)
  ctx.fillStyle = 'rgba(255, 255, 255, .62)'
  ctx.font = '500 23px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `生成于 ${new Date().toLocaleString()}`, { time: new Date().toLocaleString() }), 92, footerTop + 174)
  ctx.fillText(`LX Music · ${overview.year}`, 92, footerTop + 212)

  return canvas.toDataURL('image/png')
}

export const loadYearOptions = async(preferredYear?: number) => {
  const options = await getYearlyReportYearOptions()
  const nextOptions = [...options].sort((a, b) => b.year - a.year)
  yearlyYearOptions.value = nextOptions

  if (!nextOptions.length) {
    yearlySelectedYear.value = getCurrentYear()
    return yearlySelectedYear.value
  }

  const expectedYear = normalizeYear(preferredYear ?? yearlySelectedYear.value)
  const matched = nextOptions.find(item => item.year === expectedYear)
  yearlySelectedYear.value = matched?.year ?? nextOptions[0].year
  return yearlySelectedYear.value
}

export const loadYearlyReport = async(year?: number) => {
  yearlyLoading.value = true
  yearlyError.value = ''
  try {
    const selectedYear = await loadYearOptions(year)
    const [overview, cards] = await Promise.all([
      getYearlyReportOverview({ year: selectedYear }),
      getYearlyReportCards({ year: selectedYear }),
    ])
    yearlySelectedYear.value = overview.year
    yearlyOverview.value = overview
    yearlyCards.value = cards
    yearlyLastUpdatedAt.value = Date.now()
  } catch (err: any) {
    yearlyError.value = err?.message ?? String(err)
    yearlyOverview.value = null
    yearlyCards.value = null
    throw err
  } finally {
    yearlyLoading.value = false
  }
}

export const exportYearlyReport = async(style: 'classic' | 'poster' = 'poster') => {
  if (!yearlyOverview.value || !yearlyCards.value) throw new Error('Yearly report data is empty')
  const year = yearlyOverview.value.year
  const dataUrl = style === 'classic'
    ? drawYearlyPosterClassic(yearlyOverview.value, yearlyCards.value)
    : drawYearlyPoster(yearlyOverview.value, yearlyCards.value)
  const defaultName = filterFileName(`lx-yearly-report-${year}-${style}.png`)
  return exportYearlyReportPng({
    dataUrl,
    defaultName,
  })
}

export const createYearlyReportPosterPreview = (style: 'classic' | 'poster' = 'poster') => {
  if (!yearlyOverview.value || !yearlyCards.value) throw new Error('Yearly report data is empty')
  return style === 'classic'
    ? drawYearlyPosterClassic(yearlyOverview.value, yearlyCards.value)
    : drawYearlyPoster(yearlyOverview.value, yearlyCards.value)
}

export const rebuildAndReloadYearlyReport = async(year?: number) => {
  const targetYear = normalizeYear(year ?? yearlySelectedYear.value)
  const result = await rebuildYearlyReportCache({
    year: targetYear,
  })
  await loadYearlyReport(result.year)
  return result
}
