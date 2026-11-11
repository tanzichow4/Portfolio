# T17 plan: experience.log, bigger window, key stats and an org pill

Source: `docs/plans/T17-requirements.md` (identical to `00-requirements.md`: Current state, Assumptions 1-10, AC1-AC23), `CLAUDE.md`, `docs/design-decisions.md` (decisions 5, 7, 11, 13) and the T16 plan's method. Code read: `src/data.ts` (`Exp`, `EXP`, `EXPERIENCE_LABELS`), `src/windows/{Experience.tsx,Experience.css}`, `src/{Window.tsx,Window.css}` (`minHeight: meta.height`, `.win-body { flex: 1 }`), `src/logic/{windows,layout,terminal}.ts`, `src/{PhonePage.tsx,PhonePage.css}`, `src/theme.css` (accent ramps, `.tag-accent`). Tests grepped: every file under `tests/` that pins `desc`, `.exp-desc`, `.exp-org`, `.exp-panel`, `WIN_META.exp`, exp position (354), heights (290), widths (520), phone list counts, plus the copy-ban, purity, token and contrast tests.

T1-T3 below are tasks inside ticket T17, not backlog tickets.

## 1. Goal and scope

**Goal.** The experience.log window grows to 600x400 and stays fully between the menubar and the dock at 1280x720, and each role's `desc` sentence becomes a short `stats: string[]` list made only from figures already in the data. The `@ Company` line becomes a light-purple pill using two new Nocturne tokens that pass WCAG AA in dark and light, while the terminal `experience` command and the phone page keep working.

**Out of scope** (carried over):

- New stats, numbers or claims not already in `src/data.ts` (no invented figures, no `TODO(Tanzi)` placeholders rendered).
- Changing the terminal `experience` output, `help`, `ls` or `open`.
- Restyling the phone page `@ org` line as a pill, or any other phone layout change beyond replacing `desc` with stats.
- Changing the `layout()` formula for exp or any other window, other windows' sizes, or `INITIAL_ORDER`.
- Changing tabs, the rail width, tag styles, or adding new tag variants.
- A styled scroll bar (T18 does that for projects; exp uses the default).
- Mobile window layout, persistence changes, editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `T17-requirements.md` with the same numbers. No AC is added. One gap found in AC22's "known cases" list: `tests/logic/windows.test.ts` "AC2: widths match the spec" pins `WIN_META.exp.width` at 520. It is a test-list gap, not a product gap, so it is handled in section 7a, not as a new AC.

### A. Data

- **AC1** `Exp` in `src/data.ts` is `{ when: string; role: string; org: string; stats: string[]; tags: string[] }`. The `desc` field is removed from the type and from every entry, and `desc` is not read for experience anywhere in `src/`.
- **AC2** `EXP[*].stats` are exactly these strings, in this order (no trailing full stop, straight characters):
  - Tartigrade Ltd.: `"Led onboarding for a multi-tenant web platform"`, `"Built a natural-language-to-SQL engine on a local model"`, `"Wrote a security review"`.
  - General Dynamics Mission Systems: `"Redesigned a legacy system, cutting runtime from 33 hours to 3"`, `"Raised coverage by 80% with PyTest"`, `"Automated deploy config in Python"`.
  - University of Calgary: `"IoT, data and ML projects"`.
- **AC3** Every figure in `stats` already appeared in the old `desc` text (33 hours, 3, 80%). No new number, percentage, metric, employer, tool or claim is introduced. No stat string is empty, and no stat contains `TODO`. `when`, `role`, `org`, `tags` and the order of `EXP` are unchanged.

### B. Experience window content

- **AC4** The panel shows, in DOM order: the role heading (`h2.exp-role`), the org pill, the date (`.exp-when`), a stats list, then the tags. `p.exp-desc` no longer exists.
- **AC5** The stats list is a semantic `<ul>` with one `<li>` per string of the selected entry's `stats`, in order, and the `li` text equals the data string exactly. It shows only the selected entry's stats (never another entry's), and it changes when the tab changes. Any bullet icon or marker is decorative (`aria-hidden`, not focusable). Stat text uses theme tokens only and passes the existing text contrast checks (for example `neutral-400` or `text`), at a size of at least 13px.
- **AC6** Tabs, tab keyboard behaviour (Arrow Up/Down wrap, Home, End, roving `tabindex`), `aria-controls`, the panel's accessible name (the selected org) and the reset-on-close behaviour are unchanged.

### C. Org pill

- **AC7** The `@ Company` line is rendered as a pill: still the element with class `exp-org`, its `textContent` is still `${EXPERIENCE_LABELS.at} ${org}` (for example `@ Tartigrade Ltd.`), and `@` still comes from `EXPERIENCE_LABELS.at`. It has a filled background, a fully rounded or tag-like border radius, horizontal padding, and sizes to its content (it does not stretch across the panel). It is not focusable and not interactive.
- **AC8** `src/theme.css` gains two opaque `#rrggbb` tokens, `--color-org-pill-bg` and `--color-org-pill-text`, defined in `:root` (dark) and overridden in `[data-theme='light']`. The pill background reads as a light purple in both themes and is from the existing accent family (default `#d2cefd` background with `#2b2741` text in both themes, about 9.5:1). In light mode the pill background differs from the tag background (`--color-accent-800`) so the pill does not look like a tag.
- **AC9** Text contrast of `--color-org-pill-text` on `--color-org-pill-bg` is at least 4.5:1 in dark and in light. This is verified by a unit test in `tests/contrast.test.ts` that resolves both tokens per theme with the existing `resolveTheme` helper and checks them with `contrastRatio`, in the same style as `TAG_PAIRS` (one test per theme, the ratio in the failure message).
- **AC10** `Experience.css` uses only `var(--…)` tokens for the pill (no hard-coded colours, the existing T07 AC7 check still passes). The pill has no hover or motion. The phone page `@ org` line is not changed to a pill (see Out of scope).

### D. Window size, position and scrolling

- **AC11** `WIN_META.exp` is `{ width: 600, height: 400, dock: true }`. The rail stays 150px wide.
- **AC12** The `layout()` formula for exp is unchanged, so the new height alone moves it. The resulting exp positions are: 1280x720 (64, 244); 1366x768 (68, 292); 1440x900 (72, 424); 1536x864 (77, 388); 1920x1080 (96, 562). Every other window's position is unchanged at every supported size.
- **AC13** At 1280x720 and every supported size the whole exp window is on screen: `y >= 36` (below the menubar), `y + 400 <= vh - 76` (above the dock clearance), `x >= 16` and `x + 600 <= vw - 16`. At 1280x720 its right edge (664) stays left of term (810) and its bottom (644) touches but does not cross the dock clearance.
- **AC14** The rendered exp window height is within 2px of 400 at 1280x720 on every tab, in dark and light (fixed height, not content height). The rail and panel fill the body height.
- **AC15** When the selected entry's content is taller than the panel, the panel scrolls vertically (`overflow-y: auto`), not the window or the page, and there is no horizontal scroll. The panel stays keyboard focusable (`tabIndex=0`) so it can be scrolled from the keyboard, and its focus ring is still visible. With the AC2 data at 1280x720, all three entries fit without clipping the window chrome. Scrolling inside the panel does not start a window drag.
- **AC16** Opening exp from the dock, the Windows menu, the hello "What I've been up to" button or the terminal `open experience` raises it above hello, so the whole window (tabs, pill, stats) is visible and clickable. Drag clamp, minimize (genie) and close behave as before for the new size.

### E. Terminal and phone page

- **AC17** The terminal `experience` output is byte for byte unchanged (one row per entry: `when.padEnd(12) + role + ' @ ' + org`). The terminal tests pass without edits.
- **AC18** The phone page experience section shows, per entry: role `h3`, `@ org`, when, the entry's `stats` as a nested `<ul role="list">` with one `li` per stat in order, then the tags. There is no `desc` text. The section has no tabs, no buttons and no focusable elements, and the page still has no horizontal overflow at 320px (a long stat wraps).
- **AC19** Nothing else on the phone page changes (about, projects, links, heading structure, four sections, link-only interactivity).

### F. Tests and quality

- **AC20** Unit tests cover: AC1 to AC3 (exact stats per entry, no `desc` key, no empty or `TODO` stat, figures only from the old text) in `tests/data.test.ts` or a new T17 data test; AC4 to AC7 and AC10 in `tests/windows/Experience.test.tsx` (stats `ul` order and text per tab, only the selected entry's stats, pill text, pill class and token-only CSS, no `.exp-desc`); AC9 in `tests/contrast.test.ts`; AC11 to AC13 in `tests/logic/layout.test.ts`; AC18 in `tests/PhonePage.test.tsx`.
- **AC21** Playwright at 1280x720 covers: exp window renders 600 wide and within 2px of 400 tall on every tab (AC11, AC14); exp fully above the dock and below the menubar (AC13); the pill is visible with `@ Tartigrade Ltd.` and its computed background and text colours match the theme tokens in dark and light (AC7, AC8); the stats list shows the AC2 strings for each tab (AC5); the panel scrolls rather than the window when content is forced taller (AC15); no console errors or warnings.
- **AC22** Existing tests that pin the old size, position or `desc` are updated, never deleted, skipped or weakened. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T17 ACn): <reason>` and is listed in the QA report and the autobuild log. The confirmed list is in section 7a.
- **AC23** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## 3. Architecture

**Approach.** Data, markup and CSS only. No logic module, reducer, `Window`, `Desktop` or terminal change. The fixed window height is achieved inside `Experience.css` without touching `Window`: `Window` already sets `minHeight: meta.height` on a flex column whose `.win-body` is `flex: 1`. If the exp body is taken out of flow (absolutely positioned inside a positioned `.win-body`), the section renders at exactly `meta.height` and `.win-body` grows to `400 - titlebar`. The panel then scrolls inside that box. No titlebar height is hard-coded.

**`src/data.ts`** (AC1-AC3)

- `Exp` becomes `{ when; role; org; stats: string[]; tags }`. Remove `desc` from the type and the three entries, add the AC2 `stats` arrays literally. `when`, `role`, `org`, `tags` and order untouched.
- Leave the `experience/` comment as is (no content change asked).
- No new labels: the stats list needs no visible label (the panel is already named by the org tab).

**`src/windows/Experience.tsx`** (AC4-AC7)

- Replace `<p className="exp-desc">` with `<ul className="exp-stats" role="list">{entry.stats.map((s) => <li key={s} className="exp-stat">{s}</li>)}</ul>`, between `.exp-when` and `.exp-tags`. `role="list"` is explicit because the CSS sets `list-style: none` (keeps list semantics in WebKit, same rule as the phone page).
- The bullet is a CSS `::before` with `content: ''`, so it is not in the accessibility tree, not focusable and not in `textContent` (AC5).
- `.exp-org` stays a `div` with the same children. It becomes a pill by CSS only (AC7).
- Tabs, keyboard handler, ids and state untouched (AC6).

**`src/windows/Experience.css`**

- T1 (stats): rename the `.exp-desc` rule to `.exp-stats` with the same typography (`margin: 12px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--color-neutral-400)`) plus `padding: 0; list-style: none`. `.exp-stat { position: relative; padding-left: 14px }`, `.exp-stat + .exp-stat { margin-top: 2px }`, `.exp-stat::before { content: ''; position: absolute; left: 2px; top: 0.7em; width: 5px; height: 5px; border-radius: 50%; background: var(--color-accent) }`.
- T2 (pill): `.exp-org { display: block; width: fit-content; max-width: 100%; box-sizing: border-box; margin-top: 6px; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 500; line-height: 1.5; background: var(--color-org-pill-bg); color: var(--color-org-pill-text) }`. No `:hover`, no transition, no transform (AC10).
- T2 (fixed height and scroll):
  - `.win-body:has(> .exp-body) { position: relative; }` (`:has` is already used in `theme.css`).
  - `.exp-body { position: absolute; inset: 0; display: flex; align-items: stretch; }` so rail and panel fill the body height (AC14).
  - `.exp-panel` adds `overflow-y: auto; overflow-x: hidden;`. Keep `min-height: 250px`, `outline-offset: -2px`, `user-select: text` and `tabIndex=0` (AC15). The panel is not the titlebar, so wheel and drag-select inside it never start a window drag.
- No hex, rgb, hsl or the number `760` in the file (T07 AC7 test and `view.test`).

**`src/theme.css`** (AC8)

- `:root` (first block, after the accent ramp): `--color-org-pill-bg: #d2cefd; --color-org-pill-text: #2b2741;`.
- `[data-theme='light']`: the same two lines with the same values (explicit override, AC8). Light pill `#d2cefd` differs from light `--color-accent-800` `#e7e5fe`. Ratio is about 9.5:1 in both themes (computed: L 0.649 vs 0.0235).
- Literal hex, not `var()` of the ramp, because the light ramp is reversed and AC8 requires opaque `#rrggbb` values that `resolveTheme` reads directly.

**`src/logic/windows.ts`** (AC11). `exp: { width: 600, height: 400, dock: true }`. `layout()` untouched, so AC12 positions follow (verified by hand: 1280x720 `min(380, 720-76-400=244)` = 244, x `min(64, 1280-600-16)` = 64; the other four sizes match the AC12 list).

**`src/PhonePage.tsx` + `PhonePage.css`** (AC18, AC19)

- Replace `<p className="phone-desc">{e.desc}</p>` with `<ul className="phone-stats" role="list">{e.stats.map((s) => <li key={s}>{s}</li>)}</ul>`. Projects keep `.phone-desc`.
- `.phone-stats { margin: 8px 0 0; padding-left: 20px; list-style: disc; color: var(--color-neutral-400); }`. The page's `overflow-wrap: anywhere` keeps 320px safe.

**Terminal.** Untouched (it never read `desc`). AC17 is guarded by the existing terminal tests passing unedited.

**Data and API changes.** `Exp` loses `desc`, gains `stats`. Two new CSS tokens. `WIN_META.exp` size. No new exports, actions, state or storage.

**Dependencies.** None.

## 4. Design

**User flow.** On first load only hello is open (unchanged). The visitor opens experience.log from hello's "What I've been up to", the dock, the Windows menu or `open experience`. It flies in at (64, 244) on top of hello, 600x400, ending exactly at the dock clearance. The rail shows three org tabs. The panel shows the role, a soft light-purple `@ Tartigrade Ltd.` pill, the date, three short bullet stats, then the tags. Switching tabs swaps the pill, date, stats and tags; the window does not change size.

**States.**

- Loading: none (static data).
- Empty: not possible with the AC2 data (every entry has at least one stat, enforced by AC3 test). If a future entry had `stats: []`, the `ul` renders empty with no visual gap beyond its margin; acceptable, no placeholder copy.
- Error: none, nothing async.
- Success: the selected entry's content; the panel scrolls only if a future entry is taller than about 320px of content.

**1280x720 and larger.** Exp spans x 64..664, y 244..644. Term (810..1250) is untouched on the right. Hello (top of the stack after Tidy up) covers the upper-left of exp; raising exp fixes that, which is the accepted overlapping layout (Assumption 5). Larger viewports follow AC12. Mobile is not built; the phone page only swaps `desc` for the stats list.

**Accessibility.**

- Stats are a real list (`ul role="list"` + `li`); bullets are empty pseudo-elements, not announced.
- The pill is plain text in a `div`, not focusable, no role; screen readers read `@ Tartigrade Ltd.` as before.
- Panel remains a focusable `tabpanel` (Tab order: selected tab, then panel) so keyboard users can scroll it with arrows; the inset focus ring stays visible inside the scroll box.
- Contrast: pill 9.5:1 both themes; stats `neutral-400` already pass on surface in both themes (existing `windows.contrast.test.ts`); the bullet is non-text.

**Reduced motion.** No new motion. The pill has no hover or transition. Tab face hover and genie rules unchanged.

## 5. Risk and security

No auth, input, network or secrets involved. All content is static strings rendered as text (no `dangerouslySetInnerHTML`, guarded by the existing Terminal test).

- **R1. Invented claims (AC3).** Safeguard: T1 test deep-equals the literal AC2 stats and checks every digit or percentage in each entry's stats appears in a frozen copy of that entry's old `desc` (kept as a literal in the test).
- **R2. Window height not fixed (AC14).** `Window` only sets `minHeight`, so any in-flow content taller than 360px would grow the window. Safeguard: the absolute `.exp-body` takes content out of flow; e2e measures 400 +/- 2 on every tab in dark and light, and with forced tall content (AC15 test) the window stays 400.
- **R3. `:has` support.** Chromium (the only e2e target) and all current evergreen browsers support it; `theme.css` already relies on it. Unit tests only parse CSS text, so jsdom is not affected.
- **R4. Test churn weakening coverage (AC22).** Section 7a lists every edit; edits only swap expected values or selectors, never drop assertions. QA diffs `tests/` and checks each edit has the marker.
- **R5. Phone list counts.** Nested `ul`s change `getAllByRole('listitem')` and make `getByRole('list')` ambiguous inside the experience section. Safeguard: the edited tests count direct children of the top-level `ul.phone-list` only, and a new test counts the nested stat items separately, so coverage goes up, not down.
- **R6. Copy-ban and purity tests.** No new copy outside `data.ts`; no `src/logic` change; no `760`, email or menu strings added anywhere. The stat strings live only in `data.ts`.
- **R7. Typecheck between tasks.** Removing `desc` breaks `Experience.tsx` and `PhonePage.tsx` immediately, so both consumers switch to `stats` in the same task (T1).
- **R8. Unverified edit list.** This plan comes from grep, not a suite run. Safeguard: at the start of each task the test-writer runs the suites and reconciles 7a against real failures. A failure outside 7a is a regression to fix in `src/`, not a test edit.

## 6. Gaps check

- **Auth:** none in this app.
- **Validation:** no user input. Data shape validated by the T1 data tests (no empty or `TODO` stats, no `desc` key).
- **Error handling:** no failure path.
- **Mobile:** desktop-only change except the phone page `desc` -> stats swap (AC18), tested at unit level and by the existing 320px overflow e2e.
- **Accessibility:** list semantics, decorative bullets, non-interactive pill, focusable scrollable panel, AA contrast (AC9 test).
- **Config and env vars:** none.
- **Tests:** data, Experience component and CSS, contrast, windows meta, layout, phone unit tests, a new e2e spec, and the 7a edits.

## 7. Tasks

The coder edits `src/` only, the test-writer owns `tests/`. Each task leaves `npm run lint`, `npm run typecheck` and `npm test` green (and `npm run format:check`). New tests use a `T17 ACn:` prefix. Every edit to an existing test carries `// DELIBERATE REQUIREMENT CHANGE (T17 ACn): <reason>`.

- **T1. Stats data, experience stats list, phone stats.** ACs: AC1-AC6, AC17-AC19, AC20 (data, Experience content, phone parts), AC22 (unit).
  - Coder: `data.ts` `Exp`/`EXP` (section 3); `Experience.tsx` stats `ul`; `Experience.css` `.exp-desc` -> `.exp-stats` plus `.exp-stat` rules; `PhonePage.tsx` and `PhonePage.css` stats list. No size, pill or token change yet.
  - Test-writer: apply the 7a "T1" edits. New cases:
    - `tests/data.test.ts` (new `describe('T17 experience stats')`): AC2 deep-equal of all three `stats` arrays; AC1 no entry has a `desc` key (`'desc' in e` is false); AC3 every stat non-empty, trimmed, no `TODO`, no trailing `.`; every `/\d+%?/g` match in an entry's stats appears in that entry's frozen old `desc` literal; `when`, `role`, `org`, `tags` and order deep-equal literals.
    - `tests/windows/Experience.test.tsx`: AC4 DOM order role h2 -> `.exp-org` -> `.exp-when` -> `ul.exp-stats` -> `.exp-tags`, and no `.exp-desc` / no `p` in the panel; AC5 per tab the `li` texts equal `e.stats` exactly, the panel contains no other entry's stats, the `ul` has `role="list"`, the panel has no `svg`/`img` and no focusable element besides itself; AC5 CSS `.exp-stats` font-size >= 13px and colour `var(--color-neutral-400)`, `.exp-stat::before` `content: ''`; AC1 `Experience.tsx?raw` does not contain `.desc`.
    - `tests/PhonePage.test.tsx`: AC18 each entry `li` has one nested `ul[role=list]` whose `li` texts equal `e.stats`, ordered after the when line and before the tags; no `.phone-desc` in the experience section; AC19 projects still use `.phone-desc` with `p.desc`.
    - Terminal tests: run unedited (AC17).
- **T2. Window size, fixed height and scroll, org pill, tokens and contrast.** ACs: AC7-AC16, AC20 (pill, contrast, layout parts), AC22 (unit).
  - Coder: `WIN_META.exp` 600x400; `Experience.css` pill, `.win-body:has(> .exp-body)`, absolute `.exp-body`, panel overflow (section 3); `theme.css` two tokens in `:root` and light.
  - Test-writer: apply the 7a "T2" edits. New cases:
    - `tests/contrast.test.ts`: `ORG_PILL = ['org-pill-text', 'org-pill-bg']`, one `T17 AC9: ${theme}: org pill text on bg` test per theme with the ratio in the message; `T17 AC8`: both tokens match `/^#[0-9a-f]{6}$/i` in both themes, light bg differs from light `accent-800`, both are present in the `[data-theme='light']` block itself (`parseBlock`).
    - `tests/windows/Experience.test.tsx`: AC7 `.exp-org` textContent `@ Tartigrade Ltd.` (and per tab), no `tabindex`/role; CSS `background: var(--color-org-pill-bg)`, `color: var(--color-org-pill-text)`, `border-radius` and horizontal `padding` set, `width: fit-content`; AC10 no `.exp-org:hover` rule and no `transition`/`transform` on `.exp-org`; AC15 `.exp-panel` `overflow-y: auto`, `overflow-x: hidden`; AC14 `.exp-body` `position: absolute`, `inset: 0`, `.win-body:has(> .exp-body)` `position: relative`; AC11 rail still `150px`.
    - `tests/logic/layout.test.ts` (new `describe('T17 exp layout')`): AC12 literal exp positions at the five sizes; AC13 bounds at every size and at 1280x720 `x + 600 <= 810` and `y + 400 === 644`; AC12 the other windows (hello, about, proj, term, viz, site) equal the existing `BEFORE` literals (plus viz from T16).
    - `tests/logic/windows.test.ts`: AC11 `WIN_META.exp` toEqual `{ width: 600, height: 400, dock: true }`.
- **T3. End to end.** ACs: AC13-AC16, AC18, AC21, AC22 (e2e), AC23.
  - Test-writer: apply the 7a "T3" edits. New `tests/e2e/experience.spec.ts`, `watchErrors` in every test, 1280x720:
    - AC11/AC14: open exp from the dock; for dark and light (View menu), on every tab the box is 600 wide and 400 +/- 2 tall.
    - AC13: `y >= 36`, `y + h <= dock top + 0.5`, `x >= 16`, right <= 1264; y is 244.
    - AC7/AC8: `.exp-org` visible with text `@ Tartigrade Ltd.`; its computed `background-color` and `color` equal a probe element's computed `var(--color-org-pill-bg)` / `var(--color-org-pill-text)`, in dark and light; its width is less than the panel's content width.
    - AC5: per tab, `ul.exp-stats li` texts equal the AC2 literals.
    - AC15: append a tall block into the panel via `page.evaluate`; the panel `scrollHeight > clientHeight`, `scrollWidth <= clientWidth`, the window stays 400 +/- 2; `mouse.wheel` over the panel raises its `scrollTop` while the window box `x`/`y` stay put and `document.scrollingElement.scrollTop` stays 0; focus the panel and press `End`/`PageDown`, `scrollTop` rises; the focus ring (`outline-style` not `none`) shows.
    - AC16: from each of dock, Windows menu, hello "What I've been up to" and terminal `open experience` (after Tidy up so hello is on top), exp has the max z-index and `elementFromPoint` at the pill and first stat hits inside exp; drag the titlebar past the left edge and it clamps at x 16; minimize and restore from the dock; close.
    - AC18: phone viewport 320x700, the experience section shows the stats `li`s and `scrollWidth <= clientWidth`.
  - Run the full AC23 set.

**After T3 (QA).** Confirm `git diff` on existing tests shows only 7a edits plus additive cases, each with the marker. List every edit in the QA report and the autobuild log.

### 7a. Existing tests this ticket changes (sanctioned under AC22)

Located by grep. Assertions are kept; only expected values, selectors or counting scope change. The test-writer runs each suite first and reconciles this list (R8).

**Checked, no edit expected:**

- `tests/logic/terminal.test.ts`, `tests/windows/Terminal.test.tsx` (AC17: must pass unedited).
- `tests/windows.contrast.test.ts` (its "experience description (neutral-400)" and "@ org (accent)" pairs still pass; left as is, the pill gets its own test).
- `tests/theme-tokens.test.ts` (pins existing tokens only; new tokens do not affect it).
- `tests/Desktop.dock.test.tsx` T06 AC2 (244 + 400 = 644, still `<= 644`).
- `tests/windows/Projects.test.tsx`, `tests/windows/About.test.tsx`, `tests/windows/Hello.test.tsx`, purity, view, MenuBar copy-ban tests.
- `tests/e2e/boot.spec.ts` (exp tab `dispatchEvent` path and relative position checks), `tests/e2e/dock.spec.ts` "no window overlaps the dock" (bottom still 644), `tests/e2e/windows.motion.spec.ts` (`raise`/tab-face probes), `tests/e2e/phone.spec.ts` (`.phone-desc` probes now hit the first project, which still exercises overflow and selection), `tests/e2e/chrome.spec.ts`. Edit only if a hit-test point moves; keep the assertion.

**T1 (unit): `desc` -> `stats`**

| File                                | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/windows/Experience.test.tsx` | **T07 AC30 "role heading, @ org, date, description and tags":** `toContain(e.desc)` becomes `for (const s of e.stats) toContain(s)` (AC5). Title kept. **T07 AC30 "for every entry the panel shows that entry only":** `toContain(e.desc)` -> each of `e.stats`; `not.toContain(o.desc)` -> each of `o.stats` (AC5). **T07 AC30 "panel text sizes":** the three `decls('.exp-desc')` lookups become `decls('.exp-stats')` with the same `13.5px`, `1.6`, `var(--color-neutral-400)` values (AC4).                                                                                                                                                                                                                           |
| `tests/PhonePage.test.tsx`          | **T13 AC10 "org, when, desc and each tag":** `items` becomes the direct `li` children of the section's `ul.phone-list` (`Array.from(exp.querySelectorAll(':scope ul.phone-list > li'))`), length still `EXP.length`; `toContain(e.desc)` -> each of `e.stats` (AC18). **T13 AC10 "tags separated by whitespace":** `first` taken from the same top-level `li` list (AC18). **T13 AC21 "right item counts":** `getByRole('list')` -> `getAllByRole('list')[0]` and count only its direct `li` children (`list.querySelectorAll(':scope > li')`), counts unchanged for all four sections (AC18). **T13 AC21 "every ul keeps list semantics":** `uls.length` 4 -> `4 + EXP.length`; every `ul` still has `role="list"` (AC18). |

**T2 (unit): size, position, pill**

| File                                | Edit                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/windows/Experience.test.tsx` | **T07 AC47 "experience window height is 290":** `toBe(290)` -> `toBe(400)` (AC11). Title kept. **T07 AC30 "panel text sizes":** `decls('.exp-org').color` `var(--color-accent)` -> `var(--color-org-pill-text)` (AC7, AC8). **T07 AC27 rail and panel min-height:** no edit, `min-height: 250px` is kept. |
| `tests/logic/windows.test.ts`       | **AC2 "widths match the spec":** `WIN_META.exp.width` 520 -> 600 (AC11). Not in the requirements' known list; found by grep.                                                                                                                                                                              |
| `tests/logic/layout.test.ts`        | **T16 `BEFORE`:** exp literals become the AC12 values: 1280x720 `{ 64, 244 }`, 1366x768 `{ 68, 292 }`, 1440x900 `{ 72, 424 }`, 1536x864 `{ 77, 388 }`; 1920x1080 stays `{ 96, 562 }` (AC12). All other windows' literals unchanged. AC3 and AC4 untouched and passing.                                    |

**T3 (e2e)**

| File                        | Edit                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/windows.spec.ts` | `HEIGHTS.exp` 290 -> 400 (AC14), used by "every default window" and "keeps its height on every tab". **T07 AC30 panel selection:** `.locator('.exp-desc')` -> `.locator('.exp-stats')` (AC4); the selection-length assertions stay. |
| `tests/e2e/desktop.spec.ts` | AC24 reference `exp: { x: 64, y: 354 }` -> `{ x: 64, y: 244 }` (AC12).                                                                                                                                                              |
| `tests/e2e/menubar.spec.ts` | Reference `exp: { x: 64, y: 354 }` -> `{ x: 64, y: 244 }` (AC12).                                                                                                                                                                   |
| `tests/e2e/start.spec.ts`   | Reference `exp: { x: 64, y: 354 }` -> `{ x: 64, y: 244 }` (AC12).                                                                                                                                                                   |

## 8. Open questions

None need a human. Decided unattended:

1. **Fixed height without touching `Window`.** Absolute `.exp-body` inside `.win-body:has(> .exp-body)`, so the existing `minHeight` gives exactly 400 and no titlebar height is hard-coded. Changing `Window` to set `height` would affect every window and is out of scope.
2. **Bullets are empty `::before` dots in `--color-accent`**, with `list-style: none` and `role="list"`, so the marker is never announced and `li` text equals the data string (AC5). The phone page uses plain `disc` markers to keep its change minimal.
3. **Pill tokens are literal `#d2cefd` / `#2b2741` in both themes** (the AC8 default, 9.5:1). Light-mode pill is a step darker than the light tag fill `#e7e5fe`.
4. **Keep `.exp-panel { min-height: 250px }`** so T07 AC27 needs no edit; it is harmless under the 360px body.
5. **`.exp-desc` CSS rule is renamed to `.exp-stats`** with the same typography, so the existing typography assertions move with a selector swap and are not lost.
6. **No new `data.ts` label** for the stats list; it has no visible heading.
7. **`windows.contrast.test.ts` "@ org (accent)" pair is left unedited** (still true, still passes); the pill's real pair is covered by the new AC9 test.
8. **Task split.** T1 bundles data with both `desc` consumers because removing `desc` breaks typecheck otherwise; T2 is everything visual and geometric; T3 is e2e.
