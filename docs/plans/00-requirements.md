# T04 requirements: `Window` chrome (drag, minimize/genie, close, wobble, reduced motion)

## Goal

Replace the T03 placeholder boxes with a shared, accessible `Window` chrome (titlebar with icon, title, labelled minimize and close buttons, and a content slot) that the user can focus, drag with pointer events, minimize with a genie-style animation and close. Wobble tilt while dragging, the fly-out on open and the genie are all disabled under `prefers-reduced-motion`, and minimized windows are inert; window contents stay placeholders until T07.

## Current state (observed, so the planner does not redo finished work)

- **Pure logic is done and tested (T02, T03):**
  - `src/logic/drag.ts`: `clampPosition(pos, width, vw, vh)` (x in `[80 - width, vw - 80]`, y in `[36, vh - 60]`), `dragPosition(origin, {dx, dy}, width, vw, vh)`, `tiltFor(movementX, enabled)` (clamped to +/-7 deg, factor 0.7, returns 0 when disabled or non-finite).
  - `src/logic/zorder.ts`: `raise`, `topMost(order, wins)`, `zIndexFor` (`site` pinned at 800).
  - `src/logic/windows.ts`: `WIN_IDS`, `WIN_META` (width, nominal height, `dock` flag; `site` has `dock: false`), `DOCK_IDS`.
  - `src/logic/desktop.ts`: `desktopReducer` already supports `focus`, `minimize`, `restore`, `close`, `open`, `move` (clamps defensively), `dockClick`, `minimizeAll`, `showAll`, `tidy`, `restart`, `resize`. `open` sets `min: false` immediately; the fly-out animation is this ticket's job.
- `src/types.ts`: `State` is `{ wins, order, vw, vh }`. No `wobble`, `drag` or `tilt` in it (T03 assumption 1: drag and tilt stay local to the window).
- `src/data.ts`: `WIN_TITLES` exists. There are no window icons and no button labels in it yet.
- `src/Desktop.tsx`: renders one `<section aria-label={title} data-win data-min hidden={min}>` per open window, absolutely positioned at `x, y`, width from `WIN_META`, `minHeight` from `WIN_META`, `zIndex` from `zIndexFor`, surface background, radius-lg. No border, shadow, buttons or transform.
- `src/Window.tsx` returns `null`; `src/hooks/useDrag.ts` is an empty stub with a TODO.
- `src/theme.css`: easing tokens `--ease-spring`, `--ease-bouncy`, `--ease-minimize`; `--shadow-md`/`--shadow-lg` for both themes; `.btn` and `.btn-icon` (36px, so the 24px size needs an override); a global `:focus-visible` outline; a reduced-motion rule that only shortens durations (design-decisions D says that is not enough).
- Tests that this ticket touches:
  - `tests/Desktop.wiring.test.tsx` "AC22: placeholders hold only their title, no buttons" asserts zero buttons and `textContent === title`. That T03 criterion is superseded by this ticket's chrome (see Assumption 14).
  - `tests/e2e/desktop.spec.ts` locates windows by `[data-win="id"]`, reads `boundingBox()` at rest, and finds windows by `getByRole('region', { name })`. These must keep passing.
  - T03 AC21 (a minimized window is mounted, not visible, not focusable, not exposed to assistive tech) has no component or e2e test yet. It is picked up here (AC17-AC19).

## Acceptance criteria

### Chrome and layout

- **AC1.** Each open window renders through a shared `Window` component as an element with role `region` whose accessible name is its title from `WIN_TITLES`, and it keeps the `data-win="<id>"` and `data-min="true|false"` attributes.
- **AC2.** The window root is absolutely positioned at its `x, y`, has the width from `WIN_META`, `--radius-lg` corners, `--color-surface` background, `overflow: hidden`, `transform-origin: top center`, and the z-index from `zIndexFor`.
- **AC3.** The top-most visible window (`topMost(order, wins)`) has `box-shadow: var(--shadow-lg)`; every other open window has `var(--shadow-md)`. Focusing another window moves the large shadow to it.
- **AC4.** The titlebar has padding `8px 8px 8px 16px`, 12px text in `--color-neutral-400`, background `--color-bg`, `cursor: grab`, and shows, left to right: the window's accent-colored Phosphor icon (hello: HandWaving, about: User, exp: Briefcase, proj: Folder, term: TerminalWindow, site: Info), the title, then right-aligned buttons. The icon is hidden from assistive technology.
- **AC5.** The five dock windows show a minimize button (Phosphor Minus) and a close button (Phosphor X). The `site` window shows only a close button.
- **AC6.** Each button is a native `<button type="button">` using `.btn .btn-icon`, renders at 24x24 CSS pixels, has icon color `--color-neutral-400`, and has an accessible name that includes the action and the window title (for example "Minimize hello.txt", "Close hello.txt"). The label strings come from `src/data.ts`.
- **AC7.** Below the titlebar, the window renders a content slot. In this ticket `Desktop` passes placeholder content, and the window keeps at least its `WIN_META` nominal height so it is a visible box.
- **AC8.** At 1280x720 and 1920x1080, with no interaction, the windows' bounding boxes are at the same positions and widths as in T03 (the existing `tests/e2e/desktop.spec.ts` passes unchanged), and the at-rest transform is the identity (no rotation or scale).

### Focus and z-order

- **AC9.** A `pointerdown` anywhere on an open, non-minimized window (titlebar, body or buttons) brings it to the front: its z-index becomes the highest among non-`site` windows and it gets the large shadow.
- **AC10.** Moving keyboard focus into a window (Tab onto one of its buttons) also brings it to the front.

### Drag

- **AC11.** Pressing the primary pointer button (mouse button 0, or any touch/pen contact) on the titlebar, outside its buttons, and moving the pointer moves the window by the same delta, clamped with `dragPosition`/`clampPosition` (at least 80px stays on screen horizontally, `y` within `[36, vh - 60]`). Pressing on a titlebar button never starts a drag. Pressing on the window body never starts a drag.
- **AC12.** Drag uses pointer events (no `mousedown`/`mousemove`/`mouseup` listeners), captures the pointer so the drag continues when the pointer leaves the titlebar or the window, and the titlebar has `touch-action: none`.
- **AC13.** Releasing the pointer (`pointerup`), `pointercancel` or losing pointer capture ends the drag. After the drag ends the window stays where it was dropped, and that final position is in `Desktop` state: closing the window and opening it again (via a reducer `open` dispatch) shows it at the dropped position.
- **AC14.** During one drag, the `Desktop` reducer receives at most one `move` action (on release). A press and release with no movement dispatches no `move` that changes state. Other windows do not change position or z-order during a drag.
- **AC15.** Dragging does not select text on the page.

### Wobble

- **AC16.** While dragging with wobble enabled and reduced motion off, the window's transform is `rotate(<tiltFor(movementX, true)>deg) scale(1.015)`: rotation is within +/-7 degrees and its sign follows the horizontal pointer direction (moving right tilts positive). On release the transform returns to the identity with the transition `transform .45s var(--ease-spring)`. With wobble disabled (prop false), dragging applies no rotation.

### Minimize, genie, restore and open fly-out

- **AC17.** Clicking the minimize button, or double-clicking the titlebar outside its buttons, dispatches `minimize` for that window. The window stays mounted with `data-min="true"`. Double-clicking the `site` titlebar does nothing.
- **AC18.** With reduced motion off, a minimizing window animates to `translate(vw/2 - (x + width/2), vh - 40 - y) scale(0.06)` with opacity 0, using `transform .45s var(--ease-minimize), opacity .4s ease-in`. Restoring (reducer `restore` or `open`) animates back to the identity transform and opacity 1 using the spring curve (`transform .45s var(--ease-spring), opacity .25s ease-out`).
- **AC19.** A minimized window has `pointer-events: none` and the `inert` attribute from the moment it is minimized: it cannot be clicked, Tab never reaches its buttons, and it is absent from the accessibility tree (`getByRole('region', { name })` does not find it). After restore, `inert` is removed and its buttons are reachable by Tab again.
- **AC20.** When a window becomes open after `Desktop` first mounted (closed to open), it first renders in the minimized pose and moves to the normal pose on a later animation frame, so it flies out of the dock. Windows open at first load appear in place with no fly-out. No `setTimeout` is used for this, and it works under `StrictMode`.

### Close

- **AC21.** Clicking the close button dispatches `close`: the window unmounts (its `[data-win]` element is gone) and its content's internal state is discarded. Its last position is kept in `Desktop` state.

### Reduced motion

- **AC22.** With `prefers-reduced-motion: reduce` (checked at the time of the interaction): dragging applies no rotation and no scale; minimizing and restoring use opacity only with no translate or scale (the genie is off); a newly opened window appears in place with no fly-out. Inertness and position behaviour are unchanged.

### Keyboard and accessibility

- **AC23.** Every minimize and close button of a non-minimized window is reachable with Tab in DOM order and activates with Enter and Space. The focused button shows the `:focus-visible` outline, and the outline is not clipped by the window's `overflow: hidden`.
- **AC24.** Titlebar text (`--color-neutral-400` on `--color-bg`) meets WCAG AA (at least 4.5:1) in both dark and light themes, and the button icon color against `--color-bg` meets at least 3:1 in both themes, verified by a test that uses the existing contrast helpers. No new color tokens are introduced; if one is needed, it meets the same thresholds.
- **AC25.** No mouse-only behaviour: all chrome actions (minimize, close) are available as buttons; double-click and drag are pointer conveniences only.

### Quality

- **AC26.** Logic that can be pure (for example the genie transform from `x, y, width, vw, vh`, and the window transform for a given drag/min/reduced-motion state) lives in `src/logic/` and has unit tests. `useDrag` lives in `src/hooks/useDrag.ts`.
- **AC27.** Under `StrictMode`, mounting and unmounting `Desktop` and running a drag leaves no stray `window` or `document` listeners, pending animation frames or console errors or warnings.
- **AC28.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass. No existing test is deleted or weakened; the T03 "no buttons" test is updated to the new chrome as described in Assumption 14.

## Out of scope

- Window contents (Hello, About, Experience, Projects, Terminal, About this site bodies): T07. Real window heights and re-tuning `WIN_META.height`: T07.
- The Wobbly windows toggle, adding `wobble` to `State`, and reading or writing `tanzi-os:wobble` in localStorage: T05 (menus). Restart keeping wobble: T08.
- Menubar, menus and closing menus on window pointerdown: T05.
- Dock, dock buttons and aiming the genie at the real dock button: T06. The genie keeps the prototype target (viewport center x, `vh - 40`).
- Any UI to restore or open a window: none exists until T05/T06. Restore and open are exercised in tests by dispatching reducer actions or by rendering `Window` with changed props.
- Moving or resizing windows with the keyboard, focus return after minimize or close, Escape handling, and window resizing by the user: T09 (accessibility pass) or later.
- Boot screen and Restart: T08.
- Mobile and touch-specific layout below 760px: later epic (decision 1). Pointer events still work with touch on desktop sizes.
- Re-clamping on resize: already done in T03.
- Changes to `design_handoff_tanzi_os/`.

## Assumptions

1. **Window semantics.** Windows stay `role="region"` (a `<section>` with an accessible name), not `role="dialog"`, as decided in T03 (assumption 12) and design-decisions D (windows are non-modal). This also keeps the T03 e2e tests valid.
2. **Wobble ownership.** `Window` takes a `wobble: boolean` input. In T04, `Desktop` passes `true` (the spec default "on by default"). T05 adds `wobble` to `State`, the toggle and the `tanzi-os:wobble` persistence, and passes the real value. T04 does not touch localStorage.
3. **Wobble off keeps the lift scale.** With wobble disabled but reduced motion off, dragging still applies `scale(1.015)` and no rotation, matching the prototype. Under reduced motion there is neither.
4. **Genie target** follows the prototype, not the spec's "dock center": x is the viewport center (`vw / 2`), y is `vh - 40` (design-decisions B, simplest option; T06 may refine).
5. **`site` has close only.** It is not in the dock and the Windows menu does not list it, so a minimized `site` window would be unrecoverable. Following the prototype it has no minimize button and no double-click minimize.
6. **Inert immediately.** `inert` and `pointer-events: none` are applied as soon as `min` becomes true, not after the animation ends. The genie still plays because the element stays mounted with opacity transitioning to 0. `inert` replaces T03's `hidden`, which would cut the animation. `aria-hidden` is optional because `inert` already removes the subtree from the accessibility tree.
7. **Fly-out scope.** Only a closed-to-open transition after `Desktop`'s first mount flies out. This includes windows reopened by `tidy`. Windows open at first load do not animate (the prototype starts with them open and not minimized). The next-frame step uses `requestAnimationFrame` (double rAF is fine), per design-decisions C.
8. **Drag commits on release.** The window follows the pointer locally (ref or local state plus a transform or position style) and `Desktop` gets a single `move` on release, per design-decisions C ("keep the reducer for discrete events only"). The clamp during the drag uses the viewport size at drag time.
9. **Focus on keyboard focus.** Bringing a window to the front on `focusin` is added to the spec's "mousedown brings to front", so a keyboard-focused window is not hidden behind others (WCAG 2.4.11). This has no effect on dock click logic, because dock buttons are outside windows.
10. **Reduced motion detection** uses `matchMedia('(prefers-reduced-motion: reduce)')`. Reading it at interaction or render time is enough; live updates without a re-render are not required. Transitions also stay short under the existing global theme.css rule, so "keep fades" from the spec effectively means an instant opacity change. That is acceptable.
11. **Button labels and window icons are content**, so they live in `src/data.ts` (CLAUDE.md: no copy outside `data.ts`). The icons are stored as component references (design-decisions C).
12. **Primary button only.** Right-click or middle-click on the titlebar does not start a drag. Touch and pen contacts do.
13. **Cursor.** The titlebar uses `cursor: grab` per the spec. Showing `grabbing` while dragging is allowed but not required.
14. **T03 AC22 test.** The T03 criterion "placeholders hold only their title, no buttons" is replaced by this ticket's AC5-AC7. Updating that test to assert the new chrome (title text present, the expected labelled buttons per window, `data-min="false"`, visible) is a requirement change, not a weakening. Every other T03 test stays as is.
15. **Placeholder body.** The content slot holds an empty or minimal placeholder that adds no new copy (the title already appears in the titlebar). It is not focusable, so Tab order is only the chrome buttons.
16. **Button size.** 24x24 meets the WCAG 2.2 AA target size minimum (2.5.8). It overrides `.btn-icon`'s 36px just for the chrome.

## Open questions

No blocking questions.
