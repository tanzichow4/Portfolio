# T13 requirements: phone fallback page (<760px)

## Goal

A viewport narrower than 760 CSS px gets a plain, scrolling, single-column page with name, about, experience, projects, links and résumé from `src/data.ts`, and the desktop is not mounted (decision 13). A viewport 760px or wider gets the existing desktop, unchanged.

## Current state (observed, so the planner does not redo or miss anything)

- `src/main.tsx` statically imports and renders `<Desktop />`. Nothing chooses a view today.
- `src/theme.css` sets `body { overflow: hidden }` and `html, body, #root { height: 100% }` globally. As it stands, a page taller than the viewport cannot scroll.
- The inline script in `index.html` sets `<html data-theme>` before first paint, from `tanzi-os:theme` or else `prefers-color-scheme`.
- `readSettings()` reads the theme from that attribute, not from storage. `Desktop` is the only code that applies the theme or writes settings.
- `linkAttrs(href)` in `src/logic/menu.ts` gives `http(s)` links `target="_blank"` and `rel="noopener noreferrer"`, and gives anything else no attributes.
- `MENU_ITEMS.resume` is the only existing résumé link. It uses `newTab: true`, because `linkAttrs` would not open `/resume.pdf` in a new tab.
- `public/resume.pdf` does not exist and every `PROJECTS` `href` is `#`. Both are T10 placeholders.
- `prefersReducedMotion()` guards against a missing `matchMedia`, because jsdom has none.
- `tests/logic/purity.test.ts` forbids `window` and `document` in `src/logic/*.ts`, and its `EXPECTED` list must name every module.
- Playwright runs Chromium at 1280x720. No test pins what `main.tsx` renders, other than `tests/fonts.test.ts` reading its font imports.

## Acceptance criteria

### A. Choosing the view

- **AC1** The view depends only on viewport width in CSS px. Width below 760 shows the phone page. Width 760 or more shows the desktop. Height, orientation, user agent and touch support are not consulted. Exact boundaries: 759 is phone, 760 is desktop, and a fractional width such as 759.5 is phone.
- **AC2** The 760 breakpoint is defined in exactly one place in source. The width-to-view rule is a pure, unit-tested function, and any viewport read stays outside `src/logic`.
- **AC3** On a load below 760px the desktop never mounts. From document start to settled, the DOM never contains the system menu bar, the dock, a window or the boot status region, including under StrictMode. No frame shows the desktop or an empty intermediate view once React has rendered.
- **AC4** On a load at 760px or wider the phone page never mounts or paints, and the rendered desktop is the same as before this ticket.
- **AC5** Resizing or rotating across 760 swaps the view with no reload, and the outgoing view is fully unmounted in the same commit that mounts the incoming one. No frame shows both views or neither. After the swap no console error or warning appears.
- **AC6** Repeated or rapid crossings, including a return within one frame, end on the view matching the final width, with exactly one view mounted. Listeners registered by the switch are removed on unmount.
- **AC7** Resizing or rotating without crossing 760 does not remount the current view. The phone page keeps its scroll position as the browser allows, and the desktop keeps its window state.
- **AC8** Crossing into the phone page shows it from the top of the page. Crossing back shows a fresh desktop at the current viewport, with no page scrollbars and no leftover scroll offset visible. Window positions and window-local state are not preserved across a crossing, the same as a reload (decisions 4, 5). A Restart boot running at a crossing is discarded, with no further progress and no warning.

### B. Between 760px and 1280px

- **AC9** The range 760 to 1279px keeps today's behaviour: the desktop renders, with no message, redirect, scaling or layout change. It remains an unsupported size (decision 7). At 1280x720 and up, all existing unit and e2e tests pass unchanged.

### C. Content

- **AC10** The page shows, top to bottom, in this order:
  1. `NAME` and `ROLE`.
  2. About: every `ABOUT_COPY` paragraph, with `em` segments emphasized, then every `FACTS` label.
  3. Experience: every `EXP` entry in array order, all visible at once with no tabs, showing role, `EXPERIENCE_LABELS.at` plus org, `when`, `desc` and all tags.
  4. Projects: every `PROJECTS` entry in array order, showing name, `desc` and all tags, with the name as the link to `href`.
  5. Links: every `LINKS` item by its visible text `label`, followed by the résumé link to `RESUME_URL`, labelled with `MENU_ITEMS.resume`.
- **AC11** All copy comes from `src/data.ts`. Existing constants are reused wherever they fit. Only copy with no existing constant is added, which is expected to be just the section headings. The file-style `WIN_TITLES` values are not used as headings. No email, URL or label is hard-coded elsewhere, and the rendered text changes when the data does.
- **AC12** The page has no theme toggle, terminal, windows, dock, menubar, boot screen, verb game, wallpaper or wobble.

### D. Layout and scrolling

- **AC13** The page is a single column on a `--color-bg` background and uses existing tokens only, with no new colours and no change to any token value. Spacing, size and component choices are the planner's, within these criteria.
- **AC14** The page scrolls vertically by touch, wheel and keyboard, and all content down to the résumé link can be reached.
- **AC15** At widths 320, 375, 414 and 759, and at short landscape sizes such as 667x375, there is no horizontal scrolling. `document.documentElement.scrollWidth` is at most the viewport width, and long text and tag rows wrap.
- **AC16** At 760 and up, `body` still does not scroll and all overflow behaviour of the desktop is unchanged. Below 760, text on the page is selectable. The desktop's `user-select: none` does not apply.

### E. Theme

- **AC17** The page renders in whichever theme the existing no-flash init set: the stored preference, else `prefers-color-scheme`, else dark when storage throws. Dark and light both render correctly, with no flash of the other theme on load.
- **AC18** The page never changes `<html data-theme>` and writes nothing to `localStorage`. Stored theme, wallpaper and wobble are the same after a phone session as before it.
- **AC19** Crossing 760 in either direction leaves `<html data-theme>` unchanged, including a theme changed on the desktop in the current session while storage is throwing.

### F. Semantics and links

- **AC20** The page has exactly one `h1`, whose text is `NAME`, and one `main` landmark. About, Experience, Projects and Links are each a `section` named by an `h2`. Each experience entry and project is headed by an `h3`. No heading level is skipped.
- **AC21** Facts, experience entries, projects and links are real lists, and `html lang` stays `en`.
- **AC22** Every `LINKS` and `PROJECTS` link uses `linkAttrs(href)`, so `http(s)` links open in a new tab with `rel="noopener noreferrer"` and `mailto:` and `#` links get neither attribute. The résumé link matches the existing menu item, with `target="_blank"` and `rel="noopener noreferrer"` (see Assumption 3).

### G. Accessibility and motion

- **AC23** Every link is reachable by Tab in reading order, with the global `:focus-visible` ring visible and not clipped. The page has no positive `tabindex` and no focus trap.
- **AC24** Icons, if used, are decorative (`aria-hidden`, not focusable), and every link has visible text as its accessible name.
- **AC25** Each standalone link in the Projects and Links sections has a tap target at least 44 CSS px high.
- **AC26** All text meets WCAG AA in both themes on the background it sits on, checked by unit tests using `tests/helpers/contrast.ts` for each text and background token pair the page uses, including any `color-mix` or `opacity` applied. Existing muted styles are not assumed to pass (see Assumption 7).
- **AC27** Essentially no motion, with or without reduced motion: no CSS animation, no transition, no smooth scrolling and no scripted movement. A hover or focus style change is immediate. In e2e, `document.getAnimations()` is empty on the page, with both motion settings.
- **AC28** The page does not disable pinch zoom, and the existing viewport meta tag stays as it is. Crossing 760 moves no focus programmatically and announces nothing.

### H. Constraints and quality

- **AC29** No new dependency in `package.json`.
- **AC30** Unit and component tests cover AC1, AC2, AC10-AC12, AC17-AC18, AC20-AC22, AC24 and AC26, plus the view choice in an environment without `matchMedia` (jsdom), which must not throw and must render the desktop at jsdom's default width.
- **AC31** Playwright, using explicit viewport sizes on top of the 1280x720 config, covers:
  - no desktop in the DOM at any point on a phone load, using a mutation record from document start (AC3)
  - the exact 759 and 760 boundary (AC1)
  - crossing in both directions and a rotation-style swap of width and height, with no frame of both views (AC5, AC8)
  - rapid crossings (AC6) and non-crossing resize keeping the view (AC7)
  - vertical scroll and no horizontal overflow (AC14, AC15)
  - theme from stored value and from emulated colour scheme, with no storage writes (AC17, AC18), and theme kept across a crossing (AC19)
  - keyboard Tab order and link attributes in a real browser (AC22, AC23)
  - no animations (AC27)
  - no console errors or warnings
- **AC32** QA screenshots the page at 375x667 in dark and light, and records the result in the QA report.
- **AC33** No existing test is deleted, skipped or weakened. If a new `src/logic` module is added, adding it to the purity `EXPECTED` list is the one expected test edit. It must be commented and listed in the QA report as a deliberate requirement change.
- **AC34** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass.

## Out of scope

- The OS-style mobile design: window stack, tab-bar dock, TC menu (T11, and the README's responsive note).
- A theme toggle, terminal, windows or any interactive feature on the phone page.
- Any change to the 760 to 1279px range, including an "unsupported size" message.
- A separate rule for phones in landscape wider than 760px, for short viewports, or for touch devices (see Assumption 1).
- Code-splitting the desktop out of the phone bundle.
- Preserving window state, scroll position or focus across a crossing.
- Live following of a changed OS colour scheme on the phone page. The existing init reads it once per load.
- Real content and the résumé PDF (T10). The `<noscript>` summary and OG tags (decision 10, T12). The app-wide accessibility pass (T09).
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## Assumptions

1. **Width only, so large phones in landscape get the desktop.** The ticket and decision 13 both define phones as `<760px`, and the brief asks for the simplest behaviour above that. A phone wider than 760px in landscape, such as 844x390, is therefore treated like any other 760 to 1279px viewport and shows the desktop at a height below the 720 minimum. "Never mount the desktop on phones" is read as "below 760px". The product owner may want to revisit this, and a later ticket could add a condition without changing anything else here.
2. **Desktop browsers below 760px also get the phone page.** This includes a narrowed window or high browser zoom, for example 1280px at 200%. No user-agent detection is used.
3. **Résumé link target is the one exception to `linkAttrs`.** `linkAttrs('/resume.pdf')` would give no new tab, but the only existing résumé link opens one (`newTab: true` in `src/logic/menu.ts`). The same destination should behave the same on both views, and opening a PDF in a new tab keeps the visitor's place on the page.
4. **Content scope.** "About" includes `FACTS` because the About window shows them. `HELLO_COPY` and `VERBS` are left out, being part of the desktop's playful hello window, and `SITE_COPY.desc` is left out because it describes dragging windows.
5. **Placeholders are kept as they are.** Project links use `href="#"`, so on a scrolling page a tap jumps to the top until T10 supplies real URLs. `/resume.pdf` does not exist yet, which is already true of the menu item and is T10's job.
6. **Section heading copy.** "About", "Experience", "Projects" and "Links" are the expected headings. `EXPERIENCE_LABELS.tablist` already holds "Experience" and may be reused.
7. **Contrast of muted styles.** By hand calculation, `.text-muted` (55% text mix) on the light surface is about 3.3:1, and `.card-meta` (50% mix) on the dark surface is about 4.2:1. Both fail AA, so the planner should not reuse them for text here. `.card-body` also applies opacity and needs the same check.
8. **Focus at a crossing.** Focus falls to `<body>` when the focused view unmounts. A crossing is a rare, user-initiated change of the viewport, so no focus move or announcement is required (AC28).
9. **Initial load timing.** `#root` is empty until the script runs, as it is today. AC3 and AC4 apply from React's first commit onward, and that commit must already be the correct view.

## Open questions

No blocking questions.
