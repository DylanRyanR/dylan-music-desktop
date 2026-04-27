import { formatPlayTime2 } from '@common/utils/common'
import { useI18n } from '@root/lang'

export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return formatPlayTime2(safeSeconds)
}

export const formatPercent = (value: number) => {
  const safeValue = Math.max(0, Math.min(1, value))
  return `${(safeValue * 100).toFixed(1)}%`
}

export const useSafeI18n = () => {
  const t = useI18n()
  const translate = t as unknown as (key: string, params?: Record<string, string | number>) => string
  return (key: string, fallback: string, params?: Record<string, string | number>) => {
    const text = translate(key, params)
    if (!text || text === key) return fallback
    return text
  }
}
