# QA report: T07 window contents

Branch autobuild/2026-11-08. Viewports 1280x720 and 1920x1080, dark and light. Mobile not tested (out of scope).

Method: the Playwright MCP browser was not used. I drove the bundled Chromium with scripted Playwright runs (scripts in the session scratchpad, not committed). Screenshots of every window in both themes were taken and inspected (scratchpad `s/`). The dev server was started by me and stopped afterwards.

Console and network: no console errors or warnings, no page errors, no failed or 4xx requests in any run (default load, terminal command barrage, tab/verb/menu flows, reload) at either size.

## Result summary

No functional failures found against the 54 ACs that I could exercise in a browser. One honest usability note (default layout overlaps) that matches the prototype's formula, and a few minor observations. Unit-level ACs (AC2, AC4, AC5, AC12, AC49, AC52, AC53) were not re-run by me, see "Not verified".

## Default layout at 1280x720 (requested judgement)

Measured rectangles (x, y, w, h, bottom): hello 77,72,560,420,492; about 640,64,420,331,395; exp 64,354,520,290,644; proj 538,259,520,385,644; term 810,340,440,270,610. Dock top is 644.

At pointer-hit level (elementFromPoint on each control centre):

- hello: all five controls reachable.
- about: both buttons reachable.
- experience: Minimize, Close and the Northwind and Brightline tabs are covered by hello. Only the University Lab tab is clickable. The titlebar is hidden, so the window cannot be dragged by its title until raised.
- projects: Minimize, Close and the Pathfinder and Pantry tiles are covered by about, dotfiles is covered by the terminal. Only tinyq is directly clickable.
- terminal: titlebar buttons and input reachable.

Reaching covered windows works through the dock, the Windows menu, "See what I've built", or by clicking any visible sliver (click raises). Keyboard Tab reaches everything regardless of overlap. At 1920x1080 nothing important overlaps (exp y=562, proj y=410, term y=700, all bottoms above dock top 1004).

Comparison with `Tanzi OS.dc.html` `layout()`: the formulas are the same (hello 0.06vw/72, about 0.5vw/64, exp max(380,0.52vh), proj max(300,0.38vh), term max(330,vh-380)). In the prototype at 1280x720 exp would be y=380 and hello (y=72, about 420 tall, bottom ~492) would cover exp's titlebar and tabs just as here. The build adds `yFit` (clamp above the dock), which moves exp up to 354 (26px more overlap than the prototype) so its bottom sits exactly on the dock top edge (644 = dock top, AC48 says "above"; touching, not overlapping). Verdict: the overlap is inherent to the prototype's formula at the minimum size and is not a T07 defect; AC48 requires the formulas unchanged. It is a design limitation worth a product decision later (severity: minor/design). Screenshot: `scratchpad/s/full-1280-dark.png` and `full-1280-light.png`.

## Visual comparison against README / prototype (AC51)

All six windows in dark and light at 1280 compared with the prototype markup and README (screenshots `hello-*.png`, `about-*.png`, `exp-*.png`, `proj-*.png`, `term-*.png`, `site-*.png`, dark and light). Matches: greeting row with waving hand, 58px two-line name "Tanzi / Chowdhury.", "I build stuff." with accent underline, hint with cursor icon, two buttons; about with emphasised phrases and fact pills; experience rail plus detail with tags; projects 2x2 tiles with icon, arrow, tags; terminal banner and prompt; About this site with TC mark. No text overflow, no blank band below content (every window's rendered height equals its `WIN_META` height: 420, 331, 290, 385, 270, 282, and body scrollHeight equals clientHeight, in both viewports and both themes). Verb loop: longest verbs ("refactor") stay on one line, hello height stays 420 across all 7 verbs. Experience height stays 290 on all three tabs.

Visual notes (not failures): in light mode `tag-neutral` chips on project tiles lose their chip shape (known and accepted, assumption 16). The terminal input focus ring is a full-width box (accepted, assumption 9). Focus rings on verb, buttons, tab, tile and terminal input are fully visible, not clipped.

## Passed criteria

- AC1: every window renders its body.
- AC3: close then reopen resets terminal (banner only, empty input, empty history via Up), verb (build) and tab (Northwind). Minimize/Restore, Minimize all/Show all and Tidy up keep verb, tab and typed unsent terminal text.
- AC6: pointer drag from the body of hello, about, exp, proj, term does not move the window.
- AC7: both themes render correctly (visual).
- AC8: under reduced motion, letters, hand, verb (hover and pressed), hello buttons, pills, tabs, tiles have `transform: none` on hover and press; shadow/colour changes remain.
- AC9: hover resting at the bottom edge of letters, both hello buttons, verb, pills, tabs (bottom and right edge) and tiles (bottom and top-left) stayed hovered for 1.5s with no flicker.
- AC10 and AC11: Tab order exactly matches AC11 for hello, about, exp (selected tab then panel), proj (four tiles), terminal (Minimize, Close, input). Focus rings visible.
- AC13 to AC21: hello visuals and behaviour. Hover poses measured: letter translateY(-12px) rotate(-6deg) plus accent colour, hand rotates about -28deg on hover, verb rotate(-4deg) scale(1.06) and scale(.92) pressed, buttons translate(-3px,-3px) with 3px 3px 0 shadow, springy timing. Verb cycles in order and wraps, works with Enter and Space. "See what I've built" opens a closed projects window, restores a minimized one and raises it, hello stays open. "Say hi" is `mailto:hello@tanzi.dev`, no target.
- AC22: dragging selects text in about and the selection persists after release (an initial attempt failed only because the drag started inside an existing selection, which is normal browser drag-and-drop). Hello is not selectable.
- AC23 to AC26: visuals and hover poses (pill rotate -4deg translateY(-3px)). About this site content in the specified order.
- AC27 to AC30: tablist vertical with name "Experience", tabs in order, only selected tab has tabindex 0, panel labelled by tab with tabindex 0. ArrowUp/Down wrap, Home/End work and focus follows. Tab hover translateX(4px). Panel text selectable by drag. Window height unchanged on tab switch.
- AC31 to AC34: tiles, hover pose (translateY(-5px) rotate(-1.5deg)), titlebar reads `~/projects`, accessible labels stay `projects`.
- AC35 to AC38: terminal body 230px, scrolls, banner and empty input, labelled input ("Terminal command") and log ("Terminal output") exist, input outside the log, `<b>x</b>` renders literally (0 `<b>` elements), a 120-char word wraps with no horizontal scroll (scrollWidth equals clientWidth).
- AC39 and AC40: help, whoami, ls, experience, projects, contact, open (none/bad/valid), theme and wallpaper (bad and valid, theme persists to localStorage `tanzi-os:theme`, wallpaper to `tanzi-os:wallpaper`), tidy, restart (runs layout reset), sudo hire-tanzi, sudo x, rm, unknown, uppercase `HELP` (not found, as per existing runCommand), whitespace trimmed, empty Enter prints just the prompt line, clear removes everything including the banner and keeps history.
- AC41: focus remains in the input after commands.
- AC42: output scrolls to bottom (scrollTop equals scrollHeight minus 230) and the input row stays visible, keyboard only.
- AC43: Up/Down walk history, Down past newest restores the draft, caret at end, Tab leaves the input to the next focusable element.
- AC44: a click in the body focuses the input, a drag-select of output keeps the selection and focus stays on BODY.
- AC45: Help > Terminal commands from closed gives banner, echoed help and output, from open appends and keeps unsent input, from minimized restores and appends, two activations give two runs, and the run is not in Up history.
- AC46: terminal does not take focus on load or when opened from the dock.
- AC47: all heights match meta exactly at 1280 and 1920, no blank band.
- AC48: formulas unchanged, all default windows end at or above dock top at both sizes (exp at 1280 touches it exactly).
- AC50, AC51: covered by this walk (AC51 recorded above).

## Failures

None at ticket level.

Observations (low severity, not ACs):

1. Clicking bare desktop did not clear an existing text selection in about (selection string remained after a click at the desktop). Possibly intentional (desktop is user-select none); minor.
2. Terminal command `open about` replies "opening about…" even for an already-open window, existing logic; fine.
3. At 1280x720 default layout, covered titlebars of experience and projects (see above). Design limitation, same as prototype.

## Not verified by me

AC2 (copy only from data.ts), AC4, AC5 (no Desktop re-render on typing), AC12 (contrast unit tests), AC49, AC52 and AC53 (lint, typecheck, unit and e2e suites). Not re-run in this pass; they are the test suite's job. Out of scope per the ticket: Restart reset (after `restart` the layout reset happened, state not asserted), BootScreen, T09 a11y, T10 content.

RESULT: PASS
