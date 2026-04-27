import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import {
  trackSession,
  getOverview,
  getCards,
  exportPng,
  rebuildCache,
} from '@main/modules/reportMonthly'

export default () => {
  mainHandle<LX.ReportMonthly.TrackSessionPayload, boolean>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_track_session, async({ params }) => {
    return trackSession(params)
  })

  mainHandle<undefined, LX.ReportMonthly.OverviewDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_overview, async() => {
    return getOverview()
  })

  mainHandle<undefined, LX.ReportMonthly.CardsDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_get_cards, async() => {
    return getCards()
  })

  mainHandle<LX.ReportMonthly.ExportPngPayload, LX.ReportMonthly.ExportPngResult>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_export_png, async({ params }) => {
    return exportPng(params)
  })

  mainHandle<number, LX.ReportMonthly.RebuildCacheResult>(WIN_MAIN_RENDERER_EVENT_NAME.report_monthly_rebuild_cache, async({ params }) => {
    const days = params === 90 || params === 400 ? params : 30
    return rebuildCache(days)
  })
}
