# T18 requirements: project detail view, scrolling project list and a Featured star

## Goal

Clicking (or activating from the keyboard) a project tile in the projects window swaps the grid for an in-window detail view of that project, with a back button, Escape to go back and managed focus, built from new optional `Project` fields in `src/data.ts` that hold only facts already in the repo. The project list scrolls inside a fixed-height window with a token-styled scroll bar, and featured projects (Indoor Garden, Tanzi's capstone) show a filled Phosphor `Star` named "Featured" on the desktop tile, in the detail view and on the phone page.

## Current state (observed, so the planner does not redo finished work)

- `Project` in `src/data.ts` is `{ name; icon; href; desc; tags }`. `PROJECTS` has four entries in this order: Voice Calendar, Indoor Garden, Grocery Prices, Driver Safety. Every `href` is the placeholder `'#'`. There is no `experience/` folder in the repo (no résumés), so `desc`, `tags` and Tanzi's statement that Indoor Garden was their capstone are the only sources.
- `src/windows/Projects.tsx` takes no props and renders `ul.proj-grid` (2 columns, gap 10px, padding 14px) of `li.proj-item > a.proj-tile` (href from `p.href`, `linkAttrs`) wrapping `div.proj-face` with the icon, an `ArrowUpRight` arrow, `h2.proj-name`, `p.proj-desc` and `.tag.tag-neutral.proj-tag` tags. Both svgs are `aria-hidden`. Hover/press motion lives on `.proj-tile:hover .proj-face` / `.proj-tile:active .proj-face` with a reduced-motion override. `Projects.css` has no overflow rules.
- `WIN_META.proj` is `{ width: 520, height: 385, dock: true }`; at 1280x720 it is at y 259 with its bottom at the dock clearance (644). The e2e test checks the grid reaches within 2px of the window bottom. `WIN_BAR_TITLES` is `{ proj: '~/projects' }`; the region and every other name stay `projects`.
- No component handles Escape today except `MenuBar` (document `keydown`, closes an open menu).
- The terminal `projects` command prints `p.name.padEnd(12) + p.desc` per entry.
- `PhonePage` renders each project as an `li` with `h3 > a.phone-link` (href `p.href`), `p.phone-desc` and tags. The phone page has no svg at all today (T13 AC24 asserts this).
- Accent tokens: dark `--color-accent #9184d9` on `--color-bg #161826` / `--color-surface #232532`; light `#6558ad` on `#e4e7f5` (4.8:1) / `#f3f5fe` (5.4:1). `tests/contrast.test.ts` has `resolveTheme` and `contrastRatio` helpers.

## Acceptance criteria

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
- **AC10** The star colour is a theme token (no hard-coded colour) and has at least 3:1 contrast (WCAG 1.4.11 non-text) against both `--color-bg` and `--color-surface` in dark and in light. This is verified by a unit test in `tests/contrast.test.ts` using `resolveTheme` and `contrastRatio`, one test per theme and background, ratio in the failure message. (The default `--color-accent` is expected to clear this comfortably; light is 4.8:1 on bg and 5.4:1 on surface.)

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

- **AC19** The list area scrolls vertically (`overflow-y: auto`) inside the window body when tiles exceed the available height; there is no horizontal scroll and the page does not scroll. `WIN_META.proj` stays `{ width: 520, height: 385, dock: true }` and the rendered window height stays within 2px of 385 whatever the number of projects (verified with at least 8 projects, for example by mocking `PROJECTS` in a unit test and by injecting extra tiles in e2e). With the current four projects nothing visibly changes: same 2x2 grid, 10px gap, 14px padding, and the grid content still reaches within 2px of the window bottom.
- **AC20** The scroll container adds no extra tab stop while it contains focusable tiles; tabbing to a tile below the fold scrolls it into view.
- **AC21** The scroll bar is styled with theme tokens only (for example `scrollbar-width: thin` and `scrollbar-color: <thumb> <track>`, plus optional `::-webkit-scrollbar` rules), with no hard-coded colours (T07 AC7 check still passes). The thumb has at least 3:1 contrast against its track (or against `--color-surface` if the track is transparent) in dark and light, verified in `tests/contrast.test.ts`. The scroll bar has no motion.

### F. Unchanged surfaces

- **AC22** The terminal `projects` output is byte for byte unchanged; terminal tests pass without edits. `ls`, `open projects` and `help` are unchanged.
- **AC23** Desktop tab order counts are unchanged while the list is shown: the projects window still has six stops (Minimize, Close, four tiles), named `Voice Calendar`, `Indoor Garden`, `Grocery Prices`, `Driver Safety` in the existing chrome e2e stop-name helper, and the whole-desktop count in `tests/Desktop.dock.test.tsx` stays 35.

### G. Phone page

- **AC24** The phone page projects section shows the Featured star (filled Phosphor `Star`, `role="img"`, accessible name `Featured`, not focusable, token colour meeting AC10) for Indoor Garden only, placed outside the project name link so the link's accessible name still equals its visible text. Non-featured projects show no star.
- **AC25** The phone page has no detail view: no buttons, no `details`, `highlights` or `links` content, and nothing else changes (name link with `p.href`, `phone-desc`, tags, four sections, heading structure, list counts, link-only interactivity, no horizontal overflow at 320px). The only svg on the phone page is the Featured star.

### H. Tests and quality

- **AC26** Unit tests cover: AC1 to AC4 in `tests/data.test.ts` or a new T18 data test (optional fields, Indoor Garden featured and `Capstone`, only one featured, no `TODO` in values, no `links`, absent rather than empty fields); AC5, AC6, AC8, AC9, AC11 to AC16 and AC18 in `tests/windows/Projects.test.tsx` and a Desktop-level test for close/reopen and Restart reset; AC19 with mocked extra projects; AC10 and AC21 in `tests/contrast.test.ts`; AC24 and AC25 in `tests/PhonePage.test.tsx`.
- **AC27** Playwright at 1280x720 covers: open a detail view by click and by keyboard (Enter and Space), back button focused, back by button and by Escape with focus returned to the same tile (AC13 to AC15); the detail tab order (AC16); window still 520x385 at y 259 in list and detail view (AC11, AC19); the list scrolls inside the window with extra injected tiles, scroll bar computed `scrollbar-color` matches the tokens in dark and light (AC19, AC21); star visible with name `Featured` on Indoor Garden in the tile and detail, and on the phone page (AC9, AC24); no console errors or warnings.
- **AC28** Existing tests that pin the old link tiles are updated, never deleted, skipped or weakened. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T18 ACn): <reason>` and is listed in the QA report and the autobuild log. Known cases (the planner must confirm the full list by running the suites):
  - `tests/windows/Projects.test.tsx`: T07 AC31 "a list with one link tile per PROJECTS entry" and "each tile shows name as a heading, description and every tag" (`getAllByRole('link')` becomes the tile buttons, and content is checked on the `li` if the heading is outside the button); T07 AC32 "each href comes from PROJECTS" and "target and rel come from linkAttrs" (tiles have no href; move the href/`linkAttrs` assertions to detail `links` and keep the pure `linkAttrs` tests); T07 AC32 "icons are hidden from assistive technology" (svg count `PROJECTS.length * 2` changes with the arrow removed and the star added; all non-star svgs stay `aria-hidden`); T07 AC32 "accessible name holds name and description" and "separates name, description and tags" (the name becomes exactly the project name, desc moves to the description; tag whitespace separation still checked).
  - `tests/e2e/projects.spec.ts`: T07 AC31 locator `a.proj-tile` (becomes the tile buttons, still four in a 2x2 grid with a 10px gap); T07 AC47 grid-bottom gap probe if the scroll container changes which element is measured.
  - `tests/e2e/windows.spec.ts`: T07 AC11 `tile = win('proj').locator('a').nth(i)` and `locator('a').count()` is 4 (becomes buttons; stop count stays 6); T07 AC10 `seen.get('proj').size` stays 6 and should pass unchanged.
  - `tests/e2e/windows.motion.spec.ts`: T07 AC9 "a click at the bottom edge of a tile reaches the link (navigation is cancelled)" (becomes "reaches the tile button and opens the detail view"); hover/press/reduced-motion tile tests should pass unchanged if `.proj-tile`/`.proj-face` keep their roles.
  - `tests/e2e/chrome.spec.ts` (23 stop names incl. the four project names) and `tests/Desktop.dock.test.tsx` T06 AC25 (35 stops): should pass unchanged (AC23); edit only if a selector, not a count, must move.
  - `tests/PhonePage.test.tsx`: T13 AC24 "no svg or img" (becomes: the only svg is one Featured star, on Indoor Garden; still no img; link names still equal visible text).
  - `tests/e2e/phone.spec.ts`: any "no svg" or icon probe, if present.
- **AC29** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## Out of scope

- Inventing details, highlights, metrics, links, screenshots or repo URLs. No real project links are added; `href` placeholders stay `'#'`.
- Changing the terminal `projects`, `ls`, `open` or `help` output, or adding a terminal command for project details.
- A detail view, buttons, highlights or links on the phone page; any phone layout change beyond the star.
- Deep links or URL/hash routing for a project (no deep links in v1, decisions log 9).
- Persisting the selected project (only theme, wallpaper and wobble persist).
- Changing `WIN_META.proj` size, the `layout()` formula, z-order rules, other windows, or the titlebar text per view.
- Animated transitions between list and detail (a reduced-motion-safe instant swap is enough).
- New projects in `PROJECTS` (the list only has to support them).
- Styled scroll bars in other windows (experience, terminal).
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **No résumés.** `experience/` does not exist, so detail content comes only from `desc`, `tags` and the capstone statement. Only Indoor Garden gets `details`; `highlights` and `links` are omitted for every project, each gap marked with a `// TODO(Tanzi)` comment. The detail view still shows the always-present name, icon, desc and tags, so it is never empty.
2. **Tile becomes a button.** It no longer navigates, because every `href` is `'#'`. Real external links, when Tanzi adds them, go in `links` and render only in the detail view. `href` stays in the type and data because the phone page still uses it for the name link (phone page unchanged apart from the star).
3. **Accessible name.** The tile's name is just the project name (short, matches the existing chrome e2e stop names); `desc` and "Featured" go in the accessible description, so keyboard users still hear them.
4. **Arrow removed.** `ArrowUpRight` implies an external link, which tiles no longer are.
5. **Escape scope.** Escape is handled only when focus is inside the projects window and the detail view is open; it never closes the window. This avoids conflicting with the menubar's own Escape handling.
6. **Minimize keeps the view.** Consistent with terminal history and the experience tab surviving minimize; only close (unmount) and Restart reset it.
7. **Star contrast.** The star is a meaningful non-text graphic, so 3:1 (WCAG 1.4.11) is the bar. Both `--color-bg` (tile face) and `--color-surface` (window/detail and phone backgrounds) are checked so the planner can place it on either.
8. **Scroll bar.** Standard `scrollbar-color`/`scrollbar-width` (supported in the Chromium e2e target) with tokens; thumb vs track 3:1 because it is a UI component. The list fits today, so the scroll bar only appears when projects are added.
9. **Capstone wording.** Exact `details` text for Indoor Garden is the planner's choice within AC2 (for example "Capstone project: IoT garden monitoring with a live dashboard for 10+ sensors, built with Docker and React.").
10. **Test edits are sanctioned requirement changes** under the backlog round 2 rule and the T15 to T17 precedent (AC28).

## Open questions

No blocking questions.
