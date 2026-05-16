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
  return `${text.slice(0, Math.max(0, maxLength - 1))}...`
}

let noisePatternCanvas: HTMLCanvasElement | null = null
const getNoisePattern = (): CanvasPattern | null => {
  if (noisePatternCanvas) {
    const cachedCtx = noisePatternCanvas.getContext('2d')
    if (cachedCtx) return cachedCtx.createPattern(noisePatternCanvas, 'repeat')
  }
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const imageData = ctx.getImageData(0, 0, 128, 128)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 40)
    imageData.data[i] = v
    imageData.data[i + 1] = v
    imageData.data[i + 2] = v
    imageData.data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  noisePatternCanvas = canvas
  return ctx.createPattern(canvas, 'repeat')
}

interface YearlyPosterLayoutMetrics {
  contentLeft: number
  contentWidth: number
  innerLeft: number
  innerRight: number
  columnGap: number
  leftColumnWidth: number
  rightColumnWidth: number
  heroTop: number
  heroHeight: number
  middleTop: number
  middleHeight: number
  replayTop: number
  replayHeight: number
  replayListTop: number
  replayVisibleCount: number
  replayRowHeight: number
  footerTop: number
  footerHeight: number
  favoriteRowGap: number
  albumMissing: boolean
}

const getYearlyPosterLayoutMetrics = (cards: LX.ReportYearly.CardsDTO): YearlyPosterLayoutMetrics => {
  const canvasHeight = 1920
  const heroTop = 76
  const sectionGap = 34
  const footerGap = 28
  const footerBottomPadding = 108
  const contentLeft = 58
  const contentWidth = 964
  const innerLeft = 92
  const innerRight = 988
  const columnGap = 24
  const leftColumnWidth = 560
  const rightColumnWidth = contentWidth - (innerLeft - contentLeft) * 2 - leftColumnWidth - columnGap

  const albumMissing = !cards.yearFavorites.album.albumName && !cards.yearFavorites.album.artistName
  const replayVisibleCount = Math.min(Math.max(cards.replaySongs.length, 1), 6)

  const heroHeight = 340
  const middleHeight = albumMissing ? 332 : 364
  const replayRowHeight = replayVisibleCount <= 2 ? 110 : replayVisibleCount >= 6 ? 98 : 104
  const replayHeaderHeight = 118
  const replayBodyHeight = replayVisibleCount * replayRowHeight
  const replayHeightBase = replayHeaderHeight + replayBodyHeight + 48
  const footerHeight = replayVisibleCount <= 2 ? 144 : replayVisibleCount >= 5 ? 118 : 132

  const middleTop = heroTop + heroHeight + sectionGap
  const replayTop = middleTop + middleHeight + sectionGap
  const replayHeight = Math.max(
    replayHeightBase,
    canvasHeight - footerBottomPadding - footerHeight - footerGap - replayTop,
  )
  const footerTop = replayTop + replayHeight + footerGap

  const replayBodyAvailable = replayHeight - replayHeaderHeight - 40
  const replayListTop = replayTop + replayHeaderHeight + Math.max(
    24,
    Math.floor((replayBodyAvailable - replayBodyHeight) / 2),
  )

  return {
    contentLeft,
    contentWidth,
    innerLeft,
    innerRight,
    columnGap,
    leftColumnWidth,
    rightColumnWidth,
    heroTop,
    heroHeight,
    middleTop,
    middleHeight,
    replayTop,
    replayHeight,
    replayListTop,
    replayVisibleCount,
    replayRowHeight,
    footerTop,
    footerHeight,
    favoriteRowGap: middleHeight <= 340 ? 88 : 96,
    albumMissing,
  }
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
  // 底色填充
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = 'rgba(255, 255, 255, .07)'
  ctx.fill()

  // 内发光渐变叠加
  ctx.save()
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  const shine = ctx.createLinearGradient(x, y, x + width, y + height)
  shine.addColorStop(0, 'rgba(255, 255, 255, .18)')
  shine.addColorStop(0.4, 'rgba(255, 255, 255, .04)')
  shine.addColorStop(1, 'rgba(255, 255, 255, .01)')
  ctx.fillStyle = shine
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  // 外边框
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = 'rgba(255, 255, 255, .10)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 顶部高光线
  ctx.save()
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255, 255, 255, .14)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + radius, y + 1)
  ctx.lineTo(x + width - radius, y + 1)
  ctx.stroke()
  ctx.restore()
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
  ctx.fillText(resolveI18n('yearly_report__poster_title', 'LX Music Yearly Report'), 80, 150)
  ctx.font = '500 36px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(248, 250, 252, .84)'
  ctx.fillText(resolveI18n('yearly_report__poster_subtitle', `${overview.year} Listening Recap`, { year: overview.year }), 80, 208)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 94px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(formatDuration(overview.totalListenSeconds), 80, 390)
  ctx.font = '500 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.fillText(resolveI18n('yearly_report__poster_total_line', `Total listens ${overview.sessionCount}`, { sessions: overview.sessionCount }), 84, 446)

  const statRows: Array<[string, string]> = [
    [resolveI18n('yearly_report__active_days', 'Active Days'), `${overview.activeDays}`],
    [resolveI18n('yearly_report__new_song_ratio', 'New Song Ratio'), formatPercent(overview.newSongRatio)],
    [resolveI18n('yearly_report__new_artist_ratio', 'New Artist Ratio'), formatPercent(overview.newArtistRatio)],
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
  ctx.fillText(resolveI18n('yearly_report__poster_replay_title', 'Most Replayed'), 80, 958)

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
    ctx.fillText(`${item.artistName.slice(0, 16)} / x${item.count}`, 612, replayY)
    replayY += 72
  })

  ctx.fillStyle = 'rgba(255, 255, 255, .62)'
  ctx.font = '500 26px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `Generated at ${new Date().toLocaleString()}`, { time: new Date().toLocaleString() }), 82, 1778)
  ctx.fillText(resolveI18n('yearly_report__poster_share_line', 'Share your yearly rhythm with LX Music'), 82, 1830)

  return canvas.toDataURL('image/png')
}

const drawYearlyPoster = (overview: LX.ReportYearly.OverviewDTO, cards: LX.ReportYearly.CardsDTO) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  // 底色：纵向三阶渐变
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bg.addColorStop(0, '#0f172a')
  bg.addColorStop(0.5, '#1e1b4b')
  bg.addColorStop(1, '#0f172a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 液态光球 ×3
  const orbA = ctx.createRadialGradient(820, 280, 60, 820, 280, 620)
  orbA.addColorStop(0, 'rgba(255, 140, 80, .20)')
  orbA.addColorStop(1, 'rgba(255, 140, 80, 0)')
  ctx.fillStyle = orbA
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const orbB = ctx.createRadialGradient(180, 1620, 80, 180, 1620, 540)
  orbB.addColorStop(0, 'rgba(56, 200, 240, .15)')
  orbB.addColorStop(1, 'rgba(56, 200, 240, 0)')
  ctx.fillStyle = orbB
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const orbC = ctx.createRadialGradient(540, 960, 100, 540, 960, 500)
  orbC.addColorStop(0, 'rgba(130, 80, 220, .10)')
  orbC.addColorStop(1, 'rgba(130, 80, 220, 0)')
  ctx.fillStyle = orbC
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 黑胶纹理：同心圆环
  ctx.save()
  ctx.globalAlpha = 0.028
  for (let r = 260; r < 1200; r += 80) {
    ctx.beginPath()
    ctx.arc(540, 960, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, .5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()

  // 细微噪点
  const noise = getNoisePattern()
  if (noise) {
    ctx.save()
    ctx.globalAlpha = 0.04
    ctx.fillStyle = noise
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const {
    contentLeft,
    contentWidth,
    innerLeft,
    innerRight,
    columnGap,
    leftColumnWidth,
    rightColumnWidth,
    heroTop,
    heroHeight,
    middleTop,
    middleHeight,
    replayTop,
    replayHeight,
    replayListTop,
    replayVisibleCount,
    replayRowHeight,
    footerTop,
    footerHeight,
    favoriteRowGap,
    albumMissing,
  } = getYearlyPosterLayoutMetrics(cards)
  const generatedAt = new Date().toLocaleString()

  fillGlassCard(ctx, contentLeft, heroTop, contentWidth, heroHeight, 34)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 56px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_title', 'LX Music Yearly Report'), innerLeft, heroTop + 88)
  ctx.font = '500 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(248, 250, 252, .84)'
  ctx.fillText(resolveI18n('yearly_report__poster_subtitle', `${overview.year} Listening Recap`, { year: overview.year }), innerLeft, heroTop + 138)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 100px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(formatDuration(overview.totalListenSeconds), innerLeft, heroTop + 282)
  ctx.font = '500 30px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.fillText(resolveI18n('yearly_report__poster_total_line', `Total listens ${overview.sessionCount}`, { sessions: overview.sessionCount }), innerLeft + 4, heroTop + 334)

  const statCards: Array<{ label: string, value: string }> = [
    { label: resolveI18n('yearly_report__active_days', 'Active Days'), value: `${overview.activeDays}` },
    { label: resolveI18n('yearly_report__new_song_ratio', 'New Song Ratio'), value: formatPercent(overview.newSongRatio) },
    { label: resolveI18n('yearly_report__new_artist_ratio', 'New Artist Ratio'), value: formatPercent(overview.newArtistRatio) },
  ]

  // Section divider: Hero → Middle
  ctx.save()
  const dividerY1 = middleTop - 20
  const dividerGrad1 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY1, contentLeft + contentWidth * 0.8, dividerY1)
  dividerGrad1.addColorStop(0, 'rgba(255, 255, 255, 0)')
  dividerGrad1.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
  dividerGrad1.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.strokeStyle = dividerGrad1
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY1)
  ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY1)
  ctx.stroke()
  ctx.restore()

  fillGlassCard(ctx, contentLeft, middleTop, contentWidth, middleHeight, 30)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 40px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__favorites', 'Year Favorites'), innerLeft, middleTop + 68)

  const topSong = cards.yearFavorites.song
  const topArtist = cards.yearFavorites.artist
  const topAlbum = cards.yearFavorites.album
  const favoriteRows: Array<[string, string, string]> = [
    [
      resolveI18n('yearly_report__top_song', 'Top Song'),
      trimText(topSong.songName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 26 : 24),
      trimText(topSong.artistName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 22 : 20),
    ],
    [
      resolveI18n('yearly_report__top_artist', 'Top Artist'),
      trimText(topArtist.artistName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 26 : 24),
      `${topArtist.count}x / ${formatDuration(topArtist.seconds)}`,
    ],
    [
      resolveI18n('yearly_report__top_album', 'Top Album'),
      trimText(topAlbum.albumName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 20 : 24),
      trimText(`${topAlbum.artistName || resolveI18n('monthly_report__no_data', 'No Data')} / ${topAlbum.count}x`, albumMissing ? 24 : 28),
    ],
  ]

  let favoriteY = middleTop + 126
  for (const [label, main, sub] of favoriteRows) {
    ctx.fillStyle = 'rgba(232, 242, 255, .66)'
    ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(label, innerLeft, favoriteY)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(main, innerLeft, favoriteY + 40)
    ctx.fillStyle = 'rgba(232, 242, 255, .72)'
    ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(sub, innerLeft, favoriteY + 74)
    favoriteY += favoriteRowGap
  }

  let statY = middleTop + 54
  const statX = innerLeft + leftColumnWidth + columnGap
  for (const item of statCards) {
    fillGlassCard(ctx, statX, statY, rightColumnWidth, 86, 18)
    ctx.fillStyle = 'rgba(240, 248, 255, .72)'
    ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(item.label, statX + 20, statY + 34)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 36px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(item.value, statX + 20, statY + 68)
    statY += 106
  }

  // Section divider: Middle → Replay
  ctx.save()
  const dividerY2 = replayTop - 20
  const dividerGrad2 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY2, contentLeft + contentWidth * 0.8, dividerY2)
  dividerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0)')
  dividerGrad2.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
  dividerGrad2.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.strokeStyle = dividerGrad2
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY2)
  ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY2)
  ctx.stroke()
  ctx.restore()

  fillGlassCard(ctx, contentLeft, replayTop, contentWidth, replayHeight, 30)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 42px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__poster_replay_title', 'Most Replayed'), innerLeft, replayTop + 70)

  const replaySongs = cards.replaySongs.slice(0, replayVisibleCount)
  const replayCardHeight = replayRowHeight - 18
  const replayCardWidth = 900
  let replayY = replayListTop
  replaySongs.forEach((item, index) => {
    fillGlassCard(ctx, innerLeft - 2, replayY - 20, replayCardWidth, replayCardHeight, 18)
    ctx.fillStyle = 'rgba(255, 255, 255, .78)'
    ctx.font = '700 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`#${index + 1}`, innerLeft + 24, replayY + 16)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(trimText(item.songName, replayVisibleCount <= 2 ? 32 : 28), innerLeft + 126, replayY + 12)
    ctx.fillStyle = 'rgba(255, 255, 255, .68)'
    ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(trimText(item.artistName, replayVisibleCount <= 2 ? 24 : 22), innerLeft + 126, replayY + 46)
    ctx.save()
    ctx.textAlign = 'right'
    ctx.fillText(`x${item.count} / ${formatDuration(item.seconds)}`, innerRight - 24, replayY + 46)
    ctx.restore()
    replayY += replayRowHeight
  })

  // Section divider: Replay → Footer
  ctx.save()
  const dividerY3 = footerTop - 20
  const dividerGrad3 = ctx.createLinearGradient(contentLeft + contentWidth * 0.2, dividerY3, contentLeft + contentWidth * 0.8, dividerY3)
  dividerGrad3.addColorStop(0, 'rgba(255, 255, 255, 0)')
  dividerGrad3.addColorStop(0.5, 'rgba(255, 255, 255, .06)')
  dividerGrad3.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.strokeStyle = dividerGrad3
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(contentLeft + contentWidth * 0.2, dividerY3)
  ctx.lineTo(contentLeft + contentWidth * 0.8, dividerY3)
  ctx.stroke()
  ctx.restore()

  fillGlassCard(ctx, contentLeft, footerTop, contentWidth, footerHeight, 24)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(resolveI18n('yearly_report__story_ending_title', `${overview.year}, thanks for listening`, { year: overview.year }), innerLeft, footerTop + 44)
  ctx.fillStyle = 'rgba(255, 255, 255, .62)'
  ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
  const footerMetaY = footerTop + Math.min(footerHeight - 22, 82)
  ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `Generated at ${generatedAt}`, { time: generatedAt }), innerLeft, footerMetaY)
  ctx.save()
  ctx.textAlign = 'right'
  ctx.fillText(`LX Music / ${overview.year}`, innerRight - 24, footerMetaY)
  ctx.restore()

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
