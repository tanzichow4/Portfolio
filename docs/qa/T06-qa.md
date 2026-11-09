# T06 QA report: Dock (branch autobuild/2026-11-08)

Method: real Chromium (bundled Playwright, scripted runs; the Playwright MCP browser was not used) at 1280x720 and 1920x1080, dark and light, against the dev server on :5173. Screenshots were inspected (scratchpad). No source or tests edited.

## Gates (AC34)

- lint, typecheck, build, format:check: pass.
- npm test: 840 passed.
- npm run test:e2e: 120 passed (dev and preview projects).
- Console during my runs (4 viewport/theme combos plus keyboard, reduced-motion runs): 0 errors/warnings. Network: no failed or 4xx/5xx requests.

## Visual checks (AC33), both themes and both sizes

- Dock centred (offset 0px), 14px from bottom, top edge at vh-76 at both sizes. Pill, five buttons, divider, three links read cleanly in dark and light.
- Dots: visible under each window button. Open is full opacity; minimized visibly dim; closed absent.
- Divider: thin, correctly placed, vertically aligned.
- Hover lift (window button and tilted link): not clipped by the dock or viewport in either theme.
- Keyboard focus ring on dock button: visible, not clipped.
- Fly-out (close then dock click): starts at scale(0.06) at the dock centre (e.g. translate(283px, 608px) at 1280, 565,968 at 1920), fades in via opacity 0 -> 0.49 -> 0.75 -> 1, ends at transform none. Mid-flight screenshots show the window growing out of the dock.
- Minimize flight and restore flight: screenshots show the window shrinking toward and growing from the dock, in both themes. Restored window returns to transform none, opacity 1, same position.
- Window dragged under the dock: it stays behind the dock; all dock controls remain visible and clickable (elementFromPoint at a dock button returns the dock item). Dragging the dock background moved no window and changed no z-order.

## Acceptance criteria

Passed (browser-verified unless noted): AC1, AC2, AC3 (tab/DOM order, no "About this site"), AC4-AC8 (appearance; both themes), AC9 (all four outcomes: closed->open front, minimized->restore front, behind->front with identical bounding box, front->minimize), AC10 (one transition per click observed), AC11 (9 rapid clicks left data-min=true, opacity 0, aria-pressed=false, description "Minimized": consistent), AC12 (position kept), AC13, AC14 (open Windows menu closes on dock click and action still happens), AC16 (GitHub opens new tab with noopener noreferrer; Email `mailto:hello@tanzi.dev` with no target; menus unaffected), AC17, AC18 (pointer at the bottom edge of the at-rest box: stable hover transform matrix(1.15,0,0,1.15,0,-10) across 10 samples; click there activates), AC19 (reduced motion: hover transform none; dock open gives no genie/fly-out transform), AC20-AC24, AC25 (tab order: menubar, then Minimize/Close buttons per window, then the 5 dock buttons, then 3 links; Enter and Space both toggled), AC26 (focus stayed on the dock button after minimize, restore, and closed->open by keyboard), AC27 (ring visible; minimized windows left the tab order), AC32 (target inside the dock at both sizes, observed), AC34.
Passed by automated suites (not re-derived by me): AC15 menu/sync coverage beyond what I exercised, AC28, AC29, AC30, AC31 (all present and green in vitest/e2e).

AC24 grep of src/ outside data.ts for URLs, mailto, "Dock", "Open", "Minimized", "Closed": only hit is `src/logic/menu.ts:146` building `'mailto:' + EMAIL` from the data.ts constant. That is T05 menubar code, not dock copy, and uses data.ts. No dock copy hard-coded. Pass.

## Failures

None.

## Observations (non-blocking)

- Refresh mid-flow resets the windows to the default layout (state not persisted); consistent with earlier tickets, dots and aria-pressed matched on reload.
- A window dragged under the dock is partly covered and can only be recovered by Tidy up, as accepted in the requirements.
- The 12px-rounded hit box corners were not noticeable in use (accepted).
- I did not test each Windows menu item individually against the dots; relied on the existing green suites for that.

RESULT: PASS
