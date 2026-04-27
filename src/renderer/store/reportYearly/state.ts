import { ref, shallowRef } from '@common/utils/vueTools'

const getDefaultYear = () => new Date().getFullYear()

export const yearlyYearOptions = shallowRef<LX.ReportYearly.YearOption[]>([])
export const yearlySelectedYear = ref<number>(getDefaultYear())
export const yearlyOverview = shallowRef<LX.ReportYearly.OverviewDTO | null>(null)
export const yearlyCards = shallowRef<LX.ReportYearly.CardsDTO | null>(null)
export const yearlyLoading = ref(false)
export const yearlyError = ref('')
export const yearlyLastUpdatedAt = ref(0)

export const resetYearlyReportState = () => {
  yearlyYearOptions.value = []
  yearlySelectedYear.value = getDefaultYear()
  yearlyOverview.value = null
  yearlyCards.value = null
  yearlyLoading.value = false
  yearlyError.value = ''
  yearlyLastUpdatedAt.value = 0
}
