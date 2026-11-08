# T04 QA report: Window chrome

VERDICT: PASS

Scope: docs/plans/T04-plan.md section 2 (AC1-AC29), docs/plans/T04-requirements.md. Driven in the project's bundled Playwright Chromium (scratch script, scratchpad qa.cjs, screenshots reviewed) against `npm run dev` at 1280x720 and 1920x1080. Also ran `npx vitest run`: 21 files, 451 tests pass. Playwright e2e, lint, build were not re-run.

## Passed (browser, both sizes unless noted)

- Five windows with titlebar, accent icon (aria-hidden), title, labelled buttons "Minimize <title>" / "Close <title>", 24x24. Titlebar padding 8px 8px 8px 16px, 12px, cursor grab, touch-action none, radius 14px. At-rest transform none; positions equal T03 (hello 77,72 at 1280; 115,72 at 1920). (AC1-AC8)
- Large shadow on the front window only; clicking a back window (projects) raises it and moves the shadow. (AC3, AC9)
- Drag by titlebar: window follows, rotate(+7deg / -7deg) scale(1.015) with direction, springs to `none` on release; moved by the net delta; other windows unchanged; selection empty during and after. (AC11, AC14-AC16)
- Clamp: top-left drag stops at x=-480 (80px visible), y=36; bottom-right at x=vw-80, y=vh-60. (AC11)
- Right-button drag does nothing. Refresh mid-drag restores initial layout, no errors.
- Tab order: Minimize/Close of each window in DOM order (10 buttons) then body; focus raises the window (terminal got z 14 and shadow); visible 2px focus ring, not clipped (screenshot focus-1280.png). Space on Minimize and Enter on Close work. (AC10, AC23)
- Minimize: transform translate(-390px, 346px) scale(0.06) at 1280 (translate(-710px,346px) at 1920), opacity 0, data-min true, inert, 0 region/buttons in the accessibility tree, skipped by Tab. Double-click titlebar minimizes, no text selection. Close removes the window. (AC17-AC19, AC21)
- prefers-reduced-motion: reduce: drag transform `none`; minimize transform `none` with opacity 0. (AC22)
- Themes: dark title text rgb(178,182,202) on rgb(22,24,38); light rgb(92,96,115) on rgb(228,231,245) (roughly 5.5:1); both legible in screenshots, no clipping or overlap glitches. (AC24)
- Console warnings/errors: none. Failed network requests: none.
- Restore/open: no UI exists yet (T05/T06), so not drivable in the browser. Covered by tests/WindowLayer.test.tsx (reducer harness), which pass; fly-out on open was not visually checked.

## Failures

None.

## Observations (not defects)

- Tilt saturates at +/-7deg for any fast move (20px steps), so tilt magnitude is not graduated in practice. Matches clamp spec.
- Window bodies are empty placeholders (T07). Menubar and dock absent (T05/T06).
- vite.config.ts changed (`css.include` adds /Window\.css/) so the CSS is processed in tests. Harmless, not listed in the plan's files.

## Test diff review (git diff HEAD~2 -- tests)

- Only existing-test edits: the `within` import added, the T03 "AC22 no buttons" test replaced, and `'motion'` added to purity `EXPECTED`. No test deleted or skipped; nothing else weakened.
- Replacement is at least as strict for the new requirement: exactly 10 buttons, each region by name, `.win-title` text, exact button names in order, type=button, data-min false, visible, not inert. One mild loosening: the old test asserted the whole element text equals the title; the new one checks only `.win-title`, which is necessary because the old assertion would be impossible with labelled buttons (aria-label, so textContent would still equal the title; body is empty). The old "equals title" check could have been kept. Low risk.
- Purity `EXPECTED` change is sanctioned and correct.
