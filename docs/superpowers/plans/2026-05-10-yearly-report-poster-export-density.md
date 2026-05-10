# Yearly Report Poster Export Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the yearly report `poster` PNG export so the 1080 x 1920 image feels fuller and more balanced without changing data contracts or the `classic` export.

**Architecture:** Keep all changes inside `src/renderer/store/reportYearly/action.ts`, where yearly poster preview and export are already rendered from canvas drawing commands. Recompose the existing poster into a denser hero, a two-column middle section, a five-row replay ranking, and a lighter footer while preserving the current background treatment and export pipeline.

**Tech Stack:** Electron renderer, TypeScript, canvas 2D API, Vue store action module, ESLint

---

## Scope Check

This plan covers one self-contained rendering refactor for the yearly report `poster` export style. It does not change yearly DTOs, IPC contracts, aggregation logic, preview modal behavior, the in-page yearly report layout, or `drawYearlyPosterClassic()`.

## File Structure And Ownership

- Modify: `src/renderer/store/reportYearly/action.ts`
  - Owns the `drawYearlyPoster()` canvas layout and the existing helper functions used by preview/export.
  - Will absorb the density optimization through drawing constants, layout geometry, text trimming, and replay row count.
- No changes expected: `src/renderer/views/Report/index.vue`
  - Export trigger and preview modal remain unchanged.
- No changes expected: `src/renderer/views/ReportYearly/index.vue`
  - Page layout and export style selection remain unchanged.

---

### Task 1: Recompose The Poster Layout

**Files:**
- Modify: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: Add denser layout constants inside `drawYearlyPoster()`**

At the top of `drawYearlyPoster()`, replace the loose section positioning with explicit layout constants so the hero, middle section, replay list, and footer are easier to tune together:

```ts
const heroTop = 76
const heroHeight = 360
const middleTop = heroTop + heroHeight + 34
const middleHeight = 360
const replayTop = middleTop + middleHeight + 34
const replayHeight = 760
const footerTop = replayTop + replayHeight + 28
const footerHeight = 128

const contentLeft = 58
const contentWidth = 964
const innerLeft = 92
const innerRight = 988
const columnGap = 24
const leftColumnWidth = 560
const rightColumnWidth = contentWidth - (innerLeft - contentLeft) * 2 - leftColumnWidth - columnGap
```

These constants replace the current `mainTop`, the hard-coded `560`, `888`, and `1570` section starts, and the oversized `448 / 294 / 634 / 250` heights.

- [ ] **Step 2: Compress the hero and move the KPI cards into the right column**

Inside `drawYearlyPoster()`, replace the current hero card and horizontal KPI row with a denser hero plus a right-column KPI stack:

```ts
fillGlassCard(ctx, contentLeft, heroTop, contentWidth, heroHeight, 34)

ctx.fillStyle = '#f8fafc'
ctx.font = '700 56px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__poster_title', '洛雪音乐年度报告'), innerLeft, heroTop + 88)
ctx.font = '500 32px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillStyle = 'rgba(248, 250, 252, .84)'
ctx.fillText(resolveI18n('yearly_report__poster_subtitle', `${overview.year} 听歌回顾`, { year: overview.year }), innerLeft, heroTop + 138)

ctx.fillStyle = '#ffffff'
ctx.font = '700 100px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(formatDuration(overview.totalListenSeconds), innerLeft, heroTop + 282)
ctx.font = '500 30px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillStyle = 'rgba(255, 255, 255, .78)'
ctx.fillText(resolveI18n('yearly_report__poster_total_line', `总收听 ${overview.sessionCount} 次`, { sessions: overview.sessionCount }), innerLeft + 4, heroTop + 334)

const statCards: Array<{ label: string, value: string }> = [
  { label: resolveI18n('yearly_report__active_days', '活跃天数'), value: `${overview.activeDays}` },
  { label: resolveI18n('yearly_report__new_song_ratio', '新歌占比'), value: formatPercent(overview.newSongRatio) },
  { label: resolveI18n('yearly_report__new_artist_ratio', '新歌手占比'), value: formatPercent(overview.newArtistRatio) },
]
```

Do not draw the 3 horizontal KPI cards at `statY = 454` anymore. The same `statCards` data will be rendered as the middle-right column in the next step.

- [ ] **Step 3: Replace the separate favorites block with a two-column middle section**

Replace the current `fillGlassCard(ctx, 58, 560, 964, 294, 30)` block and its rows with one shared middle card, with favorites on the left and KPI cards stacked on the right:

```ts
fillGlassCard(ctx, contentLeft, middleTop, contentWidth, middleHeight, 30)

const topSong = cards.yearFavorites.song
const topArtist = cards.yearFavorites.artist
const topAlbum = cards.yearFavorites.album

const favoriteRows = [
  [
    resolveI18n('yearly_report__top_song', '年度歌曲'),
    trimText(topSong.songName || resolveI18n('monthly_report__no_data', '暂无数据'), 24),
    trimText(topSong.artistName || resolveI18n('monthly_report__no_data', '暂无数据'), 20),
  ],
  [
    resolveI18n('yearly_report__top_artist', '年度歌手'),
    trimText(topArtist.artistName || resolveI18n('monthly_report__no_data', '暂无数据'), 24),
    `${topArtist.count}次 · ${formatDuration(topArtist.seconds)}`,
  ],
  [
    resolveI18n('yearly_report__top_album', '年度专辑'),
    trimText(topAlbum.albumName || resolveI18n('monthly_report__no_data', '暂无数据'), 24),
    trimText(`${topAlbum.artistName || resolveI18n('monthly_report__no_data', '暂无数据')} · ${topAlbum.count}次`, 28),
  ],
]

ctx.fillStyle = '#ffffff'
ctx.font = '700 40px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__favorites', 'Year Favorites'), innerLeft, middleTop + 68)

let favoriteY = middleTop + 134
for (const [label, main, sub] of favoriteRows) {
  ctx.fillStyle = 'rgba(232, 242, 255, .66)'
  ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(label, innerLeft, favoriteY)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 34px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(main, innerLeft, favoriteY + 42)
  ctx.fillStyle = 'rgba(232, 242, 255, .72)'
  ctx.font = '500 24px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(sub, innerLeft, favoriteY + 78)
  favoriteY += 96
}

let statY = middleTop + 54
const statX = innerLeft + leftColumnWidth + columnGap
for (const item of statCards) {
  fillGlassCard(ctx, statX, statY, rightColumnWidth, 86, 18)
  ctx.fillStyle = 'rgba(240, 248, 255, .72)'
  ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(item.label, statX + 20, statY + 34)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 36px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(item.value, statX + 20, statY + 68)
  statY += 106
}
```

This turns the middle of the poster into one denser shared information zone instead of one favorites card plus one detached KPI strip.

- [ ] **Step 4: Expand replay rows to five items and lighten the footer**

Replace the current replay section and large footer with a denser ranking card and a slim footer band:

```ts
fillGlassCard(ctx, contentLeft, replayTop, contentWidth, replayHeight, 30)

ctx.fillStyle = '#ffffff'
ctx.font = '700 42px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__poster_replay_title', '年度反复听'), innerLeft, replayTop + 70)

const replaySongs = cards.replaySongs.slice(0, 5)
let replayY = replayTop + 128
replaySongs.forEach((item, index) => {
  fillGlassCard(ctx, innerLeft - 2, replayY - 28, 900, 106, 18)
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.font = '700 30px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(`#${index + 1}`, innerLeft + 24, replayY + 18)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(trimText(item.songName, 28), innerLeft + 126, replayY + 14)
  ctx.fillStyle = 'rgba(255, 255, 255, .68)'
  ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(trimText(item.artistName, 22), innerLeft + 126, replayY + 48)
  ctx.fillText(`x${item.count} · ${formatDuration(item.seconds)}`, innerRight - 200, replayY + 48)
  replayY += 126
})

fillGlassCard(ctx, contentLeft, footerTop, contentWidth, footerHeight, 24)
ctx.fillStyle = '#ffffff'
ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__story_ending_title', `${overview.year}，谢谢音乐继续陪你`, { year: overview.year }), innerLeft, footerTop + 48)
ctx.fillStyle = 'rgba(255, 255, 255, .72)'
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `生成于 ${new Date().toLocaleString()}`, { time: new Date().toLocaleString() }), innerLeft, footerTop + 84)
ctx.fillText(`LX Music · ${overview.year}`, innerRight - 160, footerTop + 84)
```

This step intentionally removes the current `footerTop = 1570` large footer card and the `cards.replaySongs.slice(0, 3)` limit.

- [ ] **Step 5: Run focused lint for the modified file**

Run:

```bash
npx eslint src/renderer/store/reportYearly/action.ts
```

Expected:

```text
No lint errors.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "style: densify yearly poster export layout"
```

---

### Task 2: Verify Visual Density And Export Safety

**Files:**
- Modify: `src/renderer/store/reportYearly/action.ts` (only if tuning is needed after review)

- [ ] **Step 1: Start the app and open yearly report export preview**

Run:

```bash
npm run dev
```

Then open the yearly report page in the app, switch to yearly mode, keep export style on `poster`, and open the export preview.

Expected:

```text
The preview renders a fuller poster with a shorter hero, a shared middle section, a five-row replay ranking, and a thin footer.
```

- [ ] **Step 2: Manually validate long-text edge cases**

In the preview, inspect or reproduce yearly data with longer values and verify these rules:

```text
- Long song names stay on one line after trimText(...) and do not overlap the replay metrics.
- Long artist names stay within the replay row body and do not push the count/duration line off the right edge.
- Year Favorites rows remain aligned even when album or artist values are longer than average.
```

If any of these fail, adjust only the trimming lengths and X positions already introduced in Task 1 rather than adding new layout sections.

- [ ] **Step 3: Run full project verification**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
Both commands pass with no new errors.
```

- [ ] **Step 4: Commit any verification-driven tuning**

If Task 2 required code changes, run:

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "fix: polish yearly poster export spacing"
```

If no code changes were needed after preview review, skip this commit.
