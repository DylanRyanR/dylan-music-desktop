<template>
  <div ref="dom_lists" :class="$style.lists">
    <div :class="$style.listHeader">
      <h2 :class="$style.listsTitle">{{ $t('my_list') }}</h2>
      <div :class="$style.headerBtns">
        <button :class="$style.listsAdd" :aria-label="$t('lists__new_list_btn')" @click="isShowNewList = true">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-list-add" />
          </svg>
        </button>
        <button :class="$style.listsAdd" :aria-label="$t('list_update_modal__title')" @click="isShowListUpdateModal = true">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" style="transform: rotate(45deg);" height="70%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-refresh" />
          </svg>
        </button>
      </div>
    </div>
    <ul ref="dom_lists_list" class="scroll" :class="[$style.listsContent, { [$style.sortable]: isModDown }]">
      <li class="default-list" :class="[$style.listsItem, {[$style.active]: defaultList.id == listId}, {[$style.clicked]: rightClickItemIndex == -2}, {[$style.fetching]: fetchingListStatus[defaultList.id]}]" :aria-label="$t(defaultList.name)" :aria-selected="defaultList.id == listId" @contextmenu="handleListsItemRigthClick($event, -2)" @click="handleListToggle(defaultList.id)">
        <span :class="$style.listsLabel">
          <transition name="list-active">
            <svg-icon v-if="defaultList.id == listId" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ $t(defaultList.name) }}
        </span>
      </li>
      <li class="default-list" :class="[$style.listsItem, {[$style.active]: loveList.id == listId}, {[$style.clicked]: rightClickItemIndex == -1}, {[$style.fetching]: fetchingListStatus[loveList.id]}]" :aria-label="$t(loveList.name)" :aria-selected="loveList.id == listId" @contextmenu="handleListsItemRigthClick($event, -1)" @click="handleListToggle(loveList.id)">
        <span :class="$style.listsLabel">
          <transition name="list-active">
            <svg-icon v-if="loveList.id == listId" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ $t(loveList.name) }}
        </span>
      </li>
      <li class="default-list" :class="[$style.listsItem, {[$style.active]: isMediaLibrarySelected}, {[$style.fetching]: isMediaLibraryFetching}]" :aria-label="mediaList.name" :aria-selected="isMediaLibrarySelected" @click="handleListToggle(mediaList.id)">
        <span :class="[$style.listsLabel, $style.listsGroupLabel]">
          <transition name="list-active">
            <svg-icon v-if="isMediaLibrarySelected" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ mediaList.name }}
        </span>
      </li>
      <li class="default-list" :class="[$style.listsItem, $style.listsSubItem, {[$style.active]: mediaAllList.id == listId}, {[$style.fetching]: fetchingListStatus[mediaAllList.id]}]" :aria-label="mediaAllList.name" :aria-selected="mediaAllList.id == listId" @click="handleListToggle(mediaAllList.id)">
        <span :class="$style.listsLabel">
          <transition name="list-active">
            <svg-icon v-if="mediaAllList.id == listId" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ mediaAllList.name }}
        </span>
      </li>
      <li v-for="connection in mediaConnections" :key="connection.id" class="default-list" :class="[$style.listsItem, $style.listsSubItem, {[$style.active]: connection.listId == listId}, {[$style.fetching]: fetchingListStatus[connection.listId]}]" :aria-label="connection.name" :aria-selected="connection.listId == listId" @click="handleListToggle(connection.listId)">
        <span :class="$style.listsLabel">
          <transition name="list-active">
            <svg-icon v-if="connection.listId == listId" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ connection.name }}
        </span>
      </li>
      <li v-for="(item, index) in userLists" :key="item.id" class="user-list" :class="[$style.listsItem, {[$style.active]: item.id == listId}, {[$style.clicked]: rightClickItemIndex == index}, {[$style.fetching]: fetchingListStatus[item.id]}]" :data-index="index" :aria-label="item.name" :aria-selected="item.id == listId" @contextmenu="handleListsItemRigthClick($event, index)">
        <span :class="$style.listsLabel" @click="handleListToggle(item.id, index + 2)">
          <transition name="list-active">
            <svg-icon v-if="item.id == listId" name="angle-right-solid" :class="$style.activeIcon" />
          </transition>
          {{ item.name }}
        </span>
        <base-input :class="$style.listsInput" type="text" :value="item.name" :placeholder="item.name" @keyup.enter="handleSaveListName(index, $event)" @blur="handleSaveListName(index, $event)" />
      </li>
      <transition enter-active-class="animated-fast slideInLeft" leave-active-class="animated-fast fadeOut" @after-leave="isNewListLeave = false" @after-enter="$refs.dom_listsNewInput.focus()">
        <li v-if="isShowNewList" :class="[$style.listsItem, $style.listsNew, {[$style.newLeave]: isNewListLeave}]">
          <base-input ref="dom_listsNewInput" :class="$style.listsInput" type="text" :placeholder="$t('lists__new_list_input')" @keyup.enter="handleCreateList" @blur="handleCreateList" />
        </li>
      </transition>
    </ul>
    <base-menu v-model="isShowMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <DuplicateMusicModal v-model:visible="isShowDuplicateMusicModal" :list-info="duplicateListInfo" />
    <ListSortModal v-model:visible="isShowListSortModal" :list-info="sortListInfo" />
    <ListUpdateModal v-model:visible="isShowListUpdateModal" />
  </div>
</template>

<script>
import { openUrl } from '@common/utils/electron'
import { LIST_IDS, createMediaLibraryConnectionListId, isMediaLibraryConnectionListId } from '@common/constants'
import musicSdk from '@renderer/utils/musicSdk'
import DuplicateMusicModal from './components/DuplicateMusicModal.vue'
import ListSortModal from './components/ListSortModal.vue'
import ListUpdateModal from './components/ListUpdateModal.vue'
import { defaultList, loveList, mediaList, userLists, fetchingListStatus } from '@renderer/store/list/state'
import { removeUserList } from '@renderer/store/list/action'
import { ref, watch, computed, onMounted } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { dialog } from '@renderer/plugins/Dialog'
import { saveListPrevSelectId } from '@renderer/utils/data'
import { getMediaConnections } from '@renderer/utils/ipc'
import { useI18n } from '@renderer/plugins/i18n'
import useShare from './useShare'
import useMenu from './useMenu'
import useListUpdate from './useListUpdate'
import useSort from './useSort'
import useDarg from './useDarg'
import useEditList from './useEditList'
import useListScroll from './useListScroll'
import useDuplicate from './useDuplicate'

export default {
  name: 'MyLists',
  components: {
    DuplicateMusicModal,
    ListSortModal,
    ListUpdateModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const router = useRouter()
    const t = useI18n()
    const dom_lists_list = ref(null)
    const rightClickItemIndex = ref(-10)
    const mediaConnections = ref([])
    const mediaAllList = {
      id: LIST_IDS.MEDIA_LIBRARY_ALL,
      name: '全部媒体',
    }
    const { handleImportList, handleExportList } = useShare()
    const { isShowListUpdateModal, handleUpdateSourceList } = useListUpdate()
    const { isShowListSortModal, sortListInfo, handleSortList } = useSort()
    const { isShowDuplicateMusicModal, duplicateListInfo, handleDuplicateList } = useDuplicate()
    const { handleRename, handleSaveListName, isShowNewList, isNewListLeave, handleCreateList } = useEditList({ dom_lists_list })
    useListScroll({ dom_lists_list })

    const loadMediaConnections = async() => {
      mediaConnections.value = (await getMediaConnections()).map(item => ({
        ...JSON.parse(item.config),
        id: item.id,
        name: item.name,
        listId: createMediaLibraryConnectionListId(item.id),
      }))
    }

    const isMediaLibrarySelected = computed(() => {
      return props.listId === LIST_IDS.MEDIA_LIBRARY || props.listId === LIST_IDS.MEDIA_LIBRARY_ALL || isMediaLibraryConnectionListId(props.listId)
    })
    const isMediaLibraryFetching = computed(() => {
      return !!fetchingListStatus[LIST_IDS.MEDIA_LIBRARY] || !!fetchingListStatus[LIST_IDS.MEDIA_LIBRARY_ALL] || mediaConnections.value.some(item => fetchingListStatus[item.listId])
    })

    const handleOpenSourceDetailPage = async(listInfo) => {
      const { source, sourceListId } = listInfo
      if (!sourceListId) return
      let url
      if (/board__/.test(sourceListId)) {
        const id = sourceListId.replace(/board__/, '')
        url = musicSdk[source].leaderboard.getDetailPageUrl(id)
      } else if (musicSdk[source]?.songList?.getDetailPageUrl) {
        url = await musicSdk[source].songList.getDetailPageUrl(sourceListId)
      }
      if (!url) return
      void openUrl(url)
    }

    const handleRemove = (listInfo) => {
      void dialog.confirm({
        message: t('lists__remove_tip', { name: listInfo.name }),
        confirmButtonText: t('lists__remove_tip_button'),
      }).then(isRemove => {
        if (!isRemove) return
        void removeUserList([listInfo.id])
        if (props.listId == listInfo.id) handleListToggle(LIST_IDS.DEFAULT)
      })
    }

    const { menus, menuLocation, isShowMenu, showMenu, menuClick } = useMenu({
      emit,
      handleImportList,
      handleExportList,
      handleUpdateSourceList,
      handleOpenSourceDetailPage,
      handleSortList,
      handleDuplicateList,
      handleRename,
      handleRemove,
    })

    const handleListsItemRigthClick = (event, index) => {
      rightClickItemIndex.value = index
      showMenu(event, index)
    }

    const handleListToggle = (id) => {
      const targetId = id == LIST_IDS.MEDIA_LIBRARY ? LIST_IDS.MEDIA_LIBRARY_ALL : id
      if (targetId == props.listId) return
      router.replace({ path: '/list', query: { id: targetId } }).catch(_ => _)
    }

    const handleMenuClick = (action) => {
      if (rightClickItemIndex.value < -2) return
      const index = rightClickItemIndex.value
      rightClickItemIndex.value = -10
      menuClick(action, index)
    }

    const { isModDown } = useDarg({ dom_lists_list, handleMenuClick, handleSaveListName })

    watch(() => props.listId, (listId) => {
      saveListPrevSelectId(listId == LIST_IDS.MEDIA_LIBRARY ? LIST_IDS.MEDIA_LIBRARY_ALL : listId)
    })

    watch(() => userLists, (lists) => {
      if (lists.some(l => l.id == props.listId)) return
      if ([defaultList.id, loveList.id, mediaList.id, mediaAllList.id].includes(props.listId)) return
      if (mediaConnections.value.some(item => item.listId == props.listId)) return
      void router.replace({ path: '/list', query: { id: defaultList.id } })
    })

    onMounted(() => {
      void loadMediaConnections()
    })

    return {
      rightClickItemIndex,
      defaultList,
      loveList,
      mediaList,
      mediaAllList,
      mediaConnections,
      isMediaLibrarySelected,
      isMediaLibraryFetching,
      userLists,
      fetchingListStatus,
      dom_lists_list,
      isShowListUpdateModal,
      isShowListSortModal,
      sortListInfo,
      isShowDuplicateMusicModal,
      duplicateListInfo,
      handleSaveListName,
      isShowNewList,
      isNewListLeave,
      handleCreateList,
      handleListsItemRigthClick,
      isShowMenu,
      handleMenuClick,
      menus,
      menuLocation,
      handleListToggle,
      isModDown,
      hideMenu: handleMenuClick,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@lists-item-height: @ui-row-height-md;
.lists {
  flex: none;
  width: 16%;
  display: flex;
  flex-flow: column nowrap;
}
.listHeader {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  border-bottom: var(--color-list-header-border-bottom);
  &:hover {
    .listsAdd {
      opacity: 1;
    }
  }
}
.listsTitle {
  flex: auto;
  font-size: 12px;
  line-height: 38px;
  padding: 0 10px;
  color: var(--ui-text-secondary);
  .mixin-ellipsis-1();
}
.headerBtns {
  flex: none;
  display: flex;
}
.listsAdd {
  margin-top: 6px;
  background: none;
  height: 30px;
  border: none;
  outline: none;
  border-radius: @radius-border;
  cursor: pointer;
  opacity: .1;
  transition: opacity @transition-normal;
  color: var(--color-button-font);
  svg {
    vertical-align: bottom;
  }
  &:active {
    opacity: .7 !important;
  }
  &:hover {
    opacity: .6 !important;
  }
}
.listsContent {
  flex: auto;
  min-width: 0;
  overflow-y: scroll !important;

  &.sortable {
    * {
      -webkit-user-drag: element;
    }

    .listsItem {
      &:hover, &.active, &.selected, &.clicked {
        background-color: transparent !important;
      }

      &.dragingItem {
        background-color: var(--color-primary-background-hover) !important;
      }
    }
  }
}
.listsItem {
  position: relative;
  min-height: @ui-row-height-md;
  color: var(--ui-text-primary);
  transition: .3s ease;
  transition-property: color, background-color, opacity;
  background-color: transparent;
  &:hover:not(.active) {
    background-color: var(--ui-list-row-hover);
    cursor: pointer;
  }
  &.active {
    color: var(--ui-accent);
  }
  &.selected {
    background-color: var(--color-primary-font-active);
  }
  &.clicked {
    background-color: var(--ui-list-row-selected);
  }
  &.fetching {
    opacity: .5;
  }
  &.editing {
    padding: 0 10px;
    background-color: var(--color-primary-background-hover);
    .listsLabel {
      display: none;
    }
    .listsInput {
      display: block;
    }
  }
}
.listsLabel {
  display: block;
  height: @lists-item-height;
  padding: 0 10px;
  line-height: @lists-item-height;
  color: inherit;
  .mixin-ellipsis-1();
}
.listsGroupLabel {
  font-weight: 700;
}
.listsSubItem {
  .listsLabel {
    padding-left: 24px;
  }
}
.activeIcon {
  height: .9em;
  width: .9em;
  margin-left: -0.45em;
  vertical-align: -0.05em;
}
.listsInput {
  display: none;
  width: 100%;
}
.listsNew {
  padding: 0 10px;
}
.newLeave {
  opacity: 0;
}
</style>
