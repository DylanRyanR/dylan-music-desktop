import { ref, shallowRef } from '@common/utils/vueTools'

export const reportOverview = shallowRef<LX.ReportMonthly.OverviewDTO | null>(null)
export const reportCards = shallowRef<LX.ReportMonthly.CardsDTO | null>(null)
export const reportLoading = ref(false)
export const reportError = ref('')
export const reportLastUpdatedAt = ref(0)

export const resetMonthlyReportState = () => {
  reportOverview.value = null
  reportCards.value = null
  reportLoading.value = false
  reportError.value = ''
  reportLastUpdatedAt.value = 0
}
