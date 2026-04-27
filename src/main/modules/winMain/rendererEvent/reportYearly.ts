import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import {
  getYearOptions,
  getOverview,
  getCards,
  exportPng,
  rebuildYearCache,
} from '@main/modules/reportYearly'

export default () => {
  mainHandle<undefined, LX.ReportYearly.YearOption[]>(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_year_options, async() => {
    return getYearOptions()
  })

  mainHandle<LX.ReportYearly.GetPayload, LX.ReportYearly.OverviewDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_overview, async({ params }) => {
    return getOverview(params?.year ?? new Date().getFullYear())
  })

  mainHandle<LX.ReportYearly.GetPayload, LX.ReportYearly.CardsDTO>(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_get_cards, async({ params }) => {
    return getCards(params?.year ?? new Date().getFullYear())
  })

  mainHandle<LX.ReportYearly.ExportPngPayload, LX.ReportYearly.ExportPngResult>(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_export_png, async({ params }) => {
    return exportPng(params)
  })

  mainHandle<LX.ReportYearly.RebuildPayload, LX.ReportYearly.RebuildCacheResult>(WIN_MAIN_RENDERER_EVENT_NAME.report_yearly_rebuild_cache, async({ params }) => {
    return rebuildYearCache(params?.year ?? new Date().getFullYear())
  })
}
