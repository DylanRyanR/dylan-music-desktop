<template>
  <div :class="$style.main">
    <div class="scroll" :class="$style.toc">
      <div :class="$style.tocInner">
        <div :class="$style.tocHeader">
          <p :class="$style.tocEyebrow">Settings</p>
          <h1 :class="$style.tocTitle">{{ activeToc?.title || 'Settings' }}</h1>
        </div>
        <ul :class="$style.tocList" role="toolbar">
          <li v-for="h2 in tocList" :key="h2.id" :class="$style.tocListItem" role="presentation">
            <h2
              :class="[$style.tocH2, {[$style.active]: avtiveComponentName == h2.id }]"
              role="tab" :aria-selected="avtiveComponentName == h2.id"
              :aria-label="h2.title" ignore-tip @click="toggleTab(h2.id)"
            >
              <transition name="list-active">
                <svg-icon v-if="avtiveComponentName == h2.id" name="angle-right-solid" :class="$style.activeIcon" />
              </transition>
              {{ h2.title }}
            </h2>
            <!-- <ul v-if="h2.children.length" :class="$style.tocList">
              <li v-for="h3 in h2.children" :key="h3.id" :class="$style.tocSubListItem">
                <h3 :class="[$style.tocH3, toc.activeId == h3.id ? $style.active : null]" :aria-label="h3.title">
                  <a :href="'#' + h3.id" @click.stop="toc.activeId = h3.id">{{ h3.title }}</a>
                </h3>
              </li>
            </ul> -->
          </li>
        </ul>
      </div>
    </div>
    <div ref="dom_content_ref" class="scroll" :class="$style.setting">
      <div :class="$style.settingHeader">
        <p :class="$style.settingEyebrow">Current section</p>
        <h2 :class="$style.settingTitle">{{ activeToc?.title || '' }}</h2>
      </div>
      <dl :class="$style.settingList">
        <component :is="avtiveComponentName" />
        <!-- <SettingBasic />
        <SettingPlay />
        <SettingPlayDetail />
        <SettingDesktopLyric />
        <SettingSearch />
        <SettingList />
        <SettingDownload />
        <SettingSync />
        <SettingHotKey />
        <SettingNetwork />
        <SettingOdc />
        <SettingBackup />
        <SettingOther />
        <SettingUpdate />
        <SettingAbout /> -->
      </dl>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from '@common/utils/vueTools'
// import { currentStting } from './setting'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingMediaLibrary from './components/SettingMediaLibrary.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingUpdate from './components/SettingUpdate.vue'
import SettingAbout from './components/SettingAbout.vue'

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingMediaLibrary,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingUpdate,
    SettingAbout,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()

    const dom_content_ref = ref(null)

    const tocList = computed(() => {
      return [
        { id: 'SettingBasic', title: t('setting__basic') },
        { id: 'SettingPlay', title: t('setting__play') },
        { id: 'SettingPlayDetail', title: t('setting__play_detail') },
        { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric') },
        { id: 'SettingSearch', title: t('setting__search') },
        { id: 'SettingList', title: t('setting__list') },
        { id: 'SettingDownload', title: t('setting__download') },
        { id: 'SettingMediaLibrary', title: 'Media Library' },
        { id: 'SettingHotKey', title: t('setting__hot_key') },
        { id: 'SettingSync', title: t('setting__sync') },
        { id: 'SettingOpenAPI', title: t('setting__open_api') },
        { id: 'SettingNetwork', title: t('setting__network') },
        { id: 'SettingOdc', title: t('setting__odc') },
        { id: 'SettingBackup', title: t('setting__backup') },
        { id: 'SettingOther', title: t('setting__other') },
        { id: 'SettingUpdate', title: t('setting__update') },
        { id: 'SettingAbout', title: t('setting__about') },
      ]
    })

    const avtiveComponentName = ref(route.query.name && tocList.value.some(t => t.id == route.query.name)
      ? route.query.name
      : tocList.value[0].id)
    const activeToc = computed(() => tocList.value.find(item => item.id == avtiveComponentName.value))

    const toggleTab = id => {
      avtiveComponentName.value = id
      void nextTick(() => {
        dom_content_ref.value?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      })
    }

    return {
      tocList,
      avtiveComponentName,
      activeToc,
      dom_content_ref,
      toggleTab,
    }
  },
  // mounted() {
  //   this.initTOC()
  // },
  // methods: {
  //   initTOC() {
  //     const list = this.$refs.dom_setting_list.children
  //     const toc = []
  //     let prevTitle
  //     for (const item of list) {
  //       if (item.tagName == 'DT') {
  //         prevTitle = {
  //           title: item.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: item.getAttribute('id'),
  //           dom: item,
  //           children: [],
  //         }
  //         toc.push(prevTitle)
  //         continue
  //       }
  //       const h3 = item.querySelector('h3')
  //       if (h3) {
  //         prevTitle.children.push({
  //           title: h3.innerText.replace(/[（(].+?[)）]/, ''),
  //           id: h3.getAttribute('id'),
  //           dom: h3,
  //           children: [],
  //         })
  //       }
  //     }
  //     console.log(toc)
  //     this.toc.list = toc
  //   },
  //   handleListScroll(event) {
  //     // console.log(event.target.scrollTop)
  //   },
  // },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  display: grid;
  grid-template-columns: minmax(210px, 240px) minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.toc,
.setting {
  min-height: 0;
  border-radius: @radius-border;
  background: var(--color-primary-background);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.toc {
  overflow-y: auto;
}

.tocInner {
  padding: 14px 12px 12px;
}

.tocHeader {
  padding: 2px 6px 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-list-header-border-bottom);
}

.tocEyebrow,
.settingEyebrow {
  font-size: 12px;
  line-height: 1.4;
  opacity: .6;
}

.tocTitle,
.settingTitle {
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
}

.tocListItem + .tocListItem {
  margin-top: 4px;
}

.tocH2 {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  line-height: 1.45;
  .mixin-ellipsis-1();
  font-size: 13px;
  font-weight: 600;
  color: var(--color-font);
  padding: 9px 12px;
  border-radius: @radius-border;
  transition: @transition-fast;
  transition-property: background-color, color, opacity;

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: var(--color-button-background-hover);
    }
  }
  &.active {
    color: var(--color-primary);
    background: var(--color-primary-background-hover);
  }
}

.activeIcon {
  flex: none;
  height: .9em;
  width: .9em;
  margin-left: -0.1em;
  vertical-align: -0.05em;
}

.setting {
  padding: 18px;
  font-size: 14px;
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
  width: 100%;
}

.settingHeader {
  padding: 4px 2px 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--color-list-header-border-bottom);
}

.settingList {
  min-width: 0;
}

.setting {
  :global {
    dt {
      padding: 0 0 10px;
      margin: 0 0 14px;
      border: none;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.4;
    }

    dd {
      margin: 0;
      padding: 16px;
      border-radius: @radius-border;
      background: var(--color-primary-background-hover);

      & + dd {
        margin-top: 12px;
      }

      > div {
        padding: 0;
      }
    }
    h3 {
      font-size: 13px;
      margin: 0 0 14px;
      font-weight: 700;
      line-height: 1.4;
    }
    .p {
      padding: 3px 0;
      line-height: 1.5;
      .btn {
        + .btn {
          margin-left: 10px;
        }
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.4em;
      border: none;
      background: none;
      color: var(--color-button-font);
      cursor: pointer;
      transition: opacity 0.2s ease;
      &:hover {
        opacity: 0.7;
      }
    }
    .help-icon {
      margin: 0 0.4em;
    }
  }
}
</style>
