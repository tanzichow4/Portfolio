# T02 plan: pure logic modules and unit tests

Source: `docs/plans/00-requirements.md` (current state, module contract, assumptions A1-A11, AC1-AC39), `docs/design-decisions.md` (decisions 5, 6, 7, 8 and the spec gaps on `site` z-order, the email and the version string), and the prototype logic in `design_handoff_tanzi_os/Tanzi OS.dc.html` lines 204-212 and 232-341.

## 1. Goal and scope

**Goal.** Add pure, framework-free TypeScript modules under `src/logic/` for window metadata, layout, z-order, dock click logic, drag clamp and tilt, the terminal `runCommand`, and command history, each covered by Vitest unit tests. T03 imports these modules from the `Desktop` reducer and the `Terminal` component, so this ticket fixes their signatures and changes no UI.

**Already done, not redone:** `WinId`, `Win`, `Theme`, `Wall` in `src/types.ts`; `EXP`, `PROJECTS`, `LINKS` in `src/data.ts`; Vitest config (`tests/**/*.test.{ts,tsx}`, jsdom, globals); the `?raw` import pattern already used in `tests/fonts.test.ts`.

**Out of scope** (carried over): wiring into `Desktop`, the reducer, actions, resize listeners, and fixing `State` (`verb`, `tab`, `cmd`, `lines`) (T03); `useDrag`, pointer capture, `touch-action`, rAF, genie math (T04); rendering the terminal and the tone-to-color CSS (T03/T07); applying effects (theme, wallpaper, localStorage, tidy, restart, boot); menus (T05) and dock UI (T06); tab completion, `open terminal`/`open site`, new commands or aliases, case-insensitive commands; a history cap or keeping history across close or restart; mobile; extracting the about and hello copy (T10); any edit to `design_handoff_tanzi_os/`.

**Dependency on T03.** T03 consumes every export listed in section 3 by name. The signatures below are the contract. Change them only with a matching note in T03's plan.

## 2. Acceptance criteria

AC1-AC39 are copied from `00-requirements.md` with the same numbers and meaning. Short form:

- **AC1.** `layout(vw, vh)` returns `{ x, y }` for all six ids, all finite integers, for `vw`, `vh` in `[0, 4000]`.
- **AC2.** For every id except `site`, `x` is in `[16, vw - width - 16]` when `vw - width - 32 >= 0`, otherwise 16.
- **AC3.** At 1280x720, 1366x768, 1440x900, 1536x864 and 1920x1080, every id has `y >= 36` and `y + nominalHeight(id) <= vh - 76`.
- **AC4.** At 1440x900 and 1920x1080, `x` equals the spec formula (hello `0.06vw`, about `0.5vw`, exp `0.05vw`, proj `0.42vw`, term `vw - 470`, rounded then clamped as in AC2). `y` equals the spec formula (hello 72, about 64, exp `max(380, 0.52vh)`, proj `max(300, 0.38vh)`, term `max(330, vh - 380)`, rounded), unless that would break AC3. In that case `y` is the largest integer that satisfies AC3.
- **AC5.** `site`: `x = round(vw/2 - 170)`, `y = round(vh/2 - 180)`, then clamped to `y >= 36`.
- **AC6.** `INITIAL_ORDER` is `['proj', 'exp', 'term', 'about', 'hello']` (back to front), without `site`.
- **AC7.** `initialWindows(vw, vh)` returns the `layout` positions, `open: true, min: false` for the five dock windows, `open: false, min: false` for `site`, and `order` as a fresh copy of `INITIAL_ORDER`.
- **AC8.** Layout is deterministic: equal inputs give deep-equal outputs.
- **AC9.** `raise(order, id)` returns a new array with `id` last and the others in their existing relative order. An id that is missing gets appended.
- **AC10.** If `id` is already last, `raise` returns the same reference.
- **AC11.** `topMost(order, wins)` returns the last id in `order` that is `open && !min`, or `null`. Ids that are not in `order` are ignored.
- **AC12.** `zIndexFor('site', order)` is 800. Other ids get `indexOf + 10`, always below 900, and an id not in `order` gets at least 10.
- **AC13.** `dockClickAction` returns `'open'` (closed, whatever `min` is), `'restore'` (open and minimized), `'focus'` (visible, not top-most) or `'minimize'` (visible and top-most).
- **AC14.** A table-driven test covers those four branches plus three cases: the only visible window; a minimized window that is last in `order` with a visible one below it; and `site` open and top-most.
- **AC15.** `clampPosition` keeps `x` in `[80 - width, vw - 80]` and `y` in `[36, vh - 60]`. Positions already in range are unchanged. If `vh - 60 < 36`, `y` is 36.
- **AC16.** `clampPosition` is idempotent.
- **AC17.** `dragPosition(origin, { dx, dy }, ...)` equals `clampPosition({ x: origin.x + dx, y: origin.y + dy }, ...)`.
- **AC18.** `tiltFor(m, enabled)` is `clamp(m * 0.7, -7, 7)` when enabled and 0 otherwise. It never returns `-0` or NaN, and a non-finite input gives 0.
- **AC19.** Input is trimmed and split on whitespace into `head` and `arg`, where `arg` is the remaining words joined with single spaces. The first line is the echo `{ text: 'tanzi ~ % ' + trimmed, tone: 'cmd' }`, except for `clear`. Matching is case-sensitive.
- **AC20.** Empty or whitespace-only input gives only the echo and no effects.
- **AC21.** At most one effect per call, and only from the commands in AC23-AC27.
- **AC22.** Exact output for `help` (two `acc` lines), `whoami`, `ls`, `experience`, `projects` and `contact`, with all personal values taken from `data.ts`.
- **AC23.** `open X`: the eight accepted names print `opening X…` (`dim`) and return `{ type: 'open', id }`. An unknown X prints `open: no such file: X` (`dim`). No argument prints `usage: open <hello|about|experience|projects>` (`dim`).
- **AC24.** `theme dark|light` prints `theme → <t>` (`dim`) plus the effect. Anything else prints `usage: theme dark|light` (`dim`).
- **AC25.** `wallpaper nebula|grid|plain` prints `wallpaper → <w>` (`dim`) plus the effect. Anything else prints `usage: wallpaper nebula|grid|plain` (`dim`).
- **AC26.** `tidy` prints `windows tidied.` (`dim`) plus `{ type: 'tidy' }`. `restart` returns only the echo plus `{ type: 'restart' }`.
- **AC27.** `clear` returns `lines: []` and `{ type: 'clear' }`.
- **AC28.** `sudo hire-tanzi` prints `[sudo] password for recruiter: ********` (`dim`) and then `access granted → <email>` (`acc`). Any other `sudo …` prints `nice try. (psst: sudo hire-tanzi)` (`dim`).
- **AC29.** `rm …` prints `absolutely not.` (`acc`).
- **AC30.** Any other head prints `command not found: <head> — try "help"` (`dim`).
- **AC31.** `TERMINAL_BANNER` is one `dim` line: `tanzi.os v<VERSION> — type "help" to look around`.
- **AC32.** The email literal appears once in `src/` (in `data.ts`). `LINKS` and the terminal both derive from it, and a test checks that `contact` and `sudo hire-tanzi` contain the `Email` link's `href` without `mailto:`.
- **AC33.** `pushHistory` appends the trimmed non-empty command, ignores blank input, keeps consecutive duplicates and resets navigation. `clear` is recorded like any other command.
- **AC34.** `historyUp`: with an empty history it returns `value === input` and the history unchanged. The first press saves the draft and returns the newest entry. Later presses move one entry older and stop at the oldest.
- **AC35.** `historyDown`: moves one entry newer. Moving past the newest entry returns the draft and leaves navigation. Outside navigation it returns `value === input` with the history unchanged.
- **AC36.** No mutation. The sequence push `a, b, c`, input `x`, then Up x4 and Down x4 gives `c, b, a, a, b, c, x, x`.
- **AC37.** Each module has its own test file under `tests/logic/`, and `npm test` covers every AC. Coverage is optional. `@vitest/coverage-v8` is not installed, so it is **not added** (resolved: no new dependency).
- **AC38.** No logic module imports React, Phosphor or anything that touches `window`, `document` or `localStorage`. A test guards this. The Phosphor import that comes indirectly through `data.ts` is accepted.
- **AC39.** lint, typecheck, test, test:e2e, build and format:check all pass. Existing tests are unchanged and the page renders the same.

No ACs added. The gaps I found (prototype-pollution lookups, `-0`, fractional viewport sizes, readonly typing) are covered as safeguards in section 5 under the existing ACs.

## 3. Architecture

**Approach.** Seven small modules in a new `src/logic/` folder. Each exports plain functions and constants only. No React, DOM, timers, `Date` or `Math.random`, and no input is mutated. Port the behaviour from the prototype, not its code, with the changes required by decisions 6-8.

**Files and exact public surface (the T03 contract):**

| File                    | Exports                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types.ts` (edit)   | `type Tone = 'cmd' \| 'out' \| 'dim' \| 'acc'`. `Line` becomes `{ text: string; tone: Tone }` (the `color` field is removed, A1). `State` is otherwise untouched.                                                                                                                                                      |
| `src/data.ts` (edit)    | Add `NAME = 'Tanzi Chowdhury'`, `ROLE = 'software engineer'`, `EMAIL = 'hello@tanzi.dev'`, `VERSION = '1.0'`. The `LINKS` Email `href` becomes `` `mailto:${EMAIL}` ``.                                                                                                                                                |
| `src/logic/windows.ts`  | `WIN_IDS: readonly WinId[]` = `['hello','about','exp','proj','term','site']`; `interface WinMeta { width: number; height: number; dock: boolean }`; `WIN_META: Readonly<Record<WinId, WinMeta>>`; `DOCK_IDS: readonly WinId[]` (every id except `site`).                                                               |
| `src/logic/layout.ts`   | `MENUBAR_H = 36`, `DOCK_CLEARANCE = 76`; `layout(vw: number, vh: number): Record<WinId, { x: number; y: number }>`; `INITIAL_ORDER: readonly WinId[]`; `initialWindows(vw: number, vh: number): { wins: Record<WinId, Win>; order: WinId[] }`.                                                                         |
| `src/logic/zorder.ts`   | `raise(order: readonly WinId[], id: WinId): readonly WinId[]`; `topMost(order: readonly WinId[], wins: Record<WinId, Win>): WinId \| null`; `zIndexFor(id: WinId, order: readonly WinId[]): number`; `SITE_Z = 800`.                                                                                                   |
| `src/logic/dock.ts`     | `type DockAction = 'open' \| 'restore' \| 'focus' \| 'minimize'`; `dockClickAction(id: WinId, wins: Record<WinId, Win>, order: readonly WinId[]): DockAction` (uses `topMost`).                                                                                                                                        |
| `src/logic/drag.ts`     | `type Point = { x: number; y: number }`; `clampPosition(pos: Point, width: number, vw: number, vh: number): Point`; `dragPosition(origin: Point, delta: { dx: number; dy: number }, width: number, vw: number, vh: number): Point`; `tiltFor(movementX: number, enabled: boolean): number`.                            |
| `src/logic/terminal.ts` | `type TerminalEffect` (the six variants from the contract); `runCommand(raw: string): { lines: Line[]; effects: TerminalEffect[] }`; `TERMINAL_BANNER: readonly Line[]`; `PROMPT = 'tanzi ~ % '`. Imports only `EXP`, `PROJECTS`, `NAME`, `ROLE`, `EMAIL`, `VERSION` from `../data` and types from `../types`.         |
| `src/logic/history.ts`  | `interface History { readonly entries: readonly string[]; readonly index: number \| null; readonly draft: string }` (`index === null` means not navigating); `emptyHistory()`, `pushHistory(h, cmd)`, `historyUp(h, input)` and `historyDown(h, input)`, the last two returning `{ history: History; value: string }`. |

**One signature refinement (resolved).** The contract lists `raise(...): WinId[]`, but AC10 requires the input reference to be returned, and that input is `readonly WinId[]`. TypeScript does not allow both. Resolution: `raise` returns `readonly WinId[]`, and T03 types `State.order` as `readonly WinId[]` (T03 rewrites `State` anyway). `initialWindows().order` stays a mutable `WinId[]`, which can be assigned to the readonly type.

**Nominal heights (A3), kept in `WIN_META`:** hello 420, about 460, exp 300 (40 titlebar + 250 body min-height + borders), proj 330, term 310 (40 + 230 body + input row), site 340. Widths come from the spec: 560, 420, 520, 520, 440, 340. T07 may correct the heights. AC3 must keep passing, and the tests read heights from `WIN_META`.

**Layout rule (meets AC2-AC5 at every size):**

- `xClamp(x, w) = max(16, min(round(x), floor(vw - w - 16)))`.
- `yFit(y, h) = max(36, min(round(y), floor(vh - 76 - h)))`.
- `site` uses `x = round(vw/2 - 170)` and `y = max(36, round(vh/2 - 180))`.
- Normalize every value with `+ 0` so `-0` never appears.
- `floor` keeps fractional viewports on integers (AC1).

Reference values with the heights above (useful as a sanity check; the tests compute expectations from the formula and `WIN_META`):

| vw x vh   | hello  | about  | exp    | proj    | term     | site    |
| --------- | ------ | ------ | ------ | ------- | -------- | ------- |
| 1280x720  | 77,72  | 640,64 | 64,344 | 538,300 | 810,334  | 470,180 |
| 1440x900  | 86,72  | 720,64 | 72,468 | 605,342 | 970,514  | 550,270 |
| 1920x1080 | 115,72 | 960,64 | 96,562 | 806,410 | 1450,694 | 790,360 |

The terminal's formula `vh - 380` plus a height of 310 always crosses `vh - 76`, so `term` always sits 6px higher than the formula. This is expected under AC4.

**Other rules:**

- **Drag.** `clampPosition` uses `x = max(80 - width, min(vw - 80, x))` and `y = max(36, min(vh - 60, y))`. The lower bound wins when the range is empty, as in the prototype and AC15. No rounding (A5). It returns a new object.
- **Tilt.** `tiltFor` returns 0 if `!enabled || !Number.isFinite(m)`. Otherwise it computes `t = max(-7, min(7, m * 0.7))` and returns `t === 0 ? 0 : t`.
- **Z-index.** `zIndexFor`: `site` gives 800. Otherwise `max(order.indexOf(id), 0) + 10`.
- **Terminal lookups.** Lookups use `ReadonlyMap` or `includes` on constant arrays, never plain-object indexing (see R1). `sudo hire-tanzi` matches on `head === 'sudo' && arg === 'hire-tanzi'`, so extra spaces in between still match, which fits AC19's normalization. Exact Unicode characters: `…` U+2026, `—` U+2014, `→` U+2192, `·` U+00B7.

**Data and API changes.** Only `Line` (A1) and the four new `data.ts` constants. `State.lines` still typechecks. No storage, no network, no env vars.

**Dependencies.** None added. Coverage tooling is skipped (AC37 allows that).

## 4. Design

There is no UI change in this ticket. The rendered page, the user flow and every visual state stay the same (the smoke test and the e2e tests confirm it). The design choices that carry into later tickets:

- **User flow.** Desktop behaviour at 1280x720 and larger is decided here through the layout values: every window fits between the menubar and the dock (AC3). Below 1280x720, values are only finite and clamped (mobile is out of scope, decision 1).
- **States.** No state rendering happens here. Terminal "error" states are `dim` usage, no-such-file and not-found lines rather than exceptions. No pure function throws on any string or number input.
- **Accessibility.** `Line.tone` keeps text semantics apart from color, and T03/T07 map tones to tokens that already pass AA (T01). Echoed input is plain text and must be rendered as React text, never HTML (A11, carried to T03/T07).
- **Reduced motion.** `tiltFor(m, enabled)` takes the caller's `wobble && !prefersReducedMotion` and returns exactly 0 when it is disabled. The module itself never reads media queries.

## 5. Risk and security

| #   | Risk                                                                                                                                       | Safeguard (task)                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Plain-object lookup: in the prototype, `open constructor` or `wallpaper toString` is truthy and would open a function or set a bogus wall. | Use `Map` and `includes` lookups (T6). Tests run `open constructor`, `open __proto__`, `wallpaper toString` and `theme constructor` and expect the no-file or usage line with no effect (T12). |
| R2  | Untrusted terminal input reaches the DOM.                                                                                                  | Lines are plain strings. The rule is noted for T03/T07 (render as text). Tests include `<img src=x onerror=1>` and expect it echoed verbatim, with no effect (T12).                            |
| R3  | Pathological input (very long or many spaces) is slow or throws.                                                                           | Use one `trim` and one `split(/\s+/)`, with no regex backtracking. Test a 10,000-character input and tabs or newlines mixed in (T12).                                                          |
| R4  | `-0` or non-integer layout values make tests flaky or put windows on half pixels.                                                          | Use `+ 0` normalization and `floor`ed bounds (T3). Property test over a grid of `vw` and `vh` in `[0, 4000]`, including fractional values like 1280.5 (T9).                                    |
| R5  | The nominal heights are guesses, and T07 may change them.                                                                                  | Heights live only in `WIN_META`. Layout tests derive expectations from it, so a change keeps the tests meaningful (T3, T9).                                                                    |
| R6  | Input mutation leaks between reducer states.                                                                                               | Tests deep-freeze inputs (`Object.freeze` on arrays, records and history) before calling any function (T10, T11, T13).                                                                         |
| R7  | A logic module silently starts using `window` or React later.                                                                              | Purity test over `import.meta.glob('/src/logic/*.ts', { query: '?raw', import: 'default', eager: true })`. It also asserts that all seven files are found, so an empty glob cannot pass (T14). |
| R8  | The email gets duplicated again.                                                                                                           | A source-scan test counts `EMAIL` occurrences across `src/**/*.{ts,tsx}` and expects exactly 1 (T12).                                                                                          |
| R9  | T03 drifts from these signatures.                                                                                                          | The signatures are frozen in section 3. Tests import every named export, so a rename breaks typecheck.                                                                                         |
| R10 | `padEnd(12)` with a name or date of 12 characters or more gives no gap.                                                                    | Accepted. It matches the prototype (spec copy), and the test uses the real formula, not hard-coded strings.                                                                                    |

Auth, data exposure and network: not applicable (no network, no storage, no secrets). The only "personal" data is the public email, now single-sourced.

## 6. Gaps check

- **Auth:** none in this app. N/A.
- **Validation:** terminal input is the only untrusted input (R1-R3). Numeric inputs: AC1 covers `[0, 4000]` including fractional values, and `tiltFor` guards non-finite input.
- **Error handling:** pure functions are total and never throw. Bad commands give usage or not-found lines.
- **Mobile:** out of scope (decision 1). Small viewports only need finite, clamped values.
- **Accessibility:** no UI. Tone semantics and the reduced-motion parameter are noted in section 4.
- **Config and env vars:** none. No `.env`, no eslint or vite config change (the purity guard is a test, which is the simpler option).
- **Tests:** one test file per module under `tests/logic/`, plus a purity test and the email single-source test. Existing tests stay untouched.

## 7. Tasks

Coder tasks (T1-T7, `src/` only) and test-writer tasks (T8-T14, `tests/` only) can run in parallel, because the tests are written against the signatures in section 3. **Commit order rule:** a test task is committed only after the src task it names, so the suite is green at every commit. Suggested interleave: T1, T2, T8, T3, T9, T4, T10, T5, T11, T6, T12, T7, T13, T14, T15.

| Task | Owner  | Files                                                    | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ACs              |
| ---- | ------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| T1   | coder  | `src/types.ts`, `src/data.ts`                            | Add `Tone`, and replace `Line.color` with `tone`. Add `NAME`, `ROLE`, `EMAIL`, `VERSION`, and derive the `LINKS` Email href from `EMAIL`. Existing `tests/data.test.ts` stays green.                                                                                                                                                                                                                                                                      | AC22, AC31, AC32 |
| T2   | coder  | `src/logic/windows.ts`                                   | `WIN_IDS`, `WinMeta`, `WIN_META` (widths, nominal heights from section 3, dock flag), `DOCK_IDS`.                                                                                                                                                                                                                                                                                                                                                         | AC2, AC3         |
| T3   | coder  | `src/logic/layout.ts`                                    | `MENUBAR_H`, `DOCK_CLEARANCE`, `layout` (xClamp, yFit, site rule, `-0` normalization), `INITIAL_ORDER`, `initialWindows`.                                                                                                                                                                                                                                                                                                                                 | AC1-AC8          |
| T4   | coder  | `src/logic/zorder.ts`, `src/logic/dock.ts`               | `raise` (same reference when already last), `topMost`, `zIndexFor`, `SITE_Z`, `DockAction`, `dockClickAction`.                                                                                                                                                                                                                                                                                                                                            | AC9-AC13         |
| T5   | coder  | `src/logic/drag.ts`                                      | `Point`, `clampPosition`, `dragPosition`, `tiltFor`. Remove nothing from `src/hooks/useDrag.ts` (T04 owns it).                                                                                                                                                                                                                                                                                                                                            | AC15-AC18        |
| T6   | coder  | `src/logic/terminal.ts`                                  | `PROMPT`, `TerminalEffect`, `TERMINAL_BANNER`, `runCommand` with Map-based lookups and every output string from AC22-AC31.                                                                                                                                                                                                                                                                                                                                | AC19-AC32        |
| T7   | coder  | `src/logic/history.ts`                                   | `History`, `emptyHistory`, `pushHistory`, `historyUp`, `historyDown`. Return the same `History` reference whenever nothing changes.                                                                                                                                                                                                                                                                                                                       | AC33-AC36        |
| T8   | tests  | `tests/logic/windows.test.ts`                            | `WIN_IDS` order and contents, spec widths, `DOCK_IDS` excludes `site`, every height a positive integer.                                                                                                                                                                                                                                                                                                                                                   | AC2, AC3         |
| T9   | tests  | `tests/logic/layout.test.ts`                             | AC1 grid (0 to 4000 in steps, plus fractional values and `Number.isInteger`, `Object.is(v, -0) === false`); AC2 bounds; AC3 at the five sizes using `WIN_META` heights; AC4 expected values computed from the spec formula and capped by AC3; AC5; AC6; AC7 (fresh copy: mutating the result does not change `INITIAL_ORDER`); AC8.                                                                                                                       | AC1-AC8          |
| T10  | tests  | `tests/logic/zorder.test.ts`, `tests/logic/dock.test.ts` | Cover `raise` (move, append `site`, same reference with `toBe`, frozen input), `topMost` (null, skips minimized and closed, ignores ids not in `order`), and `zIndexFor` (`site` 800, missing id 10 or more, all below 900). The dock table holds the 4 branches plus the 3 AC14 cases.                                                                                                                                                                   | AC9-AC14         |
| T11  | tests  | `tests/logic/drag.test.ts`                               | AC15 edges (each bound, unchanged inside the range, `vh < 96`), idempotence over a grid, `dragPosition` equal to `clampPosition`, and no drift: repeated large deltas from one origin end where expected. Tilt: ±7 caps, 0 when disabled, NaN and Infinity give 0, `Object.is(tiltFor(-0, true), 0)`.                                                                                                                                                     | AC15-AC18        |
| T12  | tests  | `tests/logic/terminal.test.ts`                           | Every command and its exact lines and tones (`help`, `whoami`, `ls`, `experience`, `projects`, `contact`, `open` x8 and its failures, `theme`, `wallpaper`, `tidy`, `restart`, `clear`, `sudo`, `rm`, not-found), echo rules, whitespace normalization, case sensitivity (`HELP` not found), at most one effect, banner. Also R1 to R3 inputs, AC32 (contact and sudo contain the `LINKS` email, and a source scan finds `EMAIL` exactly once in `src/`). | AC19-AC32        |
| T13  | tests  | `tests/logic/history.test.ts`                            | Push rules (trim, blank ignored, duplicates kept, navigation reset, `clear` recorded), Up and Down edges, the AC36 sequence, and frozen-input non-mutation.                                                                                                                                                                                                                                                                                               | AC33-AC36        |
| T14  | tests  | `tests/logic/purity.test.ts`                             | Raw-glob `src/logic/*.ts` and assert all seven files are present. Forbid `from 'react'`, `react-dom`, `@phosphor-icons`, and the words `window`, `document`, `localStorage`, `Math.random`, `setTimeout`, `setInterval`, `Date` (word-boundary regex). The only allowed non-type imports are `./*` siblings and `../data`.                                                                                                                                | AC37, AC38       |
| T15  | either | `docs/plans/plan.md` (status), `docs/qa/` report         | Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check`. Confirm `git diff` shows no changes to existing test files.                                                                                                                                                                                                                                                                          | AC37, AC39       |

## 8. Open questions

None blocking. This was an unattended run, so each item was resolved with the simplest option:

1. **`raise` return type.** It returns `readonly WinId[]` so it can satisfy AC10. T03 types `State.order` as readonly (section 3).
2. **Nominal heights.** hello 420, about 460, exp 300, proj 330, term 310, site 340, kept in `WIN_META`. T07 may tune them, and AC3 must keep passing.
3. **`TONE_COLOR` map.** Not added in T02. The tone-to-token mapping belongs to the Terminal component (T03/T07).
4. **Purity guard.** A test, not an eslint rule. This means no config change.
5. **Coverage.** Not added, since `@vitest/coverage-v8` is not installed (AC37).
6. **For later human confirmation, not blocking:** whether to record `NAME`, `ROLE`, `EMAIL` and `VERSION` in the Decisions log as the answer to the "Version string" and "Hard-coded email" spec gaps, and whether `open` should accept `terminal` or `site` (currently no, per decision 8).
