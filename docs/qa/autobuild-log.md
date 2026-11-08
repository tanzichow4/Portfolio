# Autobuild log

## Run 2026-11-08 (branch autobuild/2026-11-08)

Baseline: lint, typecheck, unit tests green (3 tests).
### T01 done
- Shipped: light neutral-400/500 and accent-400 contrast fixes, light section-glow and accent-2 ramp; tests for tokens, contrast, fonts, theme init; Playwright `chromium-preview` project (fresh build on port 4173).
- Results: lint, typecheck, 157 unit tests, build, format:check, 22 e2e all green. QA: PASS (docs/qa/T01-qa.md). No fix rounds.
- Assumptions: A3 light accent-400 set to #6558ad (plain reversal gave ~4.2:1, fails AA); accent-2 ramp reversed in light; contrast check covers solid token pairs only.
- Gaps: A3 is not yet in the Decisions log (only a theme.css comment and plan). `vite.config.ts` test css now `include: [/theme\.css/]`. e2e now runs a build every time. Inline theme script will need CSP hash/nonce at deploy (T12). New tests had no mutation check. QA used bundled Chromium (Chrome not installed for Playwright MCP).

