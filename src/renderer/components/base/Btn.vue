<template>
  <button
    :class="[$style.btn, {[$style.min]: min}, {[$style.outline]: outline}]"
    tabindex="0"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    min: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: @ui-control-height-md;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: @ui-radius-md;
  cursor: pointer;
  color: var(--ui-text-primary);
  outline: none;
  transition: background-color @ui-transition-fast, border-color @ui-transition-fast, box-shadow @ui-transition-fast, color @ui-transition-fast, transform @ui-transition-fast;
  background-color: var(--ui-control-bg);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;

  &[disabled] {
    opacity: .45;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:not([disabled]):hover {
    background-color: var(--ui-control-bg-hover);
  }

  &:not([disabled]):active {
    background-color: var(--ui-control-bg-active);
    transform: translateY(1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px var(--ui-focus-ring);
  }

  &.outline {
    background-color: transparent;
    border-color: var(--ui-border-subtle);
    color: var(--ui-text-secondary);

    &:not([disabled]):hover {
      background-color: var(--ui-surface-hover);
      color: var(--ui-text-primary);
    }

    &:not([disabled]):active {
      background-color: var(--ui-surface-active);
    }
  }
}

.min {
  min-height: @ui-control-height-sm;
  padding: 0 12px;
  border-radius: @ui-radius-sm;
  font-size: 12px;
}

</style>
