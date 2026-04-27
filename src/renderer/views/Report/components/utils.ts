import { formatPlayTime2 } from '@common/utils/common'

export const SOURCE_TYPES: LX.ReportMonthly.SourceType[] = ['online', 'local', 'onedrive', 'smb', 'webdav', 'other']

export const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return formatPlayTime2(safeSeconds)
}

export const formatPercent = (value: number, digits = 1) => {
  const rate = Number.isFinite(value) ? value : 0
  return `${(rate * 100).toFixed(digits)}%`
}

export const formatShortDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export const formatDateRange = (startAt: number, endAt: number) => {
  return `${formatShortDate(startAt)} - ${formatShortDate(endAt)}`
}

export const formatHourLabel = (hour: number) => {
  return `${hour.toString().padStart(2, '0')}:00`
}

export const getPeakHour = (histogram: number[]) => {
  let peakHour = 0
  let peakValue = -1
  for (let hour = 0; hour < histogram.length; hour += 1) {
    const value = histogram[hour]
    if (value > peakValue) {
      peakValue = value
      peakHour = hour
    }
  }
  return { hour: peakHour, value: Math.max(0, peakValue) }
}
