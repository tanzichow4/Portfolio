VERDICT: PASS

# T02 QA: pure logic modules

Scope: `src/logic/*` (windows, layout, zorder, dock, drag, terminal, history). No UI change in this ticket.

## 1. App load (dev server, Chromium via project Playwright, 1280x720 and 1920x1080)

- `npm run dev` responds 200 on http://localhost:5173.
- No console errors or warnings, no page errors, no failed or 4xx/5xx requests at either size.
- The page is the empty `<div>` stub (`Desktop.tsx` still holds a TODO). Body text is empty. This is expected until T03, so it counts as "renders the same".
- `npm test` (15 files, 285 tests), `npm run typecheck` and `npm run lint` all pass.

## 2. Logic modules, run in the browser through the dev server's module graph

### Layout against the prototype formulas (rounded, clamped)

| Size      | hello  | about  | exp    | proj    | term     | site    |
| --------- | ------ | ------ | ------ | ------- | -------- | ------- |
| 1440x900  | 86,72  | 720,64 | 72,468 | 605,342 | 970,514  | 550,270 |
| 1920x1080 | 115,72 | 960,64 | 96,562 | 806,410 | 1450,694 | 790,360 |

- All x values and the y values for hello, about, exp, proj and site equal the prototype formulas.
- `term` y is 514 and 694. The prototype gives 520 and 700. The difference is the AC3 cap (`vh - 76 - 310`), as the plan documents. It is expected, not a bug.
- Site matches `vw/2-170`, `vh/2-180`.

### 1280x720 against the menubar and dock bounds

Positions: hello 77,72; about 640,64; exp 64,344; proj 538,300; term 810,334; site 470,180.

- Every dock window has y >= 36 and y + nominal height <= vh - 76.
- Every dock window has x in [16, vw - width - 16].
- The same check passes at 1366x768, 1440x900, 1536x864 and 1920x1080.
- exp y is 344 and term y is 334. The prototype formulas give 380 and 340. These are the intended caps.
- Fractional input (1280.5x720.7) gives integers. 0x0 gives term 16,36.

### Terminal outputs against the prototype

These match the prototype in text and tone: help (2 acc lines), whoami, ls, experience, projects, contact, `open about`, theme, wallpaper, tidy, `sudo hire-tanzi`, other sudo, rm, not-found, and the banner.

- `HELP` gives not-found (case-sensitive).
- `open constructor` and `wallpaper toString` give no effect. The prototype object-lookup pollution is fixed.
- A 10,000-character input is handled and returns 2 lines.
- Whitespace-only input gives only the echo.
- `open   experience.log` normalizes its whitespace and gives the `exp` effect.

Intended deviations from the prototype, all decided in the plan (not bugs):

- `open` with no argument prints a usage line (the prototype printed `(nothing)`).
- `restart` echoes the command (the prototype printed nothing).
- Lines carry `tone` instead of `color`.

### Dock, z-order, drag, history

- At 1440x900 initial order, top-most is `hello`.
- Dock click on `hello` gives `minimize`. On `proj` it gives `focus`. On `site` (closed) it gives `open`.
- With `hello` minimized, top-most becomes `about` and the `hello` click gives `restore`. This matches the prototype `dockClick` and `top()`.
- `clampPosition({-9999, 9999}, 560, 1440, 900)` gives `{-480, 840}`, as in the prototype.
- Tilt is capped at 7. `-0`, NaN and a disabled flag all give 0.
- The history sequence for push a, b, c, input x, then Up x4 and Down x4 gives c, b, a, a, b, c, x, x (AC36).

## 3. Observations (not failures)

- The nominal window heights in `WIN_META` are estimates (plan A3/R5). Re-check AC3 against the real heights when T07 builds the windows.
- The dev server was started with `npm run dev`. I stopped only the listener on port 5173 (PID 14460).

## 4. Failures

None.
