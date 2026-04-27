import { formatPlayTime2, filterFileName } from '@common/utils/common'
import { useI18n } from '@root/lang'
import {
  getMonthlyReportOverview,
  getMonthlyReportCards,
  exportMonthlyReportPng,
  rebuildMonthlyReportCache,
} from '@renderer/utils/ipc'
import {
  reportOverview,
  reportCards,
  reportLoading,
  reportError,
  reportLastUpdatedAt,
} from './state'

const t = useI18n()

const formatDuration = (seconds: number) => {
  const sec = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return formatPlayTime2(sec)
}

const drawPoster = (overview: LX.ReportMonthly.OverviewDTO, cards: LX.ReportMonthly.CardsDTO) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#111827')
  gradient.addColorStop(0.45, '#1e293b')
  gradient.addColorStop(1, '#0f172a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255, 255, 255, .08)'
  for (let i = 0; i < 18; i += 1) {
    const x = 60 + (i % 6) * 170
    const y = 260 + Math.floor(i / 6) * 240
    ctx.fillRect(x, y, 120, 120)
  }

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 64px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(t('monthly_report__poster_title'), 80, 160)
  ctx.font = '500 40px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(248, 250, 252, .84)'
  ctx.fillText(t('monthly_report__poster_subtitle'), 80, 222)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 102px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(formatDuration(overview.totalListenSeconds), 80, 400)
  ctx.font = '500 34px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, .8)'
  ctx.fillText(t('monthly_report__poster_total_line', { sessions: overview.sessionCount }), 82, 452)

  const statRows: Array<[string, string]> = [
    [t('monthly_report__poster_valid_30s'), `${overview.valid30Count}`],
    [t('monthly_report__poster_complete_80'), `${(overview.complete80Rate * 100).toFixed(1)}%`],
    [t('monthly_report__poster_skip_rate'), `${(overview.skipRate * 100).toFixed(1)}%`],
    [t('monthly_report__poster_streak'), t('monthly_report__poster_days_value', { days: overview.streakDays })],
    [t('monthly_report__active_days'), t('monthly_report__poster_days_value', { days: overview.activeDays })],
    [t('monthly_report__card_discovery'), `${overview.newDiscoveryCount}`],
  ]
  let y = 560
  for (const [label, value] of statRows) {
    ctx.fillStyle = 'rgba(255, 255, 255, .66)'
    ctx.font = '500 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(label, 84, y)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 38px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(value, 760, y)
    y += 88
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 44px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(t('monthly_report__card_top_songs'), 80, 1220)

  let rowY = 1290
  cards.topSongs.slice(0, 5).forEach((song, index) => {
    ctx.fillStyle = 'rgba(255, 255, 255, .72)'
    ctx.font = '600 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`${index + 1}`, 84, rowY)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 32px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(song.songName.slice(0, 28), 134, rowY)
    ctx.fillStyle = 'rgba(255, 255, 255, .7)'
    ctx.font = '500 28px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(song.artistName.slice(0, 18), 580, rowY)
    rowY += 72
  })

  ctx.fillStyle = 'rgba(255, 255, 255, .62)'
  ctx.font = '500 26px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(t('monthly_report__poster_generated_at', { time: new Date().toLocaleString() }), 82, 1780)
  ctx.fillText(t('monthly_report__poster_share_line'), 82, 1832)

  return canvas.toDataURL('image/png')
}

export const loadMonthlyReport = async() => {
  reportLoading.value = true
  reportError.value = ''
  try {
    const [overview, cards] = await Promise.all([
      getMonthlyReportOverview(),
      getMonthlyReportCards(),
    ])
    reportOverview.value = overview
    reportCards.value = cards
    reportLastUpdatedAt.value = Date.now()
  } catch (err: any) {
    reportError.value = err?.message ?? String(err)
    reportOverview.value = null
    reportCards.value = null
    throw err
  } finally {
    reportLoading.value = false
  }
}

export const exportMonthlyReport = async() => {
  if (!reportOverview.value || !reportCards.value) throw new Error('Monthly report data is empty')
  const dataUrl = drawPoster(reportOverview.value, reportCards.value)
  const name = filterFileName(`lx-monthly-report-${new Date().toISOString().slice(0, 10)}.png`)
  return exportMonthlyReportPng({
    dataUrl,
    defaultName: name,
  })
}

export const rebuildAndReloadMonthlyReport = async(days: 30 | 90 | 400 = 30) => {
  const rebuildResult = await rebuildMonthlyReportCache(days)
  await loadMonthlyReport()
  return rebuildResult
}
