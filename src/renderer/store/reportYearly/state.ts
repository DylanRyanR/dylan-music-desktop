import { ref, shallowRef } from '@common/utils/vueTools'

const getDefaultYear = () => new Date().getFullYear()
const YEARLY_EXPORT_STYLE_STORAGE_KEY = 'report.yearly.export_style'

const normalizeYearlyExportStyle = (style: string | null): 'classic' | 'poster' => {
  if (style === 'classic') return 'classic'
  return 'poster'
}

const getInitialYearlyExportPosterStyle = () => {
  try {
    return normalizeYearlyExportStyle(window.localStorage.getItem(YEARLY_EXPORT_STYLE_STORAGE_KEY))
  } catch {
    return 'poster'
  }
}

export const yearlyYearOptions = shallowRef<LX.ReportYearly.YearOption[]>([])
export const yearlySelectedYear = ref<number>(getDefaultYear())
export const yearlyOverview = shallowRef<LX.ReportYearly.OverviewDTO | null>(null)
export const yearlyCards = shallowRef<LX.ReportYearly.CardsDTO | null>(null)
export const yearlyLoading = ref(false)
export const yearlyError = ref('')
export const yearlyLastUpdatedAt = ref(0)
export const yearlyExportPosterStyle = ref<'classic' | 'poster'>(getInitialYearlyExportPosterStyle())

export const setYearlyExportPosterStyle = (style: 'classic' | 'poster') => {
  const nextStyle = normalizeYearlyExportStyle(style)
  yearlyExportPosterStyle.value = nextStyle
  try {
    window.localStorage.setItem(YEARLY_EXPORT_STYLE_STORAGE_KEY, nextStyle)
  } catch {
    // Ignore localStorage failures and keep in-memory style.
  }
}

export const resetYearlyReportState = () => {
  yearlyYearOptions.value = []
  yearlySelectedYear.value = getDefaultYear()
  yearlyOverview.value = null
  yearlyCards.value = null
  yearlyLoading.value = false
  yearlyError.value = ''
  yearlyLastUpdatedAt.value = 0
  yearlyExportPosterStyle.value = getInitialYearlyExportPosterStyle()
}
