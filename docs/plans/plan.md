# T08 plan: `BootScreen` and Restart

Source: `docs/plans/00-requirements.md` (Current state, Assumptions 1-13, AC1-AC33), `CLAUDE.md`, `docs/design-decisions.md` (decisions 2-5; section C), `design_handoff_tanzi_os/README.md` and the prototype's boot markup and `restart()`. Existing code read: `src/{Desktop,WindowLayer,Window,MenuBar,BootScreen}.tsx`, `src/data.ts`, `src/types.ts`, `src/logic/{system,desktop,menu,motion,terminal}.ts`, `src/hooks/{useDrag,reducedMotion}.ts`, `src/windows/{Terminal,WindowBody}.tsx`, `vite.config.ts`, and every test that mentions Restart, `booting` or the desktop root's children.

T1-T8 below are tasks inside ticket T08, not backlog tickets.

## 1. Goal and scope

**Goal.** Restart… and the terminal's `restart` show a short full-screen boot sequence, then return the desktop to its just-loaded state, including every window's internal state, while keeping theme, wallpaper and wobble. The boot screen never runs on first load, is skipped entirely under reduced motion, and keeps the desktop behind it unreachable while it runs.

**Out of scope** (carried over):

- A boot screen on first load, or any boot-related persistence (decisions 2, 4).
- A way to skip or cancel a boot, a confirmation before Restart, or boot text, sounds or logs.
- The app-wide accessibility pass (T09), including window focus management on open and close, and the items already noted for T09.
- Replacing placeholder content (T10) and mobile or touch-specific behaviour (T11).
- Changing `runCommand` output, the Tidy up behaviour, the layout formulas or any token value.
- The crowded default layout at 1280x720 flagged in the T07 log entry.
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `00-requirements.md` with the same numbers. No AC is added: the gaps found are handled inside AC24 (Tab and text selection, see section 3) and by the decisions in section 8.

### A. When the boot screen runs

- **AC1** First load never shows the boot screen, including under React StrictMode and with any stored settings. Nothing about booting is persisted, so reloading during a boot gives a normal first load with no boot screen.
- **AC2** Without reduced motion, choosing tanzi.os → Restart… or entering `restart` in the terminal shows the boot screen by the next paint. Both entry points behave identically.
- **AC3** Under `prefers-reduced-motion: reduce`, Restart shows no boot screen, not even for one frame, starts no boot timer, and applies the full reset of section D immediately. The preference is read when Restart is triggered, so changing it without a reload takes effect on the next Restart. A preference change during a running boot does not interrupt it.
- **AC4** Tidy up, closing, minimizing, and every other menu item or terminal command never show the boot screen.

### B. Appearance

- **AC5** The boot screen is fixed to the full viewport with an opaque `--color-bg` background and sits above every other element. During a boot, `document.elementFromPoint` at the four viewport corners, over the menubar and over the dock returns the boot screen or a descendant. It stays full-viewport if the browser is resized during the boot.
- **AC6** Its content is a centered column with a 22px gap: the mark, then the progress bar. The mark is 64x64, radius 16px, with a 1px solid `--color-accent` border, centered "TC" in `--color-accent`, 22px, weight 600.
- **AC7** The progress bar is 200x3, radius 2px, on a `--color-neutral-800` track that clips its fill. The fill is `--color-accent`, its width is the current percentage, and it transitions `width .12s linear`.
- **AC8** The screen shows no other visible text or element, uses tokens only with no hard-coded colours, renders in the current theme in both dark and light, and appears and disappears without a fade.

### C. Progress and lifecycle

- **AC9** Every boot starts at 0%, including a second Restart in the same session. Every 90ms the progress increases by `7 + r * 14`, for a random `r` in `[0, 1)`. Displayed progress only increases and never exceeds 100.
- **AC10** On the tick where the total reaches 100 or more, the section D reset and the removal of the boot screen land in the same commit. Until that tick the desktop behind is not reset. No frame shows the old desktop without the boot screen, or the boot screen removed before the reset. With `r` held at 0 the boot ends on tick 15 (1350ms); with `r` just below 1 it ends on tick 5 (450ms).
- **AC11** The progress step is a pure, unit-tested function in `src/logic` that takes the random value as an argument. Random numbers and timers stay out of reducers and `src/logic`, so StrictMode's double reducer call cannot change the outcome.
- **AC12** Under StrictMode, exactly one boot interval is active, the tick rate stays 90ms, and the reset happens exactly once. Unmounting during a boot clears the interval, produces no further progress or completion, and logs no warning.
- **AC13** A Restart that arrives while a boot is running neither starts a second boot nor restarts or lengthens the current one, and the reset still happens exactly once.
- **AC14** Progress ticks do not re-render `Desktop`, `MenuBar`, `Dock`, `WindowLayer` or any window (design-decisions section C). `State` in `src/types.ts` gains no boot field or boot percentage.

### D. What Restart resets and keeps

- **AC15** After Restart the window state equals a fresh load at the current viewport: default positions, the five dock windows open and not minimized, About this site closed, default z-order. If the browser was resized during the boot, the layout uses the latest viewport.
- **AC16** After Restart every window's internal state is back to its initial value, whether that window was open, minimized or closed beforehand, on both the boot and the reduced-motion path:
  - the verb is `VERBS[0]`
  - the experience tab is the first entry
  - the terminal shows only the banner, with empty input and empty Up/Down history
- **AC17** Restart keeps the current session's theme, wallpaper and wobble (decision 3), and the prototype's reset of wobble is not copied:
  - `<html data-theme>`, the wallpaper, the View menu checks and the drag tilt behaviour are unchanged.
  - Restart writes nothing to `localStorage`, so a setting with nothing stored stays unstored.
  - Settings are not re-read from storage: when `setItem` throws, a theme changed during the session is still in effect after Restart.
- **AC18** Windows do not play the open animation as a result of Restart. In the first frame after the boot screen is removed, and immediately after a reduced-motion Restart, every open window has no transform and full opacity. Windows opened after Restart still fly in as usual.
- **AC19** A window drag in progress when Restart begins cannot change the post-Restart layout, including when the pointer is released during or after the boot.
- **AC20** Existing behaviour is unchanged:
  - Tidy up still keeps the internal state of windows that stay open.
  - Close still resets a window, and minimize still keeps its state.
  - After Restart the terminal runs commands normally, and Help → Terminal commands still runs `help` exactly once per activation.
  - Restart can be repeated in the same session.

### E. Accessibility of the boot screen and focus

- **AC21** While the boot screen is showing, the menubar, windows and dock are `inert`, so nothing behind it can be focused, clicked or read by assistive technology. The boot screen and the live region of AC26 are outside the inert content. No menu is open during a boot. `inert` is gone in the same commit that removes the boot screen, and windows minimized before Restart do not stay inert afterwards.
- **AC22** When the boot starts, focus moves to the boot screen's container, which has `role="dialog"`, `aria-modal="true"` and an accessible name saying the system is restarting. It is focusable only programmatically, adds no tab stop, and shows no visible focus ring on either entry path.
- **AC23** The bar is exposed as `role="progressbar"` with an accessible name, `aria-valuemin` 0, `aria-valuemax` 100 and an integer `aria-valuenow` matching the rounded displayed percentage. It is not focusable. The "TC" mark is hidden from assistive technology.
- **AC24** A boot cannot be cancelled or disturbed. Pressing Escape, Enter, Space or Tab, or clicking anywhere, during a boot changes nothing and does not end it early.
- **AC25** After a completed Restart, on both entry paths and on both the boot and reduced-motion paths:
  - Focus is on the "tanzi.os" menu trigger, never on `<body>`.
  - No window is raised by this focus move, so z-order stays at the default.
  - The Tab sequence matches a fresh load.
- **AC26** Completion is announced on both the boot and reduced-motion paths through a polite live region:
  - The region is in the DOM, visually hidden and empty from first load, and outside any inert content.
  - Each completed Restart sets a completion message.
  - A repeated Restart is announced again, so the region must be emptied between messages, including on the reduced-motion path where no boot separates them.
- **AC27** Unit tests using `tests/helpers/contrast.ts` confirm, in dark and light, that the mark text (`--color-accent` on `--color-bg`) is at least 4.5:1 and the fill (`--color-accent` on `--color-neutral-800`) is at least 3:1.
- **AC28** The mark text and all boot accessible names and announcements come from `src/data.ts`.

### F. Tests and quality

- **AC29** Unit and component tests cover AC1-AC4, AC7, AC9-AC13, AC15-AC19, AC20, AC22, AC23, AC25, AC26 and AC28, using fake timers and a controlled random source for AC9 and AC10. AC13 can be exercised in jsdom, which does not enforce `inert`, by submitting `restart` a second time during a boot.
- **AC30** Playwright at 1280x720 covers:
  - no boot screen on first load or on reload during a boot (AC1)
  - the boot from the menu and from the terminal (AC2)
  - no boot screen under emulated reduced motion, with the full reset applied (AC3)
  - the overlay covering everything, in both themes (AC5, AC8)
  - section D end to end: a dirtied verb, tab, terminal, layout and settings, then Restart
  - no fly-in in the first frame after the boot (AC18)
  - keyboard and pointer blocked during a boot in a real browser (AC21, AC24)
  - focus and Tab sequence after Restart (AC25)
  - no console errors or warnings
- **AC31** QA visually compares the boot screen against the prototype in both themes and records the result in the QA report.
- **AC32** Existing tests broken by Restart no longer being immediate are updated without being weakened. Each change is commented and listed in the QA report and autobuild log as a deliberate requirement change. No test is deleted or skipped. Known cases:
  - `tests/Desktop.dock.test.tsx` (T06 AC15) and the Restart case in `tests/Desktop.menubar.test.tsx` (AC29) assert the reset right after choosing Restart. They must wait for the boot or run under stubbed reduced motion, and keep every assertion.
  - `tests/e2e/menubar.spec.ts` (AC29), only if its existing polling is not enough.
  - The purity `EXPECTED` list, if a logic module is added.
  - The tests listed under "Current state" that pin `{ type: 'restart' }` and the reducer's immediate reset are expected to keep passing unchanged. If the plan cannot keep them, it must justify each edit under this AC.
- **AC33** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass. No console errors or warnings appear during e2e.

## 3. Architecture

**Approach.** `{ type: 'restart' }` and `appReducer` do not change. `Desktop` wraps its `dispatch` in `appDispatch`, which intercepts only `restart` and decides between the boot path and the immediate path. Both sources keep emitting the same action, so `tests/logic/system.test.ts`, `tests/logic/menu.test.ts`, `tests/windows/Terminal.test.tsx` and the reducer harness in `tests/MenuBar.test.tsx` stay unchanged.

**State placement (decision 5, AC14).** `State`, `App` and every action type are unchanged. No window content moves anywhere: terminal lines, input, history, tab and verb stay in their components and are discarded by remounting.

| What                                      | Lives in                | Why                                                                    |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| Progress percentage                       | `BootScreen` `useState` | Ticks re-render only `BootScreen` (AC14)                               |
| `booting: boolean`                        | `Desktop` `useState`    | Drives the overlay and `inert`, changes twice per boot                 |
| `bootingRef`                              | `Desktop` `useRef`      | Synchronous re-entry guard for AC13, read and written in handlers only |
| `epoch: number` (0 until the first reset) | `Desktop` `useState`    | Remount key and signal for focus and announcement                      |
| `readyEpoch: number`                      | `Desktop` `useState`    | Replaces `ready`, gives the no-fly-in commit (AC18)                    |
| `announcement: string`                    | `Desktop` `useState`    | Content of the live region (AC26)                                      |

**Flow, in `Desktop`.** All callbacks are `useCallback` with stable deps.

- `appDispatch(action)`: if `action.type === 'restart'`, call `beginBoot()`. Otherwise forward to `dispatch`. It is passed to `MenuBar` and to `WindowBody`. `WindowLayer` and `Dock` keep the raw `dispatch`, since neither can emit `restart`, and the resize listener keeps it too.
- `beginBoot()`, in this order: return if `bootingRef.current` (AC13, and it must come first so a preference change cannot interrupt a boot, AC3). If `prefersReducedMotion()`, call `resetDesktop()` and return (AC3). Otherwise set `bootingRef.current = true` and `setBooting(true)`.
- `finishBoot()`: `bootingRef.current = false`, `setBooting(false)`, `resetDesktop()`. It runs from the interval callback, and React batches all of it into one commit (AC10, AC21).
- `resetDesktop()`: `dispatch({ type: 'restart' })`, `setEpoch((e) => e + 1)`, `setAnnouncement('')`.

**Render shape.** `Desktop` returns a fragment: the existing root `div` (now with `inert={booting}`), then `{booting && <BootScreen onDone={finishBoot} />}`, then the live region. This is required. The root must stay `container.firstElementChild`, the header must stay its first child and the dock its last child, as pinned by `tests/Desktop.menubar.test.tsx`, `tests/Desktop.dock.test.tsx` (T06 AC25) and the `header.parentElement` wallpaper check in `tests/e2e/menubar.spec.ts`. A sibling also puts the overlay and live region outside the inert subtree. The root is `position: fixed`, which forms its own stacking context, so the overlay's z-index 2000 beats the menubar's 1000.

**Full reset (AC16).** `<WindowLayer key={epoch} ... />` remounts every window, so all internal state returns to its initial value on both paths. Closed windows have no state. `MenuBar` and `Dock` are not keyed, so the trigger survives.

**No fly-in (AC18).** `const ready = readyEpoch === epoch`, with an effect on `[epoch]` that does `requestAnimationFrame(() => setReadyEpoch(epoch))` and cancels on cleanup. `readyEpoch` starts at -1. Incrementing `epoch` makes `ready` false in the same render that remounts the windows, so `Window`'s `useState(() => flyIn && ...)` initialises to false. No `Window` change is needed, and no synchronous `setState` in an effect, so `react-hooks/set-state-in-effect` passes.

**Drag (AC19).** Holds by construction. A release during the boot dispatches `move` to the old layout, and the end-of-boot reset overwrites it. By a release after the boot the old `Window` has unmounted and `useDrag`'s cleanup has cleared `active`, and the new instance has no active drag. No code is needed, only tests.

**`BootScreen`** (`src/BootScreen.tsx`, replaces the stub): default export, `{ onDone: () => void }`.

- Interval in a `useEffect` with deps `[onDone]`. `onDone` must stay stable, otherwise a `Desktop` re-render from a resize would restart the boot. The running total is a `let` local to the effect, not state read in an updater, so StrictMode's simulated remount starts cleanly at 0.
- Each tick calls `bootStep(total, Math.random())`. If done: `clearInterval`, then `onDone()`. Otherwise `setPct`. Never call `onDone` inside a state updater. Cleanup clears the interval.
- `useLayoutEffect` on mount focuses the container with `{ preventScroll: true }`, before first paint and after `inert` is applied.
- Markup: `div.boot[role=dialog][aria-modal=true][aria-label=BOOT_COPY.dialog][tabIndex=-1]`, containing `div.boot-mark[aria-hidden=true]` with `SITE_COPY.mark`, then `div.boot-track[role=progressbar]` with `aria-label={BOOT_COPY.progress}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={Math.round(pct)}`, containing `div.boot-fill` with inline `width: ${pct}%`.
- AC24: `onKeyDown` on the container calls `preventDefault` for `Tab` only, so focus cannot leave the page. Other keys keep their browser defaults, so reload still works (AC1).

**`src/BootScreen.css`** (new, tokens only):

- `.boot`: `position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; background: var(--color-bg); -webkit-user-select: none; user-select: none`. No `transition` or `animation`. The `user-select` is part of AC24, because this sits outside the root's inline `userSelect: none`, so a drag could otherwise select the mark.
- `.boot:focus-visible { outline: none }`: the single, scoped exception that AC22 requires, overriding the global ring.
- `.boot-mark`: 64x64, `box-sizing: border-box`, radius 16px, 1px solid accent, accent text, 22px, weight 600, `display: grid; place-items: center`.
- `.boot-track`: 200x3, radius 2px, neutral-800, `overflow: hidden`.
- `.boot-fill`: `height: 100%`, accent, `transition: width .12s linear`.
- `.boot-status`: visually hidden (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap`). No such class exists yet.

**Focus after Restart (AC25).** `MenuBar` gains optional `focusSignal?: number`, set from `epoch`. A `useLayoutEffect` on `[focusSignal]` calls `triggers.current.os?.focus()` when the value is truthy, so 0 and `undefined` do nothing, which covers first load and the existing harnesses. Layout effects run after the commit has removed `inert` and the overlay, and focusing fires the trigger's `onFocus`, which resets `roving` to `os`, so the Tab sequence matches a fresh load.

**Live region (AC26).** `<div className="boot-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>`, always rendered. `resetDesktop` empties it in the reset commit. An effect on `[epoch]`, skipped at 0, sets `BOOT_COPY.done` after `ANNOUNCE_DELAY_MS` (100) with a `setTimeout`, and clears it on cleanup. This gives one mechanism for both paths and a real gap between the empty and filled states, which is what makes a repeat audible. The region is empty from the reset commit until the delay passes. A timer is used instead of `flushSync`, because two mutations in one task can be coalesced by screen readers.

**Timers and StrictMode (design-decisions section C).**

| Timer               | Started in                 | Cleanup                | StrictMode effect                                                       |
| ------------------- | -------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Boot interval, 90ms | `BootScreen` `useEffect`   | `clearInterval`        | Set, cleared, set again with a fresh total of 0: one active             |
| Ready frame         | `Desktop` effect `[epoch]` | `cancelAnimationFrame` | First is cancelled, second sets `readyEpoch`                            |
| Announcement, 100ms | `Desktop` effect `[epoch]` | `clearTimeout`         | Skipped at epoch 0. Updates are not double-invoked. Cancelled on repeat |
| Focus on dialog     | `BootScreen` layout effect | none needed            | Focuses twice, harmless                                                 |
| Focus on trigger    | `MenuBar` layout effect    | none needed            | No-op at `focusSignal` 0 or undefined                                   |

**Files and public surface.**

- `src/data.ts`: `BOOT_COPY = { dialog: 'Restarting tanzi.os', progress: 'Restart progress', done: 'tanzi.os restarted' }`. The mark reuses `SITE_COPY.mark`.
- `src/logic/system.ts`: `BOOT_TICK_MS = 90`, `ANNOUNCE_DELAY_MS = 100`, and `bootStep(total: number, r: number): { pct: number; done: boolean }`. `sum = total + 7 + r * 14`; `done = sum >= 100`; `pct = Math.min(100, sum)`. Putting it in the existing module avoids a purity `EXPECTED` edit. The timer call stays in `BootScreen`.
- `src/BootScreen.tsx`, `src/BootScreen.css`, `src/Desktop.tsx`, `src/MenuBar.tsx` (one optional prop, one layout effect).
- `vite.config.ts`: add `/BootScreen\.css/` to `test.css.include`, as every other component stylesheet has. This is the only non-`src` source edit.

**Hard naming rule.** `tests/MenuBar.test.tsx` ("AC5: no email, link URL or menu copy is hard-coded outside data.ts") scans every `.ts` and `.tsx` file in `src/` except `data.ts` for the case-sensitive string `Restart`, **including comments and identifiers**. So names such as `requestRestart`, `onRestart` or `isRestarting`, or a comment reading "Restart", fail the suite. Use `beginBoot`, `finishBoot`, `resetDesktop`, `appDispatch`, `BOOT_COPY`. Lowercase `restart` is fine. Code in `src/logic/system.ts` must also avoid the purity test's words (`window`, `document`, `Date`, `setInterval`, `setTimeout`, `Math.random`) outside comments.

**Data and API changes.** The `data.ts` and `system.ts` additions above, `MenuBar.focusSignal?`, `BootScreen.onDone`. No change to `State`, `App`, `AppAction`, `DesktopAction`, the reducers, storage or network.

**Dependencies.** None added.

## 4. Design

**User flow.** The user chooses tanzi.os → Restart… or enters `restart`. An opaque screen appears with the TC mark and a bar that fills in irregular steps over 0.45-1.35s. It vanishes without a fade to reveal the default desktop, with the windows already in place. Focus is on "tanzi.os", and a screen reader hears "tanzi.os restarted". Under reduced motion the desktop resets at once with the same focus and announcement.

**States.**

- Loading: the boot screen is itself the only transient state. First load has none.
- Empty: the live region is empty until the first completed Restart. The bar starts at 0% width.
- Error: nothing can fail: no network, and the settings path is untouched. A throwing `setItem` has no effect because Restart writes nothing (AC17). A background tab may run slower (Assumption 12).
- Success: the default desktop, focus on the trigger, the announcement.
- Interaction during a boot: all input is ignored (AC21, AC24).

**1280x720 and larger.** The overlay is `position: fixed; inset: 0`, and the column is centered at any size, including during resize. Layout after Restart uses the unchanged formulas at the latest `vw` and `vh`. Mobile is not built.

**Accessibility.** Named modal dialog that takes focus, a `progressbar` with a rounded integer value, `aria-hidden` mark, `inert` on the root, a persistent polite live region, and focus returned to a stable, non-window target. AC27's contrast values come from existing tokens, and the invisible light-mode track is accepted (Assumption 11).

**Reduced motion.** No boot screen, no boot timer, an immediate reset. The bar's width transition exists only during a boot, so a preference change mid-boot leaves it running under `theme.css`'s shortened durations, which AC3 allows.

## 5. Risk and security

Auth, secrets and server data do not apply. No new input surface. The boot copy is static and rendered as text.

- **R1. Double boot or double reset under StrictMode or repeated requests (AC12, AC13).** Safeguard: `bootingRef` checked first, and the running total local to the effect, with `onDone` called outside any updater (T2, T4). Tests under StrictMode count `setInterval` calls against `clearInterval` calls and resets.
- **R2. A `Desktop` re-render restarting the boot (AC9, AC13).** Occurs if `onDone` is not stable, for example on resize. Safeguard: `finishBoot` and its dependencies are stable `useCallback`s (T4). A test dispatches a window `resize` mid-boot and still expects tick 15 with `r` at 0.
- **R3. Window state surviving (AC16).** Safeguard: `key={epoch}` (T3). Tests dirty the verb, tab, terminal input and Up history, with the terminal open, minimized and closed.
- **R4. Fly-in or genie replay after Restart (AC18).** Safeguard: `readyEpoch` (T5). Tests must run on the boot path, because `Window` never flies in under reduced motion, which would make a stubbed test vacuous.
- **R5. Half-applied reset visible (AC10, AC21).** Safeguard: all setters in one synchronous callback, so React batches them (T4). A `MutationObserver` test confirms that the overlay's removal, the window remount and the `inert` removal arrive together.
- **R6. Focus lost to `<body>` on the terminal path (AC25).** The focused input unmounts in the reset commit. Safeguard: the `MenuBar` layout effect (T6), tested on both entry paths and both motion paths.
- **R7. Repeated announcement silent (AC26).** Safeguard: emptied at reset, filled after the delay (T7). Tests assert the empty state between two reduced-motion Restarts.
- **R8. Copy-ban test failing on identifiers.** Safeguard: the naming rule in section 3 (T2-T7).
- **R9. Focus escaping during a boot (AC24).** Safeguard: Tab `preventDefault` (T2). Real-browser check in T8.
- **R10. Tests weakened by the AC32 edits.** Two traps, both avoided in section 7a: a reduced-motion stub would make the `rotation('hello')` wobble check vacuous, and an unconditional `waitFor` would let Tidy up become non-immediate unnoticed.
- **R11. T3 tests breaking at T4.** T3's Restart is immediate but T4's is not. Safeguard: T3's tests stub reduced motion from the start, so they stay valid (T3).
- **R12. Act warnings or leaked timers in tests.** Safeguard: wrap fake-timer advances in `act`. RTL's cleanup unmounts any running boot, and the interval's cleanup handles it (AC12).

## 6. Gaps check

- **Auth:** none in this app, not applicable.
- **Validation:** no new input. `bootStep` takes `Math.random()` only.
- **Error handling:** no failure path exists. Storage is not touched by Restart (AC17).
- **Mobile:** out of scope (decision 1, T11).
- **Accessibility:** AC21-AC26, AC27. Scoped ring removal only on the dialog.
- **Config and env vars:** one `vite.config.ts` test-only line. No env vars.
- **Tests:** logic, component, raw CSS, contrast, Desktop integration, e2e, and the two sanctioned edits in 7a.

## 7. Tasks

Coder edits `src/` only, plus the one `vite.config.ts` line in T1. Test-writer runs after coder on each task and owns `tests/`. Each task must leave lint, typecheck and unit tests green once test-writer has finished. New tests are named with a `T08 ACn:` prefix.

**Test-writer guidance for `Desktop` boot tests.** Use `vi.useFakeTimers()` with `fireEvent`, not user-event, and advance with `act(() => { vi.advanceTimersByTime(90); })`. Control `r` with `vi.spyOn(Math, 'random')`. For the terminal path, `fireEvent.change` the input and then `fireEvent.keyDown` with `Enter`, as separate events. Stub reduced motion with `vi.stubGlobal('matchMedia', ...)` as `tests/Desktop.menubar.test.tsx` AC34 does, and `vi.unstubAllGlobals()` afterwards. To assert "no boot timer" (AC3) spy on `setInterval`; do not use `vi.getTimerCount()`, because the announcement timeout and the ready frame also count.

- **T1. Copy and the progress step.** ACs: AC9 (arithmetic), AC11, AC28 (constants).
  - Coder: `BOOT_COPY` in `data.ts`; `BOOT_TICK_MS`, `ANNOUNCE_DELAY_MS` and `bootStep` in `logic/system.ts`; the `vite.config.ts` line.
  - Test-writer: additive cases in `tests/data.test.ts` for the `BOOT_COPY` literals, and in `tests/logic/system.test.ts` for `bootStep`: `r` 0 reaches done on call 15 and not 14; `r` 0.999999 on call 5 and not 4; `pct` strictly increases and is capped at 100; exactly 100 is done; `BOOT_TICK_MS` is 90. No 7a edits.
- **T2. `BootScreen` component, not yet wired.** ACs: AC5 (CSS), AC6, AC7, AC8, AC9, AC12 (interval), AC22, AC23, AC24 (Tab, selection), AC27, AC28.
  - Coder: `BootScreen.tsx` and `BootScreen.css` as in section 3.
  - Test-writer: new `tests/BootScreen.test.tsx`: starts at 0, `aria-valuenow` integer and fill width per tick, `onDone` exactly once on the right tick with no further ticks, StrictMode gives one active interval at 90ms, unmount clears it with no warning, a re-render with the same `onDone` does not restart, dialog semantics and focus on mount, `tabIndex` -1, mark `aria-hidden`, text from `data.ts`, progressbar has no `tabindex`, Tab is default-prevented and Escape, Enter and Space are not. Raw CSS test on `BootScreen.css` (every AC5-AC8 declaration, no hex or `rgb(`, no `transition` on `.boot`, `outline: none` only under `.boot:focus-visible`, no `animation`). New `tests/boot.contrast.test.ts` for AC27, modelled on `tests/windows.contrast.test.ts`. No 7a edits.
- **T3. Full reset by remounting.** ACs: AC15, AC16, AC17, AC19, AC20.
  - Coder: `Desktop` gains `epoch`, `resetDesktop` and `appDispatch` (for now `restart` calls `resetDesktop()` directly), `key={epoch}` on `WindowLayer`, and passes `appDispatch` to `MenuBar` and `WindowBody`.
  - Test-writer: new `tests/Desktop.boot.test.tsx`. **Every Restart in this task's tests runs under stubbed reduced motion, so they stay valid after T4 (R11).** Cover: section D state from the menu and the terminal, with windows open, minimized and closed; default positions and z-order; a resize before Restart uses the latest viewport; About this site closed; nothing written to storage and a throwing `setItem` keeping the session theme; a drag released after Restart leaves the default layout; Tidy up keeps a dirtied verb; Help → Terminal commands still runs once after Restart; repeated Restart. Do not test the drag tilt here (vacuous under reduced motion; see T4). No 7a edits.
- **T4. Boot path.** ACs: AC1-AC5, AC9, AC10, AC12-AC14, AC15-AC17, AC19, AC21, AC24, AC29.
  - Coder: `booting`, `bootingRef`, `beginBoot`, `finishBoot`, the fragment render shape, `inert={booting}` on the root, the conditional `BootScreen`. `appDispatch` now calls `beginBoot`.
  - Test-writer: **apply 7a in this task.** Extend `tests/Desktop.boot.test.tsx` on the boot path:
    - AC1: no dialog at mount or after a frame, under StrictMode, with stored settings.
    - AC2: dialog straight after each entry point.
    - AC3: under stub, no dialog in any commit (`MutationObserver`), no `setInterval`, reset applied; the preference re-read on the next Restart; a change mid-boot ignored.
    - AC4: Tidy up, Close, Minimize, `tidy`, `clear` and others show no dialog.
    - AC9: second boot starts at 0.
    - AC10: not reset on tick 14 and reset on tick 15 with `r` at 0; tick 5 with `r` at 0.999999; `MutationObserver` shows overlay, remount and `inert` removal together.
    - AC12: StrictMode single interval and one reset (count via a spy on `initialDesktop` or by a repeated-state check); unmount mid-boot.
    - AC13: second `restart` mid-boot does not lengthen it.
    - R2: a `resize` mid-boot still ends on tick 15.
    - AC14: separate file `tests/Desktop.boot.renders.test.tsx`, using the `vi.mock` render-counter pattern of `tests/Desktop.terminal.test.tsx` for `Dock`, `MenuBar`, `WindowLayer` and `Window`, plus a counter on `Desktop`'s children; counts are unchanged across ticks. `State` has no boot key (extends the existing type-level check additively).
    - AC16 and AC17 on the boot path, including the wobble-off tilt with `rotation`.
    - AC19: release during the boot and after it.
    - AC21: root `inert` during the boot, gone in the same commit; dialog and region outside it; no menu open.
- **T5. No fly-in after Restart.** ACs: AC18.
  - Coder: `readyEpoch` and derived `ready` in `Desktop`, the effect on `[epoch]`.
  - Test-writer: on the boot path (never under a stub, R4): in the commit that removes the dialog, each `[data-win]` has `transform: none` and opacity 1; a window closed before Restart also. After advancing one frame, closing and reopening a window shows the fly-in pose in its first commit. Under reduced motion, immediately after Restart, every open window has no transform and opacity 1. No 7a edits.
- **T6. Focus after Restart.** ACs: AC25.
  - Coder: `focusSignal` on `MenuBar`, passed `epoch` by `Desktop`.
  - Test-writer: extend `tests/Desktop.boot.test.tsx`: focus on the "tanzi.os" trigger across the four combinations (menu or terminal, boot or reduced); z-order default; `tabIndex` of `os` is 0 even when another trigger was roving; `focusSignal` 0 or undefined does not move focus on mount (including the AC12 Tab test still reaching the trigger first). Additive `MenuBar` case. No 7a edits.
- **T7. Live region.** ACs: AC26, AC28.
  - Coder: `announcement`, the region, the `[epoch]` timeout effect.
  - Test-writer: extend `tests/Desktop.boot.test.tsx`: present and empty from first load; outside the root; `role="status"` and polite; message after `ANNOUNCE_DELAY_MS` on both paths; emptied in the reset commit and refilled on a repeat, on the boot and reduced-motion paths; unmount cancels the timeout with no warning. No 7a edits.
- **T8. End-to-end.** ACs: AC1-AC3, AC5, AC8, AC18, AC21, AC22, AC24, AC25, AC30.
  - Coder: nothing unless a real bug appears.
  - Test-writer: new `tests/e2e/boot.spec.ts` with `watchErrors` in every test. Use `page.addInitScript` to fix `Math.random` at 0, for a 1350ms boot. Cover:
    - first load, and reload during a boot
    - boot from the menu and the terminal
    - reduced motion (`page.emulateMedia`), with the dialog never attached and the reset applied
    - `elementFromPoint` at the corners, menubar and dock, in both themes, and after a viewport resize mid-boot
    - opaque background equals `--color-bg`, no other visible text
    - section D end to end: a dirtied verb, tab, terminal, position and settings
    - a `MutationObserver` installed before Restart that records, synchronously when the dialog is removed, each window's computed `transform` and `opacity`
    - during a boot, Escape, Enter, Space, Tab and clicks over the menubar and dock change nothing, and focus stays on the dialog; no visible outline on the dialog after keyboard entry and after pointer entry
    - after Restart, focus on the trigger, and the full Tab sequence equal to that recorded on a fresh load in the same test
    - a drag held through a boot started from the keyboard, released after it

**After T8 (QA stage, no coder or test-writer work).** Run the full AC33 set. Complete AC31 in a real browser in both themes, noting the invisible light-mode track (Assumption 11). Confirm `git diff` on existing tests shows only the 7a edits and additive cases. List every 7a edit in the QA report and autobuild log.

### 7a. Existing tests this ticket changes (sanctioned under AC32)

Applied by test-writer **in task T4**, the task whose code requires them. Located by content, not line number. No assertion is removed or relaxed, and test titles do not change.

**`tests/Desktop.menubar.test.tsx`**

1. In the import from `@testing-library/react`, add `waitFor`.
2. In the test titled `` `AC29: ${item} keeps light, grid and wobble off, resets the windows and writes nothing` ``, directly after `await choose(user, menu, item);` and before the existing `expect(winEl('hello')).not.toBeNull();`, insert:
   - comment: `// DELIBERATE REQUIREMENT CHANGE (T08 AC32): Restart now applies when the boot ends. Wait on the real boot path: a reduced-motion stub would make the wobble-off rotation check below vacuous.`
   - statement: `if (item === 'Restart…') await waitFor(() => expect(winEl('hello')).not.toBeNull(), { timeout: 3000 });`

**`tests/Desktop.dock.test.tsx`**

1. In the import from `@testing-library/react`, add `waitFor`.
2. In `'T06 AC15: Tidy up and Restart reset the dock to all open'`, directly after `await choose(user, label === 'Restart…' ? 'tanzi.os' : 'Windows', label);` and before the existing `expectAll(states());`, insert:
   - comment: `// DELIBERATE REQUIREMENT CHANGE (T08 AC32): Restart now applies when the boot ends.`
   - statement: `if (label === 'Restart…') await waitFor(() => expectAll(states()), { timeout: 3000 });`

Both inserts are conditional so Tidy up stays pinned as immediate. Real timers are used, the longest boot is 1350ms, and the timeout leaves margin. The following assertions all still run after the wait.

**Checked and needing no edit:**

- `tests/logic/system.test.ts`, `tests/logic/menu.test.ts`, `tests/logic/desktop.test.ts`, `tests/windows/Terminal.test.tsx`, `tests/MenuBar.test.tsx` harness: the action and `appReducer` are unchanged, and `Terminal` and `MenuBar` harnesses receive their own dispatch.
- `tests/logic/purity.test.ts`: no module added.
- `tests/e2e/menubar.spec.ts` (AC29): `hello` is the first `REFERENCE` entry and is closed, so `boundingBox` inside the existing `expect.poll` waits until it mounts, which is when the boot ends. Its comment about a reopened window flying in becomes stale but is harmless, and it is left alone rather than creating an unnecessary edit.
- `tests/Desktop.test.tsx`, T06 AC25 and every `root(c)` check: the fragment leaves the root as `container.firstElementChild`, with header first and dock last.
- `tests/e2e/windows.spec.ts` T07 AC41: excludes `restart`.
- Tests of Tab-stop and button counts: the overlay is absent at rest and the live region is not focusable.

## 8. Open questions

None need a human. Decided unattended from the spec, decisions log and requirements:

1. **Boot is intercepted in `Desktop`,** not added to the reducer, so `{ type: 'restart' }` and every test pinning it are untouched, and no timer or random value can reach a reducer.
2. **Reset by remounting `WindowLayer` with a key,** which needs no reset logic per window, keeps window state out of `Desktop` (decision 5) and clears any in-progress drag.
3. **`bootStep` goes in `logic/system.ts`,** so the purity `EXPECTED` list needs no edit.
4. **The two AC32 tests wait for the real boot,** rather than stubbing reduced motion as AC32 also permits, because a stub would make `rotation('hello')` pass vacuously.
5. **`tests/e2e/menubar.spec.ts` needs no edit.** AC32 allowed for one only if its polling was insufficient.
6. **Focus uses a `focusSignal` prop on `MenuBar`,** not a `getElementById` from `Desktop`, so the ref stays with its owner and `roving` is corrected by the existing `onFocus`.
7. **The live region is filled by a 100ms timeout after the reset commit** on both paths, so repeats are audible.
8. **Copy:** "Restarting tanzi.os", "Restart progress" and "tanzi.os restarted" (Assumption 8). The mark reuses `SITE_COPY.mark`.
9. **Within AC24, added without a new AC:** Tab is default-prevented and the overlay has `user-select: none`.
10. **`outline: none` on the dialog** is scoped to `.boot:focus-visible`, as AC22 requires.
11. **A window opened within one frame of Restart does not fly in,** the same as during the first frame of a fresh load. Not worth handling.
12. **Stored `Desktop` values `booting`, `epoch`, `readyEpoch` and `announcement` are shell state, not window content,** and sit in local `useState`, so `State` is unchanged (AC14, decision 5).
