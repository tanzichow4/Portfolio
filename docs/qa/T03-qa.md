VERDICT: PASS

# T03 QA: Desktop reducer and wiring

Scope: docs/plans/T03-plan.md section 2 (AC1-AC26). Driven with the project's bundled Playwright Chromium via a scratch script (scratchpad `qa.cjs`), dev server on http://localhost:5173. Reducer odd inputs were run in the page by importing `/src/logic/desktop.ts` from the dev server. Unit/e2e suites were not re-run here.

## Passed (browser)
- 1280x720: five regions at hello 77,72; about 640,64; exp 64,344; proj 538,300; term 810,334; widths 560/420/520/520/440. No `site`, no "About this site" anywhere. (AC20, AC24)
- Titles are hello.txt, about.md, experience.log, projects, terminal. Accessibility tree shows exactly five `region` nodes with those names. (AC20)
- z-index: proj 10, exp 11, term 12, about 13, hello 14 (matches INITIAL_ORDER). Overlaps render in that order in the screenshot. (AC20)
- Wallpaper is the nebula radial-gradient on the fixed root. (AC19)
- Reload at 1280x720 gives identical layout. Growing 1280x720 -> 1920x1080 in the same page moves nothing.
- 1920x1080 initial: hello 115,72; about 960,64; exp 96,562; proj 806,410; term 1450,694. Resize to 1280x720: term 1200,660, others unchanged (in bounds). Back to 1920x1080: term stays 1200,660. (AC15, AC24)
- Light theme (`data-theme="light"` on html): windows and nebula wallpaper render with readable title text.
- Console: zero errors or warnings; network: no failed or 4xx/5xx requests. (AC24)
- Keyboard: first Tab leaves focus on BODY; no focusable controls (expected for placeholders).

## Passed (reducer review and odd inputs, src/logic/desktop.ts)
- Ids `constructor`, `__proto__`, `toString`, undefined, null, empty string through open/close/minimize/restore/focus/dockClick/move: all return the same reference (AC26).
- resize with NaN, Infinity, -1, numeric strings, missing fields, same size: same reference. move with NaN/Infinity: same reference. Unknown action type: same reference, no throw.
- resize to 0x0 is accepted and clamps (term x -80, y 36); 300x200 clamps without NaN.
- Flows: dockClick on top-most minimizes, second click restores and raises; dockClick site opens it and keeps z 800 (order gets site appended); close then open raises; minimizeAll then open site then tidy gives site closed, order = INITIAL_ORDER; move clamps to -360/36 low and 1200/660 high at 1280x720; focus on a closed window is a no-op.
- Matches the prototype's open/close/minimize/dockClick/tidy/restart/allWins semantics. Differences are intentional: open sets min false directly (the prototype's 30 ms min-then-unmin is animation, T04); resize re-clamps (the prototype only stores size, per plan Assumption 4); restart equals tidy (T08 adds the boot remount).

## Failures
None.

## Observations (not defects)
- Placeholders have no border or shadow, so overlaps are hard to tell apart visually. Expected until T04.
- `resize` to 0x0 is accepted (only negatives and non-finite are rejected). Harmless, within the stated spec.
- Plan R7: purity test title still says "seven" modules. Accepted by plan.
- Not covered here: StrictMode listener count and deep-freeze purity (unit tests own these).
