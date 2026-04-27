<template>
  <CardShell :title="text('yearly_report__favorites', 'Year Favorites')" :subtitle="text('yearly_report__favorites_subtitle', 'Song / Artist / Album snapshot')">
    <ul :class="$style.list">
      <li :class="$style.item">
        <p :class="$style.label">{{ text('monthly_report__top_song', 'Top Song') }}</p>
        <p :class="$style.value">{{ favoriteSongName }}</p>
        <p :class="$style.meta">{{ favoriteSongMeta }}</p>
      </li>
      <li :class="$style.item">
        <p :class="$style.label">{{ text('monthly_report__top_artist', 'Top Artist') }}</p>
        <p :class="$style.value">{{ favoriteArtistName }}</p>
        <p :class="$style.meta">{{ favoriteArtistMeta }}</p>
      </li>
      <li :class="$style.item">
        <p :class="$style.label">{{ text('yearly_report__top_album', 'Top Album') }}</p>
        <p :class="$style.value">{{ favoriteAlbumName }}</p>
        <p :class="$style.meta">{{ favoriteAlbumMeta }}</p>
      </li>
    </ul>
  </CardShell>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import CardShell from '@renderer/views/Report/components/CardShell.vue'
import { formatDuration, useSafeI18n } from './utils'

const props = defineProps<{
  cards: LX.ReportYearly.CardsDTO
}>()

const text = useSafeI18n()

const noDataText = computed(() => text('monthly_report__no_data', 'No data'))

const favoriteSongName = computed(() => {
  return props.cards.yearFavorites.song.songName || noDataText.value
})

const favoriteSongMeta = computed(() => {
  const song = props.cards.yearFavorites.song
  if (!song.songName) return '-'
  return `${song.artistName || '-'} | x${song.count} | ${formatDuration(song.seconds)}`
})

const favoriteArtistName = computed(() => {
  return props.cards.yearFavorites.artist.artistName || noDataText.value
})

const favoriteArtistMeta = computed(() => {
  const artist = props.cards.yearFavorites.artist
  if (!artist.artistName) return '-'
  return `x${artist.count} | ${formatDuration(artist.seconds)}`
})

const favoriteAlbumName = computed(() => {
  return props.cards.yearFavorites.album.albumName || noDataText.value
})

const favoriteAlbumMeta = computed(() => {
  const album = props.cards.yearFavorites.album
  if (!album.albumName) return '-'
  return `${album.artistName || '-'} | x${album.count} | ${formatDuration(album.seconds)}`
})
</script>

<style lang="less" module>
.list {
  display: grid;
  gap: 10px;
}

.item {
  display: grid;
  gap: 4px;
}

.label {
  margin: 0;
  font-size: 11px;
  opacity: .66;
}

.value {
  margin: 0;
  font-size: 13px;
  line-height: 1.36;
  font-weight: 600;
}

.meta {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  opacity: .66;
}
</style>
