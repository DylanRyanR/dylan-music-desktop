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
  grid-template-columns: minmax(224px, 260px) minmax(0, 1fr);
  gap: 18px;
  height: 100%;
  padding: 18px;
  box-sizing: border-box;
}

.toc,
.setting {
  min-height: 0;
  border-radius: 20px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.10);
  backdrop-filter: blur(14px);
}

.toc {
  overflow-y: auto;
  background: color-mix(in srgb, var(--color-primary-background) 92%, rgba(255, 255, 255, .08));
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 58%, transparent);
}

.setting {
  background: color-mix(in srgb, var(--color-primary-background) 96%, rgba(255, 255, 255, .1));
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 68%, transparent);
}

.tocInner {
  padding: 18px 14px 14px;
}

.tocHeader {
  padding: 2px 8px 16px;
  margin-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 74%, transparent);
}

.tocEyebrow,
.settingEyebrow {
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .58;
}

.tocTitle,
.settingTitle {
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.32;
  font-weight: 700;
}

.tocListItem + .tocListItem {
  margin-top: 6px;
}

.tocH2 {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  line-height: 1.45;
  .mixin-ellipsis-1();
  font-size: 13px;
  font-weight: 600;
  color: var(--color-font);
  padding: 10px 14px 10px 16px;
  border-radius: 14px;
  transition: @transition-fast;
  transition-property: background-color, color, opacity, transform, box-shadow;

  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 999px;
    background: transparent;
    transition: @transition-fast;
    transition-property: background-color, opacity;
    opacity: 0;
  }

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: color-mix(in srgb, var(--color-button-background-hover) 82%, transparent);
      transform: translateX(1px);
    }
  }
  &.active {
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary-background-hover) 82%, rgba(255, 255, 255, .08));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .08),
      0 10px 22px rgba(0, 0, 0, .06);

    &::before {
      opacity: 1;
      background: var(--color-primary);
    }
  }
}

.activeIcon {
  flex: none;
  height: .92em;
  width: .92em;
  margin-left: -0.05em;
  vertical-align: -0.05em;
  opacity: .92;
}

.setting {
  padding: 22px;
  font-size: 14px;
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
  width: 100%;
}

.settingHeader {
  padding: 2px 4px 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 76%, transparent);
}

.settingList {
  min-width: 0;
}

.setting {
  :global {
    dt {
      padding: 0 0 12px;
      margin: 0 0 16px;
      border: none;
      font-size: 17px;
      font-weight: 700;
      line-height: 1.4;
    }

    dd {
      margin: 0;
      padding: 18px;
      border-radius: 18px;
      background: color-mix(in srgb, var(--color-primary-background-hover) 88%, rgba(255, 255, 255, .08));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .07),
        0 12px 26px rgba(0, 0, 0, .05);
      border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 56%, transparent);

      & + dd {
        margin-top: 14px;
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
      padding: 4px 0;
      line-height: 1.58;
      color: color-mix(in srgb, var(--color-font) 84%, transparent);
      .btn {
        + .btn {
          margin-left: 10px;
        }
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.28em;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-button-background-hover) 70%, transparent);
      color: var(--color-button-font);
      cursor: pointer;
      transition: @transition-fast;
      transition-property: opacity, background-color, transform;
      &:hover {
        opacity: 1;
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--color-primary-background-hover) 72%, rgba(255, 255, 255, .08));
      }
    }
    .help-icon {
      margin: 0 0.3em;
    }
  }
}

@media (max-width: 900px) {
  .main {
    grid-template-columns: minmax(208px, 232px) minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }

  .setting {
    padding: 18px;
  }
}

@media (max-width: 720px) {
  .main {
    grid-template-columns: 1fr;
  }

  .toc {
    max-height: 240px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tocH2,
  .help-btn {
    transition: none;
  }
}
</style>
