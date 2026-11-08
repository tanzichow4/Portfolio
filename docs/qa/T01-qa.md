# T01 QA report

VERDICT: PASS

Method: dev server (`npm run dev`) at 1280x720. The MCP Playwright browser could not start (Chrome not installed), so I drove the project's bundled Chromium with a scratch script. Also ran `npx vitest run` (157 passed) and the `chromium-preview` Playwright project (4 passed, real build). Mobile is out of scope.

## Passed

- AC2/AC4 light tokens (computed in browser): neutral-400 `#5c6073`, neutral-500 `#626679`, accent and accent-400 `#6558ad`; body text `rgb(41,43,49)`. Contrast is covered by `tests/contrast.test.ts` (passes).
- AC3: light section-glow `#e7e5fe`, accent-2-100 `#2b293a` (reversed ramp). Dark values unchanged.
- AC1/AC9: dark tokens correct; `--font-mono` is `ui-monospace, Menlo, monospace`.
- AC6/AC7: only `http://localhost:5173` origin requested, no failed requests. `document.fonts.load` returned a face and `check` was true for 400, 500 and 600. Body font-family is `Inter, system-ui, sans-serif`. Only Inter 400/500/600 normal faces are registered.
- AC8 (build): built CSS has only Inter 400/500/600 normal, urls under /assets/ (preview spec).
- AC10: no stored value, so OS dark gives dark (bg `rgb(22,24,38)`) and OS light gives light (bg `rgb(228,231,245)`).
- AC11: stored light beats OS dark, and stored dark beats OS light.
- AC12: `blue`, empty string and `<img onerror>` are ignored, so the OS scheme decides, in both directions.
- AC13: with `Storage.prototype.getItem` throwing, theme is dark and there are no page errors or console errors.
- AC14: with the entry blocked, dev `data-theme` is correct. The build preview checks body background for both themes (pass).
- No flash: a MutationObserver on `data-theme` saw zero changes after load, so the attribute is set before any module runs and never flips.
- Console: no errors or warnings during any run.

## Failures

None.

## Notes

- Not checked: keyboard navigation, back/refresh mid-flow and empty states. T01 has no interactive UI.
- `npm run test:e2e` (dev project) was not re-run by me. The equivalent checks were done by hand above.
