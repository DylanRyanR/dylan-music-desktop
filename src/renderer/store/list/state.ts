import { reactive } from '@common/utils/vueTools'

export {
  allMusicList,
  defaultList,
  loveList,
  mediaList,
  tempList,
  userLists,
} from '@renderer/store/list/listManage'

export const tempListMeta = {
  id: '',
}

export const fetchingListStatus = reactive<Record<string, boolean>>({})

export const listUpdateTimes = reactive<Record<string, string>>({})
