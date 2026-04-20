<template>
  <div :class="['right', $style.right]" :style="lrcFontSize">
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div
        v-show="!isShowLrcSelectContent"
        ref="dom_lyric"
        :class="['lyric', $style.lyric, { [$style.draging]: isMsDown }, { [$style.lrcActiveZoom]: isZoomActiveLrc }]" :style="lrcStyles"
        @wheel="handleWheel" @mousedown="handleLyricMouseDown" @touchstart="handleLyricTouchStart"
        @contextmenu.stop="handleShowLyricMenu"
      >
        <div :class="['pre', $style.lyricSpace]" />
        <div ref="dom_lyric_text" />
        <div :class="$style.lyricSpace" />
      </div>
    </transition>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-if="isShowLyricProgressSetting" v-show="isStopScroll && !isShowLrcSelectContent" :class="$style.skip">
        <div ref="dom_skip_line" :class="$style.line" />
        <span :class="$style.label">{{ timeStr }}</span>
        <base-btn :class="$style.skipBtn" @mouseenter="handleSkipMouseEnter" @mouseleave="handleSkipMouseLeave" @click="handleSkipPlay">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-play" />
          </svg>
        </base-btn>
      </div>
    </transition>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-if="isShowLrcSelectContent" ref="dom_lrc_select_content" tabindex="-1" :class="[$style.lyricSelectContent, 'select', 'scroll', 'lyricSelectContent']" @contextmenu="handleCopySelectText">
        <div v-for="(info, index) in lyric.lines" :key="index" :class="[$style.lyricSelectline, { [$style.lrcActive]: lyric.line == index }]">
          <span>{{ info.text }}</span>
          <template v-for="(lrc, i) in info.extendedLyrics" :key="i">
            <br>
            <span :class="$style.lyricSelectlineExtended">{{ lrc }}</span>
          </template>
        </div>
      </div>
    </transition>
    <LyricMenu v-model="lyricMenuVisible" :xy="lyricMenuXY" :lyric-info="lyricInfo" @update-lyric="handleUpdateLyric" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { lyric } from '@renderer/store/player/lyric'
import { playProgress } from '@renderer/store/player/playProgress'
import { isFullscreen } from '@renderer/store'
import {
  isPlay,
  isShowLrcSelectContent,
  isShowPlayComment,
  musicInfo as playerMusicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setMusicInfo,
} from '@renderer/store/player/action'
import { onMounted, onBeforeUnmount, computed, reactive, ref, nextTick, watch } from '@common/utils/vueTools'
import useLyric from '@renderer/utils/compositions/useLyric'
import LyricMenu from './components/LyricMenu.vue'
import { appSetting } from '@renderer/store/setting'
import { setLyricOffset } from '@renderer/core/lyric'
import useSelectAllLrc from './useSelectAllLrc'

export default {
  components: {
    LyricMenu,
  },
  setup() {
    const isZoomActiveLrc = computed(() => appSetting['playDetail.isZoomActiveLrc'])
    const isShowLyricProgressSetting = computed(() => appSetting['playDetail.isShowLyricProgressSetting'])

    const {
      dom_lyric,
      dom_lyric_text,
      dom_skip_line,
      isMsDown,
      isStopScroll,
      timeStr,
      handleLyricMouseDown,
      handleLyricTouchStart,
      handleWheel,
      handleSkipPlay,
      handleSkipMouseEnter,
      handleSkipMouseLeave,
      handleScrollLrc,
    } = useLyric({ isPlay, lyric, playProgress, isShowLyricProgressSetting })

    const dom_lrc_select_content = useSelectAllLrc()

    watch([isFullscreen, isShowPlayComment], () => {
      setTimeout(handleScrollLrc, 400)
    })

    const lyricMenuVisible = ref(false)
    const lyricMenuXY = reactive({
      x: 0,
      y: 0,
    })
    const lyricInfo = reactive({
      lyric: '',
      tlyric: '',
      rlyric: '',
      lxlyric: '',
      rawlyric: '',
      musicInfo: null,
    })
    const updateMusicInfo = () => {
      lyricInfo.lyric = playerMusicInfo.lrc
      lyricInfo.tlyric = playerMusicInfo.tlrc
      lyricInfo.rlyric = playerMusicInfo.rlrc
      lyricInfo.lxlyric = playerMusicInfo.lxlrc
      lyricInfo.rawlyric = playerMusicInfo.rawlrc
      lyricInfo.musicInfo = playMusicInfo.musicInfo
    }
    const handleShowLyricMenu = event => {
      updateMusicInfo()
      lyricMenuXY.x = event.pageX
      lyricMenuXY.y = event.pageY
      if (lyricMenuVisible.value) return
      void nextTick(() => {
        lyricMenuVisible.value = true
      })
    }
    const handleUpdateLyric = ({ lyric, tlyric, rlyric, lxlyric, offset }) => {
      setMusicInfo({
        lrc: lyric,
        tlrc: tlyric,
        rlrc: rlyric,
        lxlrc: lxlyric,
      })
      console.log(offset)
      setLyricOffset(offset)
    }

    const lrcStyles = computed(() => {
      return {
        textAlign: appSetting['playDetail.style.align'],
      }
    })
    const lrcFontSize = computed(() => {
      let size = appSetting['playDetail.style.fontSize'] / 100
      if (isFullscreen.value) size = size *= 1.4
      return {
        '--playDetail-lrc-font-size': (isShowPlayComment.value ? size * 0.82 : size) + 'rem',
      }
    })

    onMounted(() => {
      window.app_event.on('musicToggled', updateMusicInfo)
      window.app_event.on('lyricUpdated', updateMusicInfo)
    })
    onBeforeUnmount(() => {
      window.app_event.off('musicToggled', updateMusicInfo)
      window.app_event.off('lyricUpdated', updateMusicInfo)
    })

    return {
      dom_lyric,
      dom_lyric_text,
      dom_skip_line,
      dom_lrc_select_content,
      isMsDown,
      timeStr,
      handleLyricMouseDown,
      handleLyricTouchStart,
      handleWheel,
      handleSkipPlay,
      handleSkipMouseEnter,
      handleSkipMouseLeave,
      lyric,
      lrcStyles,
      lrcFontSize,
      isShowLrcSelectContent,
      isShowLyricProgressSetting,
      isZoomActiveLrc,
      isStopScroll,
      lyricMenuVisible,
      lyricMenuXY,
      handleShowLyricMenu,
      handleUpdateLyric,
      lyricInfo,
    }
  },
  methods: {
    handleCopySelectText() {
      let str = window.getSelection().toString()
      str = str.trim()
      if (!str.length) return
      clipboardWriteText(str)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.right {
  flex: 0 0 60%;
  // padding: 0 30px;
  position: relative;
  transition: flex-basis @transition-normal;

  &::before {
    content: '';
    position: absolute;
    inset: 6% 1% 6% 4%;
    border-radius: 34px;
    background: linear-gradient(180deg, rgba(8, 10, 18, .06) 0%, rgba(8, 10, 18, .14) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .05),
      0 16px 38px rgba(0, 0, 0, .10);
    backdrop-filter: blur(12px);
    pointer-events: none;
    opacity: .72;
  }
}
.lyric {
  position: relative;
  z-index: 1;
  text-align: center;
  height: 100%;
  overflow: hidden;
  font-size: var(--playDetail-lrc-font-size, 16px);
  -webkit-mask-image: linear-gradient(transparent 0%, rgba(255, 255, 255, .62) 16%, #fff 30%, #fff 70%, rgba(255, 255, 255, .62) 84%, transparent 100%);
  cursor: grab;
  text-shadow: 0 2px 14px rgba(0, 0, 0, .28);
  &.draging {
    cursor: grabbing;
  }
  :global {
    .font-lrc {
      color: rgba(255, 255, 255, .72);
    }
    .line-content {
      line-height: 1.24;
      padding: calc(var(--playDetail-lrc-font-size, 16px) / 2.4) 12px;
      overflow-wrap: break-word;
      color: rgba(255, 255, 255, .56);
      opacity: .78;
      transition: @transition-normal;
      transition-property: padding, opacity, transform, filter;
      filter: saturate(.82) blur(.2px);

      .extended {
        font-size: 0.78em;
        margin-top: 8px;
        opacity: .62;
      }
      &.line-mode {
        .font-lrc {
          transition: @transition-fast;
          transition-property: font-size, color, opacity, text-shadow;
        }
      }
      &.active {
        opacity: 1;
        transform: scale(1.018);
        filter: saturate(1.04);

        .font-lrc {
          color: #fff;
          text-shadow:
            0 0 28px rgba(255, 255, 255, .16),
            0 4px 22px rgba(0, 0, 0, .34);
        }

        .extended {
          opacity: .78;
        }
      }
      &.line-mode.active .font-lrc, &.font-mode.played .font-lrc {
        color: #fff;
      }
      &.font-mode > .line > .font-lrc {
        > span {
          transition: @transition-normal;
          transition-property: font-size, background-size, filter;
          font-size: 1em;
          background-repeat: no-repeat;
          background-color: rgba(255, 255, 255, .72);
          background-image: -webkit-linear-gradient(top, #fff, #fff);
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          background-size: 0 100%;
          filter: drop-shadow(0 3px 14px rgba(0, 0, 0, .22));
        }
      }
    }
  }
  // p {
  //   padding: 8px 0;
  //   line-height: 1.2;
  //   overflow-wrap: break-word;
  //   transition: @transition-normal !important;
  //   transition-property: color, font-size;
  // }
  // .lrc-active {
  //   color: var(--color-primary);
  //   font-size: 1.2em;
  // }
}
.lrcActiveZoom {
  :global {
    .line-content {
      &.active {
        .extended {
          font-size: .98em;
        }
        .line {
          font-size: 1.16em;
        }
      }
    }
  }
}

.skip {
  position: absolute;
  top: calc(38% + var(--playDetail-lrc-font-size, 16px) + 8px);
  left: 0;
  width: 100%;
  pointer-events: none;

  .line {
    border-top: 2px dashed rgba(255, 255, 255, .18);
    margin-right: 42px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, .45) 18%, #fff 100%);
    opacity: .32;
  }
  .label {
    position: absolute;
    right: 42px;
    top: -14px;
    line-height: 1.2;
    font-size: 12px;
    letter-spacing: .04em;
    color: rgba(255, 255, 255, .72);
    text-shadow: 0 2px 10px rgba(0, 0, 0, .18);
    opacity: .92;
  }
  .skipBtn {
    position: absolute;
    right: 0;
    top: 0;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, .10) !important;
    border: none;
    border-radius: 999px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .08),
      0 8px 20px rgba(0, 0, 0, .16);
    pointer-events: initial;
    transition: @transition-fast;
    transition-property: opacity, transform, background-color;
    opacity: .92;
    &:hover {
      opacity: 1;
      transform: translateY(-50%) translateY(-1px);
      background: rgba(255, 255, 255, .14) !important;
    }

    &:active {
      transform: translateY(-50%) scale(.96);
    }
  }
}
.lyricSelectContent {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  font-size: var(--playDetail-lrc-font-size, 16px);
  z-index: 10;
  color: rgba(255, 255, 255, .64);
  text-shadow: 0 2px 14px rgba(0, 0, 0, .22);

  .lyricSelectline {
    padding: calc(var(--playDetail-lrc-font-size, 16px) / 2.2) 10px;
    overflow-wrap: break-word;
    transition: @transition-normal !important;
    transition-property: color, font-size, opacity, transform;
    line-height: 1.32;
    opacity: .9;
  }
  .lyricSelectlineExtended {
    font-size: .88em;
    opacity: .8;
  }
  .lrcActive {
    color: #fff;
    opacity: 1;
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lyric {
    :global {
      .line-content,
      .font-lrc,
      .line-content > .line > .font-lrc > span {
        transition: none !important;
      }
    }
  }

  .skip {
    .skipBtn {
      transition: none;
    }
  }
}

.lyricSpace {
  height: 70%;
}

</style>
