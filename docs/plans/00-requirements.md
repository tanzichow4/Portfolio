# T15 requirements: start with only hello.txt open, plus hello.txt buttons

## Goal

On first load and after Restart the desktop shows only the hello.txt window, so a visitor sees one clear starting point instead of five overlapping windows. hello.txt gains buttons that open about.md and experience.log next to the existing "See what I've built" and "Say hi", and every other window stays reachable from the dock, the Windows menu and the terminal.

## Current state (observed, so the planner does not redo finished work)

- `initialWindows(vw, vh)` in `src/logic/layout.ts` sets `open: WIN_META[id].dock` for every window, so all five dock windows (hello, about, exp, proj, term) start open and `site` starts closed. `order` is a copy of `INITIAL_ORDER` (`['proj', 'exp', 'term', 'about', 'hello']`).
- `initialDesktop(vw, vh)` in `src/logic/desktop.ts` wraps `initialWindows`. `desktopReducer` handles `tidy` and `restart` in one shared case that returns `initialDesktop(state.vw, state.vh)`, so today both reopen all five windows.
- Restart remounts every window (T08), which resets verb, tab and terminal state. The boot screen and the reduced-motion path both end in the same `restart` reset.
- `WIN_META` in `src/logic/windows.ts` gives hello `{ width: 560, height: 420, dock: true }`. `layout()` places hello at `(0.06vw, 72)`.
- `src/windows/Hello.tsx` renders, inside `.hello-actions` (flex, wrap, gap 12px, margin-top 28px), a native `type="button"` "See what I've built" (`btn-primary`, `FolderOpen` icon) that dispatches `{ type: 'open', id: 'proj' }`, then a "Say hi" `mailto:` link (`btn-secondary`). Labels come from `HELLO_COPY` in `src/data.ts` (`primary`, `secondary`).
- The reducer's `open` action opens a closed window, restores a minimized one and raises it to the top. It never minimizes. The dock dispatches `dockClick`, which picks `open`, `restore`, `focus` or `minimize`.
- `PhonePage` does not use `HELLO_COPY` and does not depend on the desktop window state.

## Acceptance criteria

### A. Initial window state

- **AC1** `initialWindows(vw, vh)` (and so `initialDesktop`) returns hello `open: true, min: false` and every other window (about, exp, proj, term, site) `open: false, min: false`, at every viewport size.
- **AC2** Window positions from `initialWindows` still equal `layout(vw, vh)` for every window, open or closed, so a window opened later appears at its default layout position. `layout()` formulas are unchanged.
- **AC3** `initialWindows(...).order` still equals `INITIAL_ORDER`, as a fresh copy. `INITIAL_ORDER` is unchanged.
- **AC4** On first load at 1280x720 the DOM contains exactly one window (`[data-win="hello"]`), not minimized, at its layout position. No about, exp, proj, term or site window element exists.
- **AC5** On first load the dock shows all five window buttons. hello reads as Open, and about, experience, projects and terminal read as Closed (same labels, `aria-pressed` and dot states the dock already uses for closed windows).
- **AC6** On first load the Windows menu lists the same five items, with only hello.txt checked.
- **AC7** Each closed window can be opened from the dock, from its Windows menu item, and (for hello, about, experience, projects) from the terminal `open` command. Once opened it behaves exactly as before (drag, minimize, close, z-order, fly-in).

### B. Restart and Tidy up

- **AC8** After Restart, on both the boot path and the reduced-motion path, and from both the menu and the terminal `restart`, the window state equals a fresh load at the current viewport: only hello open, the rest closed, default positions, `INITIAL_ORDER`. This includes windows that were open or minimized before Restart, and the terminal window itself when `restart` was typed there.
- **AC9** All T08 Restart behaviour still holds: internal state resets, theme, wallpaper and wobble are kept, no fly-in after Restart, focus lands on the "tanzi.os" menu trigger, and completion is announced.
- **AC10** Tidy up (Windows menu and terminal `tidy`) is unchanged from today: it resets to the default layout with all five dock windows open and not minimized, `site` closed, order `INITIAL_ORDER` (spec: "reset to default layout, all open"). Windows that stay open across Tidy up keep their internal state, as before.

### C. hello.txt buttons

- **AC11** `.hello-actions` contains, in this DOM and Tab order: "See what I've built" (button), "More about me" (button), "What I've been up to" (button), "Say hi" (mailto link).
- **AC12** The new labels come from new `HELLO_COPY` keys in `src/data.ts`. No new label text is hard-coded in components. Existing `primary` and `secondary` keys and values are unchanged.
- **AC13** "More about me" is a native `type="button"` whose accessible name is its label. Activating it by click, Enter or Space dispatches exactly one `{ type: 'open', id: 'about' }`.
- **AC14** "What I've been up to" is a native `type="button"` whose accessible name is its label. Activating it by click, Enter or Space dispatches exactly one `{ type: 'open', id: 'exp' }`.
- **AC15** In the running app, each hello button (the existing one and the two new ones) opens its window when closed, restores it when minimized, and raises it to the top when it is open behind other windows. Activating a button whose window is already open and on top leaves it open and on top, and never minimizes it.
- **AC16** The new buttons use the existing `hello-cta` host and `btn btn-secondary hello-cta-face` styling, so they share the hover offset, shadow, pressed state and reduced-motion rules already pinned for the hello buttons. "See what I've built" stays the only primary button. Any icon added is `aria-hidden` and not focusable.
- **AC17** The buttons may wrap onto more than one row. At 1280x720 the whole hello window, including every button, is fully visible below the menubar and above the dock clearance (`y + rendered height <= 720 - DOCK_CLEARANCE`), with no clipped or overlapping buttons and no scroll inside hello. If the rendered height exceeds the nominal 420, `WIN_META.hello.height` is updated to the rendered height so `layout()` keeps hello clear of the dock.
- **AC18** The button row meets the existing contrast tests in dark and light (no new colours or tokens are introduced).
- **AC19** Changing the verb still dispatches nothing, and hello's verb state still resets on close and Restart.

### D. Unaffected areas

- **AC20** The phone page (`<760px`) renders and behaves exactly as before. All phone unit and e2e tests pass unchanged.
- **AC21** Terminal output, dock click logic (`dockClickAction`), z-order rules, drag clamp, resize re-clamp, `site` handling and localStorage behaviour are unchanged.

### E. Tests and quality

- **AC22** Unit tests cover AC1-AC3, AC8 and AC10 at the reducer and layout level (including that `tidy` and `restart` now give different results), and AC11-AC14, AC16 and AC19 in `tests/windows/Hello.test.tsx`.
- **AC23** A component test of `<Desktop />` (or an e2e test) covers AC4-AC6 and AC15 for all three hello buttons: closed, minimized, and open-but-behind cases.
- **AC24** Playwright at 1280x720 covers: only hello visible on first load (AC4); the dock and Windows menu states (AC5, AC6); opening about, exp and proj from the hello buttons (AC15); hello fully visible above the dock (AC17); only hello after Restart from the menu and from the terminal, with and without reduced motion (AC8); Tidy up still opening all five (AC10); no console errors or warnings.
- **AC25** Existing tests that assumed five windows open at load or after Restart are updated without weakening coverage. Each edit carries `// DELIBERATE REQUIREMENT CHANGE: <reason>` and is listed in the QA report and the autobuild log. No test is deleted or skipped. A test that exercises a non-hello window keeps every assertion and reaches that window through a user path (dock, Windows menu, terminal, hello button, or Tidy up) or through an explicit reducer setup. Known or likely cases (the planner must confirm the full list by running the suites):
  - Unit: `tests/logic/layout.test.ts` (AC7 open flags), `tests/logic/desktop.test.ts` (AC2 "five dock windows open", and any `tidy`/`restart` equality with `initialDesktop`), `tests/Desktop.wiring.test.tsx` (AC20/AC23 five windows rendered, page-wide tab list), `tests/WindowLayer.test.tsx` (AC1 five open windows), `tests/Desktop.dock.test.tsx` (T06 AC15 "all five windows read Open", the tab-stop list near the T07 AC52 comment), `tests/Desktop.menubar.test.tsx` (tab-stop list near the T06 AC30 comment, Restart case), `tests/Desktop.boot.test.tsx` (T08 AC15/AC16/AC25 post-Restart state and Tab sequence), `tests/Desktop.terminal.test.tsx` (assumes the terminal is open), `tests/MenuBar.test.tsx` and `tests/Dock.test.tsx` only where they build state from `initialDesktop` and expect all open, `tests/T07.foundations.test.tsx` if it assumes open windows, and `tests/windows/Hello.test.tsx` (T07 AC10 Tab order; T07 AC47 height of 420 only if AC17 changes it).
  - E2e: `tests/e2e/desktop.spec.ts` (AC24 five windows at reference positions, `toHaveCount(5)`), `tests/e2e/chrome.spec.ts` (Tab-stop sequences and window lookups), `tests/e2e/menubar.spec.ts` (AC12 first tab stops, Windows menu checks, Restart), `tests/e2e/dock.spec.ts` (initial Open states and window lookups), `tests/e2e/windows.spec.ts` and `tests/e2e/windows.motion.spec.ts` (non-hello windows assumed open), `tests/e2e/boot.spec.ts` (post-Restart state), `tests/e2e/projects.spec.ts` (projects window assumed open), and `tests/e2e/dock.motion.spec.ts` if it assumes open windows.
  - Tests that assert Tidy up opens all five keep passing unchanged.
- **AC26** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## Out of scope

- Changing the Tidy up behaviour, `layout()` formulas (other than the hello height in AC17), `INITIAL_ORDER`, terminal commands or output, or the dock click logic.
- Moving focus into a window opened from a hello button (it behaves as the existing primary button does today; window focus management stays with the accessibility work).
- Persisting which windows are open (decision 4).
- A button for the terminal or About this site in hello.
- Any change to the phone page, `PhonePage` content or mobile behaviour.
- New colours, tokens or button variants.
- Content changes to about.md, experience.log or projects (T16, T17, T18).
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **Tidy up stays "all open".** The README says Tidy up resets "to default layout, all open", and the ticket only changes first load and Restart. So Tidy up and Restart now give different window sets, even though they share one reducer case today.
2. **"Same action path as the dock"** means the reducer's `open` action (open, restore, raise), which the existing primary button already uses. The dock's minimize-when-on-top toggle is not copied, because a button labelled "More about me" should never hide the window.
3. **Z-order.** `INITIAL_ORDER` is kept as is. Closed windows hold their slot in `order` and are raised on open, which already gives the right result. This avoids churn in z-order tests.
4. **Button order** follows the ticket's wording: the existing primary first, the two new buttons, then "Say hi" last.
5. **Styling.** The new buttons use the secondary style so "See what I've built" stays the main call to action. No icons are required. Matching icons are allowed if `aria-hidden`.
6. **Copy.** The labels are exactly "More about me" and "What I've been up to", with the straight apostrophe used by the existing `primary` label. Key names are up to the planner (for example `about` and `experience`).
7. **Hello height.** Four buttons are unlikely to fit on one row within hello's 484px content width, so wrapping is allowed. The nominal height is updated only if needed to keep hello clear of the dock at 1280x720 (decision 7).
8. **Restart from the terminal** closes the terminal too, since Restart means "fresh load" (T08 AC15). Focus still goes to the "tanzi.os" trigger (T08 AC25).
9. **Phone page.** It does not read desktop window state or `HELLO_COPY`, so the backlog rule "update the phone page where content changes" needs no change here.
10. **Test edits are sanctioned requirement changes,** following the backlog round 2 rule and the T04-T08 precedent (AC25).

## Open questions

No blocking questions.
