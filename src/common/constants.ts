export const URL_SCHEME_RXP = /^lxmusic:\/\//

export const SPLIT_CHAR = {
  DISLIKE_NAME: '@',
  DISLIKE_NAME_ALIAS: '#',
} as const

export const STORE_NAMES = {
  APP_SETTINGS: 'config_v2',
  DATA: 'data',
  SYNC: 'sync',
  HOTKEY: 'hot_key',
  USER_API: 'user_api',
  LRC_RAW: 'lyrics',
  LRC_EDITED: 'lyrics_edited',
  THEME: 'theme',
  SOUND_EFFECT: 'sound_effect',
} as const

export const APP_EVENT_NAMES = {
  winMainName: 'win_main',
  winLyricName: 'win_lyric',
  trayName: 'tray',
} as const

export const LIST_IDS = {
  DEFAULT: 'default',
  LOVE: 'love',
  TEMP: 'temp',
  DOWNLOAD: 'download',
  MEDIA_LIBRARY: 'media_library',
  MEDIA_LIBRARY_ALL: 'media_library_all',
  PLAY_LATER: null,
} as const

export const MEDIA_LIBRARY_CONNECTION_LIST_PREFIX = 'media_library_connection:'

export const createMediaLibraryConnectionListId = (connectionId: string) => `${MEDIA_LIBRARY_CONNECTION_LIST_PREFIX}${connectionId}`
export const isMediaLibraryConnectionListId = (listId: string | null | undefined): listId is string => {
  return typeof listId == 'string' && listId.startsWith(MEDIA_LIBRARY_CONNECTION_LIST_PREFIX)
}
export const parseMediaLibraryConnectionListId = (listId: string | null | undefined) => {
  return isMediaLibraryConnectionListId(listId)
    ? listId.slice(MEDIA_LIBRARY_CONNECTION_LIST_PREFIX.length)
    : null
}

export const DATA_KEYS = {
  viewPrevState: 'viewPrevState',
  playInfo: 'playInfo',
  searchHistoryList: 'searchHistoryList',
  listScrollPosition: 'listScrollPosition',
  listPrevSelectId: 'listPrevSelectId',
  listUpdateInfo: 'listUpdateInfo',
  ignoreVersion: 'ignoreVersion',

  leaderboardSetting: 'leaderboardSetting',
  songListSetting: 'songListSetting',
  searchSetting: 'searchSetting',
  mediaConnections: 'mediaConnections',

  lastStartInfo: 'lastStartInfo',
} as const

export const DEFAULT_SETTING = {
  leaderboard: {
    source: 'kw',
    boardId: 'kw__16',
  },

  songList: {
    source: 'kw',
    sortId: 'new',
    tagId: '',
  },

  search: {
    temp_source: 'kw',
    source: 'all',
    type: 'music',
  },

  viewPrevState: {
    url: '/search',
    query: {},
  },
}

export const DOWNLOAD_STATUS = {
  RUN: 'run',
  WAITING: 'waiting',
  PAUSE: 'pause',
  ERROR: 'error',
  COMPLETED: 'completed',
} as const

export const QUALITYS = ['flac24bit', 'flac', 'wav', 'ape', '320k', '192k', '128k'] as const

export const TRAY_AUTO_ID = -1
