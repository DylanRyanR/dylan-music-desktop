<template>
  <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
    <div v-show="props.visible" :class="$style.noitem">
      <div v-if="appSetting['search.isShowHotSearch'] || (appSetting['search.isShowHistorySearch'] && historyList.length)" class="scroll" :class="$style.noitemListContainer">
        <div v-if="appSetting['search.isShowHotSearch']" :class="$style.noitemSection">
          <dl :class="[$style.noitemList, $style.noitemHotSearchList]">
            <dt :class="$style.noitemListTitle">{{ $t('search__hot_search') }}</dt>
            <dd v-for="(item, index) in hotSearchList" :key="index" :class="$style.noitemListItem" @click="handleSearch(item)">{{ item }}</dd>
          </dl>
        </div>
        <div v-if="appSetting['search.isShowHistorySearch'] && historyList.length" :class="$style.noitemSection">
          <dl :class="$style.noitemList">
            <dt :class="$style.noitemListTitle">
              <span>{{ $t('history_search') }}</span><span :class="$style.historyClearBtn" :aria-label="$t('history_clear')" @click="clearHistoryList">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-eraser" />
                </svg></span>
            </dt>
            <dd v-for="(item, index) in historyList" :key="index + item" :class="$style.noitemListItem" :aria-label="$t('history_remove')" @contextmenu="removeHistoryWord(index)" @click="handleSearch(item)">{{ item }}</dd>
          </dl>
        </div>
      </div>
      <div v-else :class="$style.noitem_label">
        <p>{{ $t('search__welcome') }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { watch, shallowRef } from '@common/utils/vueTools'
import { historyList } from '@renderer/store/search/state'
import { getHistoryList, removeHistoryWord, clearHistoryList } from '@renderer/store/search/action'
import { getList } from '@renderer/store/hotSearch'
import { appSetting } from '@renderer/store/setting'
import { useRouter } from '@common/utils/vueRouter'

const props = defineProps({
  visible: Boolean,
  source: {
    type: String,
    required: true,
  },
})

const hotSearchList = shallowRef([])

if (appSetting['search.isShowHotSearch']) {
  watch(() => props.visible, (visible) => {
    if (!visible) return
    void getList(props.source).then(list => {
      hotSearchList.value = list
    })
  }, {
    immediate: true,
  })

  watch(() => props.source, (source) => {
    if (!props.visible) return
    void getList(source).then(list => {
      if (source != props.source) return
      hotSearchList.value = list
    })
  })
}

if (appSetting['search.isShowHistorySearch']) {
  void getHistoryList()
}

const router = useRouter()
const handleSearch = (text) => {
  void router.replace({
    path: '/search',
    query: {
      text,
    },
  })
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
  background: transparent;
}

.noitemListContainer {
  padding: @ui-gap-xl @ui-gap-lg @ui-gap-lg;
  min-height: 250px;
  max-height: 94.7%;
}

.noitemSection {
  padding: @ui-gap-md;
  border-radius: @ui-radius-lg;
  background-color: var(--ui-surface-1);
  box-shadow: @ui-shadow-1;

  + .noitemSection {
    margin-top: @ui-gap-lg;
  }
}

.noitemList {
  + .noitemList {
    margin-top: @ui-gap-md;
  }
}

.noitemHotSearchList {
  min-height: 106px;
}

.noitemListTitle {
  color: var(--ui-text-primary);
  padding: 0 0 @ui-gap-sm;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.noitemListItem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: @ui-gap-xs @ui-gap-xs;
  background-color: var(--ui-control-bg);
  padding: 6px 12px;
  border-radius: 999px;
  transition: background-color @ui-transition-fast, color @ui-transition-fast, transform @ui-transition-fast;
  cursor: pointer;
  color: var(--ui-text-primary);
  .mixin-ellipsis-1();
  max-width: 180px;
  font-size: 13px;

  &:hover {
    background-color: var(--ui-control-bg-hover);
  }

  &:active {
    background-color: var(--ui-control-bg-active);
    transform: translateY(1px);
  }
}

.historyClearBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: @ui-icon-btn-size;
  height: @ui-icon-btn-size;
  border-radius: @ui-radius-md;
  color: var(--ui-text-secondary);
  cursor: pointer;
  transition: background-color @ui-transition-fast, color @ui-transition-fast, box-shadow @ui-transition-fast;

  &:hover {
    color: var(--ui-text-primary);
    background-color: var(--ui-control-bg-hover);
  }

  &:active {
    color: var(--ui-text-primary);
    background-color: var(--ui-control-bg-active);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px var(--ui-focus-ring);
  }

  svg {
    vertical-align: middle;
    width: 15px;
  }
}

.noitem_label {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

  p {
    font-size: 22px;
    color: var(--ui-text-secondary);
    max-width: 360px;
    line-height: 1.5;
  }
}
</style>
