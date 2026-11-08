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
