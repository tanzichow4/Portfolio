# T02 requirements: pure logic modules and unit tests

## Goal

Add pure, framework-free TypeScript modules for the window layout, z-order, dock click logic, drag clamping (plus wobble tilt) and the terminal (`runCommand` plus command history), each fully covered by Vitest unit tests. T03 imports these modules from the `Desktop` reducer and the `Terminal` component, so this ticket fixes their boundaries and signatures and does not change any UI.

## Current state (observed, so the planner does not redo finished work)

- `src/types.ts` already has `WinId`, `Win { x, y, open, min }`, `Theme`, `Wall`, `Line { text, color }` and the spec's full `State`. That `State` still has `verb`, `tab`, `cmd` and `lines`, which go against decision 5. Fixing `State` belongs to T03, not here.
- `src/data.ts` has `EXP`, `PROJECTS`, `LINKS` (the email exists only as `mailto:hello@tanzi.dev` in the `Email` link), `FACTS`, `VERBS` and `RESUME_URL`. It has no name, role, version or window metadata.
- `src/Desktop.tsx`, `Window.tsx`, `Dock.tsx` and `windows/Terminal.tsx` are stubs. `src/hooks/useDrag.ts` is an empty stub whose comment states the clamp rule. No logic module exists yet, and nothing under `src/` does layout, z-order, clamping or command handling.
- Tests: `tests/data.test.ts`, `tests/Desktop.test.tsx` (a smoke test) and the T01 token, contrast, font and theme-init tests. Vitest picks up `tests/**/*.test.{ts,tsx}` (jsdom, globals).
- The prototype reference logic is `layout()`, `top()`, `raise()`, `dockClick()`, `startDrag()` and `run()` in `design_handoff_tanzi_os/Tanzi OS.dc.html` (lines 232-341).

## Module contract (boundaries and signatures T03 relies on)

These are the public surfaces the ACs test. File names are suggestions. The names, inputs and outputs are the contract. Every module is pure: no React, no DOM, no `window`, no `localStorage`, no timers, no `Math.random`, and inputs are never mutated.

| Module                      | Public surface                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| window metadata (one place) | `WIN_IDS: readonly WinId[]` (`hello, about, exp, proj, term, site`), plus per id: width (hello 560, about 420, exp 520, proj 520, term 440, site 340), a nominal height used only by layout, and whether the id is in the dock (`site` is not). Window labels and icons are not needed in T02.   |
| `layout`                    | `layout(vw: number, vh: number): Record<WinId, { x: number; y: number }>`, `INITIAL_ORDER: readonly WinId[]`, and `initialWindows(vw, vh): { wins: Record<WinId, Win>; order: WinId[] }`                                                                                                         |
| `zorder`                    | `raise(order: readonly WinId[], id: WinId): WinId[]`, `topMost(order, wins): WinId \| null` and `zIndexFor(id, order): number`                                                                                                                                                                   |
| `dock`                      | `dockClickAction(id, wins, order): 'open' \| 'restore' \| 'focus' \| 'minimize'`                                                                                                                                                                                                                 |
| `drag`                      | `clampPosition(pos: { x; y }, width: number, vw: number, vh: number): { x; y }`, `dragPosition(origin: { x; y }, delta: { dx; dy }, width, vw, vh): { x; y }` and `tiltFor(movementX: number, enabled: boolean): number`                                                                         |
| `terminal`                  | `runCommand(raw: string): { lines: Line[]; effects: TerminalEffect[] }`, `TERMINAL_BANNER: Line[]`, and `TerminalEffect` = `{ type: 'open'; id: WinId } \| { type: 'theme'; theme: Theme } \| { type: 'wallpaper'; wall: Wall } \| { type: 'tidy' } \| { type: 'restart' } \| { type: 'clear' }` |
| `history`                   | `History` (immutable value) with `emptyHistory()`, `pushHistory(h, cmd): History`, `historyUp(h, input): { history; value }` and `historyDown(h, input): { history; value }`                                                                                                                     |

`Line` gets a semantic `tone: 'cmd' \| 'out' \| 'dim' \| 'acc'` in place of a raw CSS `color` string. The Terminal component (T03 or T07) maps the tones to `--color-text`, `--color-neutral-300`, `--color-neutral-500` and `--color-accent-400`. A `TONE_COLOR` map may live next to the type.

## Acceptance criteria

### Layout (decision 7: minimum 1280x720, tune the formulas)

- **AC1.** `layout(vw, vh)` returns an `{ x, y }` for all six ids. Every value is a finite integer (no NaN or Infinity), for any `vw` and `vh` in `[0, 4000]`.
- **AC2.** For every id except `site`, `x` lies in `[16, vw - width - 16]` whenever `vw - width - 32 >= 0`. Otherwise `x` is 16. This is the spec's x clamp.
- **AC3 (fits at the minimum size).** At 1280x720, 1366x768, 1440x900, 1536x864 and 1920x1080, every window `id` satisfies `y >= 36` (below the menubar) and `y + nominalHeight(id) <= vh - 76` (above the dock: 14px offset + 46px button + 2x8px padding).
- **AC4 (prototype character kept).** At 1440x900 and 1920x1080, each window's `x` equals the spec formula (hello `0.06vw`, about `0.5vw`, exp `0.05vw`, proj `0.42vw`, term `vw - 470`, each rounded and then clamped as in AC2). Each `y` equals the spec formula (hello 72, about 64, exp `max(380, 0.52vh)`, proj `max(300, 0.38vh)`, term `max(330, vh - 380)`, rounded) unless that value would break AC3. In that case it is the largest integer that satisfies AC3.
- **AC5.** `site` is centered: `x = round(vw/2 - 170)` and `y = round(vh/2 - 180)`, then clamped to `y >= 36`.
- **AC6.** `INITIAL_ORDER` is `['proj', 'exp', 'term', 'about', 'hello']` (back to front) and does not contain `site`.
- **AC7.** `initialWindows(vw, vh)` returns `wins` with the `layout(vw, vh)` positions, `open: true, min: false` for the five dock windows, `open: false, min: false` for `site`, and `order` equal to a fresh copy of `INITIAL_ORDER`. T03 uses this one function for the first load, Tidy up, the `tidy` command and Restart.
- **AC8.** The result is deterministic: equal inputs give deep-equal outputs.

### Z-order

- **AC9.** `raise(order, id)` returns a new array in which `id` comes last and every other id keeps its relative order. An id that is not in `order` (for example `site` the first time) is appended.
- **AC10.** If `id` is already last, `raise` returns the same array reference, so the reducer can skip a re-render.
- **AC11.** `topMost(order, wins)` returns the last id in `order` whose window is `open && !min`, or `null` if there is none. Ids in `wins` but not in `order` are ignored.
- **AC12.** `zIndexFor('site', order)` is always 800. For other ids it is `order.indexOf(id) + 10`, so it is below the dock (900) for all six ids. An id not in `order` gets 10 or more and never a negative value.

### Dock click logic

- **AC13.** `dockClickAction` returns:
  - `'open'` when the window is closed (`open: false`), whatever `min` is;
  - `'restore'` when it is open and minimized;
  - `'focus'` when it is open, not minimized, and not `topMost`;
  - `'minimize'` when it is open, not minimized, and is `topMost`.
- **AC14.** A table-driven test covers the four branches, plus these cases:
  - the only visible window (gives `'minimize'`);
  - a window that is last in `order` but minimized, with another visible window below it (gives `'restore'` for it and `'minimize'` for the visible one);
  - `site` open and top-most (a dock id below it gives `'focus'`).

### Drag clamp and tilt (decision 6 reuses the clamp on resize)

- **AC15.** `clampPosition` keeps `x` in `[80 - width, vw - 80]` (at least 80px stays visible horizontally) and `y` in `[36, vh - 60]`. Positions already inside the range come back unchanged. If `vh - 60 < 36`, `y` is 36.
- **AC16.** `clampPosition` is idempotent: clamping twice gives the same result as clamping once. T03 calls it for every window on viewport resize.
- **AC17.** `dragPosition(origin, { dx, dy }, ...)` equals `clampPosition({ x: origin.x + dx, y: origin.y + dy }, ...)`. The delta is measured from the pointer-down point, not per event, so clamping never builds up drift.
- **AC18.** `tiltFor(movementX, enabled)` returns `clamp(movementX * 0.7, -7, 7)` when `enabled` is true and `0` when it is false. The caller passes `enabled = wobble && !prefersReducedMotion`. It never returns `-0` or NaN, and a non-finite input gives 0.

### Terminal `runCommand`

General rules:

- **AC19.** The input is trimmed and split on whitespace into `head` and the `arg` words, and `arg` is the remaining words joined by single spaces. The first line is always the echo `{ text: 'tanzi ~ % ' + trimmed, tone: 'cmd' }`, except for `clear`. Matching is case-sensitive, as in the prototype.
- **AC20.** Empty or whitespace-only input returns only the echo line and no effects.
- **AC21.** At most one effect is returned for each call, and it appears only for the commands listed in AC23-AC27.

Outputs. All output lines after the echo have tone `out` unless stated otherwise.

- **AC22.**
  - `help` prints two `acc` lines: `whoami · ls · open <file> · experience · projects · contact` and `theme dark|light · wallpaper nebula|grid|plain · tidy · restart · clear`.
  - `whoami` prints `<NAME> — <ROLE>. builds stuff.` from `data.ts` constants (placeholder `Tanzi Chowdhury` / `software engineer`).
  - `ls` prints `hello.txt   about.md   experience.log   projects/`.
  - `experience` prints one line per `EXP` entry: `when.padEnd(12) + role + ' @ ' + org`.
  - `projects` prints one line per `PROJECTS` entry: `name.padEnd(12) + desc`.
  - `contact` prints `<email> · github · linkedin`. The email comes from `data.ts` and is not a literal in the terminal module.
- **AC23. `open`.** `open X`, where X is one of `hello`, `hello.txt`, `about`, `about.md`, `experience`, `experience.log`, `projects` or `projects/`:
  - prints the `dim` line `opening X…`;
  - returns `{ type: 'open', id }` with `hello`, `about`, `exp` or `proj` as the id.

  For any other non-empty X it prints the `dim` line `open: no such file: X` and returns no effect. With no argument it prints the usage line `usage: open <hello|about|experience|projects>` (`dim`) and returns no effect.

- **AC24. `theme`.** `theme dark` and `theme light` print `theme → <t>` (`dim`) and return `{ type: 'theme', theme }`. No argument, any other argument, or extra words (`theme blue`, `theme`, `theme dark now`) print `usage: theme dark|light` (`dim`) with no effect. They no longer print "command not found".
- **AC25. `wallpaper`.** `wallpaper nebula`, `wallpaper grid` and `wallpaper plain` print `wallpaper → <w>` (`dim`) and return `{ type: 'wallpaper', wall }`. Anything else prints `usage: wallpaper nebula|grid|plain` (`dim`) with no effect.
- **AC26.** `tidy` prints `windows tidied.` (`dim`) and returns `{ type: 'tidy' }`. `restart` returns only the echo line and `{ type: 'restart' }`.
- **AC27.** `clear` returns `lines: []` and `{ type: 'clear' }`. The caller replaces the scrollback with nothing, and the echo of `clear` is not kept.
- **AC28.** `sudo hire-tanzi` prints `[sudo] password for recruiter: ********` (`dim`), then `access granted → <email>` (`acc`), with the email from `data.ts`. Any other `sudo …`, including a bare `sudo`, prints `nice try. (psst: sudo hire-tanzi)` (`dim`).
- **AC29.** Any `rm …` prints `absolutely not.` (`acc`).
- **AC30.** Any other head prints `command not found: <head> — try "help"` (`dim`).
- **AC31.** `TERMINAL_BANNER` is one `dim` line: `tanzi.os v<VERSION> — type "help" to look around`, with `VERSION` taken from `data.ts`.
- **AC32.** The email appears once in `src/` as a literal, in `data.ts`, and both the `Email` entry in `LINKS` and the terminal take it from there. A test asserts that `contact` and `sudo hire-tanzi` contain the same string as the `Email` link's `href` without the `mailto:` prefix.

### Terminal history (decision 8: history yes, tab completion no)

- **AC33.** `pushHistory` appends the trimmed command if it is non-empty. It ignores empty or whitespace-only input, keeps consecutive duplicates, and resets navigation, so the next `historyUp` starts from the newest entry. `clear` is recorded like any other command and does not wipe the history.
- **AC34.** `historyUp(h, input)`:
  - with an empty history, returns `value === input` and an unchanged history;
  - the first press saves `input` as the draft and returns the newest entry;
  - each further press moves one entry older and stops at the oldest one (pressing again keeps returning the oldest).
- **AC35.** `historyDown(h, input)`:
  - moves one entry newer;
  - moving past the newest entry returns the saved draft and leaves navigation mode;
  - outside navigation mode, returns `value === input` with the history unchanged.
- **AC36.** The history functions never mutate their argument. A sequence test (push `a`, `b`, `c`; type `x`; then Up, Up, Up, Up, Down, Down, Down, Down) gives `c, b, a, a, b, c, x, x`.

### Quality gates

- **AC37.** Each module has its own test file under `tests/` (for example `tests/logic/layout.test.ts`). `npm test` covers every AC above, and line coverage of the logic modules is 100% where Vitest coverage is available (coverage is optional and not added as a dependency if it is missing).
- **AC38.** No logic module imports React, `@phosphor-icons/react` components, or anything that touches `window`, `document` or `localStorage`. A test or lint rule guards this, for example by reading the module sources with `?raw` and checking for forbidden imports. `data.ts` imports Phosphor, so the terminal module may import only the plain data values it needs (EXP, PROJECTS, the email, name, role and version). A Phosphor import pulled in through `data.ts` is accepted.
- **AC39.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check` all pass. Existing tests are unchanged and not weakened, and the rendered page is unchanged (the smoke test still passes).

## Out of scope

- Wiring anything into `Desktop`, the reducer, `useReducer` actions, fixing the `State` type in `types.ts` (removing `verb`, `tab`, `cmd`, `lines`), and resize listeners. All of that is T03.
- The `useDrag` hook, pointer capture, `touch-action`, rAF and transform handling, and the genie translate math. These are T04 (the genie target may become a pure helper then).
- Rendering the terminal (input, scrollback, auto-scroll, Up/Down key wiring, the tone-to-color CSS mapping in the component). That is T03 or T07.
- Applying effects: opening windows, theme and `data-theme`, wallpaper, localStorage writes, tidy and restart behaviour, the boot screen.
- Menus, including "Help → Terminal commands" (T05), and the dock UI (T06).
- Tab completion (decision 8). `open terminal`, `open site` and any new terminal commands or aliases. Case-insensitive commands.
- A history size cap, and keeping history across close or restart (decision 5 resets it).
- Mobile layout (decision 1). Viewports below 1280x720 only need finite, clamped values (AC1, AC2), not a fit.
- Extracting the about copy and hello text into `data.ts` (T10), and real content.
- Any edit to `design_handoff_tanzi_os/`.

## Assumptions

- **A1. Line tone.** `Line` carries a semantic `tone` instead of a CSS color string. This makes tests independent of CSS and keeps the module free of styling. Changing `Line` in `types.ts` is allowed. `State.lines` still typechecks, and T03 removes it anyway.
- **A2. Copy placement.** CLAUDE.md says content lives in `data.ts`. Personal content (name, role, email, version, experience, projects) is read from `data.ts`. Fixed system strings (usage lines, `absolutely not.`, `command not found`, `ls` file names, the help lines) stay in the terminal module, because they describe the OS and not the person. T02 adds these constants to `data.ts`:
  - `NAME`;
  - `ROLE`;
  - `EMAIL`, which `LINKS` then uses for the mailto;
  - `VERSION = '1.0'` (spec gap "Version string": the simplest choice is a constant, not `package.json`).
- **A3. Nominal heights.** Window heights depend on content and are not in the spec. Layout uses nominal heights estimated from the prototype styles. These include the 36px menubar, a titlebar of about 40px, the experience body's 250px `min-height`, and the terminal body at 230px. The estimates are kept in the window metadata table. T07 may correct them once the windows render. AC3 must keep passing with the corrected values, and the layout tests read the heights from the table and do not copy them.
- **A4. Dock clearance.** The dock's top edge is taken as `vh - 76` (14 + 46 + 8 + 8), and every window must fit above it, even if it does not overlap the dock horizontally. This is the simplest rule and needs no measurement.
- **A5. Rounding.** Layout returns integers (`Math.round`), so tests can use exact equality and windows land on whole pixels. Drag and clamp do not round, because they pass pointer deltas straight through.
- **A6. Tidy closes `site`.** As in the prototype, Tidy up and `tidy` reset to `initialWindows`, which closes "About this site". The spec says "all open", which the prototype reads as all dock windows.
- **A7. `site` z-order.** This follows the spec gap note: `site` is pinned at 800, not in `INITIAL_ORDER`, and added on its first raise. It counts for `topMost`, as in the prototype `top()`.
- **A8. Usage messages.** This follows decision 8. Bad arguments to `theme`, `wallpaper` and bare `open` print a `usage:` line. An unknown file for `open` keeps the prototype's `open: no such file: X`. Commands that take no argument (`whoami foo`, `tidy now`) ignore the extra words, as in the prototype.
- **A9. History semantics.** This is shell-like: consecutive duplicates are kept, the draft is restored when moving past the newest entry, and there is no size cap. These are the simplest choices that fit decision 8.
- **A10. `restart` output.** `restart` returns the echo and the effect. Restart resets the terminal anyway, so the echo is never really seen. Returning it keeps AC19 uniform, with `clear` as the only exception.
- **A11. Text safety.** Lines are plain text and are never HTML. Echoing user input is safe as long as the component renders it as React text (a T03/T07 requirement, noted here so it is not forgotten).

## Open questions

None blocking. Non-blocking items the human may want to confirm later (the defaults above apply until then):

1. Whether to add `VERSION`, `NAME`, `ROLE` and `EMAIL` to the Decisions log as the answer to the "Version string" and "Hard-coded email" spec gaps (A2).
2. Whether `open` should also accept `terminal` and `site` (left out per decision 8 as written, A8).
