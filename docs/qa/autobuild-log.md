# Autobuild log

## Run 2026-11-08 (branch autobuild/2026-11-08)

Baseline: lint, typecheck, unit tests green (3 tests).

### T01 done

- Shipped: light neutral-400/500 and accent-400 contrast fixes, light section-glow and accent-2 ramp; tests for tokens, contrast, fonts, theme init; Playwright `chromium-preview` project (fresh build on port 4173).
- Results: lint, typecheck, 157 unit tests, build, format:check, 22 e2e all green. QA: PASS (docs/qa/T01-qa.md). No fix rounds.
- Assumptions: A3 light accent-400 set to #6558ad (plain reversal gave ~4.2:1, fails AA); accent-2 ramp reversed in light; contrast check covers solid token pairs only.
- Gaps: A3 is not yet in the Decisions log (only a theme.css comment and plan). `vite.config.ts` test css now `include: [/theme\.css/]`. e2e now runs a build every time. Inline theme script will need CSP hash/nonce at deploy (T12). New tests had no mutation check. QA used bundled Chromium (Chrome not installed for Playwright MCP).

### T02 done

- Shipped: pure logic modules in `src/logic/` (windows, layout, zorder, dock, drag, terminal, history); `Line` now `{ text, tone }`; `NAME`, `ROLE`, `EMAIL`, `VERSION` in `data.ts`. 129 new unit tests (285 total) including a purity guard and an email-appears-once check.
- Results: lint, typecheck, 285 unit tests, build, format:check, 22 e2e all green. QA: PASS (docs/qa/T02-qa.md). No fix rounds.
- Assumptions: window heights are estimates in `WIN_META` (hello 420, about 460, exp 300, proj 330, term 310, site 340), the dock top is `vh - 76`, tidy closes "About this site", terminal sits 6px above its formula so it clears the dock, `raise` returns `readonly WinId[]` (T03 must type `State.order` as readonly), `open` with no argument prints a usage line, VERSION = '1.0'.
- Gaps: heights must be re-checked against real windows in T07; `State` in `types.ts` still has `verb`, `tab`, `cmd`, `lines` (conflicts with decision 5, left for T03); NAME/ROLE/EMAIL/VERSION not yet in the Decisions log; no mutation checks on new tests; no coverage tool installed.

### T03 done

- Shipped: `State` is now `{ wins, order, vw, vh }` (verb/tab/cmd/lines/drag/tilt removed per decision 5); pure `desktopReducer` and `initialDesktop` in `src/logic/desktop.ts` (open, close, minimize, restore, focus, dockClick, move, minimizeAll, showAll, tidy, restart, resize); `WIN_TITLES` in `data.ts`; `Desktop` wired with `useReducer`, lazy init from the viewport, one resize listener, and labelled placeholder windows.
- Results: lint, typecheck, 341 unit tests, build, format:check, 25 e2e all green. QA: PASS (docs/qa/T03-qa.md). No fix rounds.
- Assumptions: resize re-clamps with the drag clamp only (windows can end up under the dock; Tidy up restores layout); `tidy` and `restart` produce identical state and both close "About this site"; invalid ids and non-finite sizes return the same state; minimized placeholders use `hidden`; `menu`, `theme`, `wall`, `wobble`, `booting` removed from `State` for now (T05/T08 add them back).
- Gaps: AC21 (minimized placeholder is mounted, hidden, not focusable) has no component/e2e test yet, add it once T04-T06 can minimize; purity test title still says "seven" modules; no mutation checks on new tests; resize to 0x0 is accepted (clamps cleanly); placeholders have no border or shadow until T04.

### T04 done

- Shipped: `Window` chrome (titlebar, aria-hidden icon, labelled Minimize/Close buttons, shadow on the front window, `site` close-only), pointer-event drag via `useDrag` (pointer capture, one `move` per drag, idempotent end), tilt wobble, genie minimize with `inert`, fly-out on open, `prefers-reduced-motion` handling (no tilt or genie, minimize fades), pure `src/logic/motion.ts`, `WindowLayer`, `Window.css`, `WIN_ICONS` and `CHROME_LABELS` in `data.ts`.
- Results: lint, typecheck, 451 unit tests, build, format:check, 49 e2e all green. QA: PASS (docs/qa/T04-qa.md). No fix rounds.
- **Existing tests changed (review these):** (1) `tests/Desktop.wiring.test.tsx` "AC22 placeholders hold only their title, no buttons" was replaced by a stricter chrome test (exactly 10 buttons, region names, "Minimize/Close <title>" button names, `data-min=false`, visible, not inert), titled as a deliberate requirement change. One small loosening: it checks `.win-title` text rather than the whole element's text. (2) `tests/logic/purity.test.ts`: `'motion'` added to `EXPECTED`. (3) `vite.config.ts` test css include now also matches `Window.css`. No test was deleted or skipped.
- Assumptions: `chromePose` treats tilt as degrees already (no second 0.7 factor); `Desktop` passes `wobble={true}` for now (toggle, state and `tanzi-os:wobble` persistence belong to T05); genie target is viewport centre x and `vh - 40`; fly-out only for windows opened after the first frame; reduced motion keeps a fade on minimize.
- Gaps: restore and open cannot be triggered from UI until T05/T06, so only unit/component tests cover them and the fly-out was not checked visually; the T03 AC21 deferred test is covered by the new inert tests; tilt saturates at +-7deg on any fast move; window bodies are empty placeholders until T07; no mutation checks on new tests.

## Run 2026-11-08, resumed (branch autobuild/2026-11-08)

Baseline: lint and typecheck green; unit tests 752 of 753, the one failure is AC21 in `tests/MenuBar.test.tsx`, added by the unfinished T05 commit (`cff83c8`), so it was treated as T05 work rather than a broken base.

### T05 done (existing work verified, two bugs fixed)

- Verified rather than built: `cff83c8` already held `MenuBar`, menus, clock, settings and storage, plus plan, requirements and tests. Those files were reused so AC numbers keep matching the tests.
- Fixed: the Help menu Résumé link had no new-tab attributes (`linkAttrs` only handles http(s), and `RESUME_URL` is a local path), and clicking from one open menu to another closed it because hover had already switched to that menu.
- Results: lint, typecheck, 753 unit tests, build, format:check, 83 e2e all green. QA: PASS (docs/qa/T05-qa.md). One fix round for e2e.
- Assumptions: the requirements and plan committed in `cff83c8` were accepted without rerunning requirements-clarifier and planner.
- Gaps: QA did not check dragging with wobble off, or hover and pressed colours. The "Say hi" accessible name reads "Say hiemail" (for T09). The trigger hover handler does not filter by pointer type, so a tap on another trigger while a menu is open may close it; untested, touch is out of scope until T11. QA used scripted bundled Chromium because the Playwright MCP needs Chrome, which is not installed.

### T06 done

- Shipped: `Dock` in `src/Dock.tsx` and `src/Dock.css`: five window buttons, divider and three links from `data.ts`, state dots, native tooltips, `aria-pressed` plus an Open/Minimized/Closed description, hover and press motion on an inner `.dock-face` so the hit box stays still, explicit reduced-motion rules. `dockWinState`, `DOT_OPACITY` and `DOCK_LABELS` added. Reuses the existing `dockClick`.
- Results: lint, typecheck, 840 unit tests, build, format:check, 120 e2e all green. QA: PASS (docs/qa/T06-qa.md). No fix rounds.
- **Existing tests changed (review these):** four sanctioned edits, each commented `DELIBERATE REQUIREMENT CHANGE (T06 AC30)`: button lists in `tests/Desktop.wiring.test.tsx` and `tests/Desktop.menubar.test.tsx` gained the five dock labels; `tests/e2e/chrome.spec.ts` page total went from 11 to 16 with new dock counts; its Tab test went from 18 to 26 presses and now excludes only the exact dock label `terminal`, and asserts that stop is reached. No test was deleted or skipped.
- Assumptions: native `title` tooltips; genie target stays at viewport centre x and `vh - 40`; focus stays on the dock button after activation; the dock comes last in tab order; dots do not lift with the icon; part of a lifted icon above its resting box is not clickable; the extreme corners of each 46x46 button are not clickable because of the 12px rounded shape, which AC18's "anywhere in the box" did not allow for.
- Gaps: the minimized dot (0.4 opacity) is about 1.9:1 on the dock in dark mode by hand calculation, below 3:1, kept because the spec is explicit and the state is also given non-visually (for T09). Mutation checks were run only for part of task T3; test-writer edited and restored `src/Dock.css` for that and was then told to stay out of `src/`. QA used scripted bundled Chromium.

### T07 done

- Shipped: all six window bodies in `src/windows/` (Hello with verb cycling and letter motion, About, Experience with ARIA tabs, Projects with `~/projects` in the titlebar, Terminal with history, click focus and auto-scroll, About this site), `renderBody` on `WindowLayer`, Help > Terminal commands through `createHelpChannel`, copy added to `data.ts`, `WIN_META` heights set from measurement.
- Results: lint, typecheck, 1125 unit tests, build, format:check, 171 e2e all green. QA: PASS (docs/qa/T07-qa.md). No fix rounds.
- **Existing tests changed (review these):** edits from plan section 7a, each commented `DELIBERATE REQUIREMENT CHANGE (T07 AC52)`: window and page button counts, Tab-order counts and lists in `tests/Desktop.wiring.test.tsx`, `tests/Desktop.menubar.test.tsx`, `tests/Desktop.dock.test.tsx`, `tests/e2e/chrome.spec.ts` and `tests/e2e/dock.spec.ts`; default positions from new heights (exp y 354, proj y 259, term y 340 at 1280x720; term 1920x1080 y 700 was 694) in unit and e2e pins; the projects titlebar text. No test was deleted or skipped. `tests/windows/Experience.test.tsx` still has a T6 test titled "no hover or reduced-motion rules yet"; it only checks the at-rest face and the title is now out of date.
- Assumptions: `WIN_META` heights are hello 420, about 331, exp 290, proj 385, term 270, site 282; `clear` removes the banner too and keeps Up/Down history; Help > Terminal commands is not added to history; Tidy up keeps open windows' internal state; `.btn-primary` hover and pressed labels and the active tab label use a lighter accent token to reach AA, without changing token values; dots and focus follow T06.
- Decision for you: at 1280x720 the default layout is crowded. Hello covers Experience's titlebar buttons and two of its tabs; About and Terminal cover Projects' buttons and tiles. The dock, Windows menu and Tab all still reach them, and 1920x1080 is fine. This comes from the prototype's `layout()` formula, and fitting above the dock adds 26px of overlap on Experience. Screenshots were taken in QA but not committed.
- Gaps: Restart does not yet reset verb, tab or terminal (T08). In light mode `.tag-neutral` matches its tile background so the chip shape disappears, text passes AA (T09). Clicking the bare desktop does not clear a text selection. Most new tests had no mutation check. QA used scripted bundled Chromium.

## Run resumed after a usage-limit stop (branch autobuild/2026-11-08)

Baseline before T08 task T2: see the T08 entry. T08 tasks T1 and earlier were already committed; nothing partial was left in the tree.

Direction from Tanzi during this run: finish T08, defer T09 until after the MVP, add a simple phone fallback (T13, decision 13), and skip terminal admin editing for now (T14).

### T08 done

- Shipped: `BootScreen` (dialog, TC mark, progress bar, 90ms ticks) on Restart only, skipped under reduced motion; a full reset by remounting windows, with theme, wallpaper and wobble kept and nothing written to storage; the desktop inert during the boot; no fly-in after a reset; focus returned to the tanzi.os trigger through `focusSignal`; a polite live region announcing "tanzi.os restarted". `appReducer` and the `restart` action are unchanged.
- Results: lint, typecheck, 1275 unit tests, build, format:check, 197 e2e all green. QA: PASS (docs/qa/T08-qa.md). No fix rounds.
- **Existing tests changed (review these):** two edits, each commented `DELIBERATE REQUIREMENT CHANGE (T08 AC32)`: the Restart cases in `tests/Desktop.dock.test.tsx` and `tests/Desktop.menubar.test.tsx` now wait for the real boot; assertions unchanged and Tidy up still immediate. No test was deleted or skipped.
- Assumptions: decision 3 overrides the README and prototype, so wobble is kept; the reset happens at the end of the boot and 100% is never painted; the boot is a named modal dialog holding focus; copy is "Restarting tanzi.os", "Restart progress" and "tanzi.os restarted"; focus goes to the tanzi.os trigger afterwards.
- Gaps: in light mode the progress track matches the background so only the fill shows, as specified (for T09). Most new tests had no mutation check. QA used scripted bundled Chromium, and its report was saved by the orchestrator because the agent's file write was rejected. The run paused partway through on a usage limit and resumed with nothing lost.

### T10 needs a human

- The code half (about and hello copy in `data.ts`) was done in T07. The rest is real content only Tanzi has: email, GitHub and LinkedIn links, experience and project text and links, and `public/resume.pdf`, which does not exist yet, so the Résumé link is currently broken. Nothing was invented.

### T13 done

- Shipped: `PhonePage` (`src/PhonePage.tsx`, `src/PhonePage.css`) below 760px with one h1, sections for about, experience, projects and links, and no motion; `useView` and `App` choose the view from `matchMedia` with an `innerWidth` fallback; the desktop never mounts on a phone-width load; the breakpoint is defined once in `src/logic/layout.ts`.
- Results: lint, typecheck, 1371 unit tests, build, format:check, 242 e2e all green. QA: PASS (docs/qa/T13-qa.md, screenshots not committed). One fix round: the global reduced-motion rule in `src/theme.css` now excludes `:root.phone-view`, because its 0.01ms floor created focus-ring transitions on the phone page; desktop matching is unchanged.
- No existing test was changed.
- Assumptions: the switch is by width only, so 759 is phone and 760 is desktop; 760 to 1279px stays as it was; the résumé link opens a new tab, matching the menu rather than `linkAttrs`; the page has no theme toggle and no icons; tags use `.tag-outline` because filled tags nearly match the page in light mode.
- Decision for you: a phone in landscape at 760px or wider (for example 844x390) gets the desktop at 390px high, with windows overlapping and the dock covering them, and nothing scrolls.
- Gaps: real touch scrolling was exercised only in QA's iPhone emulation, not in the e2e suite; spacing is slightly uneven on the page; `tests/e2e/boot.spec.ts` boot timing failed once in a full run and then passed in 7 later runs, so it may be occasionally load-sensitive; most new tests had no mutation check. QA used scripted bundled Chromium.

## Run on branch autobuild/2026-11-10 (round 2: T15-T18)

Baseline before T15: GitHub link removed and tests updated on main (commits 1443f89, 4f84801). lint, typecheck, 1367 unit and 242 e2e all green.

### T15 done

- Shipped: only hello.txt opens on first load and after Restart; Tidy up still opens all five (reducer `tidy` and `restart` split, `tidyDesktop`); hello gets "More about me" and "What I've been up to" buttons (secondary style, same `open` action, copy in `HELLO_COPY`); `WIN_META.hello.height` 420 -> 473 because four buttons wrap to two rows.
- Results: lint, typecheck, 1423 unit, 267 e2e green. QA: PASS (docs/qa/T15-qa.md), no fix rounds.
- **Existing tests changed (review these):** many setup-only edits across unit and e2e specs, each marked `DELIBERATE REQUIREMENT CHANGE (T15 AC25)`, via new helpers `tests/helpers/openAll.ts` and `tests/e2e/helpers/openAll.ts`. Count/offset edits: hello tab stops +2, dock Tab total 31 -> 33, hello height 473. `phone.spec.ts` also needed setup, which the plan missed. No test deleted, skipped or weakened.
- Assumptions: Tidy up stays "all open" (design spec); new buttons use `open`, not the dock toggle; no icons on new buttons.
- Gaps: a newly opened window can cover hello's buttons until hello is raised; restoring a minimized window via a hello button was not walked by hand (unit and e2e cover it); QA used scripted Chromium; build and format:check not run by QA (format:check run by me).

### T16 done

- Shipped: about.md first paragraph rewritten (Tanzi's wording, two em phrases), "Currently building…" and facts unchanged; a "See some data viz" secondary button opens a new placeholder `viz` window (title `dataviz`, `ChartPieSlice` icon, "Coming soon", 280x160, starts closed, has a dock button and a Windows menu item); about height 331 -> 396; Windows menu now built from `DOCK_IDS`. Phone page shows the new copy, no viz.
- Results: lint, typecheck, 1489 unit, 283 e2e green. QA: PASS (docs/qa/T16-qa.md), no fix rounds.
- **Existing tests changed (review these):** dock/menu/start/boot/wiring/layout/window-list tests updated for six dock windows and a sixth menu item, hello/about tab stops, about height 396; each marked `DELIBERATE REQUIREMENT CHANGE (T16 ACn)`. Test helpers still open only the original five windows. No test deleted, skipped or weakened.
- Assumptions: `INITIAL_ORDER` starts with `viz` so z-order is distinct after Tidy up; terminal `ls`/`open` do not know viz (`open viz` says no such file); viz sits at (960,158) so it does not cover the about button; plain `btn btn-secondary` for the about button (not the hello hover pattern).
- Gaps: terminal `open viz` unsupported by design; QA did not check 1920x1080, reduced motion or light-mode manual walk of terminal Restart (e2e covers them); QA used scripted Chromium.

### T17 done

- Shipped: `desc` replaced by `stats: string[]` per role (desktop list and phone nested list); experience.log window 520x290 -> 600x400 (now at (64,244) at 1280x720, bottom exactly at the dock limit 644); `@ Company` is a light-purple pill via new tokens `--color-org-pill-bg` `#d2cefd` and `--color-org-pill-text` `#2b2741` (about 9.5:1, tested in both themes); the panel scrolls inside a fixed-height window.
- Results: lint, typecheck, 1519 unit, 296 e2e green. QA: FAIL once, then PASS after one fix round (docs/qa/T17-qa.md). The failure was a font-load race in the T16 viz e2e test, fixed in tests only.
- **Existing tests changed (review these):** exp height/width/position pins, `.exp-desc` -> `.exp-stats`, phone page list counts, and e2e click points on proj (`chrome.spec.ts`, `menubar.spec.ts`) plus a raise-first step in `dock.spec.ts` T06 AC13, because the bigger exp window now covers more of proj; each marked `DELIBERATE REQUIREMENT CHANGE (T17 ACn)`. No test deleted, skipped or weakened.
- **Content to review (important):** there is no `experience/` folder in the repo, so no résumé was available. The stats are only the existing figures from the old `desc` text, split into bullets: Tartigrade 3, General Dynamics 3 (33 hours to 3, +80% coverage, deploy config automation), University of Calgary 1 (no figures). Nothing was invented, so you will likely want to add stronger numbers to `EXP[*].stats` in `src/data.ts`.
- Assumptions: terminal `experience` output unchanged; phone page keeps plain `@ org` text, not a pill; after Tidy up hello covers more of exp than before.
