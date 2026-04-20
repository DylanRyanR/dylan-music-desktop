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
            h1(:class="$style.title") {{ musicInfo.name }}
            p(:class="$style.subtitle") {{ musicInfo.singer }}
            div(v-if="musicInfo.album" :class="$style.metaRow")
              span(:class="$style.metaLabel") {{ $t('player__music_album') }}
              span(:class="$style.metaValue") {{ musicInfo.album }}
            div(:class="$style.metaAccent")
              span(:class="$style.metaAccentLine")
              span(:class="$style.metaAccentText")
                | {{ status || $t('player__play') }} &#183; {{ nowPlayTimeStr }} / {{ maxPlayTimeStr }}

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
  status,
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
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'

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
    const {
      nowPlayTimeStr,
      maxPlayTimeStr,
    } = usePlayProgress()

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
      status,
      nowPlayTimeStr,
      maxPlayTimeStr,
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
  opacity: .32;
}
.bgCover {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: blur(48px) saturate(1.12);
  transform: scale(1.12);
  opacity: .88;
  transition: opacity @transition-slow, transform @transition-slow;
}
.bgOverlay {
  background:
    radial-gradient(circle at 24% 28%, rgba(255, 255, 255, .12) 0%, rgba(255, 255, 255, 0) 28%),
    linear-gradient(180deg, rgba(6, 8, 16, .18) 0%, rgba(6, 8, 16, .42) 100%),
    color-mix(in srgb, var(--color-app-background) 72%, transparent);
  backdrop-filter: blur(12px);
}
.bgVignette {
  background:
    radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, .06) 58%, rgba(0, 0, 0, .24) 100%);
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
  gap: 24px;
  margin: 0 30px;
  position: relative;

  &.showComment {
    :global {
      .left {
        flex-basis: 18%;
        .title {
          font-size: 22px;
          line-height: 1.22;
        }
        .subtitle {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.45;
        }
        .metaValue {
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
  width: min(100%, 372px);
  min-height: 0;
}
.coverFrame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 26px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .07) 0%, rgba(255, 255, 255, .03) 100%);
  box-shadow:
    0 28px 70px rgba(0, 0, 0, .22),
    inset 0 1px 0 rgba(255, 255, 255, .10);
}
.img,
.imgPlaceholder {
  width: 100%;
  height: 100%;
  border-radius: 16px;
}
.img {
  display: block;
  object-fit: cover;
  box-shadow: 0 22px 48px rgba(0, 0, 0, .24);
}
.imgPlaceholder {
  background: linear-gradient(135deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .03));
  border: 1px solid rgba(255, 255, 255, .08);
}
.description {
  max-width: 372px;
  margin-top: 22px;
  padding: 14px 4px 0;
  min-height: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  backdrop-filter: none;
}
.title {
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
  font-weight: 700;
  color: #fff;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-shadow: 0 4px 18px rgba(0, 0, 0, .22);
}
.subtitle {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  color: rgba(255, 255, 255, .74);
  overflow-wrap: anywhere;
  word-break: break-word;
}
.metaRow {
  display: grid;
  grid-template-columns: minmax(68px, 84px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-top: 18px;

  & + .metaRow {
    margin-top: 12px;
  }
}
.metaLabel {
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .42);
}
.metaValue {
  font-size: 15px;
  line-height: 1.55;
  font-weight: 600;
  color: rgba(255, 255, 255, .94);
  overflow-wrap: break-word;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .22);
}
.metaAccent {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, .08);
}
.metaAccentLine {
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 80%, rgba(255, 255, 255, .08));
}
.metaAccentText {
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: rgba(255, 255, 255, .72);
  font-variant-numeric: tabular-nums;
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

@media (max-width: 980px) {
  .main {
    gap: 18px;
    margin: 0 20px;
  }

  .coverFrame {
    border-radius: 20px;
  }

  .description {
    padding: 12px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .main,
  .left {
    transition: none;
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
