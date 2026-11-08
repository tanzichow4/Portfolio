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
