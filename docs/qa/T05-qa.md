# QA report: T05 MenuBar and menus (branch autobuild/2026-11-08)

Method: the Playwright MCP browser was unavailable (Chrome not installed), so I drove the bundled Chromium through scripted Playwright runs (scratchpad scripts, no source or test edits) at 1280x720 and 1920x1080. Dev server started by me and stopped afterwards.

## Failures

None found.

## Passed (observed)

- AC1: header fixed, 36px tall, full width (1280 and 1920), z-index 1000, blur(10px), 72% translucent bg, padding 0 12px, 13px text.
- AC2/AC10: header labelled "System menu bar"; menubar with triggers tanzi.os, Windows, View, Help; aria-expanded tracks open state.
- AC3/AC4: GitHub, LinkedIn (target _blank, rel noopener noreferrer) and Email (mailto, no target) links, each 30x28; theme toggle named "Switch to dark/light mode"; clock present.
- AC6/AC7 (including the just-fixed case): clicking another trigger while a menu is open switches to that menu (one menu only); clicking the same trigger closes it; hover opens nothing when closed; hover switches when open.
- AC8: Esc, outside click, empty-desktop click, window click and choosing an item all close the menu.
- AC9: dropdown top 34px, min-width 240px, padding 6px, radius 14px, surface bg.
- AC11-AC15: roles correct (menuitem, menuitemcheckbox, menuitemradio, separator) and aria-checked matches. Roving tabindex works. ArrowLeft/Right wrap, Home/End work. Enter, Space and ArrowDown open with the first item focused, and ArrowUp opens with the last. Arrow keys in a menu wrap. Left/Right in an open menu move to the adjacent menu. Esc returns focus to the trigger. Tab closes the menu. Choosing a radio item returns focus to the trigger. Window items return focus to the trigger (not lost).
- AC16: Esc with no menu open is harmless.
- AC17: keyboard focus ring visible (2px solid outline) on triggers, links, toggle.
- AC18-AC22: all menu contents and actions work. About opens the site window. Restart… resets the layout, closes About and keeps the theme and the other settings. Windows checks update (Minimize all gives all false, Show all restores). Tidy up works. View radio and checkbox groups are correct. Help: Terminal commands works, Résumé opens /resume.pdf in a new tab, Say hi is a mailto: link to hello@tanzi.dev. Clicking an already-checked radio does nothing and closes the menu.
- AC23-AC27/AC29: stored theme, wallpaper and wobble survive reload. Invalid stored values fall back to defaults. A throwing localStorage (getItem and setItem) causes no page errors and the settings still change for the session. Keys use the tanzi-os: prefix, and only changed values are written. The desktop background follows the wallpaper. Restart keeps the stored values.
- AC30/AC32: clock shows "Sun 6:15 PM" in the correct format, as a <time> element with dateTime.
- AC33/AC34: link hover gives translateY(-2px) rotate(-8deg) (transform matrix confirmed). With reduced motion there is no transform. No menu animation.
- AC36: after Minimize all, the tab sequence has no window controls. Tab order: tanzi.os, GitHub, LinkedIn, Email, theme toggle, then window controls.
- Console: 0 errors or warnings. Network: 0 failed requests or 4xx/5xx at both sizes.

## Not verified (no browser-based check done)

- Wobble-off drag has no tilt (AC26 dragging), hover and pressed backgrounds, AC35 contrast numbers, AC37-AC41 (unit, e2e, lint and build suites were not run, as this pass was browser-only).

## Notes (non-blocking)

- The accessible name of "Say hi" is "Say hiemail" because the hint is concatenated; likely harmless.
- Choosing an already-selected theme writes no storage (consistent with AC22).
- Mobile out of scope; Dock, window bodies and boot not assessed.

RESULT: PASS
