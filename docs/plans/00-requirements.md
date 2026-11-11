# T16 requirements: about.md rewrite and a "See some data viz" placeholder window

## Goal

about.md gets Tanzi's own first paragraph (projects built from the ground up, ideas brought to life, random facts, data visualization) while the "Currently building…" paragraph stays word for word. A "See some data viz" button below the about text opens a new, tiny placeholder window `viz` (title `dataviz`, "Coming soon"), which is also reachable from the dock and the Windows menu so Tanzi can fill it in later.

## Current state (observed, so the planner does not redo finished work)

- `ABOUT_COPY` in `src/data.ts` is `AboutSegment[][]` (`{ text; em?: true }`). Paragraph 1 is the prototype's "whole arc of a project … last pixel" text. Paragraph 2 is `Currently building ` + em `web platforms, automation and data tooling` + `.`.
- `src/windows/About.tsx` renders each paragraph as `p.about-para` (em segments as `em.about-em`), then the `ul.about-facts` list. It takes no props and has no `dispatch`. `WindowBody` renders `<About />` with no props.
- `PhonePage` also renders `ABOUT_COPY` (T13), so a copy change shows there automatically.
- `WinId` (`src/types.ts`) is `'hello' | 'about' | 'exp' | 'proj' | 'term' | 'site'`. `WIN_IDS` (`src/logic/windows.ts`) lists them in that order; `DOCK_IDS` is `WIN_IDS` filtered by `WIN_META[id].dock` (all but `site`). `WIN_META.about` is `{ width: 420, height: 331, dock: true }` (pinned by T07 AC47).
- `WIN_TITLES` and `WIN_ICONS` in `src/data.ts` are `Record<WinId, …>`, so a new id must have both.
- `layout(vw, vh)` in `src/logic/layout.ts` returns a position per id. `INITIAL_ORDER` is `['proj', 'exp', 'term', 'about', 'hello']` (no `site`). `initialWindows` opens only `START_OPEN` (`['hello']`, T15). `tidyWindows` opens every window with `dock: true`.
- `zIndexFor(id, order)` returns `SITE_Z` (800) for `site`, otherwise `max(order.indexOf(id), 0) + 10`, so an open window missing from `order` would share z 10 with the back-most window.
- The Windows menu lists a hard-coded `MENU_WINS = ['hello', 'about', 'exp', 'proj', 'term']` as `menuitemcheckbox` items, then Minimize all, Show all, Tidy up.
- The terminal `open` command accepts hello/about/experience/projects (and file-name aliases) and `ls` prints `hello.txt   about.md   experience.log   projects/`.
- The reducer `open` action opens a closed window, restores a minimized one and raises it (T15 assumption 2). The dock dispatches `dockClick`.

## Acceptance criteria

### A. about.md copy

- **AC1** `ABOUT_COPY[0]` (the first paragraph) is replaced by exactly these segments, in order: `"I'm a software engineer who enjoys seeing projects built from the ground up and "`, em `"making ideas come to life"`, `". I'm fascinated by random facts and love "`, em `"visualizing data"`, `"."`. Apostrophes are straight (`'`), as in the existing copy. The old "whole arc … last pixel" text appears nowhere in `src/`.
- **AC2** `ABOUT_COPY[1]` (the "Currently building …" paragraph) is unchanged, segment for segment (`Currently building `, em `web platforms, automation and data tooling`, `.`). `ABOUT_COPY` still has exactly two paragraphs, and `FACTS` is unchanged.
- **AC3** The about window renders both paragraphs with em segments as `em.about-em`, and the facts list after them, exactly as before (same markup and CSS for text and facts).
- **AC4** The phone page About section shows the new first paragraph and the unchanged second paragraph (it reads `ABOUT_COPY`) and has no data viz button or link. Nothing else on the phone page changes.

### B. "See some data viz" button

- **AC5** The about window contains one native `<button type="button">` whose visible text and accessible name are "See some data viz". The label comes from a new constant in `src/data.ts` (for example `ABOUT_COPY_LABELS.viz` or a `VIZ_COPY.cta` key); no label text is hard-coded in components.
- **AC6** In DOM and Tab order the button comes after the last paragraph and before the facts list ("right below the text"). It is the only focusable element in the about body.
- **AC7** Activating the button by click, Enter or Space dispatches exactly one `{ type: 'open', id: 'viz' }`. In the running app this opens viz when closed, restores it when minimized, raises it when it is open behind other windows, and never minimizes it when it is already on top.
- **AC8** The button uses the existing shared button classes from `src/theme.css` (secondary style; `btn btn-secondary` or the `hello-cta` host plus face pattern). No new colours or tokens are added, and it passes the existing dark and light contrast checks. Any icon in it is `aria-hidden` and not focusable. If it has a hover or press motion, that motion is disabled under `prefers-reduced-motion`.
- **AC9** At 1280x720 the whole about window, including the button and the facts, is fully visible below the menubar and above the dock clearance (`y + rendered height <= 720 - DOCK_CLEARANCE`) with no scroll inside the about body. `WIN_META.about.height` is updated to the measured rendered height so `layout()` keeps about clear of the dock; `WIN_META.about.width` stays 420.

### C. The `viz` window

- **AC10** `WinId` gains `'viz'`. `WIN_IDS` is `['hello', 'about', 'exp', 'proj', 'term', 'viz', 'site']`. `WIN_META.viz` has `dock: true` and a fixed width and nominal height chosen by the planner (small, no wider than 420) that match the rendered height of the viz window.
- **AC11** `WIN_TITLES.viz` is `'dataviz'` and `WIN_ICONS.viz` is a Phosphor icon component not already used by any other `WIN_ICONS` entry (default `ChartPieSlice`). The titlebar shows `dataviz` (no `WIN_BAR_TITLES` entry).
- **AC12** The viz body is a tiny self-contained component in `src/windows/Viz.tsx` (plus an optional `Viz.css` using only theme tokens). It takes no props, holds no state and dispatches nothing. Its visible text is exactly "Coming soon", from a new constant in `src/data.ts`. Any icon in it is `aria-hidden`. It has no focusable elements. `WindowBody` renders it for `id === 'viz'`.
- **AC13** viz uses the standard `Window` chrome: it can be dragged (clamped like other windows), minimized with the genie (no genie or wobble under reduced motion), closed, and raised on focus, with the same accessible window title rules as the other windows. Its z-index comes from `order` like the other non-site windows.
- **AC14** `layout(vw, vh)` returns a position for viz at every supported viewport. At 1280x720 and larger the viz window is fully on screen, below the menubar and above the dock clearance (same `xClamp`/`yFit` rules as the other dock windows). The positions of all existing windows are unchanged, except for any `y` change for about caused only by the AC9 height update.
- **AC15** `INITIAL_ORDER` becomes `['viz', 'proj', 'exp', 'term', 'about', 'hello']` (viz at the back) and still has no `site`, so viz never shares a z-index with another window.

### D. Start, Restart, Tidy up

- **AC16** On first load and after Restart (boot and reduced-motion paths, menu and terminal) viz is closed and not minimized, like every window except hello. The DOM has no `[data-win="viz"]` element.
- **AC17** Tidy up (Windows menu and terminal `tidy`) opens every dock window, which now includes viz: six windows open, not minimized, at `layout()` positions, order `INITIAL_ORDER`, `site` closed.

### E. Dock, Windows menu, terminal

- **AC18** The dock shows six window buttons in `DOCK_IDS` order (hello, about, experience, projects, terminal, dataviz), then the separator and links. The viz button has `aria-label` and `title` `dataviz`, the same `aria-pressed`, hidden state text and dot as the other dock buttons, and the same `dockClick` behaviour (open, restore, focus, minimize). It reads Closed on first load.
- **AC19** The Windows menu lists six `menuitemcheckbox` items: hello.txt, about.md, experience.log, projects, terminal, dataviz, then the separator and Minimize all, Show all, Tidy up. The dataviz item is checked only when viz is open and not minimized, and choosing it dispatches `{ type: 'open', id: 'viz' }`. Minimize all and Show all include viz when it is open.
- **AC20** The terminal is unchanged: `ls` output, `open` targets and the `open` usage message stay as they are, and `open viz` / `open dataviz` print the existing `open: no such file: …` line.

### F. Unaffected areas

- **AC21** hello.txt, experience.log, projects, terminal and About this site render and behave as before. `site` keeps z 800, has no dock button and stays in the tanzi.os menu only. Dock click logic, drag clamp, resize re-clamp and localStorage behaviour are unchanged. Restart still keeps theme, wallpaper and wobble.
- **AC22** The phone page renders no viz window, button or link, and all phone unit and e2e tests pass unchanged.

### G. Tests and quality

- **AC23** Unit tests cover AC1-AC2 (literal segments), AC5-AC9 in `tests/windows/About.test.tsx` (button text, position between last paragraph and facts, one dispatch per activation, rendered text equals data text plus the label, about height), AC10-AC12 in a new `tests/windows/Viz.test.tsx` (text from data, no focusable elements, no hard-coded colours), AC14-AC17 in the layout and reducer tests, AC18 in the dock tests and AC19 in the menu tests.
- **AC24** A `<Desktop />` component test or e2e test covers the about button opening viz from closed, minimized and open-but-behind states (AC7), and viz opening from the dock and the Windows menu.
- **AC25** Playwright at 1280x720 covers: the new about copy visible (AC1, AC2); the button below the text opening the dataviz window with "Coming soon" (AC7, AC12); the about window and the viz window fully visible above the dock (AC9, AC14); six dock buttons with dataviz Closed on load (AC18); the Windows menu dataviz item (AC19); viz closed after Restart and open after Tidy up (AC16, AC17); no console errors or warnings.
- **AC26** Existing tests that pin the old window set, counts, order or copy are updated without weakening coverage. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T16 ACn): <reason>` and is listed in the QA report and the autobuild log. No test is deleted or skipped. Tests that loop over a hard-coded five-window list keep that list where they only exercise those five (for example the e2e `openAll` helper); tests that assert "every dock window" or exact counts move to six. Known or likely cases (the planner must confirm the full list by running the suites):
  - Copy: `tests/windows/About.test.tsx` (T07 AC2 full `textContent` equals data text, which now also includes the button label; T07 AC47 `about` height 331), any e2e or unit test that matches the "last pixel" or "whole arc" text.
  - Window set and ids: `tests/logic/windows.test.ts` (WIN_IDS "six ids in spec order", DOCK_IDS "every id except site" literal list), `tests/logic/zorder.test.ts` and `tests/logic/dock.test.ts` only if they build a full `Record<WinId, Win>` from a literal id list (type errors once `viz` exists), `tests/T07.foundations.test.tsx` (literal five-window lists and `seen` set for `renderBody`, if they are meant to cover every window).
  - Layout and order: `tests/logic/layout.test.ts` (AC6 literal `INITIAL_ORDER`, keys of `layout()`, T15 tidy open flags), `tests/logic/desktop.test.ts` (`DOCK5` lists, tidy "opens all five", `INITIAL_ORDER` filters), `tests/helpers.test.ts` (T15 AC25 helper opening five, zIndex values via `INITIAL_ORDER`).
  - Start and Tidy: `tests/Desktop.start.test.tsx` (T15 AC5 `DOCK_IDS` has length 5; AC6 Windows menu five items; AC10 Tidy opens all five and `NON_HELLO` list), `tests/Desktop.boot.test.tsx` (closed-window list after Restart, Tidy comparison), `tests/Desktop.wiring.test.tsx` (`DOCK5`, page-wide tab list with five dock buttons), `tests/WindowLayer.test.tsx` (five open dock windows where state comes from tidy or "all dock").
  - Dock: `tests/Dock.test.tsx` (T06 AC3 five window buttons, `getAllByRole('button')` length 5, 7 svgs, 5 dots), `tests/Desktop.dock.test.tsx` (initial states over `DOCK_IDS`, z comparisons over `DOCK_IDS` where viz is closed, tab-stop list), `tests/windows/AboutSite.test.tsx` only if it assumes the dock count.
  - Menu: `tests/logic/menu.test.ts` (AC19 five window items), `tests/MenuBar.test.tsx` (AC11 five checkbox items; AC19 list and "all five checked"; Minimize all / Show all lists), `tests/Desktop.menubar.test.tsx` (window count and tab-stop list near the T06 AC30 comment).
  - E2e: `tests/e2e/start.spec.ts` (five dock buttons, five Windows menu items, Tidy opens five), `tests/e2e/chrome.spec.ts` (dock `toHaveCount(5)`, page-wide tab-stop sequences), `tests/e2e/dock.spec.ts` (dock `toHaveCount(5)`), `tests/e2e/menubar.spec.ts` (Windows menu items and tab stops), `tests/e2e/desktop.spec.ts` (reference positions if they use Tidy, and the about `y` if AC9 moves it), `tests/e2e/boot.spec.ts` (post-Restart closed list), `tests/e2e/windows.spec.ts` (about window contents or height).
  - Phone tests (`tests/PhonePage.test.tsx`, `tests/e2e/phone.spec.ts`) read `ABOUT_COPY` and must pass unchanged; if one pins the old literal text, that is a deliberate copy change.
- **AC27** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## Out of scope

- Any real data visualization, charts, data files or libraries in the viz window (Tanzi fills it later).
- Terminal changes for viz (`ls`, `open`, `help`, usage text).
- A viz entry, button or link on the phone page.
- A viz button in hello.txt, or any change to hello, experience, projects, terminal or About this site.
- Changing the "Currently building…" paragraph, `FACTS`, or adding about copy beyond AC1.
- Moving focus into viz when it is opened from the about button (same as the hello buttons today).
- New colours, tokens or button variants; changes to `layout()` formulas for existing windows (other than the effect of the about height in AC9).
- Persisting which windows are open.
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **Copy.** "Light polish only" is read as the exact AC1 text: Tanzi's three ideas in two sentences, with the two key phrases ("making ideas come to life", "visualizing data") as em segments so the existing em mechanism keeps at least one em per paragraph. No facts are invented.
2. **Dock button: yes.** The ticket says "dock entry", so `viz` has `dock: true` and a dock button. It starts closed (T15 start state).
3. **Tidy up opens viz too.** Tidy up already opens every `dock: true` window and the spec says "all open", so the simplest rule is to keep that rule: Tidy now opens six windows. No special case is added.
4. **Windows menu: yes.** The Windows menu lists the dock windows; viz is added as a sixth checkbox item after terminal so it stays reachable from the keyboard menu path.
5. **Terminal: no change.** The terminal already does not open every window (no `term` or `site` target), and viz is a placeholder, so `ls` and `open` stay as they are. This keeps terminal tests untouched.
6. **Phone page: no viz.** The phone page shows the new about copy automatically (it reads `ABOUT_COPY`) but gets no viz button, since there is no window on the phone and nothing to show yet.
7. **Z-order.** viz is added at the back of `INITIAL_ORDER` so it has its own z slot after Tidy up and never ties with `proj`. It is raised on open like every other window.
8. **Order of ids.** viz goes after term in `WIN_IDS`, so it is the last dock button before the separator and the last Windows menu window item. `site` stays last.
9. **Button placement and style.** "Right below the text" means after the paragraphs and before the facts pills. A secondary button (not primary) is used so it does not compete with hello's main call to action. An icon is optional.
10. **About gets `dispatch`.** About needs a way to dispatch `open`; passing `dispatch` from `WindowBody` the same way as Hello is assumed, but the exact wiring is the planner's choice.
11. **Viz icon.** `ChartPieSlice` is the default because `ChartLineUp` is already a project icon. Any unused Phosphor chart icon is acceptable.
12. **Viz body text** is exactly "Coming soon" with no extra description, matching the ticket's "short 'Coming soon' body".
13. **Test edits are sanctioned requirement changes**, following the backlog round 2 rule and the T15 precedent (AC26).

## Open questions

No blocking questions.
