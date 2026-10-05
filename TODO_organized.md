# TODO (organized)

Grouped by when to do it. The original `TODO.md` is untouched.

## Done
- [x] Milestones 1–5: dots and labels, dragging, formation presets, multiple frames with interpolation, bezier paths with draggable handles and curved playback
- [x] Side panel layout for the buttons
- [x] Rename a dancer in place, with collision swap
- [x] Explicit select + swap button

## 1. Before saving/loading (these change the data model or frame ordering)
- [x] Bug: "Add Frame" always appended to the end — now inserts directly after the current frame (`addFrameAfter`), and clears `pathToNext` on the current frame's dancers before inserting.
- [x] Add `startTime` and `endTime` (seconds, absolute, required) to `Frame`. Transitions are derived, not stored.
  - [x] "Add Frame" inserts 2s after the current frame's `endTime`, with a default 10s length (`standardFrameGap`/`standardFrameLength`).
  - [x] Ripple: if the gap to the next frame is too small, `shiftFrames` pushes it and every later frame forward by the shortfall.
  - [x] Manual time entry (two number inputs) with `clamp` — `startTime` can't go below the previous frame's `endTime` (or 0), `endTime` can't go past the next frame's `startTime`.
  - [ ] Playback still needs to use one `currentTime` playhead instead of the slider's raw `t`; in a gap, `t = (currentTime - endA) / (startB - endA)`, with `t = 1` when the gap is `<= 0` (instant jump, never divide by zero). This is part of the play/pause milestone below.
  - [ ] Reordering frames is a maybe, pending feedback from colleagues.
  - [ ] Timeline UI (two bars: formations over the song) comes later, in the audio milestone.
- [ ] Maybe revisit "Add Frame" as "snap frame" (like taking a picture of the current formation) — naming/UX only, behavior above already covers insert position and path clearing.

## 2. Next milestone: saving and loading
- [x] Save/load via `localStorage` — `SaveFile { version, frames }`, `saveToLocal`/`loadFromLocal`, lazy `useState` initializer.
- [x] File export/import (download/upload the same `SaveFile` JSON as a `.json` file) — doubles as Tier 1 sharing: send the file to another user, they import it. No server/accounts needed.
  - [ ] Style the upload/"Download" pairing — a styled button that triggers a hidden `<input type="file">` via a ref, instead of the raw file input sitting in the panel.
- [ ] Undo/redo

## 3. After saving/loading: polish (does not change what gets saved)
- [ ] Clicking empty space on the stage (not a dancer, not a button) while a dancer is selected should deselect it and cancel swap mode. Watch for event bubbling: use `e.stopPropagation()` in the circle handler or check `e.target === e.currentTarget` on the SVG.
- [ ] Revisit the Edit and Swap buttons for legibility: make it obvious that after pressing Swap the user must pick a second dancer (visible swap-mode state, a hint, a way to cancel).
- [ ] Revisit button icons (Font Awesome): pick a deliberate, consistent set once the button list settles.
- [ ] Move inline `style={{...}}` objects (e.g. `buttonStyle`, the panel layouts) into a stylesheet using `className`; clear leftover Vite template rules from `App.css` and `index.css`; use CSS variables for reused colors and sizes (hover/disabled states need this too). Consider CSS Modules once `App.tsx` is split into components.
- [ ] Replace native `title` tooltips with a custom-styled tooltip (CSS-only: hidden `<span>` shown on `:hover`).

## 4. Ongoing: code cleanup
- [ ] Review `updateCurrentFrameDancers` and `updateDancer` and how they compose, until using them feels instinctive. Practice by re-deriving each call site (drag, rename, handle drag, swap) from scratch.
- [x] Split the helper functions into their own files by subject: `types.ts`, `dancerHelpers.ts`, `frameHelpers.ts`, `pathHelpers.ts`, `persistence.ts`, `formationHelpers.ts` (`computeFormationDancers`, `getMidpointOffsetY`, `getRotateHandleReach`, `updateFormationFromDrag` — moved out of `dancerHelpers.ts` once formation-control logic grew large enough to be its own subject). `App.tsx` now holds only state, JSX, constants, `clamp`, and the closure-dependent functions (`getSvgCoords`, `updateCurrentFrameDancers`, `renameDancer`).
- [ ] Maybe move `clamp` into its own `utils.ts` if other generic helpers show up later; not urgent.
- [ ] Split `App.tsx`'s JSX into components now that logic lives elsewhere (e.g. a `Stage` component for the `<svg>`, a `ButtonPanel` for the side panel), remove leftover comments/dead code, extract helpers where logic repeats (e.g. frame-navigation index math, handlers inline in JSX).

## 5. Later milestones (each is its own project)

### Playback and timing
- [ ] Play/pause that animates `t` over time
- [ ] Add a song/audio track that drives playback, to test the choreography against the music timing
- [ ] Hide the future-position preview and dashed paths while playing like a video; show them only when paused/editing. Ties into a show/hide toggle and a paths-only editing mode.
- [ ] Disable dancer dragging while scrubbing/playing (only allow it when paused), since mid-scrub positions are interpolated, not real frame data.
- [ ] Constant-speed movement along curves (arc-length parameterization): bezier's `t` is a curve parameter, not distance.

### Formations
- [x] Bug: V formation dancers clumped in a corner — fixed by centering the formula itself on `centerX`/`centerY` (matching circle/half-circle), inside `applyVeeFormation`.

### Adjustable formations (live handle-drag controls)
- [x] `FormationControl` type, `activeFormation` state, `rotatePoint` helper, `computeFormationDancers` (circle only so far).
- [x] Circle: move handle (drag center), resize handle (drag radius), rotate handle (drag angle, via `Math.atan2`).
- [x] V: move handle (midpoint, not apex — `getMidpointOffsetY`), resizeX/resizeY handles (independent `spacingX`/`spacingY`), rotate handle (reach via `getRotateHandleReach`). All rotation-aware (un-rotate pointer before solving, rotate handle positions before rendering). Resize-radius handle correctly gated to circle/half-circle only.
- [x] Z-order fixed: handles block now renders after `displayedDancers.map(...)`, so handles always draw on top of dancers. (Also caught and fixed a related bug while testing this: an `&&`/`||` precedence mistake was silently hiding circle's own resize-radius handle entirely — needed explicit parentheses around the type check.)
- [x] Propagated to half-circle (reuses circle's move/resize/rotate directly, since it has its own `radius`) and line (move handle, `resizeX` handle shared with V's, rotate reach via `spacingX! * centerIndex`). All four formation types (circle, V, half-circle, line) now have working live handle controls.
- [ ] Holding Shift while dragging the rotate handle should snap rotation to 45° increments instead of free rotation.

### Dancers
- [ ] Add and remove dancers — currently locked to the 7 hardcoded at startup. Adding needs a fresh id (and probably a default position/label); removing needs to strip that dancer from every frame's `dancers` array, not just the current one, and decide what happens to any `pathToNext` pointing at them.

### Selection and formations
- [ ] Multi-select via click-and-drag (rubber-band box): needs `selectedIds`, a drag rectangle, and a "which dancers fall inside" check on pointer-up.
- [ ] Apply a formation preset only to the selected dancers, merging results back into the full array.
- [ ] Make formations adjustable after being applied (move the whole formation, change radius/openness) via a persistent "formation control" with draggable handles.

### Timeline
- [ ] Timeline UI: a formations bar above a song bar, with draggable frame handles that clamp to neighbors, and a manual time entry under frame "additional settings".
- [ ] Maybe: reorder frames on the timeline (wait for colleague feedback first).

### Paths and curves
- [ ] Catmull-Rom spline editing as a second path mode (the curve passes through every point, no handles), which is more intuitive for beginners. Also consider chained multi-segment paths with smooth joins (collinear handles), so keep the path data a list of segments.

### Dancers entering/leaving (wings)
- [ ] Add wings areas on the sides of the stage where dancers can enter from or exit to.
- [ ] Support a dancer not being present in every frame (revisit `interpolateFrames`, which assumes every id appears in both frames).
- [ ] Entry/exit paths, definable and editable like inter-formation paths.
- [ ] Extend the rename-collision swap: if the entered name matches an offstage dancer, that dancer takes the edited dancer's on-stage position and the edited dancer exits to the wings.

## 6. Possible future project (after everything above is working properly)
- [ ] Tier 2 sharing: real collaboration — cloud accounts, a shareable link/code to load a choreography without a file, possibly live co-editing. This is not an incremental step; it needs a backend server, a database, and authentication — effectively a second application this client talks to.
