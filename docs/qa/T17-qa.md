# T17 QA report: experience.log, bigger window, stats, org pill

Method: Vite dev server on port 5199 (stopped afterwards by killing only the listening PID), driven with the project's Playwright Chromium at 1280x720 (the MCP browser could not start, so I used a script). Screenshots were viewed in light, dark and phone. Source and tests were not edited.

## Result summary

One failure: the T16 e2e test `tests/e2e/viz.spec.ts:135` fails in every full e2e run (3 of 3, including the earlier one you reported) and passes alone. It is not a T17 product bug but it blocks AC23. All T17 behaviour checks passed.

## Failures

### F1. viz.spec.ts:135 fails in full e2e runs, passes alone (Medium)

- Test: "T16 AC6/AC7/AC12: the button sits below the text, above the facts, and opens dataviz".
- Steps: `npm run test:e2e` (full suite, 6 workers), run twice here.
- Expected: `btn.y + btn.height <= facts.y + 1`.
- Actual: the same failure in both full runs. Expected <= about 638.4, received 695.27, at viz.spec.ts:146. All other 295 tests passed in each run. The test passed 3 of 3 when run alone (`npx playwright test tests/e2e/viz.spec.ts:135`).
- Flaky or deterministic: it is not a random flake here. It fails reliably under full-suite load and passes in isolation, so it depends on load or timing. The button measures about 57px lower than the facts list top, which suggests the About window layout is measured mid-render (fonts or wrap not settled) or the About window was open at a different width. T17 does not touch About or the viz button. Whether T17 made it worse is not proven, but the earlier single failure plus 2 of 2 here makes it unreliable at best. Suggested fix: wait for layout to settle (for example `document.fonts.ready` or an expect.poll on the two boxes).

## Passed

Browser checks at 1280x720 (dark and light):

- AC11/AC14: exp window is exactly 600x400 on all 3 tabs in light and dark.
- AC12/AC13: window at (64,244), bottom 644, right 664 (left of term at 810). Fits between menubar and dock.
- AC2/AC5: stats lists match the AC2 strings on every tab, only the selected entry's stats are shown, and they change with the tab. No `.exp-desc`.
- AC4: DOM order is exp-role, exp-org, exp-when, exp-stats, exp-tags.
- AC7/AC8: `.exp-org` text is `@ Tartigrade Ltd.` (and the other orgs), sizes to content (127px against a 450px panel), background rgb(210,206,253) with text rgb(43,39,65) in both themes. I looked at the screenshots in both themes. The pill is a readable light purple, distinct from the tags, in light and in dark.
- AC15: with a forced 900px block, the panel scrolls (scrollHeight 1087 vs 360), the window stays at (64,244) 600x400, there is no horizontal scroll and the page does not scroll. Mouse wheel over the panel moved scrollTop from 0 to 300.
- Keyboard: ArrowDown, End, wrap in both directions and Home work. Tab from the tab rail lands on the tabpanel (`.exp-panel`).
- Phone page at 390 wide: no horizontal overflow (scrollWidth 390), the experience section shows the stats lists (7 items) and no description sentence.
- Console: no errors or warnings in the desktop (both themes) or phone pages. No failed or 4xx/5xx requests.
- Refresh mid flow: reload returns to the first-load state (only hello open), as designed.

Commands:

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: 1519 of 1519 pass.
- `npm run format:check`: pass.
- `npm run test:e2e` run twice: 295 of 296 pass each time. The only failure is F1 in both runs.
- `npm run build` was not run separately.

Not independently checked: the terminal `experience` output was not run in the browser. The unit terminal tests are in the 1519 passing tests.

## Notes

- The default theme in the browser is light, so the first screenshots I took were light. Dark was captured separately by setting `data-theme="dark"`.

RESULT: FAIL

## Fix round 1

The single FAIL was `tests/e2e/viz.spec.ts` (T16 button position), a load-dependent e2e measurement taken before web fonts had loaded and in three separate reads. Fixed in the tests only (`document.fonts.ready` in `settled()` and `waitSettled`, one synchronous measurement). The full `npm run test:e2e` then passed twice (296/296), as did lint, typecheck, format:check and 1519 unit tests. No product bug found. Final result: PASS after one fix round.
