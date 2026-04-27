<template>
  <CardShell :title="text('yearly_report__enrichment_placeholder', 'External Enrichment')" :subtitle="text('yearly_report__enrichment_placeholder_subtitle', 'Genre / Language / BPM / Word Cloud')">
    <div :class="$style.placeholder">
      <p :class="$style.placeholderTitle">{{ cards.enrichmentPlaceholder.status }}</p>
      <p :class="$style.placeholderFields">{{ cards.enrichmentPlaceholder.fields.join(' · ') }}</p>
      <p :class="$style.placeholderDesc">{{ text('yearly_report__enrichment_placeholder_desc', 'App keeps playback facts, external systems provide content analysis.') }}</p>
    </div>
  </CardShell>
</template>

<script setup lang="ts">
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { useSafeI18n } from './utils'

defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()
</script>

<style lang="less" module>
.placeholder {
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--color-list-header-border-bottom) 70%, transparent);
  padding: 12px;
  background: color-mix(in srgb, var(--color-primary-background) 86%, rgba(255, 255, 255, .03));
}

.placeholderTitle {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}

.placeholderFields {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.45;
  opacity: .72;
}

.placeholderDesc {
  margin: 7px 0 0;
  font-size: 11px;
  line-height: 1.45;
  opacity: .68;
}
</style>
