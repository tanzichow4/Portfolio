# T08 requirements: `BootScreen` and Restart

## Goal

Restart… and the terminal's `restart` show a short full-screen boot sequence, then return the desktop to its just-loaded state, including every window's internal state, while keeping theme, wallpaper and wobble (decisions 2, 3). The boot screen never runs on first load, is skipped entirely under reduced motion, and keeps the desktop behind it unreachable while it runs.

## Current state (observed, so the planner does not redo finished work)

- `src/BootScreen.tsx` is a stub returning `null`, and `Desktop` does not render it.
- Both entry points already produce `{ type: 'restart' }`: the menu through `menuModel` in `src/logic/menu.ts`, the terminal through `effectToAction` in `src/logic/system.ts`. `appReducer` applies it at once through `initialDesktop(vw, vh)`.
- `App.settings` is already untouched by `restart`. The in-memory settings can differ from storage when storage throws (T05 AC27).
- `WindowLayer` keys windows by `id`, so a window that stays open across `restart` is not remounted and its verb, tab and terminal state survive. This is the gap T05 and T07 left for this ticket.
- `Window` plays its fly-in when mounted with `flyIn` true, and `Desktop` sets `flyIn` true after the first frame. Any window newly mounted by a Restart would therefore fly in unless handled.
- `Window` raises itself on focus, so moving focus into a window after Restart would change the z-order.
- `choose` in `MenuBar` returns focus to the menu trigger. The terminal input keeps focus only as long as it stays mounted.
- `prefersReducedMotion()` reads the media query live. It returns false when `matchMedia` is missing, as in jsdom, so `<Desktop />` tests run the boot path unless they stub it.
- The menubar is z-index 1000 and the dock 900. The global `:focus-visible` rule in `src/theme.css` applies to any programmatically focused element after keyboard use.
- `tests/logic/purity.test.ts` forbids `Math.random`, `setInterval` and `setTimeout` in `src/logic/*.ts`, and its `EXPECTED` list must name every module.
- `tests/logic/desktop.test.ts` pins that `State` has no `booting` field.
- These tests pin that both sources emit `{ type: 'restart' }` and that `appReducer` resets immediately on it: `tests/logic/system.test.ts`, `tests/logic/menu.test.ts`, `tests/windows/Terminal.test.tsx`, and the reducer harness in `tests/MenuBar.test.tsx`.

## Acceptance criteria

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

## Out of scope

- A boot screen on first load, or any boot-related persistence (decisions 2, 4).
- A way to skip or cancel a boot, a confirmation before Restart, or boot text, sounds or logs.
- The app-wide accessibility pass (T09), including window focus management on open and close, and the items already noted for T09.
- Replacing placeholder content (T10) and mobile or touch-specific behaviour (T11).
- Changing `runCommand` output, the Tidy up behaviour, the layout formulas or any token value.
- The crowded default layout at 1280x720 flagged in the T07 log entry.
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **Wobble.** The README says Restart "keeps theme + wallpaper" and the prototype resets wobble. Decision 3 keeps wobble and takes precedence.
2. **Prototype values.** The README gives the sizes, tick rate and increment. The radius, border, gap, mark text size, track radius, fill transition and the absence of a fade come from the prototype's boot markup.
3. **No rendered 100%.** The prototype resets on the tick that reaches 100 without ever painting it. The README's "at 100% the desktop resets" is read the same way.
4. **Reset timing.** The reset happens at the end of the boot, as in the README and prototype, so the old desktop stays behind the opaque screen until then.
5. **No fly-in.** In the prototype, Restart does not animate windows in, and a Restart reads as a fresh start, which also has no fly-in on first load (AC18).
6. **Focus target after Restart.** The "tanzi.os" trigger is chosen because it matches T05 AC15 for the menu path, survives the reset, is first in the Tab order, and does not raise a window. The terminal path has no other stable target, because the input is reset with the window.
7. **Dialog role.** The boot screen blocks the whole page and takes focus, so a named modal dialog gives a reliable spoken cue at the start. A live region inside a newly mounted overlay may not be announced, and focusing the progressbar could read out each tick. The persistent live region covers completion, and is the only cue on the reduced-motion path.
8. **Copy.** The accessible wording is not specified. The planner may use wording such as "Restarting tanzi.os" and "tanzi.os restarted", stored in `data.ts`. The "TC" text may reuse the existing `SITE_COPY.mark`.
9. **Reduced motion.** "Skipped" means no boot screen at all, not a shortened one (decision 2).
10. **Contrast.** By hand calculation, dark mode gives about 5.5:1 for mark text and 3.1:1 for fill on track. Light-mode accent on `--color-bg` is 4.8:1 per the `src/theme.css` comment.
11. **Light-mode track.** Light `--color-neutral-800` and `--color-bg` are both `#e4e7f5`, so the track is invisible in light mode and only the fill shows. It is kept as specified, following the `.tag-neutral` precedent in T07, because the fill still meets 3:1. QA should note it and T09 may revisit it.
12. **Background tabs.** Browsers throttle timers in hidden tabs, so a boot in a background tab may take longer. That is accepted, and no wall-clock correction is required.
13. **Existing-test edits are sanctioned requirement changes,** following the T04-T07 precedent (AC32).

## Open questions

No blocking questions.
