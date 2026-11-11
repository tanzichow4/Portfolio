# T18 plan: project detail view, scrolling project list and a Featured star

Source: `docs/plans/T18-requirements.md` (identical to `00-requirements.md`: Current state, Assumptions 1-10, AC1-AC29), `CLAUDE.md`, `docs/design-decisions.md` (decisions 5, 9, 11, 13) and the T17 plan's method. Code read: `src/data.ts` (`Project`, `PROJECTS`), `src/windows/{Projects.tsx,Projects.css}`, `src/Window.tsx` (`minHeight: meta.height`, `overflow: hidden`, `.win-body`), `src/PhonePage.tsx`, `src/theme.css` (accent, neutral ramps, global `:focus-visible`, `.btn-ghost`), `src/MenuBar.tsx` (only other Escape handler), `eslint.config.js` (no jsx-a11y). Tests grepped: every file under `tests/` that pins `a.proj-tile`, `.proj-*`, `locator('a')` in proj, project svg counts, phone `svg`, stop names and counts, plus the purity, copy-ban, token, dependency and contrast tests.

T1-T3 below are tasks inside ticket T18, not backlog tickets.

## 1. Goal and scope

**Goal.** Activating a project tile swaps the projects grid for an in-window detail view (back button, Escape to go back, managed focus) built only from optional `Project` fields that restate facts already in the repo. The list scrolls inside the fixed 520x385 window with a token-styled scroll bar, and Indoor Garden (the capstone) shows a filled Phosphor `Star` named "Featured" on its tile, in its detail view and on the phone page.

**Out of scope** (carried over): inventing details, highlights, metrics, links, screenshots or repo URLs (`href` stays `'#'`); any terminal change; a detail view, buttons, highlights or links on the phone page; deep links or hash routing; persisting the selected project; changing `WIN_META.proj`, `layout()`, z-order, other windows or the titlebar text per view; animated list/detail transitions; new `PROJECTS` entries; styled scroll bars in other windows; editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `T18-requirements.md` with the same numbers. No AC is added. Two test-list gaps found by grep (`tests/e2e/windows.spec.ts` "a" count line 366 and the `.proj-arrow` CSS test) are handled in section 7a, not as new ACs.

### A. Data

- **AC1** `Project` in `src/data.ts` gains four optional fields: `featured?: boolean`, `details?: string`, `highlights?: string[]`, `links?: { label: string; href: string }[]`. `name`, `icon`, `href`, `desc` and `tags` stay required, and their values and the order of `PROJECTS` are unchanged.
- **AC2** Indoor Garden has `featured: true` and a `details` string that contains the word `Capstone` (capital C) and otherwise restates only facts already in its `desc` and `tags` (IoT garden monitoring, live dashboard, 10+ sensors, Docker, React). No other project is featured.
- **AC3** No new fact, number, tool, URL or claim is introduced: every `details`, `highlights` and `links` value present in `PROJECTS` uses only text already in that project's `desc`/`tags` (plus "Capstone" for Indoor Garden). Because no real project URLs exist in the repo, no project has `links`. Fields with no source are omitted (not empty strings, not empty arrays), and a `// TODO(Tanzi): ...` comment in `src/data.ts` marks each gap. No string value anywhere in `PROJECTS` contains `TODO`.
- **AC4** All new visible copy (the back button label, the "Featured" accessible name, any detail section headings such as "Highlights" and "Links") lives in a labels constant in `src/data.ts` (for example `PROJECT_LABELS`), not in components.

### B. Project list (tiles)

- **AC5** Each tile is a single native `<button type="button">` control (one tab stop per tile, no `<a>` in the list). The list still has one `li` per `PROJECTS` entry, in order, each showing the icon, the name as an `h2` heading, the `desc` and every tag (`.tag.tag-neutral`), and the markup is valid HTML (no heading or other block content inside the button).
- **AC6** The tile button's accessible name is exactly the project name. Its accessible description contains the project `desc`, and for a featured project also contains "Featured". Clicking anywhere on the visible tile face, or pressing Enter or Space on the focused button, opens that project's detail view. The `ArrowUpRight` external-link arrow is removed from tiles (tiles no longer link out); any replacement affordance icon is decorative (`aria-hidden`).
- **AC7** Tile hover lift/tilt, `--shadow-md`, pressed `scale(.97)`, the transition, the "only the face transforms" rule and the reduced-motion `transform: none` overrides behave as before (T07 AC8, AC9, AC33). The focus ring on a tile is visible and not clipped by the scroller or the window (T07 AC11 ring checks).
- **AC8** Tile project icons stay decorative (`aria-hidden`). Non-featured tiles contain no star.

### C. Featured star

- **AC9** A featured project's tile and its detail view each render exactly one filled Phosphor `Star` (`weight="fill"`) exposed as `role="img"` with accessible name exactly `Featured` (from `src/data.ts`). It is not focusable and has no `tabindex`. Non-featured projects render no star anywhere.
- **AC10** The star colour is a theme token (no hard-coded colour) and has at least 3:1 contrast (WCAG 1.4.11 non-text) against both `--color-bg` and `--color-surface` in dark and in light. This is verified by a unit test in `tests/contrast.test.ts` using `resolveTheme` and `contrastRatio`, one test per theme and background, ratio in the failure message.

### D. Detail view

- **AC11** Activating a tile replaces the list with that project's detail view inside the same window. The window's position, size (520x385), titlebar text (`~/projects`), region name (`projects`), z-order and minimize/close controls are unchanged. The list is not rendered (or is hidden from the accessibility tree and not focusable) while the detail view is shown.
- **AC12** The detail view shows, in DOM order: a back button, the project icon (decorative), the name as an `h2` heading, the star if featured, the `desc`, then `details` as a paragraph if present, `highlights` as a `<ul>` with one `li` per string in order if present, the tags (`.tag`), and `links` as a list of anchors if present (each `href` from data, `target`/`rel` from `linkAttrs`). A missing field renders nothing: no empty element, no heading for an absent section, no placeholder or `TODO` text.
- **AC13** The back button is a native `<button type="button">` with a visible text label from `src/data.ts` (for example "Back to projects"), any arrow icon `aria-hidden`. Activating it (click, Enter or Space) returns to the list.
- **AC14** When the detail view opens (by click or keyboard), focus moves to the back button. When the user goes back (back button or Escape), the list is shown again and focus moves to the tile button of the project that was open, which is scrolled into view if needed.
- **AC15** Pressing Escape while focus is anywhere inside the projects window and the detail view is shown goes back to the list (same result as AC14). Escape while the list is shown does nothing in the projects window: it does not close or minimize the window. Escape does not affect other windows, and Escape inside an open menubar menu still only closes the menu.
- **AC16** In the detail view the tab stops inside the projects window are, in order: Minimize, Close, the back button, then each detail link (none with current data). No tile is focusable while the detail view is shown.
- **AC17** With the current data the detail view fits in the window at 1280x720 without clipping the window chrome. If detail content is taller than the body, it scrolls vertically inside the window body (no horizontal scroll), never the page, and scrolling does not start a window drag.
- **AC18** The selected project lives only in the `Projects` component (no new `Desktop` state or reducer action). Closing the window and reopening it (dock, Windows menu, hello "See what I've built", terminal `open projects`) shows the list. Restart also shows the list. Minimizing and restoring keeps whatever view was showing. Opening, going back and switching projects cause no console errors or warnings.

### E. Scrolling list

- **AC19** The list area scrolls vertically (`overflow-y: auto`) inside the window body when tiles exceed the available height; there is no horizontal scroll and the page does not scroll. `WIN_META.proj` stays `{ width: 520, height: 385, dock: true }` and the rendered window height stays within 2px of 385 whatever the number of projects (verified with at least 8 projects, by mocking `PROJECTS` in a unit test and by injecting extra tiles in e2e). With the current four projects nothing visibly changes: same 2x2 grid, 10px gap, 14px padding, and the grid content still reaches within 2px of the window bottom.
- **AC20** The scroll container adds no extra tab stop while it contains focusable tiles; tabbing to a tile below the fold scrolls it into view.
- **AC21** The scroll bar is styled with theme tokens only (`scrollbar-width: thin` and `scrollbar-color: <thumb> <track>`), with no hard-coded colours (T07 AC7 check still passes). The thumb has at least 3:1 contrast against its track in dark and light, verified in `tests/contrast.test.ts`. The scroll bar has no motion.

### F. Unchanged surfaces

- **AC22** The terminal `projects` output is byte for byte unchanged; terminal tests pass without edits. `ls`, `open projects` and `help` are unchanged.
- **AC23** Desktop tab order counts are unchanged while the list is shown: the projects window still has six stops (Minimize, Close, four tiles), named `Voice Calendar`, `Indoor Garden`, `Grocery Prices`, `Driver Safety` in the existing chrome e2e stop-name helper, and the whole-desktop count in `tests/Desktop.dock.test.tsx` stays 35.

### G. Phone page

- **AC24** The phone page projects section shows the Featured star (filled Phosphor `Star`, `role="img"`, accessible name `Featured`, not focusable, token colour meeting AC10) for Indoor Garden only, placed outside the project name link so the link's accessible name still equals its visible text. Non-featured projects show no star.
- **AC25** The phone page has no detail view: no buttons, no `details`, `highlights` or `links` content, and nothing else changes (name link with `p.href`, `phone-desc`, tags, four sections, heading structure, list counts, link-only interactivity, no horizontal overflow at 320px). The only svg on the phone page is the Featured star.

### H. Tests and quality

- **AC26** Unit tests cover: AC1 to AC4 in `tests/data.test.ts`; AC5, AC6, AC8, AC9, AC11 to AC16 and AC18 in `tests/windows/Projects.test.tsx` plus a Desktop-level close/reopen and Restart test; AC19 with mocked extra projects; AC10 and AC21 in `tests/contrast.test.ts`; AC24 and AC25 in `tests/PhonePage.test.tsx`.
- **AC27** Playwright at 1280x720 covers: open a detail view by click and by keyboard (Enter and Space), back button focused, back by button and by Escape with focus returned to the same tile (AC13 to AC15); the detail tab order (AC16); window still 520x385 at y 259 in list and detail view (AC11, AC19); the list scrolls inside the window with extra injected tiles, scroll bar computed `scrollbar-color` matches the tokens in dark and light (AC19, AC21); star visible with name `Featured` on Indoor Garden in the tile and detail, and on the phone page (AC9, AC24); no console errors or warnings.
- **AC28** Existing tests that pin the old link tiles are updated, never deleted, skipped or weakened. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T18 ACn): <reason>` and is listed in the QA report and the autobuild log. The confirmed list is in section 7a.
- **AC29** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## 3. Architecture

**Approach.** Data, one component, CSS and the phone page. No `Desktop`, reducer, `Window`, terminal or `src/logic` change. No new logic module: the only "logic" is `selected: string | null` plus an Escape check, both trivial and DOM-bound. Adding a module would also force an edit to the exact module list in `tests/logic/purity.test.ts` (`EXPECTED`), which is not justified here.

**`src/data.ts`** (AC1-AC4)

- `Project` adds `featured?: boolean; details?: string; highlights?: string[]; links?: { label: string; href: string }[]`.
- Indoor Garden only: `featured: true`, `details: 'Capstone project: IoT garden monitoring with a live dashboard for 10+ sensors, built with Docker and React.'`
- `// TODO(Tanzi): ...` comments (comments only, never values): above `PROJECTS` for `links` (no real URLs in the repo) and `highlights` (no résumé source), and one per non-featured project for `details`.
- `export const PROJECT_LABELS = { back: 'Back to projects', featured: 'Featured', highlights: 'Highlights', links: 'Links' } as const;` next to `EXPERIENCE_LABELS`.

**`src/windows/Projects.tsx`** (AC5-AC9, AC11-AC18)

- State: `const [selected, setSelected] = useState<string | null>(null)` (project name). Lives only here, so close/Restart (unmount) resets it and minimize (still mounted, `inert`) keeps it (AC18).
- Root: `<div className="proj-body" ref={rootRef}>` holding either the list or the detail (conditional render, so the list is absent from the DOM in detail view, AC11, AC16).
- Tile markup (valid HTML, AC5): `li.proj-item > div.proj-tile[onClick=open] > div.proj-face > [div.proj-top: icon(aria-hidden), Star (if featured), CaretRight.proj-arrow(aria-hidden)] [h2.proj-name > button.proj-open type=button aria-describedby="{descId} {starId?}" ref] [p.proj-desc id=descId] [div.proj-tags]`.
  - The button sits inside the `h2`, so it holds only text and its accessible name is exactly `p.name` (AC6). The chrome e2e helper reads `textContent`, so names match unchanged (AC23).
  - The click handler is on `.proj-tile` (the non-transforming host), so a click anywhere on the face, including the bottom edge while the face is lifted, opens the detail. Enter/Space on the button fire a `click` that bubbles to the same handler. One handler, no double fire.
  - `CaretRight` replaces `ArrowUpRight` (decorative in-window affordance, AC6) and keeps the `.proj-arrow` class, so the existing colour test passes unedited.
  - Ids from `useId()`.
- Star: `<Star weight="fill" role="img" aria-label={PROJECT_LABELS.featured} className="proj-star" id={starId} />`. No `tabIndex`; the svg is not focusable (AC9).
- Detail markup (AC12, AC13): `div.proj-detail > button.btn.btn-ghost.proj-back[type=button, ref] (ArrowLeft aria-hidden + PROJECT_LABELS.back)`, `div.proj-detail-head` (icon aria-hidden, `h2.proj-detail-name`, star if featured), `p.proj-detail-desc`, `details && p.proj-details`, `highlights?.length && (h3 + ul > li)`, `div.proj-tags` (same tag markup as tiles), `links?.length && (h3 + ul > li > a href {...linkAttrs(href)})`. Absent fields render nothing.
- Focus (AC14): a `useEffect` on `selected`: if non-null, focus the back button. On back, store the name in a `returnTo` ref, set `selected` to null, and the effect focuses `tileRefs.current[name]` then clears `returnTo`. On first mount nothing is focused (no focus steal). Plain `focus()` scrolls the tile into the nearest scroller (no `scrollIntoView`, which jsdom lacks).
- Escape (AC15): while `selected !== null`, a `document` `keydown` listener (cleaned up on change/unmount, same pattern as `MenuBar`) goes back when `e.key === 'Escape'` and `rootRef.current?.closest('[data-win]')?.contains(e.target as Node)`. This covers focus on the titlebar Minimize/Close too. Focus in a menubar menu is outside the window, so the menu keeps sole control. No listener when the list is shown, so Escape never closes or minimizes the window.

**`src/windows/Projects.css`** (AC7, AC17, AC19-AC21)

- Fixed height, same proven pattern as T17 exp: `.win-body:has(> .proj-body) { position: relative; }`, `.proj-body { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--color-neutral-500) var(--color-surface); }`. `Window` keeps `minHeight: 385`, so the window is exactly 385 whatever the content.
- `.proj-grid` unchanged (2 columns, 10px gap, 14px padding), so the four tiles look the same and the padding keeps the 2px+2px focus ring inside the scroller.
- `.proj-tile` keeps its rules plus `cursor: pointer`; hover/active/reduced-motion rules unchanged. `.proj-open` resets button styles without `all: unset` (`margin:0; padding:0; border:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer`). Global `:focus-visible` gives the 2px accent ring. Add `.proj-tile:has(.proj-open:focus-visible) .proj-face { box-shadow: 0 0 0 2px var(--color-accent); }` so the whole tile reads as focused.
- `.proj-star { color: var(--color-accent); }`. Detail: `.proj-detail { display:flex; flex-direction:column; gap:8px; padding:14px; }`, `.proj-back { align-self: flex-start; }`, head row flex with gap 8px, name 16px/500 `--color-text`, desc and details 13px `--color-neutral-400`. Tokens only, no hex/rgb, no `760`, no transitions on new rules.

**`src/PhonePage.tsx` + `PhonePage.css`** (AC24, AC25): inside the project `h3`, after the `a.phone-link`, render `{' '}<Star weight="fill" role="img" aria-label={PROJECT_LABELS.featured} className="phone-star" />` when `p.featured`. `.phone-star { color: var(--color-accent); vertical-align: -2px; margin-left: 4px; }`. No `tabIndex`, no focus or scroll calls (T13 source checks).

**Data and API changes.** Four optional `Project` fields, one labels constant. No new tokens, exports beyond `PROJECT_LABELS`, actions, state or storage.

**Dependencies.** None (`Star`, `CaretRight`, `ArrowLeft` come from the existing `@phosphor-icons/react`; the T13 AC29 dependency test stays green).

## 4. Design

**User flow.** The visitor opens projects (dock, Windows menu, hello "See what I've built", `open projects`). Four tiles as before; Indoor Garden has a small filled accent star at top right next to a caret. Clicking a tile (or Tab to it and Enter/Space) swaps the body to the detail: "Back to projects" ghost button at top (focused), then icon, name, star, desc, the capstone paragraph for Indoor Garden, tags. Back or Escape returns to the grid with focus on the same tile.

**States.**

- Loading: none (static data).
- Empty: an empty `PROJECTS` renders an empty `ul` (not reachable with current data, no placeholder copy).
- Error: none, nothing async. An unknown `selected` (not possible) falls back to the list.
- Success: list view or detail view. A detail with only required fields still shows name, icon, desc and tags, never blank.

**1280x720 and larger.** Window unchanged at (x, 259), 520x385, bottom at the dock clearance. The list scrolls inside the body only when more than four projects exist; the detail fits with current data. Mobile is not built; the phone page only gains the star.

**Accessibility.** One tab stop per tile, name = project name, description = desc (+ "Featured"); headings preserved (`h2` per tile, `h2` in detail, `h3` only for present sections); focus moved on open and returned on back; Escape scoped to the window; star is `role="img"` named "Featured", non-focusable; other svgs `aria-hidden`; minimized window stays `inert` (existing). Contrast: star accent on bg/surface (dark about 5:1 and 6:1, light 4.8:1 and 5.4:1); scroll thumb `neutral-500` on `surface` (dark about 5:1, light about 5.2:1); text colours reuse already-tested pairs.

**Reduced motion.** List/detail swap is instant. No new transitions. Existing tile `transform: none` overrides unchanged. Scroll bar has no motion.

## 5. Risk and security

No auth, input, network or secrets. All strings render as text; no `dangerouslySetInnerHTML` (guarded by the Terminal source test).

- **R1. Invented claims (AC3).** Safeguard (T1 test): Indoor Garden `details` contains `Capstone`, `IoT`, `dashboard`, `10+`, `Docker`, `React`; every number in any `details`/`highlights` appears in that project's `desc`; no project has `links`; no `highlights` key; non-featured projects have no `details` key; no `TODO` in any string value.
- **R2. Window height grows with content (AC19).** `Window` only sets `minHeight`. Safeguard: absolute `.proj-body` takes content out of flow; e2e injects 8 extra tiles and asserts 385 +/- 2.
- **R3. Bottom-edge click misses while the face is lifted (AC6, T07 AC9).** Safeguard: the click handler lives on the non-transforming `.proj-tile`; the existing bottom-edge click e2e is kept and extended to assert the detail opened.
- **R4. Focus ring clipped by the new scroller (AC7).** The T07 AC11 e2e walks every clipping ancestor. Safeguard: the button sits inside the face with 14px grid padding plus 14px face padding; the 4px ring cannot reach the scroller edge.
- **R5. Escape conflicts (AC15).** The listener exists only in detail view and only acts when the event target is inside the projects window. Safeguard: unit tests for Escape in list view (no change, window still open), Escape from the Close button in detail view, Escape inside another window and with a menubar menu open.
- **R6. `focus()` scrolling the overflow-hidden window section.** The nearest scroller (`.proj-body`) absorbs it; e2e checks the window box and `document.scrollingElement.scrollTop` stay put after back.
- **R7. Copy-ban and purity.** New copy only in `PROJECT_LABELS`; no `src/logic` change; no email, URLs, `760` or banned menu strings added.
- **R8. Unverified edit list.** This plan comes from grep, not a suite run. Safeguard: the test-writer runs each suite at the start of every task and reconciles 7a against real failures; a failure outside 7a is a regression to fix in `src/`, not a test edit.

## 6. Gaps check

- **Auth:** none in this app.
- **Validation:** no user input; data shape validated by T1 tests.
- **Error handling:** no failure path; unknown selection falls back to the list.
- **Mobile:** not built; the phone page only adds the star (unit + 320px e2e).
- **Accessibility:** section 4 (button semantics, names/descriptions, focus management, Escape, star `role="img"`, contrast tests).
- **Config and env vars:** none.
- **Tests:** data, Projects component (list, detail, focus, Escape, many-projects mock), Desktop close/reopen/Restart, contrast, phone, a new e2e spec, plus the 7a edits.

## 7. Tasks

The coder edits `src/` only, the test-writer owns `tests/`. Each task leaves `npm run lint`, `npm run typecheck`, `npm test` and `npm run format:check` green. New tests use a `T18 ACn:` prefix. Every edit to an existing test carries `// DELIBERATE REQUIREMENT CHANGE (T18 ACn): <reason>`.

- **T1. Data fields, labels, star contrast, phone star.** ACs: AC1-AC4, AC10, AC21 (contrast part), AC24, AC25, AC26 (data, contrast, phone), AC28 (unit).
  - Coder: `data.ts` type, Indoor Garden fields, TODO comments, `PROJECT_LABELS`; `PhonePage.tsx` star + `.phone-star` CSS. (The tile star waits for T2 so the tile svg test is edited once.)
  - Test-writer: apply 7a "T1". New: `tests/data.test.ts` `describe('T18 project data')` (R1 checks, required fields and order deep-equal literals, only Indoor Garden featured, `PROJECT_LABELS` values); `tests/contrast.test.ts` `T18 AC10: ${theme}: star (accent) on bg|surface >= 3` (4 tests) and `T18 AC21: ${theme}: scroll thumb (neutral-500) on track (surface) >= 3` (2 tests), ratio in the message; `tests/PhonePage.test.tsx`: exactly one `svg[role="img"]` named `Featured`, inside the Indoor Garden `li`'s `h3` but not inside its link, no `tabindex`; no `button`; the Indoor Garden `details` text is absent.
- **T2. Tiles as buttons, detail view, focus and Escape, scrolling list.** ACs: AC5-AC9, AC11-AC20, AC21 (CSS part), AC22, AC23, AC26 (component, Desktop), AC28 (unit).
  - Coder: `Projects.tsx` and `Projects.css` per section 3.
  - Test-writer: apply 7a "T2". New, in `tests/windows/Projects.test.tsx` `describe('T18 ...')`: AC5 one `button` per `li`, no `a`, the `h2` contains the button, no block element inside any button; AC6 `toHaveAccessibleName(p.name)`, `toHaveAccessibleDescription` contains desc (+ `Featured` for Indoor Garden only), a click on `.proj-face` (not the button) opens the detail, `{Enter}` and `{ }` on the focused button open it; AC8/AC9 star count 1 in the Indoor Garden tile and detail, 0 elsewhere, no `tabindex`; AC11 detail shown, no `ul.proj-grid`, no tile buttons; AC12 DOM order and absent sections (no `h3`, no `ul`, no `TODO`) for Indoor Garden and Voice Calendar; AC13 back by click, Enter, Space; AC14 focus on back after open, on the same tile after back; AC15 Escape from the back button and from the Close button (in `<Desktop />`) goes back, Escape in list view leaves the window open and not minimized, Escape with focus in another window or in an open menubar menu leaves the detail shown; AC16 focusable elements in the window in detail view are Minimize, Close, back; AC18 in `<Desktop />`: open detail, close, reopen via dock shows the list; minimize and restore keeps the detail; Restart shows the list; no `console.error`/`warn` spy calls. CSS: `.proj-body` `overflow-y: auto`, `overflow-x: hidden`, `position: absolute`, `inset: 0`, `scrollbar-width: thin`, `scrollbar-color: var(--color-neutral-500) var(--color-surface)`; `.win-body:has(> .proj-body)` `position: relative`; `.proj-star` colour `var(--color-accent)`; no `transition` in new rules. New `tests/windows/Projects.many.test.tsx` (vi.mock `PROJECTS` to 8 entries): 8 `li`, 8 buttons, all inside `.proj-body`, `WIN_META.proj` still `{520, 385, true}`.
  - Terminal tests run unedited (AC22); `Desktop.dock.test.tsx` 35 stays unedited (AC23).
- **T3. End to end.** ACs: AC7, AC11, AC14-AC21, AC23, AC24, AC27, AC28 (e2e), AC29.
  - Test-writer: apply 7a "T3". New `tests/e2e/projects.detail.spec.ts`, `watchErrors` in every test, 1280x720: open by click, Enter and Space, back focused; back by button and by Escape, focus on the same tile; Tab order in detail (Minimize, Close, back, then focus leaves the window); window 520x385 +/- 2 at y 259 in both views. Scroll: prepend 8 cloned `li` to `.proj-grid` via `page.evaluate`; the window is still 385 +/- 2, `.proj-body` `scrollHeight > clientHeight` and `scrollWidth <= clientWidth`; a wheel over the list raises `scrollTop` while window x/y and page scroll stay put; AC20: focus Close projects and press Tab 12 times, the focused element is the `Driver Safety` button, its rect lies inside the `.proj-body` rect, `scrollTop > 0`, and `.proj-body` itself is never focused. Computed `scrollbar-color` of `.proj-body` equals a probe's computed `var(--color-neutral-500)` and `var(--color-surface)` in dark and light. Star visible via `getByRole('img', { name: 'Featured' })` in the Indoor Garden tile and detail; phone viewport 320x700 shows one Featured star and no horizontal overflow.
  - Run the full AC29 set.

**After T3 (QA).** Confirm `git diff` on existing tests shows only 7a edits plus additive cases, each with the marker; list every edit in the QA report and autobuild log.

### 7a. Existing tests this ticket changes (sanctioned under AC28)

Located by grep. Every assertion is kept; only selectors, expected values or counting scope change.

**Checked, no edit expected:** `tests/logic/terminal.test.ts`, `tests/windows/Terminal.test.tsx` (AC22); `tests/Desktop.dock.test.tsx` 35 stops (AC23); `tests/e2e/chrome.spec.ts` stop names (the helper reads `textContent`, button text = name) and 35-stop labels; `tests/e2e/windows.spec.ts` T07 AC10 `seen.get('proj').size` 6; `tests/e2e/windows.motion.spec.ts` hover, press, stability and reduced-motion tile tests (`.proj-tile` host and `.proj-face` keep their roles); `tests/e2e/projects.spec.ts` T07 AC47 grid-bottom probe (`.proj-grid` is still the measured element) and AC34; `tests/windows/Projects.test.tsx` T07 AC31 grid/face/icon/arrow/name/tag CSS, T07 AC33/AC9/AC8 motion CSS, T07 AC7 tokens, AC34, AC47/AC48, and the pure `linkAttrs` https test; `tests/data.test.ts` existing cases; `tests/PhonePage.test.tsx` AC10/AC20/AC21/AC22 and source checks; `tests/PhonePage.data.test.tsx`; `tests/logic/purity.test.ts` (no new module); `tests/logic/view.test.ts` (no new dependency, no `760`); `tests/MenuBar.test.tsx` copy-ban; `tests/e2e/phone.spec.ts` (no svg probe).

**T1 (unit)**

| File                       | Edit                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/PhonePage.test.tsx` | **T13 AC24 "no svg or img, and every link name equals its visible text"** (AC25): `querySelector('svg')` toBeNull becomes: `querySelectorAll('svg')` has length 1, it has `role="img"` and accessible name `Featured`, and it sits in the Indoor Garden `li`. `img` null, the link count and the link-name loop are unchanged. Title gains "except the Featured star". |

**T2 (unit), all in `tests/windows/Projects.test.tsx`**

| Test                                                                          | Edit                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T07 AC31 "one link tile per PROJECTS entry, in order" (AC5)                   | `getAllByRole('link')` becomes `getAllByRole('button')`; `items[i].contains(buttons[i])` kept; the heading check moves from `within(links[i])` to `within(items[i])` and also asserts the heading contains the button. Add `queryAllByRole('link')` length 0. |
| T07 AC31 "each tile shows name as a heading, description and every tag" (AC5) | Scope `within(items[i])` (the `li`) instead of the link; all heading, desc, tag-class and tag-count assertions kept.                                                                                                                                          |
| T07 AC32 "each href comes from PROJECTS" (AC6, AC12)                          | Tiles have no href: assert no element in the list has an `href`; for every project with `links` (none today) the detail anchors' `href` equals data. The phone page `href` assertion (T13 AC10) still pins `p.href`, so href-from-data stays covered.         |
| T07 AC32 "target and rel come from linkAttrs" (AC12)                          | Iterate detail-view anchors for each project (none with current data, so the loop also asserts the count equals `p.links?.length ?? 0`); `expect(linkAttrs('#')).toEqual({})` kept.                                                                           |
| T07 AC32 "icons (project icon and arrow) are hidden" (AC6, AC9)               | svg count `PROJECTS.length * 2` becomes `PROJECTS.length * 2 + featuredCount` (icon + caret per tile, plus the star); every svg without `role="img"` is `aria-hidden="true"`; the one `role="img"` svg is named `Featured`.                                   |
| T07 AC32 "accessible name holds name and description as separate words" (AC6) | The name check becomes `toHaveAccessibleName(p.name)`; desc moves to `toHaveAccessibleDescription(expect.stringContaining(p.desc))`; the "desc after name" order check is kept on the `li` textContent.                                                       |
| T07 AC32 "separates name, description and tags with whitespace" (AC6)         | `aria-label` null kept (on the button); heading `H2` with text `p.name` found via the `li`; the tag whitespace check is scoped to the `li`.                                                                                                                   |

**T3 (e2e)**

| File                               | Edit                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/projects.spec.ts`       | **T07 AC31** locator `a.proj-tile` becomes `.proj-tile` (still 4, same 2x2 geometry and 10px gaps) (AC5, AC19).                                                                                                                              |
| `tests/e2e/windows.spec.ts`        | **T07 AC11** `tile = win('proj').locator('a').nth(i)` becomes `locator('.proj-open').nth(i)`; line 366 `locator('a').count()` 4 becomes `locator('.proj-open').count()` 4 plus `locator('a').count()` 0 (AC5, AC23). Stop count 6 unchanged. |
| `tests/e2e/windows.motion.spec.ts` | **T07 AC9 "a click at the bottom edge of a tile reaches the link (navigation is cancelled)"** becomes "reaches the tile and opens the detail view": `__clicks` 1 kept, plus the back button is visible and focused (AC6, AC14).              |

## 8. Open questions

None need a human. Decided unattended:

1. **Button inside the `h2`, click handler on the non-transforming `.proj-tile` host.** Valid HTML, name = project name, and the whole face is clickable even while lifted. A stretched `::after` would move with the transformed face and miss bottom-edge clicks.
2. **`CaretRight` with the `.proj-arrow` class replaces `ArrowUpRight`**, so the arrow colour test needs no edit and tiles keep a decorative "opens" cue.
3. **Escape via a `document` listener scoped to the window element**, active only in detail view, so titlebar buttons are covered and the menubar is untouched.
4. **No new `src/logic` module**; the state is one `useState`, and a module would force a purity-list edit.
5. **Scroll colours: `neutral-500` thumb on a `surface` track** (an explicit track so contrast is testable; about 5:1 in both themes). The star uses `--color-accent`.
6. **`details` text** is "Capstone project: IoT garden monitoring with a live dashboard for 10+ sensors, built with Docker and React."
7. **Task split** deviates slightly from the suggestion: the tile star moves to T2 so the tile svg-count test is edited once; T1 still carries the data, labels, phone star and contrast tests.
8. **Phone star inside the `h3`, after the link**, so the link name is unchanged and the star reads with the project heading.
