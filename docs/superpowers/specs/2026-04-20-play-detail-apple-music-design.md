# Play Detail Apple Music Style Deepening Design

## Overview

This design refines the play detail page to feel closer to Apple Music while preserving the current page layout and the immersive direction already introduced in recent local changes.

The goal is not to redesign the screen structure. The goal is to deepen the existing visual language so the page feels more unified, more premium, and more content-led.

Core direction:

- Keep the current left cover, right lyric, and bottom control layout.
- Retain the atmospheric immersive mood instead of flattening the UI into a minimal desktop panel.
- Make the page feel less like several glass cards and more like one continuous music scene.
- Push detail quality in hierarchy, motion, focus, and interaction feedback toward Apple Music.

## Goals

- Increase perceived polish without changing the information architecture.
- Improve focus so the eye naturally lands on the cover and active lyric line.
- Make the footer controls feel more like a cohesive playback system and less like a utility toolbar.
- Preserve current functionality, including comments, lyric selection, desktop lyric control, and playback tools.
- Keep implementation scope mostly within visual styling and motion behavior.

## Non-Goals

- No large structural layout changes.
- No removal of existing controls or feature affordances.
- No rewrite of lyric logic, player logic, or comment functionality.
- No attempt to exactly clone Apple Music UI assets or layout proportions.

## Constraints

- Existing layout must remain recognizable:
  - left cover and metadata area
  - right lyric area
  - bottom playback control area
- Existing interactions and settings must continue to work.
- Reduced-motion support must be preserved.
- The result should feel closer to Apple Music, but still belong to this project and its existing UI token system.

## Design Principles

### 1. Scene Over Panels

The page should read as one immersive playback scene instead of multiple separate glass containers. Surfaces should still exist, but they should support the scene rather than compete with it.

### 2. Content Is The Hero

The cover image and current lyric line should carry the strongest visual emphasis. Supporting metadata and utility actions should remain readable but visually secondary.

### 3. Atmosphere With Restraint

Ambient blur, glow, and color diffusion should remain, but heavy overlays, thick card borders, and overly obvious glass treatment should be reduced.

### 4. Motion Should Guide Attention

Animation should reinforce focus and continuity, especially around lyric progression and playback interactions. Motion must feel soft and intentional, not flashy.

## Current UI Assessment

The current implementation already has a good foundation:

- blurred cover-based background
- large left cover area
- large right lyric area with active-line emphasis
- floating footer controls
- reduced-motion handling in some components

Main gaps relative to the target style:

- card boundaries are still visually prominent
- some surfaces feel like separate widgets instead of one scene
- metadata presentation is still somewhat field-like instead of content-like
- lyric focus is good, but not yet strong enough to create a stage-lit active line feeling
- footer controls are coherent, but still closer to a generic glass control bar than a premium playback cluster

## Component Direction

### Background

Intent:
Create a softer immersive environment driven by cover color and depth, rather than a thick dark veil.

Changes:

- Reduce the sense of a uniform dark mask across the whole screen.
- Let more cover-derived color come through the background stack.
- Keep blur, but tune it from "smeared" toward "diffused color field".
- Add a subtle center-weighted light focus around the cover area.
- Keep vignette for focus, but make it lighter and more supportive than dramatic.

Desired effect:
The screen should feel deeper, more colorful, and less gray-heavy.

### Cover Area

Intent:
Make the album art feel like the main physical object in the scene.

Changes:

- Reduce the apparent thickness of the outer cover frame.
- Keep rounded corners and soft highlight treatment, but avoid a picture-frame feeling.
- Shift the shadow from dense and heavy to broader and softer.
- Add very subtle edge light or top sheen if it supports premium depth without becoming decorative.

Desired effect:
The cover should feel anchored and premium, with more emphasis on the artwork itself than its container.

### Metadata Area

Intent:
Present track information like content presentation, not like a labeled data sheet.

Changes:

- Keep the current structure, but reduce label prominence.
- Let the track name read as the strongest text block.
- Keep singer information clearly visible, but lower than the title.
- Keep album and playback state text as supporting information.
- Increase whitespace rhythm slightly so the block breathes more naturally.

Desired effect:
Metadata should feel editorial and music-first while preserving readability and current layout constraints.

### Lyric Area

Intent:
Make the lyric area feel spatial and focused, with the active line naturally illuminated.

Changes:

- Reduce the visible sense of a dedicated lyric panel frame.
- Keep the lyric mask gradient, but soften edge fade behavior.
- Increase the contrast gap between active and inactive lyric lines.
- Keep active-line scale modest and elegant rather than dramatic.
- Make extended lyric text clearly subordinate to the main active line.
- Preserve per-word playback highlighting, but make it feel like light progression rather than a technical overlay.

Desired effect:
The eye should always find the active lyric line immediately, and the lyric area should feel less like a boxed widget.

### Lyric Motion

Intent:
Improve continuity and calmness during lyric progression and manual lyric interaction.

Changes:

- Favor soft opacity, subtle scale, and clarity shifts over aggressive movement.
- Keep the current scroll behavior, but reduce any perception of abrupt jumps.
- Ensure the skip-to-line affordance appears as a lightweight assistant layer.

Desired effect:
Lyrics should feel like they glide through focus rather than snap into place.

### Footer Controls

Intent:
Make the footer feel like a cohesive playback control system with a strong center anchor.

Changes:

- Retain the floating footer shell, but reduce its card thickness and separation from the scene.
- Strengthen the hierarchy between primary playback controls and secondary utility actions.
- Make the primary play/pause button feel like the central anchor.
- Make previous and next feel visually grouped with the primary control rather than three separate pills.
- Keep progress and timing readable, but let them support the playback cluster rather than compete with it.

Desired effect:
The user should instantly understand where the main playback focus lives.

### Secondary Actions

Intent:
Preserve capability without visual noise.

Changes:

- Keep all current secondary actions.
- Lower their default visual prominence.
- Use active state to show function clearly, without introducing many competing highlight colors.
- Make the control row feel like one family of controls with consistent rhythm.

Desired effect:
Useful controls remain discoverable, but they no longer compete with primary playback actions.

## Motion Guidelines

- Animate only key layers:
  - active lyric transitions
  - button hover and press feedback
  - footer and surface emphasis changes
- Prefer soft easing and short durations.
- Avoid large-distance movement.
- Avoid "everything animates" behavior.
- Respect `prefers-reduced-motion: reduce` by disabling or minimizing non-essential transitions.

## Visual Guidelines

- Reduce hard card edges.
- Reduce heavy overlay opacity.
- Favor soft depth over obvious frosted-glass slabs.
- Use one consistent highlight language for active states.
- Keep text contrast high enough for readability on dynamic backgrounds.
- Preserve tabular numerals for playback time.

## Accessibility Considerations

- Maintain readable contrast for metadata, lyrics, and controls on top of dynamic backgrounds.
- Keep focus and interaction states visible.
- Preserve touch and click target usability for all control buttons.
- Respect reduced motion.
- Avoid relying on color alone to indicate active states where shape, opacity, or emphasis can also help.

## Implementation Scope

Primary files expected to change:

- `src/renderer/components/layout/PlayDetail/index.vue`
- `src/renderer/components/layout/PlayDetail/LyricPlayer.vue`
- `src/renderer/components/layout/PlayDetail/PlayBar.vue`
- `src/renderer/components/layout/PlayDetail/components/ControlBtns.vue`
- potentially play-detail header button styles if needed for visual consistency

Possible supporting work:

- small token reuse or additions if existing theme tokens are insufficient
- modest transition tuning in shared styles only if required

## Acceptance Criteria

- The page still uses the current layout and feature set.
- The screen feels more like one immersive scene and less like several separate cards.
- The cover image reads as the main visual object.
- The active lyric line is easier to find immediately.
- The footer control bar has a clearer primary-vs-secondary hierarchy.
- The interface feels more premium and more Apple Music-adjacent without becoming flatter or more generic.

## Testing Strategy

- Visual QA on the play detail page in normal mode and fullscreen mode.
- Verify behavior with long track names, long singer names, and album names.
- Verify lyric readability with:
  - short lines
  - long wrapped lines
  - extended lyrics
  - line-by-line progression
- Verify comment panel coexistence with the adjusted visual hierarchy.
- Verify reduced-motion behavior.
- Verify no regressions in:
  - footer controls
  - lyric skip affordance
  - lyric selection mode
  - desktop lyric toggle

## Risks

- Over-lightening the page could reduce lyric readability on some cover images.
- Over-reducing surface boundaries could make information zones feel undefined.
- Excessive active-line emphasis could become theatrical instead of refined.
- Too much motion tuning could hurt clarity if it exceeds the current interaction cadence.

## Decisions Made

- Preserve current page structure.
- Deepen visual and interaction quality rather than redesign layout.
- Aim for Apple Music influence through polish and focus behavior, not literal imitation.
- Keep the current immersive mood rather than replacing it with a flatter minimalist style.
