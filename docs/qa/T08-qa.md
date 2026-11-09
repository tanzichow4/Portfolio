# QA report: T08 BootScreen and Restart

Branch `autobuild/2026-11-08`. The qa-tester agent returned this report as text because its file write was rejected; the orchestrator saved it here, condensed.

**Method.** Bundled Chromium (headless) driven by scripted Playwright runs, not the Playwright MCP browser, at 1280x720 and 1920x1080 in dark and light. `Math.random` pinned to 0 (1350ms boot) where timing mattered. Mobile not tested (out of scope). Source and tests were not edited.

## Failures

None found.

## Visual comparison with the prototype (AC31)

Computed styles match the README Boot screen section and the prototype in both themes and both viewports: full-viewport overlay on `--color-bg`, 64x64 accent "TC" mark, 200x3 track with an accent fill on `width 0.12s linear`, gap 22px, no other text, no fade.

Intended differences: the overlay is `position: fixed` (the prototype used absolute) and adds dialog and progressbar semantics.

Known and accepted: in light mode the track colour equals the background, so only the fill shows.

## Walked in the browser (all passed)

- **AC1:** no boot screen on first load or on reload during a boot; `localStorage` stays `{}` through boots.
- **AC2:** the boot appears within 150ms from both the menu and the terminal.
- **AC3:** under reduced motion no `.boot` node ever appears and the reset is immediate.
- **AC4:** no boot from any other action seen; not every menu item and command was walked.
- **AC5:** `elementFromPoint` at corners, menubar and dock returns the boot screen in both themes and viewports, and the overlay follows a mid-boot resize.
- **AC6-AC8:** match the values above.
- **AC9:** progress rises monotonically; a second boot starts at 0; about 1350ms with `r` at 0.
- **AC10:** at the moment the dialog is removed there are no inert elements, windows are at defaults and focus is on tanzi.os.
- **AC12-AC14:** one boot and one reset per Restart; a mid-boot resize does not restart or lengthen it.
- **AC15:** positions and z-indexes equal a fresh load; five dock windows open, About this site closed; the latest viewport is used after a mid-boot resize.
- **AC16:** a dirtied verb, experience tab, terminal, moved, minimized and closed windows all reset, on both paths. Up/Down history was not checked in the browser.
- **AC17:** theme, wallpaper and wobble survive from both entry points; `localStorage` unchanged; a drag still tilts with wobble on. The throwing `setItem` case is unit-test only.
- **AC18:** no fly-in in the commit that removes the dialog or after a reduced-motion reset; a window opened later flies in.
- **AC19:** a drag held through the boot, released during or after it, leaves the default position.
- **AC20:** the terminal runs `help` afterwards and repeated Restart works; Tidy up and Close were not re-walked in depth.
- **AC21:** the root is inert during the boot and the dialog and live region are outside it; nothing is inert afterwards.
- **AC22:** focus on the named modal dialog, outline `none` after mouse and keyboard entry.
- **AC23:** progressbar present with an integer value; mark hidden from assistive technology. Min and max were not re-read in the browser.
- **AC24:** keys and clicks during the boot do not end it, focus stays on the dialog, no text is selected.
- **AC25:** focus lands on tanzi.os on all four paths, z-order is default, Tab follows a fresh-load sequence.
- **AC26:** the status region is empty at load, emptied at the reset, and reads "tanzi.os restarted" after about 100ms.
- **AC28:** text matches `data.ts`.
- **Console and network:** no errors, warnings, failed requests or 4xx/5xx in any run, including reload, back navigation and resize.

## Not verified by QA

AC11, AC12 (interval counting), AC14 (render counts), AC27 (contrast), AC29, AC30, AC32 and AC33 were not run by QA and rely on the unit and e2e suites, which the pipeline ran separately.

## Notes

At 1280x720 the default layout overlaps windows, the T07 layout issue already logged.

RESULT: PASS
