<template lang="pug">
dt#update {{ $t('setting__update') }}
dd(:class="$style.card")
  .gap-top(:class="$style.toggleRow")
    base-checkbox(id="setting__update_tryAutoUpdate" :model-value="appSetting['common.tryAutoUpdate']" :label="$t('setting__update_try_auto_update')" @update:model-value="updateSetting({'common.tryAutoUpdate': $event})")
  .gap-top(:class="$style.toggleRow")
    base-checkbox(id="setting__update_showChangeLog" :model-value="appSetting['common.showChangeLog']" :label="$t('setting__update_show_change_log')" @update:model-value="updateSetting({'common.showChangeLog': $event})")

  .gap-top(:class="$style.versionPanel")
    .gap-top(:class="$style.versionHeader")
      .gap-top
        p(:class="$style.eyebrow") {{ $t('setting__update_current_label') }}
        p.p.small(:class="$style.currentVersion" @click="handleOpenDevTools") {{ versionInfo.version }}
      .gap-top(:class="$style.statusGroup")
        span(:class="[$style.statusBadge, statusBadgeClass]") {{ statusText }}
        base-btn.btn.gap-left(min @click="showUpdateModal") {{ $t('setting__update_open_version_modal_btn') }}

    .gap-top(:class="$style.versionGrid")
      .gap-top(:class="$style.versionItem")
        p(:class="$style.metaLabel") {{ $t('setting__update_latest_label') }}
        p.p.small(:class="$style.metaValue") {{ latestVersionText }}
      .gap-top(v-if="commit_id" :class="$style.versionItem")
        p(:class="$style.metaLabel") {{ $t('setting__update_commit_id') }}
        p.p.small.select(:class="[$style.metaValue, $style.selectValue]") {{ commit_id }}
      .gap-top(v-if="commit_date" :class="$style.versionItem")
        p(:class="$style.metaLabel") {{ $t('setting__update_commit_date') }}
        p.p.small(:class="$style.metaValue") {{ commit_date }}

    .gap-top(v-if="downloadProgress" :class="$style.progressCard")
      p(:class="$style.metaLabel") {{ $t('setting__update_downloading') }}
      p.p.small(:class="$style.progressText") {{ downloadProgress }}

    .gap-top(v-if="statusDescription" :class="$style.notice")
      p.p(:class="$style.noticeText") {{ statusDescription }}
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { versionInfo } from '@renderer/store'
import { dateFormat, sizeFormate } from '@common/utils/common'
// import { openDirInExplorer, selectDir } from '@renderer/utils'
import { openDevTools } from '@renderer/utils/ipc'
import { useI18n } from '@renderer/plugins/i18n'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingUpdate',
  setup() {
    let lastClickTime = 0
    let clickNum = 0
    const commit_id = COMMIT_ID
    const commit_date = dateFormat(COMMIT_DATE)

    const t = useI18n()

    const handleOpenDevTools = () => {
      if (window.performance.now() - lastClickTime > 1000) {
        if (clickNum > 0) clickNum = 0
      } else {
        if (clickNum > 4) {
          openDevTools()
          clickNum = 0
          return
        }
      }
      clickNum++
      lastClickTime = window.performance.now()
    }

    const downloadProgress = computed(() => {
      return versionInfo.status == 'downloading'
        ? versionInfo.downloadProgress
          ? `${versionInfo.downloadProgress.percent.toFixed(2)}% - ${sizeFormate(versionInfo.downloadProgress.transferred)}/${sizeFormate(versionInfo.downloadProgress.total)} - ${sizeFormate(versionInfo.downloadProgress.bytesPerSecond)}/s`
          : t('setting__update_init')
        : ''
    })

    const latestVersionText = computed(() => {
      return versionInfo.newVersion && versionInfo.newVersion.version != '0.0.0'
        ? versionInfo.newVersion.version
        : t('setting__update_unknown')
    })

    const statusText = computed(() => {
      if (versionInfo.status == 'downloading') return t('setting__update_downloading')
      if (versionInfo.status == 'downloaded') return t('setting__update_new_version')
      if (versionInfo.isLatest) return t('setting__update_latest')
      if (versionInfo.isUnknown) return t('setting__update_unknown')
      if (versionInfo.newVersion) return t('setting__update_new_version')
      if (versionInfo.status == 'checking') return t('setting__update_checking')
      return t('setting__update_unknown')
    })

    const statusDescription = computed(() => {
      if (versionInfo.isLatest) return t('setting__update_latest')
      if (versionInfo.isUnknown) return t('setting__update_unknown_tip')
      if (versionInfo.status == 'checking') return t('setting__update_checking')
      if (versionInfo.status == 'downloading') return ''
      if (versionInfo.newVersion) return t('setting__update_new_version')
      return ''
    })

    const statusBadgeClass = computed(() => {
      if (versionInfo.status == 'downloading') return 'isDownloading'
      if (versionInfo.isLatest) return 'isLatest'
      if (versionInfo.isUnknown) return 'isUnknown'
      if (versionInfo.newVersion) return 'isAvailable'
      return 'isUnknown'
    })

    const showUpdateModal = () => {
      versionInfo.showModal = true
    }

    return {
      versionInfo,
      downloadProgress,
      latestVersionText,
      statusText,
      statusDescription,
      statusBadgeClass,
      handleOpenDevTools,
      showUpdateModal,
      appSetting,
      updateSetting,
      commit_id,
      commit_date,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toggleRow {
  padding: 2px 0;
}

.versionPanel {
  padding: 18px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--color-primary-background) 78%, rgba(255, 255, 255, .12));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 14px 30px rgba(0, 0, 0, .05);
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 52%, transparent);
}

.versionHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 66%, transparent);
}

.eyebrow,
.metaLabel {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .58;
}

.currentVersion {
  margin: 8px 0 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  cursor: pointer;
}

.statusGroup {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  border: 1px solid transparent;

  &.isLatest {
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary-background-hover) 84%, rgba(255, 255, 255, .08));
    border-color: color-mix(in srgb, var(--color-primary) 24%, transparent);
  }

  &.isAvailable,
  &.isDownloading {
    color: #fff;
    background: color-mix(in srgb, var(--color-primary) 82%, rgba(255, 255, 255, .08));
    box-shadow: 0 10px 22px rgba(0, 0, 0, .08);
  }

  &.isUnknown {
    color: color-mix(in srgb, var(--color-font) 86%, transparent);
    background: color-mix(in srgb, var(--color-button-background-hover) 78%, transparent);
    border-color: color-mix(in srgb, var(--color-list-header-border-bottom) 52%, transparent);
  }
}

.versionGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.versionItem,
.progressCard,
.notice {
  padding: 14px 16px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-primary-background-hover) 74%, rgba(255, 255, 255, .08));
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 46%, transparent);
}

.metaValue,
.progressText,
.noticeText {
  margin: 8px 0 0;
  line-height: 1.56;
}

.metaValue {
  font-weight: 600;
}

.selectValue {
  word-break: break-all;
}

.progressText {
  font-variant-numeric: tabular-nums;
}

.noticeText {
  color: color-mix(in srgb, var(--color-font) 84%, transparent);
}

@media (max-width: 720px) {
  .versionHeader {
    flex-direction: column;
    align-items: stretch;
  }

  .statusGroup {
    justify-content: flex-start;
  }

  .currentVersion {
    font-size: 22px;
  }
}
</style>
