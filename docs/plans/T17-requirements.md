# T17 requirements: experience.log, bigger window, key stats and an org pill

## Goal

The experience.log window gets bigger (600x400, still clear of the menubar and dock at 1280x720), and each role's one-sentence `desc` is replaced by a short list of impactful stats (`stats: string[]` in `src/data.ts`) taken only from figures already in the data. The `@ Company` line becomes a light-purple pill coloured by new Nocturne tokens in `src/theme.css` that meet WCAG AA text contrast in dark and light, while the terminal `experience` command and the phone page keep working.

## Current state (observed, so the planner does not redo finished work)

- `Exp` in `src/data.ts` is `{ when; role; org; desc; tags }`. `EXP` has three entries: Tartigrade Ltd., General Dynamics Mission Systems, University of Calgary. The `desc` strings are the only place where the figures live ("33 hours to 3", "coverage by 80% with PyTest", "natural-language-to-SQL engine on a local model", "multi-tenant web platform", "security review").
- There is no `experience/` folder in the repo (no résumés to read). The data comment in `src/data.ts` refers to it, but the files are not there. The figures in `EXP[*].desc` are the only source.
- `src/windows/Experience.tsx` renders a vertical tablist (one tab per `EXP` org) and one `tabpanel` (`#exp-panel`, `tabIndex=0`) with `h2.exp-role`, `div.exp-org` (`{EXPERIENCE_LABELS.at} {org}`, so its text is `@ Tartigrade Ltd.`), `div.exp-when`, `p.exp-desc` and `.tag.tag-accent` tags.
- `Experience.css`: `.exp-rail` 150px wide, `.exp-panel` `min-height: 250px`, `.exp-org` is plain text in `var(--color-accent)`, `.exp-desc` 13.5px / 1.6 / `neutral-400`. No scroll rules. The window height comes from content.
- `WIN_META.exp` is `{ width: 520, height: 290, dock: true }`. `layout()` places exp at `x = xClamp(0.05 * vw)`, `y = yFit(max(380, 0.52 * vh))`, so at 1280x720 it is at (64, 354) and its bottom is at 644 (= 720 - 76).
- Other defaults at 1280x720 (x..right, y..bottom): hello 77..637, 72..545; about 640..1060, 64..460; proj 538..1058, 259..644; term 810..1250, 340..610. Hello already covers most of the exp tab rail after Tidy up (e2e `boot.spec.ts` uses `dispatchEvent` for that reason). Only hello is open on first load (T15).
- The terminal `experience` command prints `when.padEnd(12) + role + ' @ ' + org` per entry. It does not use `desc`.
- `PhonePage` renders each entry as an `li` in `ul.phone-list` with `h3` role, `p.phone-meta` `@ org`, `p.phone-meta` when, `p.phone-desc` desc and tags. Phone tests count `listitem`s in the section and call `getByRole('list')` inside it, so a nested list would change those counts.
- `tests/contrast.test.ts` resolves theme tokens with `resolveTheme(css, theme)` and checks pairs with `contrastRatio` (opaque `#rrggbb` only) at 4.5:1 for dark and light (`TAG_PAIRS`).

## Acceptance criteria

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
- **AC22** Existing tests that pin the old size, position or `desc` are updated, never deleted, skipped or weakened. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T17 ACn): <reason>` and is listed in the QA report and the autobuild log. Known cases (the planner must confirm the full list by running the suites):
  - Height pin: `tests/windows/Experience.test.tsx` T07 AC47 `WIN_META.exp.height` is 290 (becomes 400); T07 AC27 `.exp-panel` `min-height: 250px` if the fixed-height panel changes it.
  - `desc` in the window: `tests/windows/Experience.test.tsx` T07 AC30 "shows role heading, @ org, date, description and tags" (`toContain(e.desc)`), T07 AC30 "for every entry the panel shows that entry only" (`e.desc` / `o.desc`, switch to stats), T07 AC30 "panel text sizes" (`.exp-desc` font size, line height, colour; and `.exp-org` colour `var(--color-accent)`, which becomes the pill tokens).
  - Layout: `tests/logic/layout.test.ts` T16 `BEFORE` literal exp positions at all five sizes (exp moves to the AC12 values; the other windows stay pinned). AC3 and AC4 stay as written and must still pass.
  - E2e heights and positions: `tests/e2e/windows.spec.ts` `HEIGHTS.exp` 290 (T07 AC47 every-window height and "keeps its height on every tab"); exp reference position `{ x: 64, y: 354 }` in `tests/e2e/desktop.spec.ts`, `tests/e2e/menubar.spec.ts` and `tests/e2e/start.spec.ts`.
  - Hello and exp overlap: `tests/e2e/boot.spec.ts` (the exp tab `dispatchEvent` "hello overlaps it" path), `tests/e2e/windows.spec.ts` and `tests/e2e/windows.motion.spec.ts` `raise(page, 'exp')` / exposed-point helpers, and `tests/e2e/dock.spec.ts` "no window overlaps the dock". These should pass unchanged with exp now at y 244; edit only if a hit-test point moves, and keep the assertion.
  - Phone: `tests/PhonePage.test.tsx` T13 AC10 "org, when, desc and each tag" (`e.desc` becomes the stats), T13 AC10 and T13 AC21 list counts (`getAllByRole('listitem')` and `getByRole('list')` in the experience section must count only the top-level entries once stats are a nested list). `tests/e2e/phone.spec.ts` T13 AC16 overflow and selectable-text probes use `.phone-desc`, which now matches the first project; they keep passing, and a stat probe may be added.
- **AC23** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## Out of scope

- New stats, numbers or claims not already in `src/data.ts` (no invented figures, no `TODO(Tanzi)` placeholders rendered).
- Changing the terminal `experience` output, `help`, `ls` or `open`.
- Restyling the phone page `@ org` line as a pill, or any other phone layout change beyond replacing `desc` with stats.
- Changing the `layout()` formula for exp or any other window, other windows' sizes, or `INITIAL_ORDER`.
- Changing tabs, the rail width, tag styles, or adding new tag variants.
- A styled scroll bar (T18 adds scroll bar styling for projects; exp uses the default).
- Mobile window layout, persistence changes, editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **No résumés available.** The `experience/` folder does not exist in the repo, so the stats come only from the old `desc` strings in `src/data.ts`. The ticket's examples (33h to 3h, +80% coverage via PyTest, NL-to-SQL on a local model, multi-tenant onboarding, security review) are all in that text.
2. **Drop `desc`.** The ticket says "replace", so `desc` is removed rather than kept as dead data. The terminal does not use it; the phone page switches to `stats` so both views show the same content (backlog rule: update the phone page where content changes).
3. **Stat wording** stays as close to the old sentences as possible (split per clause, no trailing full stops). University of Calgary has no figures, so it gets a single stat from its text and nothing else; the role already says "B.Sc. Software Engineering", so "Software engineering degree" is not repeated.
4. **Size 600x400.** About 15% wider and 38% taller than 520x290. With the unchanged formula, `yFit` lifts exp to y 244 at 1280x720, so it still ends at the dock clearance (644). 400 leaves 208px of the 608px usable height for other windows above it and is comfortably more than the content needs, so the scroll is a safety net.
5. **Overlap is acceptable.** After Tidy up, hello (top of the stack) covers more of exp than before (exp now starts at y 244 instead of 354). This matches the existing overlapping layout; opening exp from any entry point raises it. Only hello is open on first load, so the first-load view is unaffected.
6. **Fixed height.** The window renders at the nominal height on every tab (like the existing "keeps its height on every tab" test), and the panel scrolls when needed. The rail does not scroll.
7. **Pill colours.** Two tokens (background and text) are needed for one pill. The default is the existing accent ramp light value `#d2cefd` with `#2b2741` text in both themes. In dark mode that is a light purple on a dark window; in light mode it is darker than the `#e7e5fe` tag fill so it does not read as a tag. The planner may pick other accent-family hex values if they meet AC8 and AC9.
8. **Pill keeps the `exp-org` class and text** so the e2e helper that strips `@` from `.exp-org` and the `@ org` text checks keep working.
9. **Stats list style** (bullets, icons, spacing) is the planner's choice within AC5 and the token-only rule.
10. **Test edits are sanctioned requirement changes** under the backlog round 2 rule and the T15 and T16 precedent (AC22).

## Open questions

No blocking questions.
