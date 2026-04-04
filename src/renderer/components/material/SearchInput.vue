<template>
  <div :class="$style.container">
    <div :class="[$style.search, {[$style.active]: focus}, {[$style.big]: big}, {[$style.small]: small}]">
      <div :class="$style.form">
        <input
          ref="dom_input"
          v-model.trim="text"
          :class="$style.input"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
          @input="$emit('update:modelValue', text)"
          @change="sendEvent('change')"
          @keyup.enter="handleSearch"
          @keydown.arrow-down.arrow-up.prevent
          @keyup.arrow-down.prevent="handleKeyDown"
          @keyup.arrow-up.prevent="handleKeyUp"
          @contextmenu="handleContextMenu"
        >
        <transition enter-active-class="animated zoomIn" leave-active-class="animated zoomOut">
          <button v-show="text" :class="$style.iconButton" type="button" @click="handleClearList">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 24 24" space="preserve">
              <use xlink:href="#icon-window-close" />
            </svg>
          </button>
        </transition>
        <button :class="$style.iconButton" type="button" @click="handleSearch">
          <slot>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 30.239 30.239" space="preserve">
              <use xlink:href="#icon-search" />
            </svg>
          </slot>
        </button>
      </div>
      <div v-if="list" :class="$style.list" :style="listStyle">
        <ul ref="dom_list" @mouseleave="selectIndex = -1">
          <li
            v-for="(item, index) in list"
            :key="item"
            :class="[$style.listItem, {[$style.select]: selectIndex === index }]"
            @mouseenter="selectIndex = index"
            @click="handleTemplistClick(index)"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'
import { HOTKEY_COMMON } from '@common/hotKey'
import { appSetting } from '@renderer/store/setting'

export default {
  props: {
    placeholder: {
      type: String,
      default: 'Search for something...',
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    visibleList: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    big: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'event'],
  data() {
    return {
      isShow: false,
      text: '',
      selectIndex: -1,
      focus: false,
      listStyle: {
        height: 0,
      },
    }
  },
  watch: {
    list(n) {
      if (!this.visibleList) return
      if (this.selectIndex > -1) this.selectIndex = -1
      this.$nextTick(() => {
        this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
      })
    },
    modelValue(n) {
      this.text = n
    },
    visibleList(n) {
      n ? this.showList() : this.hideList()
    },
  },
  mounted() {
    if (appSetting['search.isFocusSearchBox']) this.handleFocusInput()
    this.handleRegisterEvent('on')
  },
  beforeUnmount() {
    this.handleRegisterEvent('off')
  },
  methods: {
    handleRegisterEvent(action) {
      let eventHub = window.key_event
      let name = action == 'on' ? 'on' : 'off'
      // eslint-disable-next-line @typescript-eslint/unbound-method
      eventHub[name](HOTKEY_COMMON.focusSearchInput.action, this.handleFocusInput)
    },
    handleFocusInput() {
      this.$refs.dom_input.focus()
    },
    handleTemplistClick(index) {
      console.log(index)
      this.sendEvent('listClick', index)
    },
    handleFocus() {
      this.focus = true
      this.sendEvent('focus')
    },
    handleBlur() {
      setTimeout(() => {
        this.focus = false
        this.sendEvent('blur')
      }, 80)
    },
    handleSearch() {
      this.hideList()
      if (this.selectIndex < 0) {
        this.sendEvent('submit')
        return
      }
      this.sendEvent('listClick', this.selectIndex)
    },
    showList() {
      this.isShow = true
      this.listStyle.height = this.$refs.dom_list.scrollHeight + 'px'
    },
    hideList() {
      this.isShow = false
      this.listStyle.height = 0
      this.$nextTick(() => {
        this.selectIndex = -1
      })
    },
    sendEvent(action, data) {
      this.$emit('event', {
        action,
        data,
      })
    },
    handleKeyDown() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex + 1 < this.list.length ? this.selectIndex + 1 : 0
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleKeyUp() {
      if (this.list.length) {
        this.selectIndex = this.selectIndex - 1 < -1 ? this.list.length - 1 : this.selectIndex - 1
      } else if (this.selectIndex > -1) {
        this.selectIndex = -1
      }
    },
    handleContextMenu() {
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      let dom_input = this.$refs.dom_input
      this.text = this.text.substring(0, dom_input.selectionStart) + str + this.text.substring(dom_input.selectionEnd, this.text.length)
      this.$emit('update:modelValue', this.text)
    },
    handleClearList() {
      this.text = ''
      this.$emit('update:modelValue', this.text)
      this.sendEvent('submit')
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: relative;
  width: min(520px, 48vw);
  min-width: 260px;
  height: @ui-control-height-lg;
  -webkit-app-region: no-drag;
}

.search {
  position: absolute;
  width: 100%;
  border-radius: @ui-radius-lg;
  transition: box-shadow @ui-transition-normal, background-color @ui-transition-normal, border-color @ui-transition-normal;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--ui-surface-hover);
  border: 1px solid transparent;

  &.active {
    background-color: var(--ui-surface-1);
    border-color: var(--ui-border-subtle);
    box-shadow: @ui-shadow-1;

    .form {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }

  .form {
    display: flex;
    align-items: center;
    height: @ui-control-height-lg;
    position: relative;
    padding: 0 @ui-gap-sm 0 @ui-gap-md;
    border-radius: inherit;

    .input {
      flex: auto;
      background-color: transparent;
      border: none;
      min-width: 0;
      outline: none;
      padding: 0 @ui-gap-sm 0 0;
      overflow: hidden;
      font-size: 14px;
      line-height: 1.2;
      color: var(--ui-text-primary);

      &::placeholder {
        color: var(--ui-text-muted);
        font-size: 0.95em;
      }

      &:focus-visible {
        outline: none;
      }
    }

    .iconButton {
      flex: none;
      border: none;
      background-color: transparent;
      outline: none;
      cursor: pointer;
      width: @ui-icon-btn-size;
      height: @ui-icon-btn-size;
      border-radius: @ui-radius-md;
      color: var(--ui-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background-color @ui-transition-fast, color @ui-transition-fast, box-shadow @ui-transition-fast;

      svg {
        height: 16px;
      }

      &:hover {
        background-color: var(--ui-control-bg-hover);
        color: var(--ui-text-primary);
      }

      &:active {
        background-color: var(--ui-control-bg-active);
      }

      &:focus-visible {
        box-shadow: 0 0 0 3px var(--ui-focus-ring);
      }
    }
  }

  .list {
    font-size: 13px;
    transition: height @ui-transition-normal;
    height: 0;
    overflow: hidden;
    background-color: var(--ui-popover-bg);
    border-bottom-left-radius: @ui-radius-lg;
    border-bottom-right-radius: @ui-radius-lg;
    border: 1px solid var(--ui-border-subtle);
    border-top: none;

    ul {
      padding: @ui-gap-xs 0;
    }

    .listItem {
      cursor: pointer;
      padding: 10px @ui-gap-md;
      transition: background-color @ui-transition-fast;
      line-height: 1.35;
      color: var(--ui-text-primary);

      span {
        .mixin-ellipsis-2();
      }

      &.select {
        background-color: var(--ui-popover-active);
      }

      &:hover {
        background-color: var(--ui-popover-hover);
      }
    }
  }
}

.big {
  width: 100%;
  .form {
    height: @ui-control-height-lg;
  }
}
.small {
  width: 250px;
  height: @ui-control-height-md;

  .form {
    height: @ui-control-height-md;
  }
}

</style>
