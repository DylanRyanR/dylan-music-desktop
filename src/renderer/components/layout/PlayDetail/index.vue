<template lang="pug">
transition(enter-active-class="animated slideInRight" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" :class="[$style.container, { fullscreen: isFullscreen }]" @contextmenu="handleContextMenu")
    div(:class="$style.bg")
      div(:class="$style.bgTheme")
      div(v-if="bgStyle" :class="$style.bgCover" :style="bgStyle")
      div(:class="$style.bgOverlay")
      div(:class="$style.bgVignette")
    //- div(:class="$style.bg2")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div.left(:class="$style.left")
        //- div(:class="$style.info")
        div(:class="$style.info")
          div(:class="$style.coverFrame")
            img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic")
            div(v-else :class="$style.imgPlaceholder")
          div.description(:class="['scroll', $style.description]")
            p {{ $t('player__music_name') }}{{ musicInfo.name }}
            p {{ $t('player__music_singer') }}{{ musicInfo.singer }}
            p(v-if="musicInfo.album") {{ $t('player__music_album') }}{{ musicInfo.album }}

      transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
        LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
import { ref, watch, computed } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)
    const bgStyle = computed(() => {
      if (!musicInfo.pic) return null
      return {
        backgroundImage: `url("${musicInfo.pic}")`,
      }
    })

    let clickTime = 0

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false

      unregisterAutoHideMounse()
    }

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })


    return {
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      bgStyle,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-content-background);
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-font);
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;

  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}
.bgTheme,
.bgCover,
.bgOverlay,
.bgVignette {
  position: absolute;
  inset: 0;
}
.bgTheme {
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  opacity: .42;
}
.bgCover {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: blur(42px) saturate(1.08);
  transform: scale(1.16);
  opacity: .82;
  transition: opacity @transition-slow, transform @transition-slow;
}
.bgOverlay {
  background:
    linear-gradient(180deg, rgba(8, 10, 18, 0.34) 0%, rgba(8, 10, 18, 0.52) 100%),
    color-mix(in srgb, var(--color-app-background) 84%, transparent);
  backdrop-filter: blur(10px);
}
.bgVignette {
  background:
    radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, .08) 56%, rgba(0, 0, 0, .32) 100%);
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  margin: 0 30px;
  position: relative;

  &.showComment {
    :global {
      .left {
        flex-basis: 18%;
        .description p {
          font-size: 12px;
        }
      }
      .right {
        flex-basis: 30%;
        .lyricSelectContent {
          font-size: 14px;
        }
      }
      .comment {
        opacity: 1;
        transform: scaleX(1);
      }
    }
  }
}
.left {
  flex: 0 0 40%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  padding: 24px 13px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  width: min(100%, 360px);
  min-height: 0;
}
.coverFrame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, .08);
  box-shadow:
    0 22px 60px rgba(0, 0, 0, .22),
    inset 0 1px 0 rgba(255, 255, 255, .12);
  backdrop-filter: blur(10px);
}
.img,
.imgPlaceholder {
  width: 100%;
  height: 100%;
  border-radius: 12px;
}
.img {
  display: block;
  object-fit: cover;
  box-shadow: 0 18px 38px rgba(0, 0, 0, .28);
}
.imgPlaceholder {
  background: linear-gradient(135deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .03));
  border: 1px solid rgba(255, 255, 255, .08);
}
.description {
  max-width: 360px;
  margin-top: 18px;
  padding: 16px 18px 18px;
  min-height: 0;
  border-radius: 16px;
  background: rgba(8, 10, 18, .18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
  backdrop-filter: blur(12px);
  p {
    line-height: 1.6;
    font-size: 14px;
    overflow-wrap: break-word;
    text-shadow: 0 1px 2px rgba(0, 0, 0, .2);

    & + p {
      margin-top: 8px;
    }
  }
}


.comment {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  opacity: 1;
  margin-left: 10px;
  transform: scaleX(0);
}


</style>
