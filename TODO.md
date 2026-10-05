# TODO

## Selection & formations
- [ ] Multi-select via click-and-drag (marquee/rubber-band selection box) — needs `selectedIds` state, a drag-rectangle from pointer-down to pointer-move, and a "which dancers fall inside the rectangle" check on pointer-up.
- [ ] Apply a formation preset only to the selected dancers, not all of them — merge generated positions for selected ids back into the full `dancers` array, leaving unselected dancers untouched.
- [ ] Make each formation (circle, V, parabola, etc.) adjustable after being applied — move the whole formation, and increase/decrease its radius/openness — likely via a persistent "formation control" (center point + radius/openness) that regenerates dancer positions live when dragged, similar to bezier control-point dragging.

## Layout
- [x] Move preset/control buttons into a proper side panel next to the SVG stage instead of stacked above it — use a flex row container, shrink the SVG to a fixed/flex width instead of 100%, and put buttons in their own panel `<div>`.

## Dancer editing
- [x] Click (or double-click) a dancer's name/label to edit it in place — needs an "editing which dancer" piece of state, and an inline `<input>` (or `<foreignObject>` since labels live inside the SVG) that replaces the `<text>` while active.
- [x] When the edited name matches an existing dancer's name, auto-detect the collision and swap the two dancers' positions instead of creating a duplicate name.
- [x] Consider an explicit "swap places" button/action in the edit UI as an alternative to relying on name-collision detection alone.
- [ ] Clicking empty space on the stage (not a dancer, not a button) while a dancer is selected should deselect it — also cancel swap mode. Watch for event bubbling: circle pointer events reach the SVG's handler, so use `e.stopPropagation()` in the circle handler or check `e.target === e.currentTarget` on the SVG.
- [ ] Revisit the Edit and Swap buttons for legibility — make it obvious to the user that after pressing Swap they need to pick a second dancer (e.g. a visible swap-mode state on the button, a hint message, and a way to cancel).

## Timing & playback
- [ ] Give each frame a duration and each transition between frames a duration, instead of a single global interpolation `t`.
- [ ] Hide the future-position preview (faded next-frame dancers) and the dashed paths while playing the whole choreography like a video; only show them when paused/editing. Ties into the planned toggle to show/hide them and a paths-only editing mode.
- [ ] Add a song/audio track that drives playback, plus a play/pause button, so the choreography can be tested against the actual music timing.
- [ ] Disable dancer dragging while scrubbing/playing (t > 0 mid-transition) — only allow dragging when paused, since mid-scrub the displayed positions are interpolated, not the real frame data.

## Paths & curves
- [ ] Add Catmull-Rom spline editing as a second path mode alongside cubic bezier — the curve passes through every point the user places (no handles), which is more intuitive for beginners. Also consider chained multi-segment paths (smooth joins need collinear handles), so keep the path data a list of segments.
- [ ] Constant-speed movement along curves: bezier's `t` is a curve parameter, not distance, so dancers speed up on straights and slow in tight bends. Revisit with arc-length parameterization when timing/music sync is built.

## Frame creation
- [ ] Revisit "Add Frame" — consider reframing it as "snap frame" (like taking a picture of the current formation), which may be clearer for users. Decide behavior when adding in the middle of the timeline (insert vs. append) and make sure `pathToNext` is cleared on the copied dancers.

- [ ] Bug: "Add Frame" always appends to the end of the frames list. When the current frame isn't the last one (e.g. on frame 2 of 3), the new frame should be inserted directly after the current frame instead. Fix `addFrame` to insert at `currentFrameIndex + 1`, and when inserting in the middle, clear `pathToNext` on the current frame's dancers, since their old paths pointed at the frame that is no longer next.

## Code cleanup
- [ ] Review `updateCurrentFrameDancers` and `updateDancer` (and how they compose, e.g. `updateCurrentFrameDancers(updateDancer(currentFrame.dancers, id, { ... }))`) until using them feels instinctive — practice by re-deriving each call site (drag, rename, handle drag, swap) from scratch.
- [ ] Clean up `App.tsx` for legibility — split the large file into modules (types, formation functions, helpers, components), remove leftover comments/dead code, and extract more helper functions wherever logic repeats (e.g. the repeated frame-navigation index math, the handlers inline in JSX).

## UI polish
- [ ] Revisit button icons (Font Awesome) — currently using whatever solid/regular icons were quick to wire up; pick a deliberate, consistent icon set once the button list settles.
- [ ] Replace native `title` tooltips on buttons with a custom-styled tooltip (CSS-only: hidden `<span>` shown on `:hover`, styled freely) — native `title` can't be styled since it's rendered by the browser outside the page's DOM.

## Dancers entering/leaving (wings)
- [ ] Add "wings" areas on the sides of the stage/frame representing offstage space, where dancers can enter from or exit to instead of always being present on stage.
- [ ] Once wings exist, dancer paths need to support a dancer not being present in every frame — revisit the interpolation logic's current assumption that every dancer id appears in both frames of a transition.
- [ ] Entry/exit paths (from wings onto stage, or stage into wings) should be definable/editable the same way inter-formation paths are.
- [ ] Extend the rename-collision swap once wings exist: if the entered name matches a dancer currently offstage, the offstage dancer takes the edited dancer's on-stage position and the edited dancer exits to the wings (instead of a plain position swap between two on-stage dancers).
