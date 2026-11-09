# QA report: T13 phone fallback page

Branch autobuild/2026-11-08. Method: the Playwright MCP browser was unavailable (Chrome not installed), so I drove the bundled Chromium with scripted Playwright runs, including iPhone 13 device emulation with touch. Screenshots are in docs/qa/shots/ (dark and light at every size, plus dark full-page at 320, 375, 390, 414 and 759). I looked at 375 dark full page, 375 light, 320 light, 667x375 dark, the focus ring at 375, and 844x390.

## Result summary

No failures found. The spot checks were scripted and not exhaustive; unit tests were run, build and e2e were not.

## Viewports

| Size                                                 | View    | scrollWidth <= width | Notes                                                |
| ---------------------------------------------------- | ------- | -------------------- | ---------------------------------------------------- |
| 320x568, 375x667, 390x844, 414x896, 759x900, 667x375 | phone   | yes                  | no clipped elements, no desktop in DOM, 1 h1, 1 main |
| 760x800, 1280x720, 1920x1080                         | desktop | yes                  | body overflow hidden, unchanged                      |

Both themes were rendered at every size.

## Acceptance criteria

Passed (observed):

- AC1: 759 is phone, 760 is desktop. Height and touch ignored (667x375 is phone, 844x390 is desktop).
- AC3, AC4: a MutationObserver from document start recorded no desktop element (header.mb, dock, dialog) on a 375 load, and no phone page on a 1280 load.
- AC5, AC6: crossing 800, 375, 760, 759, 1000, 700 and 10 rapid toggles recorded 0 frames with both views and 0 with neither. It ended on the correct view with one view mounted. No console errors or warnings.
- AC7: a resize from 375 to 380 wide kept scrollY at 500 (view not remounted).
- AC8: after crossing into the phone page scrollY was 0. After crossing back, the desktop had no scrollbars and an empty html class.
- AC9, AC16: the desktop at 760 to 1920 has body overflow hidden. Phone text is selectable (user-select auto, 1152 chars selected).
- AC10, AC11, AC12: order is name and role, About with facts, three Experience entries, four Projects, Links with the résumé last. No toggle, dock or terminal.
- AC13: one column, tokens only, max-width 640 centred.
- AC14: wheel scroll and End key reach the bottom (2051 high at 320), and the résumé link is reachable. Touch emulation (iPhone 13) also scrolled.
- AC15: no horizontal overflow at any phone size. An injected 100+ character unbroken string at 375 wrapped (scrollWidth 375).
- AC17, AC18, AC19: stored light gave light. OS dark gave dark and OS light gave light. With localStorage throwing it gave dark. 0 setItem calls on the phone page. data-theme was unchanged across crossings.
- AC20, AC21: headings are h1, h2, h3 in order with no skipped level. lang is en. Lists have role=list.
- AC22: the project `#` links and the mailto link have no target or rel. The GitHub and LinkedIn links have _blank and noopener noreferrer. The résumé link has _blank and noopener noreferrer, and the click opened a popup to /resume.pdf.
- AC23: Tab order matches reading order (Pathfinder, Pantry, tinyq, dotfiles, GitHub, LinkedIn, Email, Résumé, then leaves the page). The ring is visible and not clipped (focus-375.png).
- AC25: 0 links under 44px high.
- AC27: document.getAnimations() is 0 with reduced motion on and off.
- AC28: viewport meta not touched.
- AC29, AC34 (partial): lint, typecheck, npm test (1371 passed) and format:check pass. npm run build and npm run test:e2e were not run.
- AC32: screenshots taken at 375x667 in dark and light (docs/qa/shots/dark-375x667.png, light-375x667.png).

Not verified by me (code or unit-test scope): AC2, AC24 (no icons are used), AC26 contrast (I judged it visually only; the muted text reads fine in both themes), AC30, AC31, AC33.

## Console and network

No console errors or warnings and no failed requests on any run. /resume.pdf is only requested when the link is followed (T10).

## Visual and UX notes (not failures)

- Hierarchy is clear and the text is readable at 320 to 414. Tags wrap.
- Spacing is slightly uneven. The "Experience" heading sits close to the first entry. In Projects the 44px link box leaves a visible gap between the project name and its description. Links in the Links list are spaced about 40px apart, which is comfortable.
- The light theme background is a lavender tint (existing --color-bg).
- Project links go to `#` (known placeholder, T10) so a tap jumps to the top.

## Landscape phone at 760px or wider (accepted assumption)

At 844x390 the desktop renders at 390px high: the menu bar, hello and about windows overlap, and the dock covers the windows and is mostly obscured (docs/qa/shots/dark-844x390.png). It is usable only with effort and nothing is scrollable. Severity for the owner to weigh: medium for phones such as iPhone Plus and Pro Max in landscape, since those visitors get a cramped desktop and not the readable page. A height or touch rule would fix it, but this is out of scope for T13.

## Known and noted, not failed

Placeholder content, `#` project links and the missing /resume.pdf (T10).

RESULT: PASS
