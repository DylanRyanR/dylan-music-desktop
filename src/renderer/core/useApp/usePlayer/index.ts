import {
  createAudio,
} from '@renderer/plugins/player'
import useMediaDevice from './useMediaDevice'
import usePlayerEvent from './usePlayerEvent'
import usePlayer from './usePlayer'
import usePlayStatus from './usePlayStatus'
import useMonthlyReportTracker from './useMonthlyReportTracker'

export default () => {
  createAudio()

  usePlayerEvent()
  useMediaDevice() // 鍒濆鍖栭煶棰戦┍鍔ㄨ緭鍑鸿缃?
  usePlayer()
  useMonthlyReportTracker()
  const initPlayStatus = usePlayStatus()

  return () => {
    void initPlayStatus()
  }
}
