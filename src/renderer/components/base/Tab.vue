<template>
  <ul :class="[$style.list, $style[align]]" role="tablist">
    <li
      v-for="item in list"
      :key="item[itemKey]" :class="[$style.listItem, {[$style.active]: modelValue == item[itemKey]}]" tabindex="0" role="tab"
      :aria-label="item[itemLabel]" ignore-tip :aria-selected="modelValue == item[itemKey]" @click="handleToggle(item[itemKey])"
      @keyup.enter="handleToggle(item[itemKey])" @keyup.space.prevent="handleToggle(item[itemKey])"
    >
      <span :class="$style.label">{{ item[itemLabel] }}</span>
    </li>
  </ul>
</template>

<script>

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    align: {
      type: String,
      default: 'left',
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemLabel: {
      type: String,
      default: 'label',
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const handleToggle = id => {
      if (id == props.modelValue) return
      emit('update:modelValue', id)
      emit('change', id)
    }

    return {
      handleToggle,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: @ui-gap-sm;
  padding: @ui-gap-xs;
  border-radius: @ui-radius-lg;
  background-color: var(--ui-surface-hover);
  font-size: 12px;

  &.left {
    justify-content: flex-start;
  }
  &.center {
    justify-content: center;
  }
  &.right {
    justify-content: flex-end;
  }
}
.listItem {
  display: block;
  border-radius: @ui-radius-md;
  cursor: pointer;
  color: var(--ui-text-secondary);
  outline: none;
  transition: background-color @ui-transition-fast, color @ui-transition-fast, box-shadow @ui-transition-fast;

  &:hover {
    color: var(--ui-text-primary);
    background-color: var(--ui-surface-hover);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px var(--ui-focus-ring);
  }

  &.active {
    color: var(--ui-accent);
    background-color: var(--ui-surface-1);
    box-shadow: @ui-shadow-1;
    cursor: default;

    > .label {
      &:after {
        opacity: 1;
        transform: scaleX(1);
      }
    }
  }
}

.label {
  display: block;
  position: relative;
  padding: 10px 14px;
  font-weight: 500;
  line-height: 1;

  &:after {
    .mixin-after();
    left: 14px;
    right: 14px;
    bottom: 6px;
    height: 2px;
    border-radius: 999px;
    background-color: var(--ui-accent);
    transform: scaleX(0.4);
    opacity: 0;
    transition: transform @ui-transition-fast, opacity @ui-transition-fast;
  }
}
</style>
