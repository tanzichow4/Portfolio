# T01 requirements: theme tokens, fonts, light-mode contrast, no-flash theme init

## Goal

Make `src/theme.css` the complete, AA-compliant source of the Nocturne tokens for both dark and light themes, with Inter bundled locally (400/500/600) and no external font requests. Make sure the page paints in the correct theme from the first frame: the stored choice if there is one, otherwise `prefers-color-scheme` (decision 4).

## Current state (observed, so the planner does not redo finished work)

- `src/main.tsx` already imports `@fontsource/inter` 400/500/600, and `@fontsource/inter` is in `package.json`. `src/theme.css` has no Google Fonts `@import` (the spec's README line 155 describes the prototype only).
- `index.html` already has an inline `<head>` script that reads `tanzi-os:theme`, falls back to `prefers-color-scheme`, and falls back to `dark` if storage throws. It has no tests yet.
- In `[data-theme='light']`, `--color-accent` is already `#6558ad`. However, `--color-neutral-400` is still `#75798c` and `--color-neutral-500` is still `#9397ab`. Decision 11 requires `#5c6073` and `#626679`.
- The light override for `--color-section-glow` (prototype `#e7e5fe`) is missing, and so are light overrides for the `--color-accent-2-*` ramp.
- No test covers tokens, contrast, fonts or theme init. `tests/e2e/smoke.spec.ts` only checks that `data-theme` is `dark` or `light`.

## Acceptance criteria

### Tokens

- **AC1.** With `<html data-theme="dark">` (or no light override), the computed values of every dark token in the spec (README "Design tokens", Dark) match the spec exactly: bg, surface, text, accent, divider, section, neutral 100-900, accent 100-900, shadow-sm/md/lg.
- **AC2.** With `<html data-theme="light">`, the computed values match the spec's light overrides, with decision 11 applied:
  - bg `#e4e7f5`, surface `#f3f5fe`, text `#292b31`, divider `color-mix(in srgb, #292b31 16%, transparent)`, section `#d2cefd`, and light shadow-sm/md/lg as in the spec.
  - `--color-accent` is `#6558ad` (not the spec's `#796cbf`).
  - The neutral ramp is reversed (100 to 900 becomes `#292b31 #3f424d #595d6c #5c6073 #626679 #b2b6ca #cfd3e5 #e4e7f5 #f3f5fe`). This means 400 is `#5c6073` and 500 is `#626679` per decision 11.
  - The accent ramp is reversed (100 to 900 becomes `#2b2741 #423a6a #5d5294 #796cbf #968ae0 #b5abfc #d2cefd #e7e5fe #f5f4ff`), except as changed by AC4.
- **AC3.** In light mode, `--color-section-glow` is `#e7e5fe` and the `--color-accent-2-*` ramp is reversed (100 to 900 in reverse order), so `.tag-accent-2` renders dark text on a light chip.
- **AC4.** Every text and background pair that the spec uses for text meets WCAG AA (at least 4.5:1) in both themes. An automated test computes these ratios from the token values in `src/theme.css` and fails if any pair drops below the threshold. The pairs are:
  - `--color-text`, `--color-accent`, `--color-neutral-300`, `--color-neutral-400`, `--color-neutral-500` and `--color-accent-400`
  - each on `--color-surface` and on `--color-bg`.

  (Background: light `--color-accent-400` with the plain reversal is `#796cbf`, about 4.2:1. The terminal uses it for highlights and `a:hover` uses it. See Assumption A3.)

- **AC5.** Wallpaper tokens `--wall-nebula`, `--wall-grid` and `--wall-plain`, and the easing tokens, stay as in the spec. They resolve against the active theme, so switching `data-theme` changes the wallpaper colors with no other change.

### Fonts

- **AC6.** When the app loads (dev and `npm run build` + preview), the browser makes no network request to `fonts.googleapis.com`, `fonts.gstatic.com` or any other third-party origin.
- **AC7.** After load, `document.fonts.check('400 15px Inter')`, `'500 15px Inter'` and `'600 15px Inter'` all return true. The computed `font-family` of `body` begins with `Inter`.
- **AC8.** The built `dist/assets` contains Inter font files for weights 400, 500 and 600 only. No 700 weight and no italic files are included.
- **AC9.** The `--font-mono` token is `ui-monospace, Menlo, monospace`, and no web font is loaded for mono.

### No-flash theme init

- **AC10.** With no `tanzi-os:theme` in localStorage and an OS color scheme of light, `<html>` has `data-theme="light"` before any module script runs. With an OS color scheme of dark, it has `data-theme="dark"`.
- **AC11.** With `tanzi-os:theme` = `dark` or `light`, `<html data-theme>` equals the stored value, whatever the OS color scheme.
- **AC12.** With `tanzi-os:theme` set to anything else (for example `"blue"` or empty), the stored value is ignored and the OS color scheme decides.
- **AC13.** If reading localStorage throws, `data-theme` is `dark`, the page still loads, and there are no uncaught errors in the console.
- **AC14.** The correct theme is painted on the very first frame. A Playwright test that blocks `/src/main.tsx` (or the built entry chunk) still finds the expected `data-theme`, and the computed `body` background equals that theme's `--color-bg` (`#161826` dark, `#e4e7f5` light).
- **AC15.** `index.html` does not hard-code a `data-theme` attribute on `<html>`, and the init script uses only the key `tanzi-os:theme`.

### Hygiene

- **AC16.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm run format:check` all pass. The existing smoke test is not weakened.

## Out of scope

- The theme toggle UI, the `theme` terminal command, and writing the theme to localStorage. These belong to the reducer, menubar and terminal tickets (T03/T05/T02+).
- Making `Desktop` reducer state read its initial theme from `<html data-theme>`, and keeping the two in sync. That happens when the reducer is built (T03). T01 only guarantees the attribute is correct at load.
- Persisting the wallpaper and wobble settings (decision 4). The tickets that add those controls will cover it.
- The `prefers-reduced-motion` rules (section D, accessibility and Window tickets).
- Self-hosting or deploy config, meta/OG tags and `<noscript>` (T12). This includes any font preload `<link>` tags.
- Changing the dark-theme palette, or any color not listed above. Light `--color-section-ghost` is left as is because it is unused and has no spec value.
- Mobile layout.
- Editing `design_handoff_tanzi_os/`.

## Assumptions

- **A1.** Decision 11 is applied on top of the spec's ramp reversal. Light neutral-400 and neutral-500 take the decided values, and every other reversed step stays as the spec says. Light neutral-400 (`#5c6073`) is now very close to neutral-300 (`#595d6c`). That is accepted as decided and not re-litigated.
- **A2.** The ticket's "remove the Google Fonts @import" is already done (no `@import` exists). T01 locks that in with AC6 and AC8 instead of making a code change.
- **A3.** Light `--color-accent-400` (`#796cbf` after reversal) fails AA for the terminal's 12-13px highlight lines and for link hover text. Decision 11 does not mention accent-400. CLAUDE.md requires AA for text in both themes, and decision 11 says to re-check contrast. The simplest fix that fits is to darken light `--color-accent-400` to `#6558ad`, the already-decided light accent, so it reaches at least 4.5:1 on both surface and bg. No new color is introduced. If the planner finds that accent-400 is only used for large text (for example the 42px hello letters), the 3:1 large-text rule applies to that use only, but the terminal use still needs 4.5:1.
- **A4.** Light accent-2 ramp: reversing it, as the spec does for the other ramps, is the simplest consistent choice. The ramp is unused today, so this is low risk.
- **A5.** The AA check (AC4) covers solid token pairs only. Translucent mixes are not measured in this ticket: the menubar bg mix, `.text-muted` and the 55% `color-mix` text in `figcaption` and `.card-meta`. These classes are not in the spec's "Nocturne classes used" list. Components that adopt them later must re-check contrast.
- **A6.** For fonts, `@fontsource/inter` per-weight CSS (all subsets, split by `unicode-range`) is acceptable. Browsers only fetch the subsets the page needs. "Weights 400/500/600 only" in AC8 refers to weights, not subsets.
- **A7.** "Before any module script runs" (AC10) is satisfied by a synchronous inline script in `<head>`. The current approach is acceptable if it meets the ACs. The planner decides whether to keep it as is or refactor it.
- **A8.** If storage is unavailable, the fallback is `dark` (the spec default), as the existing script does. The fallback does not try `prefers-color-scheme` in that case.
- **A9.** Contrast is measured with the WCAG 2.x relative luminance formula. Spot checks with that formula: light neutral-500 `#626679` is about 5.2:1 on surface and 4.6:1 on bg. Dark neutral-500 `#9397ab` is about 5.2:1 on surface. Dark accent `#9184d9` is about 4.7:1 on surface.

## Open questions

None blocking. Non-blocking, for the human's later review:

1. Confirm A3 (light `--color-accent-400` darkened to `#6558ad`). If you prefer to keep the ramp untouched, the terminal and link-hover tickets would need a different light-mode token for small text instead.
