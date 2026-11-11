# T16 plan: about.md rewrite and a "See some data viz" placeholder window

Source: `docs/plans/T16-requirements.md` (identical to `00-requirements.md`: Current state, Assumptions 1-13, AC1-AC27), `CLAUDE.md`, `docs/design-decisions.md` (decisions 4, 5, 7, 11, 13) and the T15 plan's method. Code read: `src/data.ts` (`ABOUT_COPY`, `WIN_TITLES`, `WIN_ICONS`, icon imports), `src/windows/{About.tsx,About.css,WindowBody.tsx}`, `src/logic/{windows,layout,menu}.ts`, `src/theme.css` (`.btn`, `.btn-secondary`). Tests grepped: every file under `tests/` that pins `WIN_IDS`, `DOCK_IDS`, `INITIAL_ORDER`, `WIN_TITLES`, window, button, dock or menu counts, tab-stop sequences, the about copy or about height, plus the purity and source-ban tests.

T1-T4 below are tasks inside ticket T16, not backlog tickets.

## 1. Goal and scope

**Goal.** about.md opens with Tanzi's own first paragraph (projects built from the ground up, ideas brought to life, random facts, data visualization), and the "Currently building…" paragraph stays word for word. A "See some data viz" button below the about text opens a new small placeholder window `viz` (title `dataviz`, body "Coming soon"). The window can also be opened from the dock and the Windows menu, so Tanzi can fill it in later.

**Out of scope** (carried over):

- Any real data visualization, charts, data files or libraries in the viz window.
- Terminal changes for viz (`ls`, `open`, `help`, usage text).
- A viz entry, button or link on the phone page.
- A viz button in hello.txt, and any change to hello, experience, projects, terminal or About this site.
- Changing the "Currently building…" paragraph or `FACTS`, or adding about copy beyond AC1.
- Moving focus into viz when the about button opens it.
- New colours, tokens or button variants. Changes to the `layout()` formulas for existing windows (the about height change in AC9 is the only allowed effect).
- Persisting which windows are open.
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `T16-requirements.md` with the same numbers. No AC is added. The one gap I found is the contract of the shared `openAllFromDock` test helper (does it now open viz?). I resolve it in section 8, Q1, as a test-method rule, not a product criterion.

### A. about.md copy

- **AC1** `ABOUT_COPY[0]` is replaced by exactly these segments, in order: `"I'm a software engineer who enjoys seeing projects built from the ground up and "`, em `"making ideas come to life"`, `". I'm fascinated by random facts and love "`, em `"visualizing data"`, `"."`. Apostrophes are straight (`'`). The old "whole arc … last pixel" text appears nowhere in `src/`.
- **AC2** `ABOUT_COPY[1]` is unchanged, segment for segment (`Currently building `, em `web platforms, automation and data tooling`, `.`). `ABOUT_COPY` still has exactly two paragraphs, and `FACTS` is unchanged.
- **AC3** The about window renders both paragraphs with em segments as `em.about-em` and the facts list after them, exactly as before (same markup and CSS for text and facts).
- **AC4** The phone page About section shows the new first paragraph and the unchanged second one (it reads `ABOUT_COPY`) and has no data viz button or link. Nothing else on the phone page changes.

### B. "See some data viz" button

- **AC5** The about window contains one native `<button type="button">` whose visible text and accessible name are "See some data viz". The label comes from a new constant in `src/data.ts`. No label text is hard-coded in components.
- **AC6** In DOM and Tab order the button comes after the last paragraph and before the facts list. It is the only focusable element in the about body.
- **AC7** Activating the button by click, Enter or Space dispatches exactly one `{ type: 'open', id: 'viz' }`. In the running app this opens viz when it is closed, restores it when minimized, and raises it when it is open behind other windows. It never minimizes viz when viz is already on top.
- **AC8** The button uses the existing shared secondary button classes from `src/theme.css`. No new colours or tokens are added, and it passes the existing dark and light contrast checks. Any icon is `aria-hidden` and not focusable. Any hover or press motion is disabled under `prefers-reduced-motion`.
- **AC9** At 1280x720 the whole about window, including the button and the facts, is fully visible below the menubar and above the dock clearance (`y + rendered height <= 720 - DOCK_CLEARANCE`), with no scroll inside the about body. `WIN_META.about.height` is updated to the measured rendered height. `WIN_META.about.width` stays 420.

### C. The `viz` window

- **AC10** `WinId` gains `'viz'`. `WIN_IDS` is `['hello', 'about', 'exp', 'proj', 'term', 'viz', 'site']`. `WIN_META.viz` has `dock: true` and a fixed width and nominal height (small, no wider than 420) that match the rendered height of the viz window.
- **AC11** `WIN_TITLES.viz` is `'dataviz'` and `WIN_ICONS.viz` is a Phosphor icon not used by any other `WIN_ICONS` entry (default `ChartPieSlice`). The titlebar shows `dataviz` (no `WIN_BAR_TITLES` entry).
- **AC12** The viz body is a tiny self-contained component in `src/windows/Viz.tsx` (plus an optional `Viz.css` that uses only theme tokens). It takes no props, holds no state and dispatches nothing. Its visible text is exactly "Coming soon", from a new constant in `src/data.ts`. Any icon is `aria-hidden`. It has no focusable elements. `WindowBody` renders it for `id === 'viz'`.
- **AC13** viz uses the standard `Window` chrome: drag (clamped), minimize with the genie (no genie or wobble under reduced motion), close, raise on focus, and the same accessible title rules as the other windows. Its z-index comes from `order`.
- **AC14** `layout(vw, vh)` returns a position for viz at every supported viewport. At 1280x720 and larger viz is fully on screen, below the menubar and above the dock clearance (same `xClamp`/`yFit` rules). The positions of all existing windows are unchanged, except for any about `y` change caused only by AC9.
- **AC15** `INITIAL_ORDER` becomes `['viz', 'proj', 'exp', 'term', 'about', 'hello']` and still has no `site`.

### D. Start, Restart, Tidy up

- **AC16** On first load and after Restart (boot and reduced-motion paths, menu and terminal) viz is closed and not minimized. The DOM has no `[data-win="viz"]`.
- **AC17** Tidy up (Windows menu and terminal `tidy`) opens every dock window, now including viz: six windows open, not minimized, at `layout()` positions, order `INITIAL_ORDER`, `site` closed.

### E. Dock, Windows menu, terminal

- **AC18** The dock shows six window buttons in `DOCK_IDS` order (hello, about, experience, projects, terminal, dataviz), then the separator and links. The viz button has `aria-label` and `title` `dataviz`, the same `aria-pressed`, hidden state text, dot and `dockClick` behaviour as the others. It reads Closed on first load.
- **AC19** The Windows menu lists six `menuitemcheckbox` items (hello.txt, about.md, experience.log, projects, terminal, dataviz), then the separator, Minimize all, Show all and Tidy up. The dataviz item is checked only when viz is open and not minimized, and choosing it dispatches `{ type: 'open', id: 'viz' }`. Minimize all and Show all include viz when it is open.
- **AC20** The terminal is unchanged: `ls` output, `open` targets and the `open` usage message stay as they are. `open viz` and `open dataviz` print the existing `open: no such file: …` line.

### F. Unaffected areas

- **AC21** hello.txt, experience.log, projects, terminal and About this site render and behave as before. `site` keeps z 800, has no dock button and stays in the tanzi.os menu only. Dock click logic, drag clamp, resize re-clamp and localStorage behaviour are unchanged. Restart still keeps theme, wallpaper and wobble.
- **AC22** The phone page renders no viz window, button or link, and all phone unit and e2e tests pass unchanged.

### G. Tests and quality

- **AC23** Unit tests cover:
  - AC1-AC2: the literal segments.
  - AC5-AC9 in `tests/windows/About.test.tsx`: button text, position between the last paragraph and the facts, one dispatch per activation, rendered text equal to the data text plus the label, about height.
  - AC10-AC12 in a new `tests/windows/Viz.test.tsx`: text from data, no focusable elements, no hard-coded colours.
  - AC14-AC17 in the layout and reducer tests.
  - AC18 in the dock tests and AC19 in the menu tests.
- **AC24** A `<Desktop />` component test or e2e test covers the about button opening viz from three states (closed, minimized, open but behind) (AC7), and viz opening from the dock and the Windows menu.
- **AC25** Playwright at 1280x720 covers:
  - the new about copy (AC1, AC2);
  - the button below the text opening dataviz with "Coming soon" (AC7, AC12);
  - about and viz fully visible above the dock (AC9, AC14);
  - six dock buttons, with dataviz Closed on load (AC18);
  - the Windows menu dataviz item (AC19);
  - viz closed after Restart and open after Tidy up (AC16, AC17);
  - no console errors or warnings.
- **AC26** Existing tests that pin the old window set, counts, order or copy are updated without weakening coverage. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T16 ACn): <reason>` and is listed in the QA report and the autobuild log. No test is deleted or skipped. Tests that loop over a hard-coded five-window list keep that list where they only exercise those five (for example the `openAll` helpers). Tests that assert "every dock window" or exact counts move to six. The full list is in section 7a.
- **AC27** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## 3. Architecture

**Approach.** viz is a seventh `WinId`, built the same way as every other window. Most behaviour comes for free because the dock, Tidy up, Minimize all, Show all, `WindowLayer`, `Window` and the reducer already iterate `WIN_IDS`/`DOCK_IDS`/`WIN_META`. Only four hard-coded places need edits: the `WinId` union, `WIN_IDS`/`WIN_META`, `layout()`/`INITIAL_ORDER`, and the Windows menu list. The about button reuses the reducer's `open` action, which already opens, restores or raises and never minimizes (T15 AC15).

**`src/types.ts`.** `WinId` adds `'viz'` (AC10).

**`src/logic/windows.ts`** (AC10)

- `WIN_IDS = ['hello', 'about', 'exp', 'proj', 'term', 'viz', 'site']`.
- `WIN_META.viz = { width: 280, height: 160, dock: true }`.
  - `Window` sets `minHeight: meta.height`, so the rendered height is `max(content, 160)`.
  - The content is a titlebar plus one padded line, roughly 110 px, so the rendered height is 160.
  - The coder confirms this in Playwright. If the content turns out taller, set `height` to the measured integer.
- `DOCK_IDS` keeps its formula, so it now includes viz after term.

**`src/logic/layout.ts`** (AC14, AC15)

- New entry `viz: { x: xClamp(vw - 320, w('viz')), y: yFit(Math.max(140, vh * 0.22), h('viz')) }`.
  - At 1280x720 that is (960, 158), with the bottom at 318 <= 644. At 1920x1080 it is (1600, 238).
  - At 1280x720 it overlaps the right edge of about (x 640-1060) but not the about button, which sits near x 664-830. So the button stays visible after it opens viz.
  - At every `SIZES` entry viz fits under the existing AC3 bound.
- `INITIAL_ORDER = ['viz', 'proj', 'exp', 'term', 'about', 'hello']`. No other formula changes.

**`src/logic/menu.ts`** (AC19). Replace the hard-coded `MENU_WINS` with `DOCK_IDS` imported from `./windows`, which the purity test allows. The Windows menu then lists the dock windows in dock order and cannot drift from the dock again. Do not use the bare word `window` in logic code, because the purity test bans it outside comments.

**`src/data.ts`**

- Replace `ABOUT_COPY[0]` with the AC1 segments. `ABOUT_COPY[1]` is untouched (AC1, AC2).
- `export const ABOUT_LABELS = { viz: 'See some data viz' } as const;` (AC5).
- `export const VIZ_COPY = { body: 'Coming soon' } as const;` (AC12).
- `WIN_TITLES.viz = 'dataviz'`. Import `ChartPieSlice` and set `WIN_ICONS.viz = ChartPieSlice` (AC11).
- Do not put the number `760` anywhere. `tests/logic/view.test.ts` allows it only in `layout.ts`.

**`src/windows/Viz.tsx` + `Viz.css`** (AC12). A component that takes no props and renders `<div className="viz-body"><p className="viz-text">{VIZ_COPY.body}</p></div>`, with no icon. `Viz.css` uses the same type tokens as `.about-body`: padding `22px 24px 24px`, 14px, line height 1.65, `color: var(--color-neutral-400)`. That colour already passes AA on the window surface in both themes. No hex or rgb values.

**`src/windows/About.tsx`** (AC3, AC5-AC8)

- Signature `About({ dispatch }: { dispatch: Dispatch<AppAction> })`, the same as Hello.
- Between the paragraphs map and `ul.about-facts`, add `<button type="button" className="btn btn-secondary about-viz" onClick={() => dispatch({ type: 'open', id: 'viz' })}>{ABOUT_LABELS.viz}</button>`.
- No icon.
- `.btn-secondary` only changes background on hover and active. It has no transform, so nothing needs a reduced-motion override (AC8).
- The existing 12px paragraph margin and 16px facts margin give the spacing. If the coder needs anything, add only a spacing rule (`.about-viz { margin: … }`) to `About.css`, with no colours.

**`src/windows/WindowBody.tsx`.** `case 'about': return <About dispatch={dispatch} />;` and `case 'viz': return <Viz />;`.

**AC9 height.** The button adds about 35px plus margins, so the expected height is about 375-390. The coder measures `[data-win="about"]` at 1280x720 with fonts loaded, in dark and light, using Playwright `boundingBox`. The result is rounded up to an integer and set as `WIN_META.about.height`. `yFit(64, h)` keeps y at 64 while `h <= 580`, so the about reference position (640, 64) is unchanged.

**Data and API changes.**

- New `WinId` member.
- `WIN_IDS`, `WIN_META.viz`, `INITIAL_ORDER` and the `layout()` viz entry.
- `ABOUT_LABELS`, `VIZ_COPY`, and `WIN_TITLES`/`WIN_ICONS` entries.
- `About` gains a required `dispatch` prop.
- `State` shape, action types, storage, `Desktop`, `Dock`, `MenuBar`, `WindowLayer`, `Window`, `PhonePage` and the terminal are unchanged.

**Dependencies.** None. `ChartPieSlice` ships in the existing `@phosphor-icons/react`.

## 4. Design

**User flow.** On first load the visitor sees hello alone. The dock now shows six window buttons, with a pie-chart dataviz button last before the separator, reading Closed. The visitor opens about.md from hello's "More about me", the dock, the menu or the terminal, and reads the new paragraph. Under the text is a quiet secondary "See some data viz" button, and the fact pills come after it. Activating the button flies in a small `dataviz` window to the right of about that says "Coming soon". The visitor can drag, minimize, close and reopen it from the dock or the Windows menu. Tidy up lays out all six windows, and Restart returns to hello only.

**States.**

- Loading: none new.
- Empty: the viz body "Coming soon" is the intended placeholder, not an error.
- Error: none. Everything is local and synchronous.
- Success: the button opens, restores or raises viz. Pressing it again with viz on top changes nothing visible.

**1280x720 and larger.**

- about stays at (640, 64) and is about 380px tall, so its bottom is around 444, well above 644.
- viz sits at (960, 158) to (1240, 318).
- On larger viewports viz moves right and down with the formula, and stays clear of about from 1440 wide up.
- Mobile is not built. The phone page shows the new copy automatically and nothing else (AC4, AC22).

**Accessibility.**

- The button is native and named by its text. Tab order inside about is Minimize, Close, then "See some data viz". The facts are not focusable (AC6).
- Focus stays on the button after activation (out of scope to move it).
- viz has its region name `dataviz` from `WIN_TITLES` and only its chrome buttons as stops.
- Closed viz is absent from the DOM, and minimized viz is inert (existing rules).
- The dock icon is `aria-hidden` through the existing dock code.
- The global focus ring is inherited.

**Reduced motion.** No new motion. The button has no transform. viz opening, minimizing and closing use the existing fly-in, genie and wobble rules, which are already disabled under reduced motion.

## 5. Risk and security

Auth, secrets and server data do not apply. There is no new input surface: the button dispatches a fixed action with a literal id.

- **R1. Test churn weakening coverage (AC26).** This is the main risk. Safeguards:
  - Section 7a lists every edit with its reason. Edits only change expected values or add assertions.
  - Where a test loops over `DOCK_IDS` on windows opened by the five-window helper, skipping the closed viz keeps exactly the five windows it checked before. viz is covered by new tests.
  - The QA step diffs `tests/` and checks the marker on every edit.
- **R2. The `openAllFromDock` contract.** Both helpers (unit and e2e) stay at five windows (Q1). Their doc comments now say "the five original windows; Tidy up also opens viz".
  - After the helper the order is still `INITIAL_ORDER`, with viz untouched at index 0, so the existing `helpers.test.ts` z and position checks still pass unchanged.
  - Tests that compare against the Tidy state build it through Tidy up itself (the `Desktop.boot` edit in 7a).
- **R3. viz sharing z 10 with proj.** viz goes at the front of `INITIAL_ORDER` (AC15). A unit test asserts that all six z-indexes after `tidy` are distinct (T2).
- **R4. Menu and dock drifting apart.** `MENU_WINS` is replaced by `DOCK_IDS` (section 3). A unit test asserts that the menu window items equal `DOCK_IDS` mapped to `{ open id }` (T2).
- **R5. About overlapping the dock after the button is added (AC9).** Safeguard: measure, then set `WIN_META.about.height`. The existing layout AC3 test, the `Desktop.dock` AC2 644 test and the e2e height table then guard it (T3, T4).
- **R6. Source-ban and purity tests.**
  - `MenuBar.test` bans menu copy ("Restart", "Tidy up" and others) in every `src/` file except `data.ts`, including comments.
  - `terminal.test` requires the email only in `data.ts`.
  - `view.test` allows `760` only in `layout.ts`.
  - `purity.test` bans `window`, `document` and similar words in `src/logic` code, allows only `./x`, `../data` and `../types` imports, and pins the module list. T16 adds no logic module.
  - The new label and body strings live only in `data.ts`.
- **R7. Unverified edit list.** This plan was written from grep, without running the suites. Safeguard: at the start of T2, T3 and T4 the test-writer runs the suites and reconciles 7a against the real failures. A failure outside 7a is a regression to fix in `src/`, not a test edit.
- **R8. The `About` prop change breaking typecheck in tests.** `tests/windows/About.test.tsx` renders `<About />` seven times. These become `<About dispatch={vi.fn()} />` in the same task as the prop change (T3), as setup edits.

## 6. Gaps check

- **Auth:** none in this app.
- **Validation:** no new input. The reducer already rejects invalid ids, and `viz` becomes a valid id through `WIN_IDS`.
- **Error handling:** no failure path. No storage on this path.
- **Mobile:** out of scope. The phone page only picks up the copy (AC4, AC22), and a unit test asserts it has no viz label.
- **Accessibility:** native button, Tab order (AC6), region name, inert when minimized, aria-hidden icons, no new colours (AC8).
- **Config and env vars:** none.
- **Tests:** copy literals, About and Viz component tests, layout, reducer, menu and dock logic, a `<Desktop />` integration file, a new e2e spec, and the sanctioned edits in 7a.

## 7. Tasks

The coder edits `src/` only, and the test-writer owns `tests/`. Each task leaves `npm run lint`, `npm run typecheck` and `npm test` green. New tests use a `T16 ACn:` prefix. Every edit to an existing test carries `// DELIBERATE REQUIREMENT CHANGE (T16 ACn): <reason>`.

- **T1. about.md copy.** ACs: AC1-AC4, AC23 (AC1-AC2 part).
  - Coder: replace `ABOUT_COPY[0]` in `src/data.ts`.
  - Test-writer:
    - `tests/windows/About.test.tsx` new cases:
      - `T16 AC1`: deep-equal the literal five segments.
      - `T16 AC2`: deep-equal the literal second paragraph, `ABOUT_COPY.length === 2`, and the `FACTS` labels unchanged.
      - `T16 AC1`: no file in `src/` contains "last pixel" or "whole arc" (`import.meta.glob('/src/**/*.{ts,tsx}')`).
    - `tests/PhonePage.test.tsx` new case `T16 AC4`: the About section text contains both paragraphs.
    - No existing test should change. The T07 tests compare against `ABOUT_COPY`, and no test pins the old literal (grep confirmed).
- **T2. The viz window: id, layout, body, dock, Windows menu, Tidy up.** ACs: AC10-AC22, AC23 (AC10-AC12, AC14-AC19 parts), AC24 (dock and menu part), AC26 (unit).
  - Coder: section 3 changes to `types.ts`, `logic/windows.ts`, `logic/layout.ts`, `logic/menu.ts`, `data.ts` (`WIN_TITLES`, `WIN_ICONS`, `VIZ_COPY`), new `windows/Viz.tsx` and `Viz.css`, and the `WindowBody` `viz` case. The about button is not part of this task.
  - Test-writer: apply the 7a "T2" edits. New cases:
    - New `tests/windows/Viz.test.tsx`:
      - AC12: `textContent === VIZ_COPY.body` and `VIZ_COPY.body === 'Coming soon'`; no `a, button, input, [tabindex]`; every svg (if any) is `aria-hidden`; `Viz.css` has no hex, rgb or hsl.
      - AC11: `WIN_TITLES.viz === 'dataviz'`, `WIN_ICONS.viz === ChartPieSlice`, the icon is unique among the `WIN_ICONS` values, and there is no `WIN_BAR_TITLES.viz`.
    - `tests/logic/windows.test.ts`, AC10: the `WIN_META.viz` width (<= 420), height and `dock: true`.
    - `tests/logic/layout.test.ts`:
      - AC14: the viz entry follows the formula at 1440x900 and 1920x1080. At every `SIZES` entry it is on screen (`x >= 16`, `x + w <= vw - 16`, `y >= 36`, `y + h <= vh - 76`).
      - AC14: the positions of the five old windows and site at all `SIZES` equal a literal snapshot taken before the change (about `y` is checked again in T3).
      - AC15: z-indexes after `tidyWindows` are distinct.
    - `tests/logic/desktop.test.ts`:
      - AC16: `restart` from an all-six-open state leaves viz `{ open: false, min: false }`.
      - AC17: `tidy` opens viz, and `minimizeAll`/`showAll` include viz.
      - `open viz` from closed, minimized and behind: opens, restores and raises, never minimizes.
    - `tests/logic/menu.test.ts`, AC19: the window items equal `DOCK_IDS` in order with `{ type: 'open', id }`, and the dataviz item is checked only when viz is open and not minimized.
    - `tests/logic/terminal.test.ts`, AC20: `open viz` and `open dataviz` give the `no such file` line, and `ls` is unchanged.
    - New `tests/Desktop.viz.test.tsx` (AC13, AC16-AC19, AC24 part):
      - First load: no `[data-win="viz"]`, and the dock viz button is Closed.
      - The dock opens viz at its layout position, on top. Drag, minimize, restore from the dock, and close all work.
      - The Windows menu dataviz item opens viz and checks it.
      - Tidy up from the menu and the terminal gives six windows. Restart from the menu and the terminal gives no viz.
  - Run the full unit suite first and reconcile 7a (R7).
- **T3. The about button and about height.** ACs: AC5-AC9, AC23 (AC5-AC9 part), AC24 (about-button part), AC26 (unit).
  - Coder: `ABOUT_LABELS` in `data.ts`, the `About` `dispatch` prop and button, and the `WindowBody` about case. Measure the about height as in section 3 and set `WIN_META.about.height`.
  - Test-writer: apply the 7a "T3" edits. New cases:
    - In `tests/windows/About.test.tsx`:
      - AC5: one `button[type=button]` named `ABOUT_LABELS.viz`, and `ABOUT_LABELS.viz === 'See some data viz'`; `About.tsx?raw` does not contain the label literal.
      - AC6: the button follows the last `p` and precedes the `ul`; it is the only focusable element in the about body.
      - AC7: click, Enter and Space each dispatch exactly one `{ type: 'open', id: 'viz' }`.
      - AC8: the button has classes `btn btn-secondary`, has no svg, and `About.css` adds no colours.
      - AC9: `layout(1280, 720).about.y + WIN_META.about.height <= 644`, and `layout(1280, 720).about` equals `{ x: 640, y: 64 }`.
    - In `tests/Desktop.viz.test.tsx`, AC7 through the full desktop: with about open from the dock, the button opens viz when closed, restores it when minimized (minimized with its own Minimize button), and raises it to max z when it is behind (after a pointerdown on about). It leaves viz open and on top, with `data-min="false"`, when pressed again.
    - `tests/PhonePage.test.tsx`, AC22: the phone page has no text "See some data viz" and no `dataviz`.
- **T4. End to end.** ACs: AC9, AC14, AC16-AC19, AC22, AC25, AC26 (e2e), AC27.
  - Test-writer: apply the 7a "T4" e2e edits.
  - New `tests/e2e/viz.spec.ts`, with `watchErrors` in every test:
    - AC1/AC2: the about text shows both paragraphs.
    - AC7/AC12: the button sits below the last paragraph (box `y` greater than the paragraph bottom, and less than the facts top). Clicking it shows `[data-win="viz"]` with "Coming soon". Repeat after minimize, and after raising about.
    - AC9/AC14: in dark and light, the bottoms of about and viz are <= 644, about `scrollHeight <= clientHeight`, and the about height is within 2px of `WIN_META.about.height`.
    - AC18: six `button.dock-win`, with dataviz Closed and `title="dataviz"`.
    - AC19: the Windows menu dataviz item opens viz and is checked.
    - AC16/AC17: viz is absent after Restart from the menu and the terminal, with and without `emulateMedia({ reducedMotion: 'reduce' })`. It is present after Tidy up.
    - AC22: `phone.spec.ts` is unchanged and passing.
  - Run the full AC27 set.

**After T4 (QA).** Confirm that `git diff` on existing tests shows only 7a edits plus additive cases, each with the marker. List every edit in the QA report and the autobuild log.

### 7a. Existing tests this ticket changes (sanctioned under AC26)

Located by grep. Assertions are never removed or relaxed. Five-window lists (`DOCK5`, `IDS`, `NON_HELLO` and so on) stay at five where they only exercise the original windows. They change only where the requirement changes what they assert. The test-writer runs each suite first and reconciles this list (R7).

**Checked, no edit expected:**

- `tests/helpers.test.ts`: five windows, z from `INITIAL_ORDER` still match.
- `tests/logic/{zorder,dock}.test.ts`: local id lists with casts test pure functions.
- `tests/logic/purity.test.ts`: no new module.
- `tests/Window.test.tsx`: it iterates `WIN_TITLES` keys, so viz is covered automatically.
- `tests/windows/{Hello,Experience,Projects,Terminal,AboutSite}.test.tsx`.
- All contrast and CSS tests.
- `tests/PhonePage*.test.tsx` (only additions).
- `tests/e2e/{phone,fonts,theme-init,smoke,build.preview,projects}.spec.ts`.

**T2 (unit): the sixth dock window, six-item menu, six-window Tidy up**

| File                             | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/logic/windows.test.ts`    | **AC2 "WIN_IDS lists the six ids":** literal adds `'viz'` before `'site'`. The title is kept (T15 rule 8). **AC2 "DOCK_IDS is every id except site":** sorted literal adds `'viz'`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tests/logic/layout.test.ts`     | **AC4 formulas:** `formulaX` adds `viz: vw - 320` and `formulaY` adds `viz: Math.max(140, 0.22 * vh)`. Without them typecheck fails and the `DOCK_IDS` loop gets `NaN`. **AC6:** literal becomes `['viz', 'proj', 'exp', 'term', 'about', 'hello']`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tests/logic/desktop.test.ts`    | **AC11 "with every window closed both are no-ops":** `fresh()` is the Tidy state, so viz is open. The loop also closes `'viz'`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tests/logic/menu.test.ts`       | **AC19 "five window items…":** the label list adds `'dataviz'` after `'terminal'`. The `slice(0, 5)` tests stay and still pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tests/T07.foundations.test.tsx` | **T07 AC1 `seen` set** (Tidy harness): expected adds `'viz'`. The two five-id loops stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tests/WindowLayer.test.tsx`     | **AC1 and AC17/AC19:** `[data-win]` length 5 -> 6 (Tidy harness). The `DOCK5` loops stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tests/Dock.test.tsx`            | **T06 AC3:** the literal label list adds `'dataviz'`; kinds `'bbbbbdaa'` -> `'bbbbbbdaa'`; button count 5 -> 6. **T06 AC23:** svg count 7 -> 8. **T06 AC7:** dots 5 -> 6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tests/MenuBar.test.tsx`         | **AC11:** checkbox count 5 -> 6. **AC19 list:** adds `'dataviz'` after `'terminal'`. **AC19 "all five are checked":** 5 -> 6. **AC36 "after Minimize all…":** `buttons.length` 10 -> 12 (viz chrome; this harness renders no bodies).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `tests/Desktop.wiring.test.tsx`  | **AC20 region names:** the `WIN_TITLES` literal adds `viz: 'dataviz'`. **AC22 page buttons outside windows:** adds `'dataviz'` after `'terminal'`. `DOCK5` stays.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tests/Desktop.menubar.test.tsx` | **AC36 page-button list:** adds `'dataviz'`. The `[data-win]` count 5 after the helper stays.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `tests/Desktop.dock.test.tsx`    | **`ALL_OPEN`:** add `viz: 'Closed'`, because the helper opens the five original windows. Add `viz: 'Closed'` to `START_CLOSED`. **T06 AC2 rendered 644:** after the helper, `fireEvent.click(dockBtn('viz'))`, so the loop covers all six. **T06 AC9 (three tests):** z loops `DOCK_IDS.filter((i) => i !== X && winEl(i))`, which checks the same five open windows as before. **T06 AC15 Windows-menu loop:** open viz from the dock before the loop. The final `expectAll(states({ viz: 'Open' }))`. **T06 AC15 Tidy and Restart:** keep a local `viz` expected state, `'Open'` after Tidy up and `'Closed'` after Restart, and pass it in every `states()` call. **T06 AC25 Tab:** 33 -> 34 stops, the tail adds `'dataviz'` before `'LinkedIn'`, Set 34, `slice(26)` unchanged. **T06 AC25 shift+tab:** Tab from term lands on `dockBtn('viz')`, the next Tab on LinkedIn, then shift-tab walks back through viz, term and proj. |
| `tests/Desktop.start.test.tsx`   | **T15 AC5:** `DOCK_IDS` length 5 -> 6. **`NON_HELLO`:** add `'viz'`, so the first-load, AC6 menu, AC7 dock and menu open, and Restart checks cover viz. The AC7 terminal loop has its own three-id list and is unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tests/Desktop.boot.test.tsx`    | **T08 AC20 "Tidy up keeps a dirtied verb…":** `expected` comes from a new local `freshTidyLayout()`. It renders, chooses Tidy up through `fireEvent`, then reads `layout()`, because Tidy now also opens viz. `freshLayoutAllOpen()` stays for its other users. **`expectOnlyHello`:** the absent list adds `'viz'`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tests/helpers/openAll.ts`       | Doc comment only: "the five original windows; Tidy up also opens viz". `OPEN_SEQUENCE` is unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**T3 (unit): the about button (+1 window button and tab stop) and about height**

| File                             | Edit                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/windows/About.test.tsx`   | **Setup:** the seven `render(<About />)` calls become `render(<About dispatch={vi.fn()} />)`. **T07 AC2 "text equals data text only":** expected is the paragraphs joined, then `ABOUT_LABELS.viz`, then the facts labels. **T07 AC47:** height 331 -> the measured value. The width assertion is kept and the title is kept. |
| `tests/Desktop.wiring.test.tsx`  | **AC22 -> T04 AC5-AC7:** window buttons 14 -> 15. The per-window expected list gets an about branch: `[Minimize about.md, Close about.md, 'See some data viz']`.                                                                                                                                                              |
| `tests/Desktop.menubar.test.tsx` | **AC36:** `[data-win] button` count 17 -> 18.                                                                                                                                                                                                                                                                                 |
| `tests/Desktop.dock.test.tsx`    | **T06 AC25 Tab:** 34 -> 35 stops, `slice(26)` -> `slice(27)`, Set 35.                                                                                                                                                                                                                                                         |

**T4 (e2e).** The helper `tests/e2e/helpers/openAll.ts` keeps five windows and gets a comment-only edit. Then:

| File                                                                | Edit                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/start.spec.ts`                                           | **T15 AC5:** `button.dock-win` count 5 -> 6, plus a dataviz Closed check. **T15 AC6:** adds a dataviz `aria-checked="false"` check. **T15 AC10 (menu and terminal Tidy):** `[data-win]` count 5 -> 6. `IDS` and `OTHERS` stay at five, and the AC4 absent list adds `'viz'`.                                                                                                                                         |
| `tests/e2e/chrome.spec.ts`                                          | Near line 191, window buttons 14 -> 15 (about button). Near line 197, dock buttons 5 -> 6. Near line 201, page buttons 20 -> 22. Page-wide tab-stop sequences and "skip N stops" offsets (about lines 112-118 and 366-490): +1 where they count past the about body, +1 where they count past the terminal dock button, and insert the about button and `dataviz` labels where a sequence lists them. `DOCK5` stays. |
| `tests/e2e/dock.spec.ts`                                            | Near line 171, dock buttons 5 -> 6. Line 178, `kinds` adds `'dataviz'` before `'sep'`. Lines 671-672, `slice(26)` -> `slice(27)`, labels add `'dataviz'`, `Set` 29 -> 31. Line 694, loop 28 -> 30. Line 715, `ringed` adds `'dataviz'`. Use a local `DOCK6 = [...IDS, 'viz']` with `TITLES.viz = 'dataviz'` for dock-button lists, and keep `IDS` for window loops.                                                  |
| `tests/e2e/menubar.spec.ts`                                         | Windows-menu item lists and checks add `dataviz`. Tab-stop loops (about lines 553-600): +1 only where they count past the about body or the terminal dock button. `DOCK5` stays.                                                                                                                                                                                                                                     |
| `tests/e2e/windows.spec.ts`                                         | `HEIGHTS.about` 331 -> the measured value. The focusable `orders.about` adds `win(page, 'about').getByRole('button', { name: 'See some data viz' })`.                                                                                                                                                                                                                                                                |
| `tests/e2e/boot.spec.ts`                                            | Post-Restart absent lists add `'viz'`. Any Tidy comparison counts six.                                                                                                                                                                                                                                                                                                                                               |
| `tests/e2e/desktop.spec.ts`                                         | Expected unchanged: about stays at (640, 64) and the helper opens five. Confirm by running, and edit only if the about `y` moved.                                                                                                                                                                                                                                                                                    |
| `tests/e2e/dock.motion.spec.ts`, `tests/e2e/windows.motion.spec.ts` | Edit only if a tab-stop or button count crosses the about body or the dock (reconcile by running).                                                                                                                                                                                                                                                                                                                   |

## 8. Open questions

None need a human. Decided unattended:

1. **The `openAllFromDock` helpers stay at five windows** (AC26's own example). Making them open viz would add viz chrome stops to every Tab-sequence test, which is churn unrelated to the feature. viz gets its own coverage in `Desktop.viz.test.tsx` and `viz.spec.ts`, plus `Desktop.start` through `NON_HELLO`. Where a `DOCK_IDS` loop hits the closed viz, the expected value adds `viz: 'Closed'`, or the loop skips windows that are not open, which checks the same five as before.
2. **The Windows menu derives from `DOCK_IDS`** instead of a second hard-coded list, so dock and menu cannot drift (R4).
3. **Keys:** `ABOUT_LABELS.viz` and `VIZ_COPY.body`.
4. **The button is `btn btn-secondary` directly on the `<button>`**, not the `hello-cta` host and face pattern. That pattern's CSS lives in `Hello.css` and adds a transform, while the plain secondary button has no motion, which is simplest for AC8. There is no icon on the button and no icon in the viz body (Assumption 9 and AC12 allow either).
5. **viz geometry:** 280 x 160 at `(vw - 320, max(140, 0.22 vh))`, clamped. This keeps the about button visible when viz opens at 1280x720. The height is confirmed by measurement.
6. **`About` takes a required `dispatch` prop**, the same as Hello (Assumption 10). The seven bare renders in `About.test` are setup edits in T3.
7. **Copy (T1) ships before the window (T2) and the button (T3)**, so each commit is small and green. The button needs `viz` to exist as a `WinId`, so it comes after T2.
8. **Test titles that state a superseded requirement** (for example "WIN_IDS lists the six ids") keep their title. The DELIBERATE comment explains the new value (T15 precedent).
