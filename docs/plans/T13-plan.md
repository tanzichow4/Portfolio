# T13 plan: phone fallback page (<760px)

Source: `docs/plans/00-requirements.md` (Current state, Assumptions 1-9, AC1-AC34), `CLAUDE.md`, `docs/design-decisions.md` (decisions 3-5, 7, 11, 13), the responsive note in `design_handoff_tanzi_os/README.md`. Existing code read: `src/{main,Desktop}.tsx`, `src/theme.css`, `src/data.ts`, `src/storage.ts`, `src/logic/{layout,menu}.ts`, `src/hooks/reducedMotion.ts`, `src/windows/{About,Experience,Projects}.tsx`, `index.html`, `vite.config.ts`, `playwright.config.ts`, and every test that scans `src/`, reads `main.tsx` or sets a viewport.

T1-T4 below are tasks inside ticket T13, not backlog tickets.

## 1. Goal and scope

**Goal.** A viewport narrower than 760 CSS px gets a plain, scrolling, single-column page with name, about, experience, projects, links and résumé from `src/data.ts`, and the desktop is not mounted (decision 13). A viewport 760px or wider gets the existing desktop, unchanged.

**Out of scope** (carried over):

- The OS-style mobile design: window stack, tab-bar dock, TC menu (T11, and the README's responsive note).
- A theme toggle, terminal, windows or any interactive feature on the phone page.
- Any change to the 760 to 1279px range, including an "unsupported size" message.
- A separate rule for phones in landscape wider than 760px, for short viewports, or for touch devices.
- Code-splitting the desktop out of the phone bundle.
- Preserving window state, scroll position or focus across a crossing.
- Live following of a changed OS colour scheme on the phone page.
- Real content and the résumé PDF (T10). The `<noscript>` summary and OG tags (decision 10, T12). The app-wide accessibility pass (T09).
- Editing `docs/design-decisions.md` or `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

Copied from `00-requirements.md` with the same numbers. No AC is added.

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

## 3. Architecture

**Approach.** `main.tsx` renders a new `App`, which picks `<PhonePage />` or `<Desktop />` from a `useView()` hook. `Desktop`, its CSS and `theme.css` are not edited.

**View rule (AC1, AC2), added to `src/logic/layout.ts`.** It goes in the existing module, beside the other viewport-driven constants, so no new logic module exists and the purity `EXPECTED` list needs no edit.

- `export const PHONE_BREAKPOINT = 760;`: the only occurrence of `760` anywhere in `src/`, comments included.
- ``export const DESKTOP_QUERY = `(min-width: ${PHONE_BREAKPOINT}px)`;``
- `export type View = 'phone' | 'desktop';`
- `viewForWidth(width: number): View`: `width < PHONE_BREAKPOINT ? 'phone' : 'desktop'`.
- `resolveView(desktopMatches: boolean | null, width: number): View`: `null` means no media query is available, so it returns `viewForWidth(width)`. Otherwise `desktopMatches ? 'desktop' : 'phone'`.
- Purity: this file must not contain the words `window` or `document` outside comments. No DOM read happens here.

**Viewport read, `src/hooks/useView.ts` (new).**

- `readDesktopQuery(): MediaQueryList | null` guards a missing or throwing `matchMedia` with the same `typeof` and `try/catch` as `reducedMotion.ts`.
- `getSnapshot()` returns `resolveView(readDesktopQuery()?.matches ?? null, window.innerWidth)`. It returns a string, so React compares it by value.
- `subscribe(cb)` adds `cb` as a `resize` listener on `window` and as a `change` listener on the query, and removes both in its cleanup (AC6). Write the query side as `mql?.addEventListener?.('change', cb)`, because older Safari has no `addEventListener` on `MediaQueryList` and a throw here would blank the page. The `resize` listener is what keeps those browsers and jsdom working.
- `useView()` is `useSyncExternalStore(subscribe, getSnapshot)`, with `subscribe` and `getSnapshot` at module level so they are stable.

Why these reads:

- `matchMedia` is the only exact read of a fractional width. `innerWidth` is rounded by the browser, so it could report 759.5 as 760 (AC1). `innerWidth` is only the fallback when `matchMedia` is absent.
- `clientWidth` is forbidden because it excludes the scrollbar, and the phone page's own scrollbar could then flip the view. `visualViewport` is forbidden because pinch zoom would change it (AC1, AC28).
- `useSyncExternalStore` reads during render, so the first commit is already the right view (AC3, AC4, Assumption 9). Store updates render synchronously and re-read the latest value, which covers AC5 and AC6. `useState` plus an effect would paint the wrong view first.

**`src/App.tsx` (new).** `const view = useView(); return view === 'phone' ? <PhonePage /> : <Desktop />;`. React replaces the two different element types in one commit, so the old view is fully unmounted with the new one mounted (AC5). A non-crossing resize returns the same snapshot and remounts nothing (AC7). `Desktop` unmount already clears its listeners, the boot interval and the timers (T08 AC12), which gives the discarded boot of AC8.

**`src/main.tsx`.** Replace `import Desktop from './Desktop'` with `import App from './App'` and render `<App />` inside `StrictMode`. The three font imports stay exactly as they are.

**Theme (AC17-AC19).** No code. The inline script sets `data-theme` before React, and `PhonePage` never reads or writes it, or storage. On a crossing to the desktop, `readSettings()` reads the attribute and `persistDiff` sees no difference, so nothing is written, and a session theme survives a throwing `setItem`.

**Scroll scoping (AC14, AC16).** `theme.css` is untouched: `body { overflow: hidden }` and `html, body, #root { height: 100% }` stay as the default, so the desktop gets exactly the rules it has today. `PhonePage` opts out only while mounted:

- `PhonePage` has `useLayoutEffect(() => { document.documentElement.classList.add('phone-view'); return () => document.documentElement.classList.remove('phone-view'); }, [])`. A layout effect runs in the commit, so the class and the page appear before the same paint, and the cleanup runs in the commit that mounts the desktop. StrictMode's add, remove, add is harmless.
- `PhonePage.css` overrides, all prefixed so they cannot match without the class:
  - `html.phone-view, html.phone-view body, html.phone-view #root { height: auto; }`. Specificity beats the `#root` rule in `theme.css`.
  - `html.phone-view body { overflow: visible; }`, so the document itself scrolls.
- Rejected alternatives:
  - A CSS media query would be a second definition of the breakpoint (AC2).
  - `body:has(.phone)` needs no JS, but on a browser without `:has` the phone content would be cut off with no way to scroll, and this page is the one served to arbitrary phones.
  - An inner scroll container (`.phone { height: 100%; overflow: auto }`) would lose keyboard scrolling until focused and the browser's collapsing address bar.
- No `overflow-x: hidden` anywhere: AC15 is met by wrapping, not clipping, and clipping would also threaten the focus ring (AC23).
- AC8 holds without code. The document only overflows while the phone page is mounted, so the offset clamps to 0 when it unmounts, and a page mounted after the desktop starts at 0. Do not call `window.scrollTo` (jsdom logs an error for it, and it is unnecessary).

**`src/PhonePage.tsx` (new), default export, no props, no state.** No icons, so AC24 holds trivially. Markup, top to bottom:

- `main.phone` containing `div.phone-intro` with `h1.phone-name` (`NAME`) and `p.phone-role` (`ROLE`). Do not use a `<header>` element, so `header` selectors can only ever mean the desktop's menu bar.
- Four `section.phone-section`, each with `aria-labelledby` pointing at its `h2.phone-h2`, using the fixed ids `phone-about`, `phone-experience`, `phone-projects`, `phone-links`.
- About: heading `PHONE_HEADINGS.about`. Each `ABOUT_COPY` paragraph is `p.phone-para`, where `em` segments render as `<em className="phone-em">` and others as text. Then `ul.phone-facts` with one plain text `li` per `FACTS` label.
- Experience: heading `EXPERIENCE_LABELS.tablist`. `ul.phone-list`, one `li` per entry: `h3.phone-h3` (role), `p.phone-meta` (`{EXPERIENCE_LABELS.at} {org}`), `p.phone-meta` (`when`), `p.phone-desc`, tags.
- Projects: heading `PHONE_HEADINGS.projects`. `ul.phone-list`, one `li` per entry: `h3.phone-h3` holding `<a className="phone-link" href={p.href} {...linkAttrs(p.href)}>{p.name}</a>`, then `p.phone-desc`, tags.
- Links: heading `PHONE_HEADINGS.links`. `ul.phone-links`, one `li` per `LINKS` item with `a.phone-link` and `{...linkAttrs(l.href)}` and `l.label`, then a final `li` with `<a className="phone-link" href={RESUME_URL} target="_blank" rel="noopener noreferrer">{MENU_ITEMS.resume}</a>` (Assumption 3).
- Tags: a local, non-exported `Tags({ tags })` renders `div.phone-tags` with `<span className="tag tag-outline">` per tag, and a `{' '}` text node between them so assistive technology and `textContent` keep them apart, as `Projects.tsx` does.
- Every `ul` has `role="list"`, because Safari drops list semantics under `list-style: none` (AC21).
- Keys are array indexes. The lists are static, and T10's real data may repeat an org or a tag, which would otherwise produce a duplicate-key console error.

**`src/PhonePage.css` (new), tokens only, every selector prefixed `.phone` or `html.phone-view`.**

- `.phone`: `max-width: 640px; margin: 0 auto; padding: var(--space-8) var(--space-6); overflow-wrap: anywhere`. Background comes from the global `body` rule (`--color-bg`).
- `.phone-name`: 32px, margin 0. `.phone-role`: neutral-400, margin 4px 0 0.
- `.phone-section`: `margin-top: 40px`. `.phone-h2`: 20px, margin 0 0 12px. `.phone-h3`: 17px, margin 0.
- `.phone-para`, `.phone-desc`: neutral-400. `.phone-para`: margin 0 0 12px. `.phone-desc`: margin 8px 0 0.
- `.phone-em`: `font-style: normal; font-weight: 500; color: var(--color-text)`. Inter italic is not shipped, so a real italic is not an option.
- `.phone-meta`: 13px, neutral-400, margin 2px 0 0.
- `.phone-list`, `.phone-facts`, `.phone-links`: `list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column`. Gap is `var(--space-8)` on `.phone-list`, `var(--space-2)` on `.phone-facts`, 0 on `.phone-links`. `.phone-facts li`: neutral-400.
- `.phone-tags`: `display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px`.
- `.phone-link`: `display: inline-flex; align-items: center; min-height: 44px; max-width: 100%` (AC25). Global `a` gives the accent colour and underline.
- No `transition`, `animation`, `scroll-behavior`, `opacity`, `color-mix`, `@media`, `user-select` or `touch-action`.

**Colours (AC13, AC26).** Only three text tokens on one background, with no surface, no opacity and no mix: `--color-text`, `--color-neutral-400` and `--color-accent` on `--color-bg`. By hand in light mode, neutral-400 is about 5.0:1 and accent about 4.8:1; in dark, accent is about 5.5:1. `.text-muted`, `.card-meta` and `.card-body` are not used. Tags use `.tag-outline` (accent on the page background) because `--color-neutral-800` and `--color-accent-800` are almost the same as `--color-bg` in light mode, so the filled tag styles would lose their shape.

**Copy (AC11), in `src/data.ts`.** `export const PHONE_HEADINGS = { about: 'About', projects: 'Projects', links: 'Links' } as const;`. Experience reuses `EXPERIENCE_LABELS.tablist` (Assumption 6).

**Hard naming rule.** `tests/MenuBar.test.tsx` ("AC5: no email, link URL or menu copy is hard-coded outside data.ts") scans every `.ts` and `.tsx` file in `src/` except `data.ts`, **including comments and identifiers**, case-sensitively, for: `Restart`, `Tidy up`, `Minimize all`, `Show all`, `Terminal commands`, `Say hi`, `Dark mode`, `Light mode`, `System menu bar`, `Switch to light mode`, `Switch to dark mode`, `Wobbly windows`, `https://github.com`, `https://linkedin.com`, and the `EMAIL` and `RESUME_URL` values. `tests/logic/terminal.test.ts` also fixes the email literal to one occurrence, in `data.ts`. So import the constants, and do not write those strings in comments. `main.tsx` must also not contain `700`, `italic` or `variable` (`tests/fonts.test.ts`).

**Files and public surface.**

- New: `src/App.tsx`, `src/PhonePage.tsx`, `src/PhonePage.css`, `src/hooks/useView.ts`.
- Edited: `src/main.tsx` (entry), `src/logic/layout.ts` (additions only), `src/data.ts` (one constant), `vite.config.ts` (add `/PhonePage\.css/` to `test.css.include`, as every component stylesheet has).

**Data and API changes.** The additions above, plus the `phone-view` class on `<html>` while the page is mounted. No change to `Desktop`, `State`, reducers, storage or network.

**Dependencies.** None added (AC29).

## 4. Design

**User flow.** A visitor on a phone opens the site and sees the name and role, then scrolls through About, Experience, Projects and Links, ending at the résumé link. Links open as specified in AC22. Narrowing or widening past the breakpoint swaps views at once with no reload.

**States.**

- Loading: none of its own. `#root` is empty until the script runs, as today (Assumption 9), and the body already has the right theme background.
- Empty: not designed. `tests/data.test.ts` requires the content lists to be non-empty, and the page has no fetch.
- Error: no failure path in the page. A missing or throwing `matchMedia` falls back to `innerWidth`. Storage is never touched. The missing `/resume.pdf` and the `#` project links are T10 placeholders (Assumption 5).
- Success: the page, in the current theme, with text selectable.

**1280x720 and larger, and 760-1279px.** The desktop, unchanged. The `.phone` rules are inert because no matching element exists, and `html.phone-view` never applies.

**Below 760px (this ticket is the one that asks for it).** One column, capped at 640px and centered, at any height including 667x375.

**Accessibility.** One `h1`, one `main`, four labelled sections, `h3` per entry, real lists, native links in DOM order with the global focus ring, and 44px link height. Side padding (`--space-6`, 16.8px) leaves room for the 4px ring, and no ancestor clips. No focus moves or announcements at a crossing (Assumption 8, AC28). The viewport meta tag is not edited.

**Reduced motion.** Nothing moves in either setting, so no special case is needed (AC27).

## 5. Risk and security

Auth, secrets and server data do not apply. There is no new input surface: all text is static `data.ts` content rendered as React text. `PROJECTS` and `LINKS` hrefs are developer-owned constants.

- **R1. A wrong view painted first (AC3, AC4).** Safeguard: `useSyncExternalStore` read during render (T3). Unit test with a `Desktop` render counter at phone width under StrictMode; e2e mutation record from document start (T4).
- **R2. The desktop's overflow or height changing (AC4, AC16).** Safeguard: `theme.css` not edited, every override prefixed `html.phone-view` (T2). A raw CSS test pins the prefix and pins the `theme.css` rules; e2e checks `body` overflow at 760 and after a crossing back (T4).
- **R3. The class left behind after unmount, leaving the desktop scrollable (AC8, AC16).** Safeguard: the layout-effect cleanup (T2), tested on unmount, under StrictMode, and e2e after a crossing back.
- **R4. Breakpoint disagreements or a scrollbar feedback loop (AC1, AC2).** Safeguard: one constant, no CSS media query, no `clientWidth` or `visualViewport` (T1, T3). A test scans `src/` for the number.
- **R5. A fractional width misread (AC1).** Safeguard: `matchMedia` preferred over `innerWidth` (T3). Test: query says no match while `innerWidth` reports 760, the page is the phone page.
- **R6. The switch throwing on an old browser, a blank page (AC30).** Safeguard: guarded read and optional `addEventListener` (T3). Tests with no `matchMedia`, a throwing one and one without `addEventListener`.
- **R7. Text failing AA (AC26).** Safeguard: three token pairs only (T2). Contrast test, plus a raw CSS test that no other `color` value, `opacity` or `color-mix` appears, and a source test that the muted classes are not used.
- **R8. Horizontal overflow from long text or tags (AC15).** Safeguard: `overflow-wrap: anywhere`, wrapping tag row, `max-width: 100%` on links (T2). The e2e injects a long unbroken string into a tag and paragraph at 320px as well as checking normal content.
- **R9. Listener leaks (AC6).** Safeguard: `subscribe` cleanup (T3). Spies compare adds and removes under StrictMode after unmount.
- **R10. Copy-ban and purity tests failing on new code.** Safeguard: the naming rule in section 3 and no DOM words in `layout.ts` (T1-T3).
- **R11. An existing test tripping on the switch.** Checked in 7a: none does.

## 6. Gaps check

- **Auth:** none in this app, not applicable.
- **Validation:** no input. `viewForWidth` takes a number from the browser.
- **Error handling:** guarded `matchMedia` read with an `innerWidth` fallback. Nothing else can fail.
- **Mobile:** this ticket is the requested mobile work, limited to the fallback page. T11 stays out of scope.
- **Accessibility:** AC20-AC28, covered in sections 3 and 4.
- **Config and env vars:** one `vite.config.ts` test-only line. No env vars.
- **Tests:** logic, component, raw CSS, contrast and e2e, all in new files. See 7a for existing tests.

## 7. Tasks

Coder edits `src/` plus the one `vite.config.ts` line in T2. Test-writer runs after coder on each task and owns `tests/`. Each task must leave lint, typecheck and unit tests green once test-writer has finished. New tests are named with a `T13 ACn:` prefix. Tests go in new files only, so the `git diff` of existing test files stays empty.

**Test-writer guidance for the view switch.**

- jsdom has `innerWidth` 1024 and no `matchMedia`. Set a width with `Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w })`, and restore it after each test.
- For a browser-like run, use `vi.stubGlobal('matchMedia', ...)` with a fake that answers `DESKTOP_QUERY` from a test-controlled width, returns `matches: false` for any other query (so the reduced-motion read in `Desktop` is unaffected), and records `change` listeners. Fire them inside `act`, and `vi.unstubAllGlobals()` afterwards.
- Render `App` for anything about the choice of view. Existing tests render `<Desktop />` directly and are not affected.

Tasks:

- **T1. View rule and heading copy.** ACs: AC1 (rule), AC2, AC11 (constant), AC29.
  - Coder: the `layout.ts` additions and `PHONE_HEADINGS` in `data.ts`, as in section 3.
  - Test-writer: new `tests/logic/view.test.ts`: `viewForWidth` at 0, 320, 759, 759.5, 759.999 (phone) and 760, 760.5, 1024, 1280 (desktop); `resolveView(true, 0)` is desktop, `resolveView(false, 5000)` is phone, `resolveView(null, 759)` is phone and `resolveView(null, 760)` is desktop; `DESKTOP_QUERY` equals `(min-width: 760px)`; `PHONE_HEADINGS` literals. AC2: `import.meta.glob('/src/**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true })`, then `/\b760\b/` matches once in `/src/logic/layout.ts` and nowhere else. No 7a edits.
- **T2. `PhonePage`, not yet wired.** ACs: AC10-AC13, AC14 and AC16 (CSS), AC15 (CSS), AC18, AC20-AC22, AC24-AC27.
  - Coder: `PhonePage.tsx`, `PhonePage.css`, the `vite.config.ts` line.
  - Test-writer: new `tests/PhonePage.test.tsx`:
    - AC10: every item from `data.ts` present and in the listed order, using `compareDocumentPosition`; `em` count equals the `em` segments; `FACTS` inside About; every tag checked individually; no tabs.
    - AC12: no `button`, `input`, `nav`, `header`, `[role="menubar"]`, `[data-win]`, `[role="status"]`.
    - AC18: `Storage.prototype.setItem` spy has no calls, `data-theme` unchanged after mount and unmount, in both themes.
    - AC20: heading structure with no skipped level, one `main`, each section's accessible name from its `h2`.
    - AC21: `ul`/`li` for facts, experience, projects, links.
    - AC22: attributes for each `http(s)`, `mailto:` and `#` link, and the résumé link attributes.
    - AC24: no `svg`; each link's accessible name equals its text.
    - `phone-view` on `<html>` after mount, under StrictMode too, and absent after unmount.
    - Source checks on the raw `PhonePage.tsx`: no `text-muted`, `card-meta`, `card-body`, `dangerouslySetInnerHTML`, `tabIndex`, `WIN_TITLES`.
  - Test-writer: new `tests/PhonePage.data.test.tsx`, `vi.mock('../src/data', ...)` over the original to change `NAME`, one `LINKS` item, one heading and `MENU_ITEMS.resume`, and assert the render follows (AC11).
  - Test-writer: new `tests/PhonePage.css.test.ts`, raw CSS and `theme.css`:
    - every `html`, `body` or `#root` selector in `PhonePage.css` starts with `html.phone-view`, and every other selector starts with `.phone`
    - `theme.css` still has `body { overflow: hidden }` and the `height: 100%` rule (AC16)
    - every `color` value is one of the three tokens, and no hex, `rgb(`, `opacity` or `color-mix`
    - none of `transition`, `animation`, `scroll-behavior`, `@media`, `overflow-x`, `user-select`, `touch-action` (AC27, AC16)
    - `.phone-link` has `min-height: 44px` (AC25) and `.phone` has `overflow-wrap: anywhere` (AC15)
  - Test-writer: new `tests/phone.contrast.test.ts`, modelled on `tests/windows.contrast.test.ts`: `text`, `neutral-400` and `accent` on `bg`, dark and light, at least 4.5:1 (AC26). No 7a edits.
- **T3. Switch and wiring.** ACs: AC1, AC3-AC9, AC16, AC19, AC28, AC30.
  - Coder: `useView.ts`, `App.tsx`, the `main.tsx` change.
  - Test-writer: new `tests/App.test.tsx`, real `Desktop` unless noted, and new `tests/App.renders.test.tsx` for the `vi.mock` counters:
    - jsdom default: `typeof window.matchMedia` is undefined (so the case is not vacuous), no throw, desktop rendered (AC30).
    - `innerWidth` 500 with no `matchMedia`: phone page, and the desktop's menu bar, dock, `[data-win]` and `.boot-status` absent (AC3).
    - Stubbed query: 759 phone and 760 desktop; a throwing `matchMedia` and a query without `addEventListener` both fall back without throwing (R6); query no-match with `innerWidth` 760 is phone (R5).
    - `App.renders`: `vi.mock` `Desktop` and `PhonePage` with mount counters. Under StrictMode a phone-width load never mounts `Desktop` and a desktop-width load never mounts `PhonePage` (AC3, AC4). A non-crossing change fires a listener and neither remounts (AC7).
    - Crossing: firing the fake's listeners swaps views with exactly one present after `act`, `phone-view` follows the view, no `console.error` (AC5, AC8).
    - Repeated crossings end on the final width with one view (AC6).
    - AC6: `window` and fake query listener adds equal removes after unmount, under StrictMode.
    - AC19: set `data-theme` to the non-default value, make `setItem` throw, cross both ways, the attribute is unchanged. No 7a edits.
- **T4. End to end.** ACs: AC1, AC3, AC5-AC9, AC14-AC19, AC22, AC23, AC25, AC27, AC28, AC31.
  - Coder: nothing unless a real bug appears.
  - Test-writer: new `tests/e2e/phone.spec.ts` with `watchErrors` in every test (copy the helper from `boot.spec.ts`), and `colorScheme` pinned as other specs do. Use `test.use({ viewport })` or `page.setViewportSize` before `goto`, since the config default of 1280x720 is the desktop. Desktop presence means any of `[aria-label="System menu bar"]`, `nav[aria-label="Dock"]`, `[data-win]`, `.boot-status`. Phone presence means `main.phone`. Cover:
    - AC3: `addInitScript` with a `MutationObserver` on `document` (`childList`, `subtree`) that records any node matching the desktop selectors; at 500x800 the record is empty once the page is visible.
    - AC1: 759 phone, 760 desktop, on load and by resize. AC4 and AC9: at 760 and 1000, no `main.phone`, no `html.phone-view`, desktop present.
    - AC5: an observer on `#root` plus a `requestAnimationFrame` sampler that, on every sample once the first view exists, counts views; never 2 and never 0, while crossing both ways and swapping 800x400 to 400x800.
    - AC6: a burst of `setViewportSize` calls across 760, ending on each side, exactly one view.
    - AC7: phone, scroll, mark `main` with `dataset`, resize 375 to 414: the mark stays and `scrollY` is greater than 0. Desktop: typed terminal text survives 1280 to 1000.
    - AC8: scrolled phone page to desktop, `scrollY` 0, `scrollHeight` at most `innerHeight`, window positions at defaults; desktop to phone at top; a boot running at a crossing is gone with no boot screen after returning, with `Math.random` fixed as in `boot.spec.ts`.
    - AC14: `page.mouse.wheel`, and `End` and `PageDown` keys, change `scrollY`; the résumé link can be scrolled into the viewport. Touch relies on native document scrolling: assert no `touch-action` on `html`, `body` or `main.phone`.
    - AC15: for 320x568, 375x667, 414x896, 759x900, 667x375: `scrollWidth` at most `innerWidth`; at 320 also after injecting a 300-character unbroken string into a tag and a paragraph.
    - AC16: `body` computed overflow `hidden` at 760 and after crossing back; `scrollHeight` not exceeding `innerHeight`; `user-select` on a paragraph is not `none` on the page.
    - AC17: stored `dark` and `light`, and emulated scheme with nothing stored; body background matches; `html[data-theme]` already correct at the first mutation record; a storage-throwing init falls back to dark.
    - AC18: spy on `Storage.prototype.setItem` in `addInitScript`; no calls in a phone session; `localStorage` contents unchanged.
    - AC19: change theme on the desktop with `setItem` throwing, cross both ways, attribute unchanged.
    - AC22, AC23: Tab through all links, order equals DOM order, each has a visible `outline-style` of `solid`; the outline box is inside the viewport; `target` and `rel` read in the browser. AC25: every `.phone-link` box is at least 44 high.
    - AC27: `document.getAnimations()` is empty with both reduced-motion settings.
    - AC28: viewport meta unchanged; `activeElement` is `body` after a crossing and no `aria-live` element exists on the page.

**After T4 (QA stage, no coder or test-writer work).** Run the full AC34 set. Complete AC32 at 375x667 in both themes. Confirm `git diff` on existing test files is empty, and record that no deliberate requirement change was needed (AC33).

### 7a. Existing tests this ticket changes

**None.** Checked:

- `tests/logic/purity.test.ts`: no module is added, so `EXPECTED` is unchanged. The additions to `layout.ts` import nothing and contain no forbidden word.
- `tests/MenuBar.test.tsx` AC5 and `tests/logic/terminal.test.ts` AC32: both scan new source, and the naming rule keeps them green.
- `tests/fonts.test.ts`: font imports unchanged, and `App` adds no forbidden word to `main.tsx`.
- Every unit test of the desktop renders `<Desktop />` directly, not `App` or `main.tsx`, so setting `innerWidth` or stubbing `matchMedia` in them cannot reach the switch.
- Every existing e2e spec loads at the 1280x720 config default or larger. The only smaller resize is 1000x600 in `tests/e2e/boot.spec.ts`, above the breakpoint. They all stay on the desktop.
- `tests/e2e/build.preview.spec.ts`: theme, same-origin and font checks are unaffected.

## 8. Open questions

None need a human. Decided unattended from the spec, decisions log and requirements:

1. **The view rule goes in `logic/layout.ts`,** so no new logic module is added and the purity list needs no edit (AC33 allows either).
2. **`matchMedia` is the primary read, `innerWidth` the fallback,** because only the media query is exact for fractional widths (AC1) and jsdom has none (AC30).
3. **`useSyncExternalStore` drives the switch,** giving a correct first commit and an atomic swap with no extra state.
4. **Scrolling is scoped by a `phone-view` class set in a layout effect,** not a media query (a second breakpoint definition, AC2), not `:has()` (unscrollable on older phones), and not an inner scroller (keyboard and address bar problems).
5. **`theme.css` is not edited,** so the desktop's CSS is the same as before by construction.
6. **New heading copy is `PHONE_HEADINGS`** with About, Projects and Links. Experience reuses `EXPERIENCE_LABELS.tablist` (Assumption 6).
7. **No icons,** the simplest way to meet AC24.
8. **Tags use `.tag-outline`,** since the filled tag styles nearly match the page background in light mode.
9. **All text sits directly on `--color-bg` in three tokens,** so no muted class, `opacity` or `color-mix` needs a contrast check (AC26).
10. **`<em>` is shown with weight and colour, not italics,** matching `About` and the fonts that ship.
11. **`role="list"` on each `ul`,** because `list-style: none` removes list semantics in Safari (AC21).
12. **Touch scrolling is not exercised directly in e2e.** The page uses the browser's native document scroll, and the config's Desktop Chrome project has no touch. T4 asserts nothing blocks it, and the QA screenshot step covers the visual result.
