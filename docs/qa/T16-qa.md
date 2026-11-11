# T16 QA report

Tested on branch autobuild/2026-11-10, dev server on port 5199 (stopped after, PID 25176 only), headless Chromium driven by a Playwright script at 1280x720 in dark and light, plus 390x800 for the phone page. The Playwright MCP browser could not launch (Chrome not installed), so the scripted bundled Chromium was used instead.

## Suites

- npm run lint: pass
- npm run typecheck: pass
- npm test: pass, 58 files, 1489 tests
- npm run test:e2e: pass, 283 passed
- Not run by me: build, format:check (the e2e preview project builds successfully).

## Passed criteria (observed in browser, dark and light identical)

- about.md first paragraph is the new text with em "making ideas come to life" and "visualizing data". The "Currently building ... web platforms, automation and data tooling." paragraph is unchanged. Facts list unchanged. No "last pixel" text on the phone page.
- "See some data viz" is one native `button[type=button]` with classes `btn btn-secondary about-viz`. It sits after the last paragraph (bottom 276.6) and before the facts (top 334.5). Focusables in about are Minimize, Close, the button only.
- Click, Enter and Space on the button: opens viz when closed, restores it when minimized, raises it from behind (z 14 to 15 after about was raised), and a second click while on top leaves it open and unminimized.
- viz starts closed (no `[data-win="viz"]`). Dock has six window buttons in order hello.txt, about.md, experience.log, projects, terminal, dataviz. dataviz reads Closed, aria-label and title are dataviz.
- viz window: title dataviz, body "Coming soon", only Minimize and Close focusable, box (960,158) 280x160, bottom 318.
- viz does not overlap the about button (button x 664-808, y 288-318; viz starts at x 960). Button is hit-testable after viz opens.
- about window: (640,64) 420x396, bottom 460 (limit 644), scrollHeight equals clientHeight (396), no clipping. `WIN_META.about.height` is 396 and matches the rendered height.
- Windows menu lists six checkbox items (hello.txt, about.md, experience.log, projects, terminal, dataviz), then Minimize all, Show all, Tidy up. The dataviz item is checked only when viz is open.
- Tidy up opens six windows, none minimized. Restart from the tanzi.os menu returns to hello only.
- Keyboard Tab order across the page reaches the about button after Minimize about.md and Close about.md.
- Phone page at 390 wide: shows the new first paragraph and the unchanged second paragraph, no "data viz" or "dataviz" text, no horizontal overflow (scrollWidth 390).
- Console: no errors or warnings, no failed or 4xx/5xx requests, in both themes and on the phone page.

## Not checked

- Terminal `tidy` and terminal Restart paths, reduced motion paths, and the 1920x1080 viewport were not walked manually. The e2e suite (viz.spec and others) passed and covers these at 1280x720.
- The AC26 test-edit marker audit (`// DELIBERATE REQUIREMENT CHANGE (T16 ACn)` on every edited existing test) was not done.

## Failures

None found.

PASS
