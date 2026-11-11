# T15 plan: start with only hello.txt open, plus hello.txt buttons

Source: `docs/plans/T15-requirements.md` (identical to `00-requirements.md`: Current state, Assumptions 1-10, AC1-AC26), `CLAUDE.md`, `docs/design-decisions.md` (decisions 4, 5, 7) and `design_handoff_tanzi_os/README.md` ("Tidy up: reset to default layout, all open"). Code read: `src/logic/{layout,desktop,system,windows}.ts`, `src/windows/Hello.{tsx,css}`, `src/data.ts` (`HELLO_COPY`), `src/Window.tsx` (`minHeight: meta.height`). Tests read or grepped: every file under `tests/` that builds state from `initialDesktop`/`initialApp`, renders `<Desktop />`, looks up `[data-win]`, counts tab stops or buttons, or pins `tidy`/`restart`.

T1-T5 below are tasks inside ticket T15, not backlog tickets.

## 1. Goal and scope

**Goal.** On first load and after Restart the desktop shows only the hello.txt window, so a visitor sees one clear starting point instead of five overlapping windows. hello.txt gains "More about me" and "What I've been up to" buttons, which open about.md and experience.log next to "See what I've built" and "Say hi". Every other window stays reachable from the dock, the Windows menu and the terminal.

**Out of scope** (carried over):

- Changing Tidy up, the `layout()` formulas (except the hello height in AC17), `INITIAL_ORDER`, terminal commands or output, or the dock click logic.
- Moving focus into a window opened from a hello button.
- Persisting which windows are open (decision 4).
- A hello button for the terminal or About this site.
- Any change to the phone page or mobile behaviour.
- New colours, tokens or button variants.
- Content changes to about.md, experience.log or projects (T16-T18).
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `T15-requirements.md` with the same numbers. No AC is added. The one gap I found (Tab and focus must be left alone by the test setup that opens the other windows) is a test-method rule in section 7a, not a product criterion.

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
- **AC25** Existing tests that assumed five windows open at load or after Restart are updated without weakening coverage. Each edit carries `// DELIBERATE REQUIREMENT CHANGE: <reason>` and is listed in the QA report and the autobuild log. No test is deleted or skipped. A test that exercises a non-hello window keeps every assertion and reaches that window through a user path (dock, Windows menu, terminal, hello button, or Tidy up) or through an explicit reducer setup. (Known cases: see section 7a.)
- **AC26** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## 3. Architecture

**Approach.** Split today's shared `tidy`/`restart` reducer case into two pure state builders. "Start" (first load and Restart) opens only hello. "Tidy" keeps today's result. Both share one positional builder, so positions and order cannot drift apart (AC2, AC3, AC10).

**`src/logic/layout.ts`**

- Add `export const START_OPEN: readonly WinId[] = ['hello'];`
- Private `buildWindows(vw, vh, isOpen: (id: WinId) => boolean)`: today's loop body with `open: isOpen(id)`, `min: false`, `order: [...INITIAL_ORDER]`.
- `initialWindows(vw, vh)` = `buildWindows(vw, vh, (id) => START_OPEN.includes(id))` (AC1).
- New `tidyWindows(vw, vh)` = `buildWindows(vw, vh, (id) => WIN_META[id].dock)`. This is exactly today's `initialWindows` output (AC10).
- `layout()`, `INITIAL_ORDER`, `DOCK_CLEARANCE` unchanged.

**`src/logic/desktop.ts`**

- `initialDesktop` unchanged in shape (still wraps `initialWindows`).
- New `export function tidyDesktop(vw, vh): State` wrapping `tidyWindows`.
- Reducer: `case 'tidy': return tidyDesktop(state.vw, state.vh);` and `case 'restart': return initialDesktop(state.vw, state.vh);`. No action type changes. `initialApp` in `system.ts` needs no edit.

**Naming rules.** The purity test bans the whole word `window` (lowercase) in `src/logic` code outside comments. `initialWindows`, `tidyWindows` and `buildWindows` are fine. `MenuBar.test` bans the string `Restart` anywhere in `src/` except `data.ts`, including comments. No new module, so the purity `EXPECTED` list is unchanged.

**`src/data.ts`.** Add two keys to `HELLO_COPY`, after `primary`: `about: 'More about me'` and `experience: "What I've been up to"` (straight apostrophe, Assumption 6). `primary` and `secondary` unchanged (AC12).

**`src/windows/Hello.tsx`.** Inside `.hello-actions`, between the primary button and the "Say hi" link, add two copies of the existing button pattern:

```
<button type="button" className="hello-cta" onClick={() => dispatch({ type: 'open', id: 'about' })}>
  <span className="btn btn-secondary hello-cta-face">{HELLO_COPY.about}</span>
</button>
```

and the same for `exp` with `HELLO_COPY.experience`. No icons. That keeps the primary visually dominant and needs no new `aria-hidden` checks (AC16). No CSS change: the existing `.hello-cta`, `.hello-cta-face` and `.hello-cta:hover .btn-secondary` rules and the reduced-motion block already apply by class (AC16, AC18). They use the reducer's `open` action, which opens, restores or raises and never minimizes (AC15, Assumption 2).

**`src/logic/windows.ts`, AC17 only.** Four buttons do not fit on one row in hello's 484px content box (about 190 + 136 + 176 + 81 px plus gaps), so they wrap to two rows, adding about 54px. Hello's `minHeight` is `WIN_META.hello.height`, so the window grows and nothing scrolls or clips. The coder measures the rendered `[data-win="hello"]` height at 1280x720 with fonts loaded (Playwright `boundingBox`, dark and light), rounds it up to an integer and, if it is above 420, sets `WIN_META.hello.height` to it. Expected about 470-480. At 1280x720, `yFit(72, h)` keeps y at 72 while `h <= 572`, so 72 + about 476 = about 548 <= 644. Positions in every reference test stay the same.

**Data and API changes.** `START_OPEN`, `tidyWindows`, `tidyDesktop` (new exports), two `HELLO_COPY` keys, and possibly `WIN_META.hello.height`. No change to `State`, action types, storage, `Desktop`, `MenuBar`, `Dock`, `WindowLayer`, `Window` or `PhonePage`.

**Dependencies.** None.

## 4. Design

**User flow.** A visitor lands on the desktop and sees hello.txt alone over the wallpaper, with the menubar on top and the dock below. The dock shows hello as Open and the other four as Closed (no dot). From hello they can pick "See what I've built", "More about me" or "What I've been up to", and each opens its window, which flies in as usual. They can also pick "Say hi", or use the dock, the Windows menu or the terminal. Restart returns to this single-window view. Tidy up still lays out all five.

**States.**

- Loading: none new. First load has no boot screen (decision 2).
- Empty: hello alone. This is the intended starting state, not an error.
- Error: none. Everything is local and synchronous, and there is no network or storage on this path.
- Success: a hello button opens, restores or raises its target window. Clicking it again when the window is already on top changes nothing visible.

**1280x720 and larger.** hello sits at `(0.06vw, 72)`. The button row wraps to two rows, with "See what I've built" and "More about me" on the first and "What I've been up to" and "Say hi" on the second (the exact break depends on font metrics, and either way is acceptable under AC17). The window bottom stays above `vh - 76`. Larger viewports only move x. Mobile is not built (the phone page is untouched, AC20).

**Accessibility.** Native buttons named by their text. Tab order is verb, "See what I've built", "More about me", "What I've been up to", "Say hi" (AC11). The global focus ring is inherited (no `outline` change, which `Hello.test` pins). Focus stays on the button after activation (out of scope to move it). Closed windows are not in the DOM, so they add no tab stops. That shortens the first-load Tab sequence, which is intended.

**Reduced motion.** No new motion. The existing reduced-motion rule for `.hello-cta:hover/.hello-cta:active .hello-cta-face` covers the new buttons. Windows opened from the buttons follow the existing no-fly-in rule.

## 5. Risk and security

Auth, secrets and server data do not apply. No new input surface: the buttons dispatch fixed actions with literal ids.

- **R1. Tidy up silently becoming "hello only" (AC10).** Safeguard: separate `tidyDesktop`, plus a unit test asserting `tidy` and `restart` give different results from the same messy state (T2).
- **R2. Restart leaving windows open (AC8).** Safeguard: `restart` returns `initialDesktop`. Unit tests use a state with every window open or minimized. `Desktop.boot` tests cover menu and terminal, and boot and reduced motion (T2).
- **R3. Test churn weakening coverage (AC25).** This is the main risk. Safeguard: section 7a's two-step method. In T1, only _setup_ edits are made while the old behaviour is still in place, so the edited suite is proven green against the old code. In T2, only _expected values_ change. Every non-hello assertion is kept and reached through the dock.
- **R4. The test setup disturbing focus or roving tabindex.** Opening windows through the menubar would move the menubar's roving stop to "Windows" and break Tab-sequence tests for reasons unrelated to T15. Safeguard: the helper dispatches synthetic clicks on dock buttons (`fireEvent.click` / Playwright `dispatchEvent('click')`), which move no focus and no sequential-navigation start point. The helper is itself tested (T1).
- **R5. Fly-in skewing e2e measurements.** Windows opened after load fly in. Safeguard: the e2e helper waits until every `[data-win]` has no running animations before returning (T5). In unit tests the helper runs synchronously right after `render`, before the ready frame, so nothing flies in.
- **R6. Hello overlapping the dock after wrapping (AC17).** Safeguard: measure, then set `WIN_META.hello.height`. The existing layout AC3 and dock AC2 tests and the e2e AC48 test then guard it automatically (T4).
- **R7. Copy-ban and purity tests.** Safeguard: the naming rules in section 3.
- **R8. Unverified edit list.** This plan was written without running the suites. Safeguard: T1 and T5 start by running the suites, and the test-writer reconciles section 7a against the real failures. Any failure outside 7a is a regression to fix in `src/`, not a test edit.

## 6. Gaps check

- **Auth:** none in this app.
- **Validation:** no new input. The reducer already rejects invalid ids.
- **Error handling:** no failure path.
- **Mobile:** out of scope. The phone page is untouched (AC20).
- **Accessibility:** native buttons, Tab order (AC11), no new focus traps. Closed windows are absent from the DOM.
- **Config and env vars:** none.
- **Tests:** logic, Hello component, Desktop integration, e2e (new spec), the shared open-all helper with its own test, and the sanctioned edits in 7a.

## 7. Tasks

Coder edits `src/` only. Test-writer owns `tests/`. Each task leaves `npm run lint`, `npm run typecheck` and `npm test` green. New tests use a `T15 ACn:` prefix. Every edit to an existing test carries `// DELIBERATE REQUIREMENT CHANGE (T15 AC25): <reason>`.

- **T1. Test setup that opens the other four windows (no `src` change).** ACs: AC25 (setup half), AC7.
  - Test-writer: add `tests/helpers/openAll.ts` with `openAllFromDock()`. It calls `fireEvent.click` on the dock buttons for proj, exp, term, about, then hello. A closed window opens and an open window behind is raised, so the result is all five open with order `INITIAL_ORDER`, which equals the Tidy up state, both before and after T2. Add a case to `tests/helpers.test.ts` asserting that after `render(<Desktop />)` and the helper: five `[data-win]`, z-indexes match `zIndexFor(id, INITIAL_ORDER)`, positions match `layout()`, `document.activeElement` is `body`, and the "tanzi.os" trigger still has `tabIndex` 0.
  - Apply every **setup** edit in 7a (unit files only). The suite must be green on unchanged `src/`, which proves that the setup reproduces the old precondition.
- **T2. Only hello at start and Restart; Tidy up unchanged.** ACs: AC1-AC3, AC7-AC10, AC21, AC22 (logic part), AC23 (AC4-AC6).
  - Coder: section 3 changes to `layout.ts` and `desktop.ts`.
  - Test-writer: apply every **expected-value** edit in 7a for unit files. New cases:
    - `tests/logic/layout.test.ts`: AC1 at all `SIZES` plus 800x500; AC2 closed windows at layout positions; AC3 fresh copy; `tidyWindows` all dock open.
    - `tests/logic/desktop.test.ts`: `restart` from an all-open-and-minimized state gives hello only; `tidy` from the same state gives five open; `tidy` and `restart` results are not equal; `tidyDesktop` keeps `vw`/`vh`.
    - New `tests/Desktop.start.test.tsx`:
      - AC4: one `[data-win]` at layout position.
      - AC5: dock states via `aria-pressed`, description and dot.
      - AC6: Windows menu checks.
      - AC7: dock, menu and `open about` each open a closed window, which can then be dragged, minimized and closed.
      - AC8 at component level: menu and terminal, stubbed reduced motion and the real boot with `Math.random` at 0. The terminal is closed after a terminal `restart`. Focus is on the trigger.
- **T3. hello buttons.** ACs: AC11-AC16, AC18, AC19, AC22 (Hello part), AC23 (AC15).
  - Coder: `HELLO_COPY.about` and `HELLO_COPY.experience`, plus the two buttons in `Hello.tsx`.
  - Test-writer, in `tests/windows/Hello.test.tsx`:
    - AC11: DOM order and Tab order.
    - AC12: labels from `HELLO_COPY`, and no new literal in `Hello.tsx`.
    - AC13 and AC14: each is a native `type=button`; click, Enter and Space each dispatch exactly one `open` with the right id.
    - AC16: each new button is a `.hello-cta` host with a `.btn.btn-secondary.hello-cta-face` child; exactly one `.btn-primary` in hello; no svg in the new buttons.
    - AC19: changing the verb still dispatches nothing.
  - In `tests/Desktop.start.test.tsx`, AC15 for all three buttons: closed opens; minimized (via the window's Minimize button) restores and raises; open-but-behind (raise hello with a pointerdown first) raises to max z; already on top stays open and on top, with `data-min="false"`. Apply the 7a "hello buttons" expected-count edits (+2 hello stops and buttons).
- **T4. Hello height (AC17).** ACs: AC17.
  - Coder: measure as in section 3. If the height is above 420, set `WIN_META.hello.height`. If it is at most 420, change nothing and skip the 7a edits for this task.
  - Test-writer: update the height pins listed in 7a under T4. Add a `T15 AC17` unit case: `layout(1280, 720).hello.y + WIN_META.hello.height <= 720 - DOCK_CLEARANCE`.
- **T5. End to end.** ACs: AC4-AC6, AC8, AC10, AC15, AC17, AC20, AC24, AC25 (e2e), AC26.
  - Test-writer: add `tests/e2e/helpers/openAll.ts` with `openAllFromDock(page)`. It calls `dispatchEvent('click')` on dock buttons proj, exp, term, about, hello, then `expect.poll` until there are five `[data-win]`, each with `el.getAnimations().length === 0`. The file has no `.spec` suffix, so it is not collected.
  - Apply the e2e edits in 7a.
  - New `tests/e2e/start.spec.ts`, with `watchErrors` in every test:
    - AC4: only hello, at reference (x, y).
    - AC5 and AC6: dock and menu states.
    - AC15: each hello button opens its window. Repeat for minimized and behind on one button.
    - AC17: `boundingBox` bottom <= 644 in dark and light; every `.hello-cta` box is inside the hello box and none overlap; hello `scrollHeight <= clientHeight`.
    - AC8: Restart from the menu and from the terminal, with and without `emulateMedia({ reducedMotion: 'reduce' })`, leaves exactly one window.
    - AC10: Tidy up from the menu gives five.
    - AC20: `phone.spec.ts` unchanged and passing.
  - Run the full AC26 set.

**After T5 (QA).** Confirm `git diff` on existing tests shows only 7a edits plus additive cases. Each edit carries the marker. List every edit in the QA report and the autobuild log.

### 7a. Existing tests this ticket changes (sanctioned under AC25)

Located by content. Assertions are never removed or relaxed. A post-Restart or first-load assertion about a non-hello window is kept by first asserting the new expected state (closed), then opening the window from the dock and running the original assertion. **Setup** edits land in T1 (or T5 for e2e). **Expected** edits land in the task named. The test-writer must run each suite first and reconcile this list with the real failures (R8).

**Unit, setup edits (T1)**

| File                                                                                                                                                                                                      | Edit                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/logic/desktop.test.ts`                                                                                                                                                                             | `fresh()` returns `desktopReducer(initialDesktop(vw, vh), { type: 'tidy' })`, frozen. The AC2 "five dock windows" test builds from `initialDesktop` directly (it pins the start state).                                                                                                                                                                     |
| `tests/logic/menu.test.ts`                                                                                                                                                                                | `desk()` and the two `let app = initialApp(...)` setups in the AC19 checked tests get `appReducer(..., { type: 'tidy' })`.                                                                                                                                                                                                                                  |
| `tests/logic/system.test.ts`                                                                                                                                                                              | `busy()` starts from `appReducer(initialApp(...), { type: 'tidy' })`, so "close term" still changes something.                                                                                                                                                                                                                                              |
| `tests/WindowLayer.test.tsx`, `tests/T07.foundations.test.tsx`                                                                                                                                            | Harness `useReducer` initialiser: `desktopReducer(initialDesktop(1280, 720), { type: 'tidy' })`. The T07 AC4 `Object.keys(initialDesktop(...))` comparison is unchanged.                                                                                                                                                                                    |
| `tests/MenuBar.test.tsx`                                                                                                                                                                                  | Harness initialiser and `latest` seed: `appReducer(initialApp(...), { type: 'tidy' })`. The `bare()` focusSignal harness at "T08 AC25" is unchanged.                                                                                                                                                                                                        |
| `tests/Dock.test.tsx`                                                                                                                                                                                     | `winsWith` base and `setup` default use the tidy state, which the "default state is open" comment relies on.                                                                                                                                                                                                                                                |
| `tests/Desktop.wiring.test.tsx`, `tests/Desktop.dock.test.tsx`, `tests/Desktop.menubar.test.tsx`, `tests/Desktop.terminal.test.tsx`, `tests/Desktop.boot.test.tsx`, `tests/Desktop.boot.renders.test.tsx` | `openAllFromDock()` directly after each `render(<Desktop />)` in every test that touches about, exp, proj or term, or counts windows, buttons or tab stops. Exceptions: tests that only use hello, the menubar, the dock or the root are left alone. In `Desktop.boot.test.tsx` and `Desktop.boot.renders.test.tsx` call it before the first timer advance. |

**Unit, expected edits (T2)**

| File                                                                                                        | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/logic/layout.test.ts` "AC7: initialWindows uses layout positions and open flags"                     | `open` expected `id === 'hello'` (was `id !== 'site'`).                                                                                                                                                                                                                                                                                                                                                                                                            |
| `tests/logic/desktop.test.ts` "AC2: five dock windows open…"                                                | hello `{ open: true }`, other four `{ open: false, min: false }`. The site and order assertions are kept.                                                                                                                                                                                                                                                                                                                                                          |
| `tests/logic/desktop.test.ts` "AC12: tidy restores…"                                                        | `toEqual(tidyDesktop(1600, 900))` (was `initialDesktop`). "AC13: restart…" is unchanged and passes.                                                                                                                                                                                                                                                                                                                                                                |
| `tests/logic/system.test.ts` "AC29: … Restart and Tidy keep the settings"                                   | `term.open` expected `type === 'tidy'`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `tests/logic/system.test.ts` "initialApp builds the desktop…"                                               | term `open: false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tests/Desktop.dock.test.tsx` "T06 AC15: initially all five windows read Open"                              | Expected `states({ about: 'Closed', exp: 'Closed', proj: 'Closed', term: 'Closed' })`. This test pins first load, so it gets no open-all setup.                                                                                                                                                                                                                                                                                                                    |
| `tests/Desktop.dock.test.tsx` "T06 AC15: Tidy up and Restart reset the dock to all open"                    | For Restart, the expected (in `waitFor` and after it) is the four Closed. Then `openAllFromDock()` and `expectAll(states())`. Tidy is unchanged.                                                                                                                                                                                                                                                                                                                   |
| `tests/Desktop.menubar.test.tsx` "AC29: ${item} keeps light, grid…"                                         | For Restart only, assert the four non-hello windows absent, then `openAllFromDock()` before any non-hello assertion. Tidy is unchanged.                                                                                                                                                                                                                                                                                                                            |
| `tests/Desktop.boot.test.tsx` (T08 AC15, AC16, AC20 "terminal runs commands after Restart", AC18 no fly-in) | After each Restart, assert only hello is present. Then `openAllFromDock()` and keep the original per-window assertions (default positions and z-order, verb `VERBS[0]`, first experience tab, banner only, empty input and history). For AC18, do the open-all step in a later frame so the original "every open window has no transform" check runs on hello in the reset commit. The T08 AC25 Tab-sequence-equals-fresh-load test is expected to pass unchanged. |

**Unit, hello buttons (T3)**

| File                                                                                                      | Edit                                                                                                             |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tests/T07.foundations.test.tsx` "T07 AC2: HELLO_COPY literal values"                                     | Add `about` and `experience` to the expected literal.                                                            |
| `tests/windows/Hello.test.tsx` "T07 AC10: tab order is verb, primary button, then Say hi"                 | Two more `user.tab()` with assertions on "More about me" and "What I've been up to" before the Say hi assertion. |
| `tests/Desktop.wiring.test.tsx` "AC22 -> T04 AC5-AC7…"                                                    | Window buttons 12 -> 14. Hello list appends `'More about me', "What I've been up to"`.                           |
| `tests/Desktop.menubar.test.tsx` (window-button count near the T07 AC52 comment, about line 332)          | +2.                                                                                                              |
| `tests/Desktop.dock.test.tsx` "T06 AC25: Tab runs menubar, window controls, then the seven dock controls" | 31 -> 33 stops, `slice(24)` -> `slice(26)`, Set size 33.                                                         |
| `tests/MenuBar.test.tsx` "AC36: after Minimize all no window control is reachable"                        | `buttons.length` 10 is unaffected: that harness renders no bodies. Confirm by running.                           |

**Unit, height (T4, only if the height changes)**

| File                                                                              | Edit                                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `tests/windows/Hello.test.tsx` "T07 AC47: hello keeps its WIN_META height of 420" | Expected the measured value. The width assertion is kept. |

**E2e (T5).** In each file, add `await openAllFromDock(page)` in the shared `load`/`setup` helper, or after `goto` in tests without one. Skip tests that pin first load. Then:

| File                                                                                              | Edit                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/desktop.spec.ts`                                                                       | The `toHaveCount(5)` reference-position test (AC24 of T03) gets the setup. Add no other change. The region-name test likewise.                                                                                                                                                                            |
| `tests/e2e/chrome.spec.ts`                                                                        | Setup. Button counts near the T05 and T07 comments (lines 179-185) +2. Total-stops test near line 336 +2. Every "skip N stops" offset that counts past hello's body (near lines 366-438) +2.                                                                                                              |
| `tests/e2e/dock.spec.ts`                                                                          | Setup, except any initial-Open-states test, whose expected becomes the four Closed. Tab-stop totals near lines 613-645 +2 where hello is counted.                                                                                                                                                         |
| `tests/e2e/menubar.spec.ts`                                                                       | Setup. First-tab-stops tests +2 only where they count past hello's body. Windows-menu "all checked" expects only hello.txt checked if it pins first load, otherwise setup. In the AC29 Restart `REFERENCE` poll, assert the four absent after Restart, then `openAllFromDock` and keep the position poll. |
| `tests/e2e/windows.spec.ts`                                                                       | `load()` gets the setup. `HEIGHTS.hello` becomes the T4 value.                                                                                                                                                                                                                                            |
| `tests/e2e/windows.motion.spec.ts`, `tests/e2e/dock.motion.spec.ts`, `tests/e2e/projects.spec.ts` | Setup after `goto`, where non-hello windows are used.                                                                                                                                                                                                                                                     |
| `tests/e2e/boot.spec.ts`                                                                          | Setup before dirtying state. Post-Restart: assert only hello, then `openAllFromDock` and keep the per-window checks. The fresh-load Tab sequence recorded in the same test needs no edit.                                                                                                                 |

**Checked and needing no edit:** `tests/logic/{zorder,dock,drag,windows,terminal,purity,motion}.test.ts`, `tests/Window.test.tsx`, `tests/App*.test.tsx`, `tests/Desktop.test.tsx` (root and children shape only), all contrast and CSS tests, `tests/PhonePage*.test.tsx`, and `tests/e2e/{phone,fonts,theme-init,smoke,build.preview}.spec.ts`.

## 8. Open questions

None need a human. Decided unattended:

1. **Tidy up stays all open** (spec and Assumption 1) through a separate `tidyDesktop`, not a flag on `initialDesktop`, so the two reducer cases are explicit.
2. **The start set is a constant** (`START_OPEN = ['hello']`) rather than a new `WIN_META` field, to keep `WIN_META` tests untouched.
3. **No icons** on the new buttons. This keeps the primary dominant and avoids extra a11y pins (Assumption 5 allows either).
4. **Keys** `HELLO_COPY.about` and `HELLO_COPY.experience`.
5. **Tests reach non-hello windows through dock clicks**, dispatched synthetically so focus and roving tabindex are untouched (R4). Tidy up through the menu would move the menubar's roving stop. In reducer-level tests, `{ type: 'tidy' }` serves as explicit reducer setup.
6. **Setup edits first (T1), expected edits second (T2).** The rewritten setups are proven green against the old behaviour before any behaviour changes.
7. **Hello height** is set from measurement, not guessed. The edit is skipped if the height stays at or below 420.
8. **Test titles that state the superseded requirement** (for example "initially all five windows read Open") keep their title. The DELIBERATE comment explains the new expectation. This follows T08's "titles do not change" precedent, so the QA diff stays easy to audit.
