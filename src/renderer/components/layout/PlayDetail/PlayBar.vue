<template>
  <div :class="$style.footer">
    <div :class="$style.footerShell">
      <div :class="$style.footerLeft">
        <control-btns />
        <div :class="$style.progressContainer">
          <div :class="$style.progressContent">
            <common-progress-bar
              :class-name="$style.progress"
              :progress="progress"
              :handle-transition-end="handleTransitionEnd"
              :is-active-transition="isActiveTransition"
            />
          </div>
        </div>
        <div :class="$style.timeLabel">
          <span :class="$style.status">{{ status }}</span>
          <span :class="$style.timeValue">{{ nowPlayTimeStr }}</span>
          <span :class="$style.timeDivider">/</span>
          <span :class="$style.timeValue">{{ maxPlayTimeStr }}</span>
        </div>
      </div>
      <div :class="$style.playControl">
        <button :class="$style.playBtn" :aria-label="$t('player__prev')" @click="playPrev()">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-prevMusic" />
          </svg>
        </button>
        <button :class="[$style.playBtn, $style.playBtnPrimary]" :aria-label="isPlay ? $t('player__pause') : $t('player__play')" @click="togglePlay">
          <svg v-if="isPlay" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-pause" />
          </svg>
          <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-play" />
          </svg>
        </button>
        <button :class="$style.playBtn" :aria-label="$t('player__next')" @click="playNext()">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 1024 1024" space="preserve">
            <use xlink:href="#icon-nextMusic" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { playNext, playPrev, togglePlay } from '@renderer/core/player'
import { status, isPlay } from '@renderer/store/player/state'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'

import ControlBtns from './components/ControlBtns.vue'

const {
  nowPlayTimeStr,
  maxPlayTimeStr,
  progress,
  isActiveTransition,
  handleTransitionEnd,
} = usePlayProgress()

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.footer {
  flex: 0 0 112px;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 24px 22px;
}

.footerShell {
  width: 100%;
  min-height: 84px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 16px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(8, 10, 18, .12) 0%, rgba(8, 10, 18, .20) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .07),
    0 18px 34px rgba(0, 0, 0, .12);
  backdrop-filter: blur(14px);
}

.footerLeft {
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  min-width: 0;
  padding-left: 6px;
  overflow: hidden;
}

.progressContainer {
  width: 100%;
  position: relative;
  padding: 0;
}

.progressContent {
  position: relative;
  height: 14px;
  padding: 4px 0;
  width: 100%;
}

.progress {
  height: 100%;
}

.barTransition {
  transition-property: transform;
  transition-timing-function: ease-out;
  transition-duration: 0.2s;
}

.timeLabel {
  width: 100%;
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: rgba(255, 255, 255, .72);
  font-variant-numeric: tabular-nums;
}

.status {
  flex: auto;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: rgba(255, 255, 255, .58);
  .mixin-ellipsis-1();
}

.timeValue,
.timeDivider {
  font-size: 12px;
  line-height: 1.4;
}

.timeDivider {
  opacity: .5;
}

.playControl {
  flex: none;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 0 4px 0 10px;
  color: rgba(255, 255, 255, .92);
}

.playBtn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, .10);
  color: rgba(255, 255, 255, .9);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .06),
    0 8px 18px rgba(0, 0, 0, .10);
  transition: @transition-fast;
  transition-property: opacity, transform, background-color, color, box-shadow;
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
    filter: drop-shadow(0 2px 10px rgba(0, 0, 0, .2));
  }

  &:hover {
    transform: translateY(0) scale(1.02);
    background: rgba(255, 255, 255, .16);
    color: #fff;
  }

  &:active {
    transform: scale(.96);
  }
}

.playBtnPrimary {
  width: 54px;
  height: 54px;
  background: color-mix(in srgb, var(--color-primary) 88%, rgba(255, 255, 255, .10));
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .16),
    0 16px 28px rgba(0, 0, 0, .18);

  svg {
    width: 22px;
    height: 22px;
  }

  &:hover {
    background: color-mix(in srgb, var(--color-primary) 88%, rgba(255, 255, 255, .10));
    transform: scale(1.03);
  }

  &:active {
    transform: scale(.97);
  }
}

@media (max-width: 900px) {
  .footer {
    padding: 0 18px 18px;
  }

  .footerShell {
    padding: 12px 14px;
  }
}

@media (max-width: 720px) {
  .footer {
    flex-basis: 132px;
  }

  .footerShell {
    flex-direction: column;
    align-items: stretch;
  }

  .playControl {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .playBtn {
    transition: none;
  }
}
</style>
