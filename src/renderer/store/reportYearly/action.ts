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

const drawYearlyPoster = (overview: LX.ReportYearly.OverviewDTO, cards: LX.ReportYearly.CardsDTO) => {
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

export const exportYearlyReport = async() => {
  if (!yearlyOverview.value || !yearlyCards.value) throw new Error('Yearly report data is empty')
  const year = yearlyOverview.value.year
  const dataUrl = drawYearlyPoster(yearlyOverview.value, yearlyCards.value)
  const defaultName = filterFileName(`lx-yearly-report-${year}.png`)
  return exportYearlyReportPng({
    dataUrl,
    defaultName,
  })
}

export const rebuildAndReloadYearlyReport = async(year?: number) => {
  const targetYear = normalizeYear(year ?? yearlySelectedYear.value)
  const result = await rebuildYearlyReportCache({
    year: targetYear,
  })
  await loadYearlyReport(result.year)
  return result
}
