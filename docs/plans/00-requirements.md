# T03 requirements: `Desktop` reducer and wiring

## Goal

Add a pure, unit-tested reducer that owns only each window's position, open and minimized flags plus the z-order (and the viewport size it needs for layout and clamping), and wire it into `Desktop` through `useReducer` with a resize listener that re-clamps windows. `Desktop` renders a minimal, accessible placeholder per open window, so the wiring can be checked end to end before the real chrome, dock and menubar arrive in T04-T08.

## Current state (observed, so the planner does not redo finished work)

- **T02 logic is done and frozen** (`docs/plans/T02-plan.md` section 3, verified in `docs/qa/T02-qa.md`):
  - `src/logic/windows.ts`: `WIN_IDS`, `WIN_META` (width, nominal height, dock flag), `DOCK_IDS`.
  - `src/logic/layout.ts`: `MENUBAR_H`, `DOCK_CLEARANCE`, `layout(vw, vh)`, `INITIAL_ORDER`, `initialWindows(vw, vh)` (five dock windows open, `site` closed).
  - `src/logic/zorder.ts`: `raise` (returns `readonly WinId[]`, same reference if already last), `topMost`, `zIndexFor` (`site` pinned at `SITE_Z = 800`, others `index + 10`).
  - `src/logic/dock.ts`: `dockClickAction` returns `open | restore | focus | minimize`.
  - `src/logic/drag.ts`: `clampPosition(pos, width, vw, vh)` (x in `[80 - width, vw - 80]`, y in `[36, vh - 60]`), `dragPosition`, `tiltFor`.
  - `src/logic/terminal.ts` and `src/logic/history.ts` exist but are not used by this ticket.
  - Layout already fits between the menubar and the dock at 1280x720 and above (decision 7), using estimated window heights (T07 may tune them).
- `src/types.ts`: `WinId`, `Win { x, y, open, min }`, `MenuId`, `Theme`, `Wall`, `Tone`, `Line` are fine. `State` still holds `menu`, `theme`, `wall`, `wobble`, `drag`, `tilt`, `verb`, `tab`, `cmd`, `lines`, `booting`, `bootPct`, and types `order` as a mutable `WinId[]`. Nothing in `src/` imports `State` today.
- `src/Desktop.tsx` is a stub: one fixed, full-viewport `div` with the nebula wallpaper and a TODO. `Window.tsx`, `Dock.tsx`, `MenuBar.tsx`, `BootScreen.tsx`, `hooks/useDrag.ts` and `windows/*` are stubs (null or empty).
- `src/main.tsx` renders `<Desktop />` inside `StrictMode`.
- `src/data.ts` has no window titles (`hello.txt`, `about.md`, ...). They exist only as terminal `open` aliases in `terminal.ts`.
- Tests: `tests/Desktop.test.tsx` (smoke: renders without crashing), `tests/logic/*.test.ts` (T02), and `tests/logic/purity.test.ts`, which globs `src/logic/*.ts` and asserts the file list is exactly the seven T02 modules. `tests/e2e/smoke.spec.ts` checks the title, `data-theme` and no console errors.
- Prototype reference behaviour: `open()`, `dockClick()`, `allWins()`, `tidy()`, `restart()`, `close`, `focus`, the drag clamp and the resize handler in `design_handoff_tanzi_os/Tanzi OS.dc.html` lines 246-360. The prototype never re-clamps on resize (decision 6 changes that).

## Acceptance criteria

### State shape (decision 5)

- **AC1.** The desktop state type contains exactly: `wins: Record<WinId, Win>` (each `Win` is only `x`, `y`, `open`, `min`), `order: readonly WinId[]` (back to front), and the current viewport width and height. It has no `verb`, `tab`, `cmd`, `lines`, `drag`, `tilt`, `menu`, `theme`, `wall`, `wobble`, `booting` or `bootPct` field. `npm run typecheck` fails if code tries to read any of those from it.
- **AC2.** The initial state for a viewport `vw x vh` equals `initialWindows(vw, vh)` (positions from `layout`, the five dock windows open and not minimized, `site` closed and not minimized, `order` equal to `INITIAL_ORDER`) plus that viewport.

### Reducer behaviour (pure, unit tested)

- **AC3.** The reducer is a pure function in its own module. It imports no React, Phosphor, DOM, storage, timer, random or `Date` API, never mutates its input (tests deep-freeze the input state), and is covered by the existing purity guard in `tests/logic/purity.test.ts`.
- **AC4.** **open `id`.** A closed window becomes `open: true, min: false` and is raised to the end of `order`. A minimized open window becomes `min: false` and is raised. A visible window is only raised. Its position is never changed by `open`. Opening `site` appends it to `order`, and `zIndexFor('site', order)` stays 800.
- **AC5.** **close `id`.** The window becomes `open: false, min: false` and keeps its `x`, `y`. `order` is unchanged. Closing an already closed window returns the same state reference.
- **AC6.** **minimize `id`.** An open, visible window becomes `min: true`. Position and `order` are unchanged. Minimizing a closed or already minimized window returns the same state reference.
- **AC7.** **restore `id`.** An open, minimized window becomes `min: false` and is raised. On a closed or already visible window it returns the same state reference.
- **AC8.** **focus `id`.** An open, visible window is raised (the others keep their relative order). If it is already last in `order`, or the window is closed or minimized, the same state reference is returned.
- **AC9.** **dockClick `id`.** The result equals applying the action named by `dockClickAction(id, wins, order)`: `open` -> AC4, `restore` -> AC7, `focus` -> AC8, `minimize` -> AC6. A table test covers all four branches, including "clicking the top-most visible window minimizes it" and "clicking it again restores and raises it".
- **AC10.** **move `id` to `{ x, y }`.** Stores `clampPosition({ x, y }, WIN_META[id].width, vw, vh)` for the stored viewport. `open`, `min` and `order` are unchanged. A move to the current position, or with a non-finite `x` or `y`, returns the same state reference.
- **AC11.** **minimizeAll / showAll.** Every open window gets `min: true` (minimizeAll) or `min: false` (showAll). Closed windows and `order` are unchanged. If nothing changes, the same state reference is returned.
- **AC12.** **tidy.** For the stored viewport, every window gets its `layout` position, the five dock windows are open and not minimized, `site` is closed, and `order` equals `INITIAL_ORDER` (matches the prototype `tidy()`).
- **AC13.** **restart.** Produces the same window state as AC2 for the stored viewport (layout positions, five dock windows open, `site` closed, `INITIAL_ORDER`). The viewport is kept. Theme, wallpaper and wobble are not in this state, so they are untouched by construction (decision 3).
- **AC14.** **resize to `vw x vh`** (decision 6). Stores the new viewport and replaces every window's position (open, minimized and closed) with `clampPosition(pos, WIN_META[id].width, vw, vh)`. `open`, `min` and `order` are unchanged. Positions already inside the bounds do not move, so growing the viewport never moves a window. Resizing to the stored size, or with non-finite or negative values, returns the same state reference.
- **AC15.** Concrete resize check: starting from the initial state at 1920x1080 (term at 1450,694), resize to 1280x720 puts term at 1200,660, and resizing back to 1920x1080 leaves it at 1200,660. A window already within bounds at 1280x720 (for example hello at 115,72) is unchanged.
- **AC16.** After any sequence of actions, `order` contains no duplicates, and every id in it is a valid `WinId`. `topMost` of the resulting state is never a closed or minimized window.

### Wiring into `Desktop`

- **AC17.** `Desktop` creates its state with `useReducer`, initialised lazily from `window.innerWidth` and `window.innerHeight`. No other component or module holds window position, open or minimized state.
- **AC18.** `Desktop` listens for the window `resize` event and dispatches the resize action with the new inner size. The listener is removed on unmount, so under `StrictMode` (and in a component test that unmounts) exactly one listener is active and no error or warning is logged.
- **AC19.** `Desktop` keeps the current root behaviour: a fixed, full-viewport element with `overflow: hidden`, `user-select: none` and the nebula wallpaper (wallpaper switching is T05). The existing smoke test passes unchanged.
- **AC20.** For each open window, `Desktop` renders one placeholder element, positioned absolutely at the window's `x`, `y`, with the window's width from `WIN_META` and `z-index` from `zIndexFor(id, order)`. Each placeholder is a labelled region whose accessible name is the window title (`hello.txt`, `about.md`, `experience.log`, `projects`, `terminal`, `About this site`), with the titles read from `src/data.ts`. Closed windows render nothing (they unmount, decision 5).
- **AC21.** A minimized window's placeholder stays mounted but is not visible, not focusable and not exposed to assistive technology.
- **AC22.** The placeholder carries no copy beyond its title, no buttons and no drag handling. Its markup exposes the window id and minimized state in a stable way (for example `data-win` and `data-min` attributes) so tests can find it.
- **AC23.** Component test (Testing Library, jsdom): at the default jsdom viewport, the five dock windows' placeholders are present with the `layout` positions and `site` is absent. After setting a smaller `innerWidth`/`innerHeight` and firing `resize`, the positions match AC14.
- **AC24.** E2E (Playwright, Chromium): at 1280x720 the five placeholders render at the T02 reference positions (hello 77,72; about 640,64; exp 64,344; proj 538,300; term 810,334), `site` is absent, and there are no console errors. Starting at 1920x1080 and resizing the page to 1280x720 moves term to 1200,660 and leaves the others inside the clamp bounds.

### Quality gates

- **AC25.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check` all pass. No existing test is deleted or weakened. The only allowed change to an existing test is extending the purity test's expected module list if the reducer lives in `src/logic/` (this adds coverage, it does not remove any).

## Out of scope

- `Window` chrome: titlebar, minimize and close buttons, drag with pointer events, double-click minimize, wobble and tilt, genie animation and the fly-out from the dock on open, shadows for the top-most window (T04). `useDrag` stays a stub.
- Menubar, menus, menu open state, Esc handling, clock, theme toggle, theme/wallpaper/wobble state and localStorage (T05).
- Dock UI and indicator dots (T06). The reducer exposes `dockClick`, but nothing renders a dock yet.
- Window contents (Hello, About, Experience, Projects, Terminal, About this site), the terminal UI and applying `TerminalEffect`s (T07).
- Boot screen, boot progress and remounting windows on restart to reset their internal state (T08). This ticket only provides the `restart` reducer action.
- Full accessibility pass, focus management on open and close (T09).
- Content changes other than adding window titles to `src/data.ts` (T10).
- Mobile and any special layout or "unsupported size" message below 1280x720 (decision 1). Below that size, positions are only clamped.
- Persisting window layout (decision 4: not persisted).
- Changes to the T02 logic signatures, window widths or nominal heights.
- Any edit to `design_handoff_tanzi_os/`.

## Assumptions

Unattended run, so each open point was resolved with the simplest option that fits the decisions log, the spec and CLAUDE.md.

1. **State scope.** The reducer state holds only `wins`, `order` and the viewport. `menu`, `theme`, `wall`, `wobble`, `booting` and `bootPct` are removed from `State` in `src/types.ts` now and are added back by the tickets that own them (T05, T08). `drag` and `tilt` move out for good (T04 keeps them local, per section C of the design decisions). `verb`, `tab`, `cmd`, `lines` are removed (decision 5). `MenuId`, `Theme`, `Wall`, `Tone`, `Line` stay as types.
2. **`order` is `readonly WinId[]`,** as agreed in the T02 plan, so `raise`'s same-reference return can be stored directly.
3. **Viewport lives in reducer state.** `tidy`, `restart` and `move` need it, and storing it means menus and the terminal can dispatch those actions without knowing the size. The reducer never reads `window`; the size arrives through the initializer and the resize action.
4. **Re-clamp rule on resize** is the drag clamp `clampPosition` (at least 80px visible horizontally, y in `[36, vh - 60]`), applied to every window including closed and minimized ones, so a reopened window is also on screen. It does not re-run `layout` and does not try to keep windows clear of the dock. "Tidy up" still restores the full layout.
5. **No resize throttling is required.** Every `resize` event may dispatch, and the reducer returns the same reference when nothing changes. The planner may coalesce with `requestAnimationFrame` if it wants.
6. **`open` sets `min: false` immediately.** The prototype's "mount minimized, then un-minimize next frame" fly-out is a visual effect owned by the `Window` component in T04, not reducer state.
7. **`focus` on a closed or minimized window is a no-op** (the prototype raised unconditionally, but those windows cannot receive pointer events anyway).
8. **`tidy` closes `site`,** matching the prototype (`open: id !== 'site'`). `tidy` and `restart` produce the same window state. They stay separate actions because T08 will hang the boot screen and internal-state reset off `restart`.
9. **`minimizeAll`, `showAll` and `dockClick` are included** even though their UI comes later (T05, T06). They only touch open and minimized flags, so they belong in this reducer and are cheap to test now.
10. **`move` clamps defensively** with the stored viewport, even though T04's drag already clamps, so no caller can push a window off-screen.
11. **Window titles go in `src/data.ts`** (CLAUDE.md: no hard-coded copy elsewhere): `hello.txt`, `about.md`, `experience.log`, `projects`, `terminal`, `About this site`, taken from the spec's menu and section headings. T04-T06 reuse them.
12. **Placeholder semantics.** Each placeholder is a labelled region (`role="region"` or `<section>` with `aria-label`), not `role="dialog"`, following design-decisions section D (non-modal windows). T04 replaces the placeholder with the real `Window` component.
13. **Minimized placeholders** are hidden from focus and assistive technology (for example `inert` plus `aria-hidden`, or `hidden`). T04 will refine this around the genie animation.
14. **Reducer location.** It may live in `src/logic/` (preferred, so the purity guard covers it). In that case the purity test's expected list gains the new module name, which strengthens the test. If the planner puts it elsewhere, it must add an equivalent purity check.
15. **Non-finite or negative resize sizes and non-finite move coordinates are ignored** (same state returned), so a bad event can never produce NaN positions.
16. **Minimum size (decision 7)** needs no new work beyond T02's layout. This ticket verifies it end to end at 1280x720 (AC24).

## Open questions

None blocking. Items a human may want to confirm later (all resolved above for now):

1. Whether the resize re-clamp should also keep windows above the dock (currently no; only the drag clamp, Assumption 4).
2. Whether `tidy` should close an open "About this site" window (currently yes, matching the prototype, Assumption 8).
