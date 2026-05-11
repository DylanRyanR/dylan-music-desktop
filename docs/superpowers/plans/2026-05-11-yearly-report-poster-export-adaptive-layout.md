# Yearly Report Poster Export Adaptive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the yearly report `poster` export adapt its section heights and replay list density to different data volumes while preserving the fixed 1080 x 1920 poster structure.

**Architecture:** Keep the work inside `src/renderer/store/reportYearly/action.ts` and upgrade `drawYearlyPoster()` from fixed geometry to rule-based layout metrics. Compute section heights, replay row count, replay row height, and footer height first, then render the poster using those metrics so low-data and high-data years stay visually balanced without changing export contracts.

**Tech Stack:** Electron renderer, TypeScript, canvas 2D API, Vue store action module, ESLint

---

## Scope Check

This plan covers one rendering refinement for the yearly report `poster` export only. It does not change yearly DTOs, IPC, preview modal behavior, the in-page yearly report layout, `drawYearlyPosterClassic()`, or export dimensions.

## File Structure And Ownership

- Modify: `src/renderer/store/reportYearly/action.ts`
  - Owns `trimText()`, `drawYearlyPoster()`, and the canvas section geometry used by preview/export.
  - Will gain explicit adaptive layout metrics and bounded replay/section sizing rules.
- No changes expected: `src/renderer/views/Report/index.vue`
  - Export and preview entrypoints remain unchanged.
- No changes expected: `src/renderer/views/ReportYearly/index.vue`
  - Page layout is out of scope.

---

### Task 1: Introduce Adaptive Poster Layout Metrics

**Files:**
- Modify: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: Replace the current fixed poster section sizing with computed metrics**

Inside `drawYearlyPoster()`, replace the current fixed block:

```ts
const heroTop = 76
const heroHeight = 360
const middleTop = heroTop + heroHeight + 34
const middleHeight = 360
const replayTop = middleTop + middleHeight + 34
const replayHeight = 760
const footerTop = replayTop + replayHeight + 28
const footerHeight = 128
```

with an explicit metrics section like this:

```ts
const heroTop = 76
const sectionGap = 34
const footerGap = 28
const contentLeft = 58
const contentWidth = 964
const innerLeft = 92
const innerRight = 988
const columnGap = 24
const leftColumnWidth = 560
const rightColumnWidth = contentWidth - (innerLeft - contentLeft) * 2 - leftColumnWidth - columnGap

const albumMissing = !cards.yearFavorites.album.albumName && !cards.yearFavorites.album.artistName
const replayVisibleCount = Math.min(Math.max(cards.replaySongs.length, 1), 6)

const heroHeight = 340
const middleHeight = albumMissing ? 332 : 364
const replayRowHeight = replayVisibleCount <= 2 ? 94 : replayVisibleCount >= 6 ? 100 : 106
const replayHeaderHeight = 118
const replayBodyHeight = replayVisibleCount * replayRowHeight
const replayHeight = Math.max(320, Math.min(780, replayHeaderHeight + replayBodyHeight + 34))

const middleTop = heroTop + heroHeight + sectionGap
const replayTop = middleTop + middleHeight + sectionGap
const footerTop = replayTop + replayHeight + footerGap
const footerHeight = Math.max(92, Math.min(152, 1920 - footerTop - 100))
```

This keeps the poster fixed in overall size but lets `middleHeight`, `replayVisibleCount`, `replayRowHeight`, `replayHeight`, and `footerHeight` respond to the data.

- [ ] **Step 2: Keep Hero stable and update Replay to use adaptive counts**

In `drawYearlyPoster()`, keep the existing hero content structure, but make sure it reads from the new layout metrics and the adaptive replay count:

```ts
fillGlassCard(ctx, contentLeft, heroTop, contentWidth, heroHeight, 34)
```

and:

```ts
const replaySongs = cards.replaySongs.slice(0, replayVisibleCount)
```

Do not add conditional hidden hero content. The hero remains structurally stable; only its section height and downstream layout should be metric-driven.

- [ ] **Step 3: Make the replay rows draw from adaptive row height**

Replace the current replay row loop shape:

```ts
let replayY = replayTop + 128
replaySongs.forEach((item, index) => {
  fillGlassCard(ctx, innerLeft - 2, replayY - 28, 900, 106, 18)
  ...
  replayY += 126
})
```

with metric-driven row geometry:

```ts
let replayY = replayTop + 118
const replayCardHeight = replayRowHeight - 20
const replayCardWidth = 900

replaySongs.forEach((item, index) => {
  fillGlassCard(ctx, innerLeft - 2, replayY - 20, replayCardWidth, replayCardHeight, 18)
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.font = '700 30px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(`#${index + 1}`, innerLeft + 24, replayY + 16)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(trimText(item.songName, replayVisibleCount <= 2 ? 32 : 28), innerLeft + 126, replayY + 12)
  ctx.fillStyle = 'rgba(255, 255, 255, .68)'
  ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
  ctx.fillText(trimText(item.artistName, replayVisibleCount <= 2 ? 24 : 22), innerLeft + 126, replayY + 46)
  ctx.save()
  ctx.textAlign = 'right'
  ctx.fillText(`x${item.count} / ${formatDuration(item.seconds)}`, innerRight - 24, replayY + 46)
  ctx.restore()
  replayY += replayRowHeight
})
```

This step is the core adaptive behavior: low-data years get shorter replay sections, denser years get more rows with slightly tighter rhythm.

- [ ] **Step 4: Make the footer absorb bounded leftover space**

Keep footer content unchanged in meaning, but make its frame depend on the computed `footerHeight`:

```ts
fillGlassCard(ctx, contentLeft, footerTop, contentWidth, footerHeight, 24)

ctx.fillStyle = '#ffffff'
ctx.font = '700 32px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__story_ending_title', `${overview.year}, thanks for listening`, { year: overview.year }), innerLeft, footerTop + 44)
ctx.fillStyle = 'rgba(255, 255, 255, .62)'
ctx.font = '500 22px "Segoe UI", "PingFang SC", sans-serif'
ctx.fillText(resolveI18n('yearly_report__poster_generated_at', `Generated at ${new Date().toLocaleString()}`, { time: new Date().toLocaleString() }), innerLeft, footerTop + Math.min(footerHeight - 22, 82))
ctx.save()
ctx.textAlign = 'right'
ctx.fillText(`LX Music / ${overview.year}`, innerRight - 24, footerTop + Math.min(footerHeight - 22, 82))
ctx.restore()
```

The footer should consume leftover space inside a bounded range, but it should never become a new major content block.

- [ ] **Step 5: Run focused lint**

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
git commit -m "feat: add adaptive yearly poster layout metrics"
```

---

### Task 2: Tune Text And Middle Section For Adaptive Stability

**Files:**
- Modify: `src/renderer/store/reportYearly/action.ts`

- [ ] **Step 1: Keep the middle section structurally complete while allowing light shrink**

In the middle section, keep the left/right split and avoid hiding the album row entirely. Adjust only the text density and row rhythm:

```ts
const favoriteRows = [
  [
    resolveI18n('yearly_report__top_song', 'Top Song'),
    trimText(topSong.songName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 26 : 24),
    trimText(topSong.artistName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 22 : 20),
  ],
  [
    resolveI18n('yearly_report__top_artist', 'Top Artist'),
    trimText(topArtist.artistName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 26 : 24),
    `${topArtist.count}x / ${formatDuration(topArtist.seconds)}`,
  ],
  [
    resolveI18n('yearly_report__top_album', 'Top Album'),
    trimText(topAlbum.albumName || resolveI18n('monthly_report__no_data', 'No Data'), albumMissing ? 20 : 24),
    trimText(`${topAlbum.artistName || resolveI18n('monthly_report__no_data', 'No Data')} / ${topAlbum.count}x`, albumMissing ? 24 : 28),
  ],
]
```

This keeps the middle section complete while letting text density adapt slightly when album data is weak.

- [ ] **Step 2: Tie favorite row rhythm to `middleHeight`**

Replace a fully fixed favorite row start/increment like:

```ts
let favoriteY = middleTop + 134
...
favoriteY += 96
```

with a simple adaptive rhythm:

```ts
let favoriteY = middleTop + 126
const favoriteRowGap = middleHeight <= 340 ? 88 : 96

for (const [label, main, sub] of favoriteRows) {
  ...
  ctx.fillText(main, innerLeft, favoriteY + 40)
  ...
  ctx.fillText(sub, innerLeft, favoriteY + 74)
  favoriteY += favoriteRowGap
}
```

This lets the middle section breathe a little more when normal and tighten a little when album data is weak.

- [ ] **Step 3: Run focused lint again**

Run:

```bash
npx eslint src/renderer/store/reportYearly/action.ts
```

Expected:

```text
No lint errors.
```

- [ ] **Step 4: Commit**

Run:

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "fix: stabilize adaptive yearly poster text layout"
```

---

### Task 3: Validate Low-Data, Normal, And Dense Cases

**Files:**
- Modify: `src/renderer/store/reportYearly/action.ts` (only if preview review requires tuning)

- [ ] **Step 1: Start the app and open yearly report export preview**

Run:

```bash
npm run dev
```

Then open the yearly report page, switch to yearly mode, keep export style on `poster`, and open the export preview.

Expected:

```text
The poster still reads as the same product, but section heights no longer feel rigid.
```

- [ ] **Step 2: Manually validate the three target scenarios**

Check these scenarios in the preview:

```text
- Low-data case: replay list short, footer and replay area do not leave obvious dead air.
- Normal case: poster still looks close to the current “mature” version, not like a totally new style.
- Dense case: replay rows remain readable and do not collide with the right-side metrics or footer.
```

If tuning is needed, only adjust:

```text
- replayVisibleCount bounds
- replayRowHeight bounds
- middleHeight bounds
- footerHeight bounds
- trimText(...) limits
```

Do not add new content sections or remove the existing middle-section structure.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
Both commands pass with no new errors.
```

- [ ] **Step 4: Commit any final tuning**

If preview review required code adjustments, run:

```bash
git add src/renderer/store/reportYearly/action.ts
git commit -m "fix: polish adaptive yearly poster spacing"
```

If no code changes were needed after preview validation, skip this commit.
