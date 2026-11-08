# T03 plan: `Desktop` reducer and wiring

Source: `docs/plans/00-requirements.md` (Current state, Assumptions 1-16, AC1-AC25), `docs/design-decisions.md` (decisions 3-7, sections C and D), `docs/plans/T02-plan.md` section 3 (the frozen logic contract), and the prototype `open/dockClick/allWins/tidy/restart/close/focus` behaviour in `design_handoff_tanzi_os/Tanzi OS.dc.html` lines 246-360.

## 1. Goal and scope

**Goal.** Add a pure, unit-tested reducer in `src/logic/desktop.ts` that owns only each window's position, open and minimized flags, the z-order and the viewport size, and wire it into `Desktop` through `useReducer` with a `resize` listener that re-clamps windows. `Desktop` renders one minimal, accessible placeholder per open window so the wiring can be verified end to end before the real chrome, menubar, dock and boot screen arrive in T04-T08.

**Already done, not redone:** all T02 logic (`windows`, `layout`, `zorder`, `dock`, `drag`, `terminal`, `history`) and its tests; `Win`, `WinId`, `Tone`, `Line` types; the root wallpaper `div`; the smoke tests.

**Out of scope** (carried over): `Window` chrome, drag, double-click minimize, wobble/tilt, genie and fly-out, top-most shadow (T04; `useDrag` stays a stub); menubar, menus, Esc, clock, theme/wallpaper/wobble state and localStorage (T05); dock UI (T06); window contents and the terminal UI (T07); boot screen and remount-on-restart (T08); full a11y pass and focus management (T09); content changes other than window titles (T10); mobile or an "unsupported size" message below 1280x720 (decision 1); persisting layout (decision 4); changes to T02 signatures, widths or heights; any edit to `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

AC1-AC25 are copied from `00-requirements.md` with the same numbers and meaning (full text there). Short form:

- **AC1.** State type has exactly `wins: Record<WinId, Win>` (`x, y, open, min` only), `order: readonly WinId[]`, and the viewport width and height. None of `verb, tab, cmd, lines, drag, tilt, menu, theme, wall, wobble, booting, bootPct`; typecheck fails on reading them.
- **AC2.** Initial state for `vw x vh` = `initialWindows(vw, vh)` plus that viewport.
- **AC3.** Reducer is pure, in its own module, never mutates input (deep-frozen in tests), covered by `tests/logic/purity.test.ts`.
- **AC4.** `open`: closed -> `open: true, min: false` + raise; minimized -> `min: false` + raise; visible -> raise only. Position never changes. `site` is appended and stays at z 800.
- **AC5.** `close`: `open: false, min: false`, position kept, `order` unchanged. Already closed -> same reference.
- **AC6.** `minimize`: open visible -> `min: true`, position and `order` unchanged. Closed or minimized -> same reference.
- **AC7.** `restore`: open minimized -> `min: false` + raise. Closed or visible -> same reference.
- **AC8.** `focus`: open visible -> raised. Already last, closed or minimized -> same reference.
- **AC9.** `dockClick` equals the action named by `dockClickAction`. Table test covers all four branches, including minimize-on-top-most and restore-and-raise on the second click.
- **AC10.** `move` stores `clampPosition({x, y}, WIN_META[id].width, vw, vh)`. Flags and `order` unchanged. Same position or non-finite coordinate -> same reference.
- **AC11.** `minimizeAll` / `showAll` set `min` on every open window. Closed windows and `order` unchanged. No change -> same reference.
- **AC12.** `tidy`: layout positions, five dock windows open and visible, `site` closed, `order = INITIAL_ORDER`.
- **AC13.** `restart`: same window state as AC2 for the stored viewport, viewport kept.
- **AC14.** `resize`: stores the viewport, re-clamps every window (open, minimized, closed) with `clampPosition`. Flags and `order` unchanged. In-bounds positions do not move. Same size, non-finite or negative -> same reference.
- **AC15.** From 1920x1080 (term 1450,694), resize to 1280x720 -> term 1200,660; back to 1920x1080 -> still 1200,660. hello at 115,72 unchanged.
- **AC16.** After any action sequence, `order` has no duplicates and only valid ids; `topMost` is never closed or minimized.
- **AC17.** `Desktop` uses `useReducer` with a lazy initializer from `window.innerWidth/innerHeight`. Nothing else holds position/open/min.
- **AC18.** `resize` listener dispatches the new size and is removed on unmount; exactly one listener active under `StrictMode`; no errors or warnings.
- **AC19.** Root keeps fixed full-viewport, `overflow: hidden`, `user-select: none`, nebula wallpaper. Existing smoke test unchanged and green.
- **AC20.** One absolutely positioned placeholder per open window at `x, y`, width from `WIN_META`, `z-index` from `zIndexFor`. Labelled region named by the window title from `src/data.ts`. Closed windows render nothing.
- **AC21.** Minimized placeholder stays mounted but is not visible, not focusable, not exposed to AT.
- **AC22.** Placeholder has only its title, no buttons, no drag; exposes `data-win` and `data-min`.
- **AC23.** Component test: at the jsdom default viewport the five dock placeholders have layout positions and `site` is absent; after a smaller `innerWidth/innerHeight` + `resize`, positions match AC14.
- **AC24.** E2E at 1280x720: hello 77,72; about 640,64; exp 64,344; proj 538,300; term 810,334; no `site`; no console errors. 1920x1080 -> 1280x720 moves term to 1200,660 and keeps the others in clamp bounds.
- **AC25.** lint, typecheck, test, test:e2e, build, format:check all pass. No existing test deleted or weakened; the only edit to an existing test is adding `'desktop'` to the purity test's `EXPECTED` list.

**Added AC (gap found):**

- **AC26 (added).** Actions with an id that is not a valid `WinId` at runtime (for example from a future terminal effect or a bad cast) return the same state reference and never add the id to `order` or `wins`. This is what makes AC16 hold for untyped callers.

## 3. Architecture

**Approach.** One new pure module, `src/logic/desktop.ts`, composed from the frozen T02 functions (`initialWindows`, `layout`, `raise`, `topMost`, `dockClickAction`, `clampPosition`, `WIN_IDS`, `WIN_META`). `Desktop.tsx` owns the only `useReducer` and a resize effect, and renders placeholders. No T02 signature changes.

**Files and public surface (contract for coder and test-writer):**

| File                         | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types.ts` (edit)        | `State` becomes exactly `{ wins: Record<WinId, Win>; order: readonly WinId[]; vw: number; vh: number }`. All other fields removed (Assumption 1). `WinId`, `Win`, `MenuId`, `Theme`, `Wall`, `Tone`, `Line` unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/data.ts` (edit)         | Add `import type { WinId } from './types'` and `export const WIN_TITLES: Readonly<Record<WinId, string>> = { hello: 'hello.txt', about: 'about.md', exp: 'experience.log', proj: 'projects', term: 'terminal', site: 'About this site' }`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/logic/desktop.ts` (new) | `type DesktopAction = { type: 'open' \| 'close' \| 'minimize' \| 'restore' \| 'focus' \| 'dockClick'; id: WinId } \| { type: 'move'; id: WinId; x: number; y: number } \| { type: 'minimizeAll' \| 'showAll' \| 'tidy' \| 'restart' } \| { type: 'resize'; vw: number; vh: number }`. `initialDesktop(vw: number, vh: number): State`. `desktopReducer(state: State, action: DesktopAction): State`. Imports only `../types` (type), `./windows`, `./layout`, `./zorder`, `./dock`, `./drag`.                                                                                                                                                              |
| `src/Desktop.tsx` (edit)     | `useReducer(desktopReducer, undefined, () => initialDesktop(window.innerWidth, window.innerHeight))`. One `useEffect` adds a `resize` listener that dispatches `{ type: 'resize', vw: innerWidth, vh: innerHeight }`, dispatches once on mount (catches a size change between init and effect; returns same reference if unchanged) and removes the listener in cleanup. Renders the root `div` (inline styles: `position: fixed; inset: 0; overflow: hidden; user-select: none; background: var(--wall-nebula)`) and, for each `WIN_IDS` entry with `open`, a placeholder. `dispatch` is not exported or passed anywhere yet (T04-T06 will pass it down). |

**Reducer rules (precise, for tests):**

- **Guard (AC26).** For id-carrying actions, `if (!WIN_IDS.includes(id)) return state`.
- **open.** If visible and already last, return `state`. Otherwise new `wins[id] = { ...w, open: true, min: false }` (only if it changed) and `order = raise(order, id)`.
- **close / minimize / restore / focus.** Exactly AC5-AC8; every no-op path returns `state`. `focus` uses `raise` and returns `state` when `raise` returns the same reference.
- **dockClick.** `return desktopReducer(state, { type: dockClickAction(id, wins, order), id })`.
- **move.** Non-finite `x` or `y` -> `state`. Clamp with stored `vw, vh`. Equal to current `x, y` -> `state`.
- **minimizeAll / showAll.** Map only open windows whose `min` differs; if none differ, `state`.
- **tidy / restart.** Both return `initialDesktop(state.vw, state.vh)`. Kept as separate action types for T08.
- **resize.** Ignore if `!Number.isFinite(vw) || !Number.isFinite(vh) || vw < 0 || vh < 0`, or if equal to stored size. Otherwise store size and re-clamp all six windows; keep the same `Win` object when its position is unchanged.
- **Exhaustiveness.** `switch` on `action.type` with a `never`-typed default returning `state`.
- **Purity guard caveat.** The purity test forbids the word `window` (and `Date`, timers) in `src/logic/*.ts` outside comments, so identifiers must avoid them (use `win`, `wins`, `vw`, `vh`).

**Placeholder markup (AC20-AC22).** `<section aria-label={WIN_TITLES[id]} data-win={id} data-min={String(w.min)} hidden={w.min}>` with inline style `position: absolute; left: x; top: y; width: WIN_META[id].width; min-height: WIN_META[id].height; z-index: zIndexFor(id, order); background: var(--color-surface); color: var(--color-text); border-radius: var(--radius-lg)` and the title as its only text. `hidden` (display none) satisfies AC21 without extra attributes; T04 replaces it with `inert` plus animation. A `section` with an accessible name has the `region` role (design-decisions D: not `dialog`).

**Data/API changes.** `State` shape (nothing imports it today), `WIN_TITLES`. No storage, no network, no env vars.

**Dependencies.** None added.

## 4. Design

- **User flow.** Page load shows the nebula wallpaper with five titled surface boxes at the T02 layout positions. Resizing the browser keeps every box reachable (re-clamp). Nothing is interactive yet.
- **States.** Loading: none (synchronous render). Empty: not reachable through UI in this ticket (all windows closed would show only the wallpaper, which is valid). Error: the reducer is total and never throws; bad inputs return the same state. Success: placeholders rendered as above.
- **1280x720 and larger.** All five boxes sit between the menubar band (y >= 36) and the dock clearance (decision 7, AC24). Larger viewports use the spec formulas. Growing the viewport never moves a window. Below 1280x720 positions are only clamped (no mobile, decision 1).
- **Accessibility.** Each placeholder is a named region; minimized ones are `hidden` (not focusable, not in the a11y tree). No focusable controls are added, so keyboard order is unchanged. Text uses `--color-text` on `--color-surface`, already AA in both themes (T01 contrast tests). No new colors.
- **Reduced motion.** No animation is added. Nothing to gate.

## 5. Risk and security

| #   | Risk                                                                                  | Safeguard (task)                                                                                                      |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| R1  | NaN or negative sizes/coordinates from a bad event make windows vanish.               | Finite and sign checks in `resize` and `move` (T3). Tests for `NaN`, `Infinity`, `-1` (T6).                           |
| R2  | Runtime-invalid id (e.g. `'constructor'`) pollutes `wins`/`order`.                    | `WIN_IDS.includes` guard, AC26 (T3). Tests cast `'constructor'` and `'__proto__'` and assert `toBe(state)` (T6).      |
| R3  | Input mutation corrupts previous states (breaks React bailouts and future undo).      | Spread-only updates (T3). Tests deep-freeze state before every call (T6).                                             |
| R4  | StrictMode double effect leaves two `resize` listeners or a leaked one after unmount. | Single effect with cleanup (T4). Spy test under `<StrictMode>` counts add minus remove = 1, and 0 after unmount (T7). |
| R5  | Resize storms re-render on every event.                                               | Reducer returns the same reference for unchanged size, so React bails out; no throttling (Assumption 5). Accepted.    |
| R6  | Reducer accidentally reads `window` or uses a forbidden word, failing purity.         | Naming rule in section 3 (T3). Purity test extended to include `desktop` (T5).                                        |
| R7  | Purity test title still says "all seven logic modules" after adding an eighth.        | Accepted: only `EXPECTED` may change (AC25). Noted in the QA report (T9).                                             |
| R8  | Removing `State` fields breaks an importer.                                           | Nothing in `src/` or `tests/` imports `State` today (verified); `npm run typecheck` in T1 proves it.                  |
| R9  | Hidden placeholders change layout tests (`getByRole` skips hidden).                   | Tests locate placeholders with `[data-win="..."]` selectors and read `style.left/top` (T7, T8).                       |
| R10 | Copy drifts out of `data.ts`.                                                         | Titles only in `WIN_TITLES` (T2). Component test asserts names equal `WIN_TITLES` and the literal six strings (T7).   |

Auth, secrets, network and data exposure: not applicable (static client, no storage in this ticket).

## 6. Gaps check

- **Auth:** none in this app. N/A.
- **Validation:** reducer inputs (ids, coordinates, sizes) validated in R1, R2, AC26.
- **Error handling:** reducer is total, never throws; no async work.
- **Mobile:** out of scope (decision 1); small sizes only clamp.
- **Accessibility:** named regions, hidden minimized windows, no new focus stops, AA tokens reused.
- **Config and env vars:** none. No eslint, vite, playwright or tsconfig change (tests are already in `tsconfig.include`, so `@ts-expect-error` checks run under `npm run typecheck`).
- **Tests:** reducer unit tests, purity extension, component wiring test, e2e layout and resize spec. Existing tests untouched except the allowed `EXPECTED` entry.

## 7. Tasks

Coder tasks T1-T4 (`src/` only) and test-writer tasks T5-T8 (`tests/` only) can be written in parallel against section 3. **Commit order rule:** a test task is committed only after the src task it depends on, so every commit is green. Order: T1, T2, T3, T5, T6, T4, T7, T8, T9.

| Task | Owner  | Files                                              | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ACs            | Depends on |
| ---- | ------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------- |
| T1   | coder  | `src/types.ts`                                     | Replace `State` with `{ wins; order: readonly WinId[]; vw; vh }`. Run typecheck.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | AC1            | none       |
| T2   | coder  | `src/data.ts`                                      | Add `WIN_TITLES` (section 3). `tests/data.test.ts` stays green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | AC20           | none       |
| T3   | coder  | `src/logic/desktop.ts`                             | `DesktopAction`, `initialDesktop`, `desktopReducer` per the reducer rules, including the id guard and finite checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | AC2-AC16, AC26 | T1         |
| T4   | coder  | `src/Desktop.tsx`                                  | `useReducer` with lazy init, resize effect with cleanup and mount dispatch, root styles, placeholders (section 3 markup).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | AC17-AC22      | T2, T3     |
| T5   | tests  | `tests/logic/purity.test.ts`                       | Add `'desktop'` to `EXPECTED` (keep it sorted). No other change to this file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | AC3, AC25      | T3         |
| T6   | tests  | `tests/logic/desktop.test.ts` (new)                | Deep-freeze helper. AC1: `Object.keys` of state is `['order','vh','vw','wins']`, each `Win` keys `['min','open','x','y']`, plus `// @ts-expect-error` reads of `menu`, `theme`, `verb`, `lines`, `booting` inside an `it`. AC2, AC4-AC15 one `describe` each with `toBe(state)` for every no-op. AC9 table (four branches, top-most minimize then restore-and-raise). AC15 exact numbers. AC16 deterministic sequence of 200 mixed actions from a fixed list (no `Math.random`) asserting invariants after each step. AC26 and R1 bad inputs.                                                                         | AC1-AC16, AC26 | T3         |
| T7   | tests  | `tests/Desktop.wiring.test.tsx` (new)              | Render `<Desktop />`: five `[data-win]` sections with `style.left/top/width` equal to `layout(innerWidth, innerHeight)` and `WIN_META` widths, `z-index` equal to `zIndexFor`, `site` absent, accessible names equal `WIN_TITLES` and the six literal titles, no `button` inside, root styles from AC19. Set `innerWidth/innerHeight` to 800x500 (via `Object.defineProperty`, restored in `afterEach`), fire `resize` in `act`, assert AC14 clamp. Spy add/removeEventListener under `<StrictMode>`: one net `resize` listener, zero after unmount, no `console.error`/`warn`. Do not edit `tests/Desktop.test.tsx`. | AC17-AC23      | T4         |
| T8   | tests  | `tests/e2e/desktop.spec.ts` (new)                  | At the default 1280x720: five `[data-win]` boxes at the AC24 positions (`boundingBox` x, y), `[data-win="site"]` count 0, no console errors. Second test: `page.setViewportSize(1920x1080)` before `goto`, assert term at 1450,694, resize to 1280x720, assert term 1200,660 and every box within `[80 - width, 1200] x [36, 660]`.                                                                                                                                                                                                                                                                                   | AC24           | T4         |
| T9   | either | `docs/plans/plan.md` (status), `docs/qa/T03-qa.md` | Run lint, typecheck, test, test:e2e, build, format:check. Confirm `git diff` on existing test files shows only the `EXPECTED` line. Grep `src/` to confirm `useReducer` and `wins` state appear only in `Desktop.tsx` and `src/logic/desktop.ts` (AC17). Note R7.                                                                                                                                                                                                                                                                                                                                                     | AC25, AC17     | T1-T8      |

## 8. Open questions

None needing a human. The two non-blocking questions from the requirements are resolved with the simplest option:

1. **Resize re-clamp and the dock.** Resolved: no dock clearance. Resize uses only the drag clamp `clampPosition` (Assumption 4). "Tidy up" restores the full layout.
2. **Does `tidy` close "About this site"?** Resolved: yes, matching the prototype (Assumption 8). `tidy` and `restart` produce identical window state.

Other choices made unattended: placeholders use `hidden` for minimized windows (T04 refines with `inert`); no resize throttling; the purity test title "seven" is left as is (R7); placeholders get a `min-height` from `WIN_META` so they are visible boxes for e2e `boundingBox`.
