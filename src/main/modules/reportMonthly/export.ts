import fs from 'node:fs/promises'
import { showSaveDialog } from '@main/modules/winMain'

const DATA_URL_PREFIX = 'data:image/png;base64,'

const getPngBuffer = (dataUrl: string) => {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) throw new Error('Invalid PNG data URL')
  return Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), 'base64')
}

interface ExportPngPayload {
  dataUrl: string
  defaultName: string
}

const exportPng = async(title: string, payload: ExportPngPayload) => {
  const result = await showSaveDialog({
    title,
    defaultPath: payload.defaultName,
    filters: [
      { name: 'PNG', extensions: ['png'] },
    ],
  })
  if (result.canceled || !result.filePath) return { filePath: null as string | null }

  const buffer = getPngBuffer(payload.dataUrl)
  await fs.writeFile(result.filePath, buffer)
  return { filePath: result.filePath }
}

export const exportMonthlyPng = async(payload: LX.ReportMonthly.ExportPngPayload): Promise<LX.ReportMonthly.ExportPngResult> => {
  const result = await exportPng('Export Monthly Report', payload)
  return { filePath: result.filePath }
}

export const exportYearlyPng = async(payload: LX.ReportYearly.ExportPngPayload): Promise<LX.ReportYearly.ExportPngResult> => {
  const result = await exportPng('Export Yearly Report', payload)
  return { filePath: result.filePath }
}
