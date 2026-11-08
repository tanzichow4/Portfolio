# T01 plan: theme tokens, fonts, light-mode contrast, no-flash theme init

Source: `docs/plans/00-requirements.md` (ACs, current state, assumptions A1-A9), `docs/design-decisions.md` (decisions 4 and 11), `design_handoff_tanzi_os/README.md` "Design tokens".

## 1. Goal and scope

**Goal.** Make `src/theme.css` the complete, WCAG AA source of the Nocturne tokens for both themes, with Inter 400/500/600 bundled locally and no external font requests. Make the page paint in the correct theme from the first frame (stored choice, else `prefers-color-scheme`, else `dark` if storage throws).

**Already done, not redone:** `@fontsource/inter` 400/500/600 imports in `src/main.tsx`; no Google Fonts `@import`; inline theme-init script in `index.html` (kept as is, see 3); light `--color-accent: #6558ad`. T01 only fixes the remaining tokens and locks everything in with tests.

**Out of scope** (carried over): theme toggle UI, the `theme` command and writing the theme to storage (T02/T03/T05); reducer reading or syncing `<html data-theme>` (T03); persisting wallpaper and wobble; `prefers-reduced-motion` rules; deploy config, meta/OG, `<noscript>`, font preload links (T12); dark palette changes or any color not listed; light `--color-section-ghost`; mobile; editing `design_handoff_tanzi_os/`.

## 2. Acceptance criteria

AC1-AC16 are copied from `00-requirements.md` with the same numbers and wording. In short:

- **AC1.** Dark tokens match the spec exactly (bg, surface, text, accent, divider, section, neutral 100-900, accent 100-900, shadow-sm/md/lg).
- **AC2.** Light tokens match the spec with decision 11: bg `#e4e7f5`, surface `#f3f5fe`, text `#292b31`, divider `color-mix(in srgb, #292b31 16%, transparent)`, section `#d2cefd`, light shadows as in the spec, accent `#6558ad`. Neutral 100-900 is `#292b31 #3f424d #595d6c #5c6073 #626679 #b2b6ca #cfd3e5 #e4e7f5 #f3f5fe`. Accent 100-900 is `#2b2741 #423a6a #5d5294 #796cbf #968ae0 #b5abfc #d2cefd #e7e5fe #f5f4ff`, except as changed by AC4. Per A3 that makes accent-400 `#6558ad`.
- **AC3.** Light `--color-section-glow` is `#e7e5fe`. The light `--color-accent-2-*` ramp is reversed (`#2b293a #423e5d #5c5783 #7972a9 #9690c9 #b5afe8 #d2cefd #e7e5fe #f5f4ff`), so `.tag-accent-2` shows dark text on a light chip.
- **AC4.** An automated test computes WCAG 2.x ratios from `src/theme.css` and fails below 4.5:1. The text tokens are `--color-text`, `--color-accent`, `--color-neutral-300`, `--color-neutral-400`, `--color-neutral-500` and `--color-accent-400`, each on `--color-surface` and on `--color-bg`, in both themes.
- **AC5.** `--wall-nebula`, `--wall-grid`, `--wall-plain` and the easing tokens match the spec and follow the active theme.
- **AC6.** No request goes to `fonts.googleapis.com`, `fonts.gstatic.com` or any other third-party origin (dev and build + preview).
- **AC7.** After the fonts load, `document.fonts.check('400 15px Inter')`, `'500 15px Inter'` and `'600 15px Inter'` all return true. The computed `font-family` of `body` begins with Inter.
- **AC8.** The build ships Inter files for weights 400, 500 and 600 only, with no 700 and no italic.
- **AC9.** `--font-mono` is `ui-monospace, Menlo, monospace` and no web font is loaded for mono.
- **AC10.** With no stored theme, `data-theme` follows the OS color scheme (light or dark) before any module script runs.
- **AC11.** A stored `dark` or `light` wins over the OS scheme.
- **AC12.** Any other stored value (`"blue"`, `""`) is ignored and the OS scheme decides.
- **AC13.** If reading storage throws, the result is `dark`, the page still loads, and there are no uncaught errors.
- **AC14.** The correct theme is on the first frame: with the JS entry blocked, `data-theme` is correct and the `body` background is `#161826` (dark) or `#e4e7f5` (light).
- **AC15.** `index.html` has no hard-coded `data-theme` on `<html>`, and the script uses only the key `tanzi-os:theme`.
- **AC16.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check` all pass. The smoke test is not weakened.
- **AC17 (added).** The spec uses the tag classes `.tag-accent` and `.tag-neutral` (plus `.tag-accent-2` from AC3) for text. Their pairs (`accent-100` on `accent-800`, `neutral-100` on `neutral-800`, `accent-2-100` on `accent-2-800`) meet 4.5:1 in both themes, checked by the same test as AC4. Reason for adding it: AC4 only covers text on surface or bg, but tags are small text (10-11px) on their own chip color.

Resolved assumption (no human needed): **A3 is adopted.** Light `--color-accent-400` becomes `#6558ad`. My WCAG 2.x figures are about 5.4:1 on surface and 4.8:1 on bg. I checked the other light pairs too: neutral-500 `#626679` is about 5.2:1 and 4.6:1, and the accent `#6558ad` is the same as accent-400. The ramp still gets darker in order (300 `#5d5294` < 400 `#6558ad` < 500 `#968ae0`). The plain-reversal value `#796cbf` is used for small terminal highlights, so the large-text exception does not apply.

## 3. Architecture

- **Approach.** Edit CSS only. Keep the current inline `<head>` script, since it already meets AC10-AC13 and AC15 (A7). Do not refactor it: it must stay synchronous and inline, and moving its logic into a TS module would mean a second copy or a build step. Its logic is tested by pulling the script text out of `index.html` and running it against stubs (pure, no DOM needed).
- **Files changed**
  - `src/theme.css`, in the `[data-theme='light']` block only: neutral-400 `#5c6073`, neutral-500 `#626679`, accent-400 `#6558ad` (with a comment citing decision 11 and A3), add `--color-section-glow: #e7e5fe`, add the reversed `--color-accent-2-100..900`.
  - `playwright.config.ts`: add a second project `chromium-preview` (baseURL `http://localhost:4173`, `testMatch: '**/*.preview.spec.ts'`, same 1280x720 viewport). The existing `chromium` project gets `testIgnore: '**/*.preview.spec.ts'`. `webServer` becomes an array: the existing dev entry unchanged, plus `npm run build && npm run preview -- --port 4173 --strictPort` with `reuseExistingServer: false` (so the build is always fresh) and `timeout: 180_000`. Why: in dev, CSS is injected by `main.tsx`, so blocking the entry also removes the CSS. AC14's background check and AC8 can only be tested on a real build.
- **New test-only helpers** (in `tests/helpers/`, not shipped in `src/` because no app code uses them):
  - `tests/helpers/cssTokens.ts`: `stripComments(css)`, `parseBlock(css, selector)` (merges every `:root { }` block, or the `[data-theme='light']` block, into `Record<string, string>`, with multi-line values whitespace-collapsed), and `resolveTheme(css, 'dark' | 'light')` (root merged with the light overrides).
  - `tests/helpers/contrast.ts`: `hexToRgb`, `relativeLuminance` (WCAG 2.x sRGB formula), `contrastRatio(a, b)`. It accepts `#rrggbb` only and throws on anything else, so a token turning into `color-mix` fails loudly and is not skipped.
- **Reading source files in Vitest.** Use Vite `?raw` imports (`../src/theme.css?raw`, `../index.html?raw`, `../src/main.tsx?raw`). These are typed by `vite/client`, which is already in `tsconfig`, so `@types/node` is not needed. Every test asserts the raw string is non-empty. If Vitest's `css: false` ever blanks `?raw` CSS, add `test.css: { include: [/theme\.css/] }` in `vite.config.ts` and do not change the test.
- **Built fonts (AC8)** are checked in the preview spec by fetching the built stylesheet(s) linked from `index.html` and parsing their `@font-face` blocks. Again, no `fs` or `@types/node` is needed.
- **Data and API changes:** none. **New dependencies:** none.

## 4. Design

- **User flow.** The visitor loads the page and the first paint is already in the right theme. Nothing is interactive in this ticket.
- **States**
  - Loading: the background is painted from the CSS token while the JS entry is still loading (AC14). Before Inter loads, text falls back to `system-ui`.
  - Empty (no stored theme): the OS scheme decides.
  - Error (storage throws, or the stored value is invalid): fall back to `dark` or to the OS scheme respectively, with no console error.
  - Success: the stored theme is applied.
- **Viewport.** Nothing depends on the viewport. All e2e runs use 1280x720 (both Playwright projects). There is no mobile work.
- **Accessibility.** This ticket is the contrast floor for both themes (AC4, AC17). Translucent text mixes (`.text-muted`, `figcaption`, `.card-meta`, menubar bg) are not measured here (A5), and components that adopt them must re-check. Reduced motion: not affected.

## 5. Risk and security

- **Untrusted stored value.** The script only compares it against `'dark'` and `'light'` and never writes the raw value into the DOM. T5 locks this in: a value like `"<img onerror>"` falls back to the OS scheme.
- **Storage or `matchMedia` throwing** is caught and falls back to `dark` (A8). Covered by T5 (stubbed) and T7 (real browser, `Storage.prototype.getItem` overridden to throw).
- **Third-party requests and privacy.** No external origin is allowed (AC6). The e2e tests record every request and fail on any origin other than the app's.
- **Future CSP (T12).** An inline script needs a `script-src` hash or nonce. I note this for T12 and do not change it here.
- **Brittle token tests.** Expected values sit in one table per theme in the test, copied from the spec plus decision 11, and are compared after collapsing whitespace. A failure shows the token name and both values.
- **Preview server port 4173 already in use** makes e2e fail loudly (`--strictPort`). This is accepted and better than testing a stale build.
- **Slower e2e** because the build runs inside Playwright. This is accepted, since it is the only way to test AC8 and AC14 properly.
- **`document.fonts.check` false negatives** on faces that are not loaded yet. The test first calls `document.fonts.load('<w> 15px Inter', 'Tanzi')`, asserts that it returned at least one face, and then calls `check`. This also proves the weight is registered and loads from the app's own origin.

## 6. Gaps check

- Auth: not applicable (static site, no accounts).
- Validation: the stored theme is whitelisted (T5).
- Error handling: storage that throws, an invalid stored value, a CSS `?raw` read that comes back empty, and a non-hex token in the contrast helper all have explicit handling or failing tests.
- Mobile: out of scope (decision 1).
- Accessibility: AC4 and AC17 contrast. The A5 limits are noted.
- Config and env vars: no env vars. The only config changes are in `playwright.config.ts`, plus `vite.config.ts` as a fallback only.
- Tests: Vitest unit tests (helpers, tokens, contrast, fonts, theme init) and Playwright (dev and preview).
- Gap found: tag text pairs, added as AC17.

## 7. Tasks

Each task is one commit and leaves `npm test` green.

- **T1. Contrast and token helpers with their own tests.** Add `tests/helpers/contrast.ts`, `tests/helpers/cssTokens.ts` and `tests/helpers.test.ts`. The tests cover: white on black is 21:1, a color on itself is 1:1, `#6558ad` on `#f3f5fe` is about 5.4 (±0.05), multiple `:root` blocks merge, comments are stripped, light overrides win, and non-hex input throws. (AC4, AC17 infrastructure)
- **T2. Light token fixes plus token tests.** Edit the light block of `src/theme.css` as in section 3. Add `tests/theme-tokens.test.ts`, which:
  - checks every AC1 dark token and every AC2/AC3 light token against the expected tables;
  - checks that the wallpaper and easing tokens equal the spec strings, that `--wall-*` are defined only in `:root` and reference `var(--color-*)` with no literal hex colors (AC5);
  - checks that `--font-mono` is exact (AC9).
    (AC1, AC2, AC3, AC5, AC9)
- **T3. Contrast test.** Add `tests/contrast.test.ts`. It loops over both themes, over the AC4 text tokens on surface and on bg, and over the AC17 tag pairs. It asserts `>= 4.5`, and each case is named like `light: neutral-500 on bg`. (AC4, AC17)
- **T4. Static font checks.** Add `tests/fonts.test.ts`, which checks:
  - `src/main.tsx` imports exactly `@fontsource/inter/400.css`, `500.css` and `600.css` (no other weight and no italic);
  - `src/theme.css` has no `@import`, no `@font-face` and no `googleapis`/`gstatic`;
  - `index.html` has no font `<link>` and no `googleapis`/`gstatic`;
  - `--font-body` and `--font-heading` start with `'Inter'`.
    (AC6, AC7, AC8, AC9 static guard)
- **T5. Theme-init logic test.** Add `tests/theme-init.test.ts`. It extracts the non-module `<script>` from `index.html?raw` and runs it with `new Function('localStorage', 'matchMedia', 'document', src)` against stubs. Cases:
  - no stored value with OS light or OS dark;
  - stored `dark` or `light` with the opposite OS scheme;
  - stored `blue`, `''`, or a markup string;
  - `getItem` throws, or `matchMedia` throws, which gives `dark` with no exception escaping.
    It also asserts that `<html>` in `index.html` has no `data-theme` attribute, that the only storage key used is `tanzi-os:theme`, and that the script runs before the module script tag. (AC10, AC11, AC12, AC13, AC15)
- **T6. Playwright preview project.** Update `playwright.config.ts` as in section 3. This commit adds no new spec, and the existing smoke test runs unchanged in the `chromium` project. (AC14, AC8 infrastructure, AC16)
- **T7. Dev e2e specs.**
  - `tests/e2e/theme-init.spec.ts`:
    - uses `page.emulateMedia({ colorScheme })` and `addInitScript` to seed storage, covering AC10, AC11 and AC12;
    - for AC13, overrides `Storage.prototype.getItem` to throw and asserts `dark` with no `pageerror` and no console errors;
    - in light mode, checks that `getComputedStyle(html).getPropertyValue('--color-neutral-500')` is `#626679` and `--color-accent-400` is `#6558ad` (AC2, AC4 runtime spot check);
    - for AC5, a probe element with `background: var(--wall-plain)` changes color when `data-theme` is switched.
  - `tests/e2e/fonts.spec.ts`:
    - records all requests and asserts they share the page's origin (AC6, dev);
    - `document.fonts.load` then `check` for 400, 500 and 600 (AC7);
    - `body` `font-family` matches `/^"?Inter"?/` (AC7);
    - every entry in `document.fonts` has family Inter (AC9).
      (AC2, AC5, AC6, AC7, AC9, AC10, AC11, AC12, AC13)
- **T8. Preview e2e spec.** Add `tests/e2e/build.preview.spec.ts`:
  - for dark and light (via `emulateMedia`), abort `**/assets/*.js` and assert `data-theme` and that the `body` background is `rgb(22, 24, 38)` or `rgb(228, 231, 245)` (AC14);
  - without blocking, all requests are same-origin (AC6, build);
  - fetch every built stylesheet and parse its `@font-face` blocks. Every block must have family Inter, `font-weight` in {400, 500, 600} and `font-style: normal`, all three weights must be present, and every `url()` must be under `/assets/` (AC8).
    (AC6, AC8, AC14)
- **T9. Full verification.** Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check`. Fix only what breaks (never weaken tests), and confirm `tests/e2e/smoke.spec.ts` is unchanged. (AC16)

## 8. Open questions

None blocking. Resolved with the simplest option:

1. A3 is adopted: light `--color-accent-400` is `#6558ad`. It is recorded in a `theme.css` comment. The human may want to add it to the Decisions log in `docs/design-decisions.md` later, since this plan only edits `docs/plans/`.
2. The theme-init script stays inline and unchanged (A7). It is tested by extracting it rather than refactoring it.
3. AC8 and AC14 are verified against a real build through a second Playwright project on port 4173, not by adding `@types/node` to read `dist/` directly.
