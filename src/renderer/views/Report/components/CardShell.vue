<template>
  <section :class="$style.card">
    <header :class="$style.header">
      <div>
        <h3 :class="$style.title">{{ title }}</h3>
        <p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
      </div>
      <slot name="headerExtra" />
    </header>
    <div :class="$style.content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.card {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  min-height: 172px;
  border-radius: 20px;
  padding: 16px;
  box-sizing: border-box;
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--color-list-header-border-bottom) 58%, transparent);
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--color-primary-background-hover) 68%, rgba(255, 255, 255, .06)) 0%, color-mix(in srgb, var(--color-primary-background) 88%, transparent) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 16px 34px rgba(0, 0, 0, .08);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  opacity: .68;
}

.content {
  margin-top: 14px;
  flex: auto;
  min-height: 0;
}
</style>
