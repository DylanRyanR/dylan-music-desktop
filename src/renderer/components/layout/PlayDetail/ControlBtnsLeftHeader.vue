<template lang="pug">
div(:class="$style.header")
  div(ref="dom_btns" :class="$style.controBtn")
    button(type="button" :class="$style.hide" :aria-label="$t('player__hide_detail_tip')" ignore-tip :title="$t('player__hide_detail_tip')" @click="hide")
      svg(:class="$style.controBtnIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="80%" viewBox="0 0 30.727 30.727" space="preserve")
        use(xlink:href="#icon-window-hide")
    button(type="button" :class="$style.fullscreenExit" :aria-label="$t('fullscreen_exit')" ignore-tip :title="$t('fullscreen_exit')" @click="fullscreenExit")
      svg(:class="$style.controBtnIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%")
        use(xlink:href="#icon-fullscreen-exit")
    button(type="button" :class="$style.min" :aria-label="$t('min')" ignore-tip :title="$t('min')" @click="minWindow")
      svg(:class="$style.controBtnIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve")
        use(xlink:href="#icon-window-minimize")

    //- button(type="button" :class="$style.max" @click="max")
    button(type="button" :class="$style.close" :aria-label="$t('close')" ignore-tip :title="$t('close')" @click="closeWindow")
      svg(:class="$style.controBtnIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve")
        use(xlink:href="#icon-window-close")
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount, useCssModule } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import { setShowPlayerDetail } from '@renderer/store/player/action'
import { closeWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

const dom_btns = ref()
const cssModule = useCssModule()

const handle_focus = () => {
  if (!dom_btns.value) return
  for (const node of dom_btns.value.childNodes) {
    if (node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
}
const getBtnEl = (el) => {
  let current = el
  while (current) {
    if (current.tagName == 'BUTTON') return current
    current = current.parentNode
  }
  return null
}
const handle_mouseover = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  btn.classList.add(cssModule.hover)
}
const handle_mouseout = (event) => {
  const btn = getBtnEl(event.target)
  if (!btn) return
  if (getBtnEl(event.relatedTarget) == btn) return
  btn.classList.remove(cssModule.hover)
}


onMounted(() => {
  window.app_event.on('focus', handle_focus)
  dom_btns.value.addEventListener('mouseover', handle_mouseover)
  dom_btns.value.addEventListener('mouseout', handle_mouseout)
})
onBeforeUnmount(() => {
  window.app_event.off('focus', handle_focus)
  dom_btns.value.removeEventListener('mouseover', handle_mouseover)
  dom_btns.value.removeEventListener('mouseout', handle_mouseout)
})


const hide = () => {
  for (const node of dom_btns.value?.childNodes ?? []) {
    if (node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
  setShowPlayerDetail(false)
}
const fullscreenExit = () => {
  for (const node of dom_btns.value?.childNodes ?? []) {
    if (node.tagName != 'BUTTON') continue
    node.classList.remove(cssModule.hover)
  }
  void setFullScreen(false).then((fullscreen) => {
    isFullscreen.value = fullscreen
  })
}


</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

:global(.fullscreen) {
  .header {
    -webkit-app-region: no-drag;
    align-self: flex-start;
    .controBtn {
      .close, .min {
        display: none;
      }
      .fullscreenExit {
        display: flex;
      }
    }
  }
}
.header {
  position: relative;
  flex: 0 0 @height-toolbar;
  -webkit-app-region: drag;
  width: 100%;

  .controBtn {
    position: absolute;
    top: 0;
    display: flex;
    -webkit-app-region: no-drag;

    button {
      display: flex;
      position: relative;
      background: none;
      border: none;
      outline: none;
      padding: 1px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .fullscreenExit {
      display: none;
    }
  }
  .controBtn {
    align-items: center;
    padding: 10px 18px 0;
    left: 0;
    flex-direction: row-reverse;
    gap: 8px;
    height: auto;
    opacity: 1;

    button {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      color: rgba(255, 255, 255, .88);
      background: rgba(255, 255, 255, .06);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .06),
        0 6px 14px rgba(0, 0, 0, .10);
      transition: @transition-fast;
      transition-property: background-color, transform, color, box-shadow;
      + button {
        margin-right: 0;
      }

      &.hover {
        transform: scale(1.02);
        background-color: rgba(255, 255, 255, .12);
        color: #fff;

        &.close {
          background-color: color-mix(in srgb, var(--color-btn-close) 82%, rgba(255, 255, 255, .08));
        }
      }

      &:active {
        transform: scale(.96);
      }

      &.hide {
        background-color: color-mix(in srgb, var(--color-btn-hide) 78%, rgba(255, 255, 255, .08));
      }
      &.min, &.fullscreenExit {
        background-color: color-mix(in srgb, var(--color-btn-min) 78%, rgba(255, 255, 255, .08));
      }
      // &.max {
      //   background-color: var(--color-btn-max);
      // }
      &.close {
        background-color: color-mix(in srgb, var(--color-btn-close) 82%, rgba(255, 255, 255, .08));
      }
    }
  }

  .controBtnIcon {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header {
    .controBtn {
      button {
        transition: none;
      }
    }
  }
}

</style>
