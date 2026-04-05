import { LIST_IDS } from '@common/constants'
import { markRaw, reactive } from '@common/utils/vueTools'

type MediaListInfo = {
  id: typeof LIST_IDS.MEDIA_LIBRARY
  name: string
}

export const allMusicList: Map<string, LX.Music.MusicInfo[]> = markRaw(new Map())

export const defaultList = markRaw<LX.List.MyDefaultListInfo>({
  id: LIST_IDS.DEFAULT,
  name: 'list__name_default',
})

export const loveList = markRaw<LX.List.MyLoveListInfo>({
  id: LIST_IDS.LOVE,
  name: 'list__name_love',
})
export const mediaList = markRaw<MediaListInfo>({
  id: LIST_IDS.MEDIA_LIBRARY,
  name: 'Media Library',
})
export const tempList = markRaw<LX.List.MyTempListInfo>({
  id: LIST_IDS.TEMP,
  name: '临时列表',
  meta: {},
})

export const userLists: LX.List.UserListInfo[] = reactive([])
