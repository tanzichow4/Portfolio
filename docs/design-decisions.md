# Design handoff review: notes and decisions before ticketing

## Context

I read `design_handoff_tanzi_os/README.md` and the prototype logic in `Tanzi OS.dc.html` (the `Component` class: layout, drag, minimize, terminal `run()`, menus). This is a review-only pass. The notes below are things to decide before writing tickets. No code changes are proposed. "Prototype" means the HTML file; "spec" means the README.

## A. Decisions needed (these change the ticket scope)

1. **Responsive scope (<760px).** The spec says "to build", with no design. Open questions: does the stack show all five windows or only the one picked in the tab-bar dock? What does tapping the TC mark in the menubar open? Is the terminal available on mobile? Is drag/minimize/wobble dropped entirely? Recommendation: make this a separate, later epic and ship desktop first. Do it only after a mini-design exists.
2. **Boot on first load?** The prototype starts with `booting: false`, so the boot screen only runs on "Restart…". Decide whether first load plays it (it adds load delay and is a bad fit for recruiters). Recommendation: no, and skip it entirely under `prefers-reduced-motion`.
3. **What "Restart…" resets.** The spec says "keeps theme + wallpaper". The prototype also resets `wobble` to true (via `initial()`), the verb, the experience tab and the terminal history. Decide whether wobble should persist.
4. **What persists in localStorage.** The spec only recommends theme. Decide on wallpaper and wobble. Also decide whether window layout persists (the prototype doesn't).
5. **Window state after close. DECIDED: closing resets the window.** Terminal history, the selected experience tab and the verb live inside the window components, so unmounting on close discards them. Only position is kept in `Desktop` state (per the spec). This also keeps `Desktop` state small and helps the re-render concern in section C.
6. **Behavior on resize.** The prototype tracks `vw/vh` but never re-clamps windows, so shrinking the browser can leave windows off-screen until "Tidy up". Decide: re-clamp on resize, or accept it.
7. **Minimum supported desktop size.** The layout formulas misbehave at small heights. Example at 1280x720: terminal `y = max(330, 720-380) = 340` and experience `y = max(380, 374) = 380`. Taller windows then run under the dock (the dock sits about 76px up from the bottom). Decide the minimum size (suggestion: 1280x720) and check the layout there.
8. **Terminal extras not in the spec.** There is no command history (up arrow), no tab completion, `open` doesn't accept `terminal` or `site`, and `theme foo` falls through to "command not found: theme". Decide which to add. Suggestion: history yes, completion no, a proper usage message for bad arguments.
9. **Hosting. DECIDED: personal server (self-hosted static site).** `npm run build` produces `dist/`, served by a web server (nginx, Caddy or similar). Vite `base` stays `/` unless it will live under a subpath. Remaining details: web server, domain/subpath, HTTPS, how deploys happen (CI over SSH/rsync, a Docker image, or manual copy). No deep links in v1 (still a suggestion), so no SPA fallback rewrite is strictly needed, but add `try_files ... /index.html` anyway. Cache rule: long-cache the hashed `/assets/*`, no-cache `index.html`. Also serve `resume.pdf` and `favicon.svg` from `public/`.
10. **SEO and no-JS.** All content is JS-rendered and hidden when windows are closed. Decide whether to add a `<noscript>` summary and OG/meta tags. Suggestion: yes, both are cheap.

## B. Spec gaps and inconsistencies

- **Genie target.** The spec says to translate toward the "dock center". The prototype uses the viewport center for x (`vw/2`) and `vh - 40` for y, not the window's own dock button. It looks fine, but decide whether to aim at the real button (needs refs/measuring).
- **Contrast in light mode.** The spec reverses the neutral and accent ramps but leaves 500 unchanged. `--color-neutral-500` (#9397ab) on the light surface (#f3f5fe) is roughly 2.7:1, which fails WCAG AA. It's used for hints, dates, inactive tabs and dim terminal lines. `--color-accent` (#796cbf) on the light surface is about 4.2:1, borderline for 12-13px text. Needs a token decision (a darker light-mode neutral-500 or text color for small text). Measure properly before finalizing.
- **Missing light token.** The prototype sets `--color-section-glow: #e7e5fe` in light mode, but the README doesn't list it. `--color-accent-2-*` ramps have no light override either (unused today).
- **Content outside `data.ts`.** The about copy and the hello text are in the HTML template, not in constants. The spec lists "the about copy" as content to replace. A ticket should extract it into `data.ts`.
- **Hard-coded email.** `hello@tanzi.dev` appears four times in the prototype (LINKS, Help menu, `contact`, `sudo hire-tanzi`). Make `LINKS` the single source. `contact` should derive from it.
- **Version string.** The terminal banner says "tanzi.os v1.0" and the About window has a version line. Decide the source (package.json version, or a constant).
- **Clock format.** The prototype uses `toLocaleString([], {weekday:'short', hour:'numeric', minute:'2-digit'})`. That is locale-dependent, so "Sat 3:42 PM" only appears for en-US. Decide whether to fix the locale or follow the visitor's.
- **`site` window z-order.** It's pinned at z 800 (below the dock at 900), not in the initial `order`, and added on first raise. Make this an explicit rule in the reducer.
- **Dock and links have no tooltips or labels.** Nothing in the spec covers hover labels. They are needed for accessibility, and icon-only links are ambiguous.
- **Links.** Project tiles are plain `<a>` tags. Decide on `target=_blank` and `rel=noopener`. The résumé uses `window.open('#')` as a placeholder.

## C. Technical and architecture risks

- **Re-render frequency.** The prototype keeps everything (mousemove tilt, clock, boot %, terminal input text) in one component's state, so every keystroke and mousemove re-renders the whole desktop. In React: keep the terminal input local, drive drag position/tilt through a ref plus `requestAnimationFrame` or a transform style, and keep the reducer for discrete events only.
- **Terminal as pure logic.** `run()` mixes output building with side effects (`open`, `setState`, `restart`). Suggest `runCommand(cmd, ctx) -> { lines, effects }` in its own module. That makes it easy to unit test, and it's the most testable piece of the app.
- **Reducer logic worth testing.** Z-order (`raise`, `top`), dock click logic (closed / minimized / behind / front), drag clamping and `layout(vw, vh)` can all be pure functions.
- **StrictMode double effects.** The clock interval, boot interval, keydown listener and the 30ms `setTimeout` un-minimize all need proper cleanup. Prefer a double `requestAnimationFrame` over the 30ms timeout.
- **Pointer events, not mouse events.** The prototype uses mouse events. The spec asks for pointer events with touch support. The titlebar needs `touch-action: none`. The prototype also uses `movementX` for tilt, which pointer events expose too.
- **Theme application.** The prototype sets inline styles on a root element. Production should use `<html data-theme>`. My `index.html` currently hard-codes `data-theme="dark"`. To avoid a flash of the wrong theme with persistence and `prefers-color-scheme`, an inline script in `<head>` must set the attribute before first paint.
- **Fonts.** `theme.css` imports Inter from Google Fonts (copied from the design system), which is render-blocking and external. It also loads weight 700, which the spec doesn't use. Consider self-hosting via `@fontsource/inter` (400/500/600). The spec says "Inter + Phosphor load from CDNs" only for the prototype.
- **Icons.** My `data.ts` uses string icon names (`'Graph'`). Looking those up dynamically from `@phosphor-icons/react` pulls in the whole icon set. Import the components directly and store component references in `data.ts`.

## D. Accessibility items to turn into tickets

- Windows are `role="dialog"` in the spec, but they are non-modal. Consider `role="group"`/`region` with `aria-label` instead, and decide the focus management when opening and closing.
- Minimized windows keep `pointer-events: none` but remain tabbable and readable by screen readers. They need `inert` or `aria-hidden` plus `visibility` once the animation ends.
- The hello name is built from one `<span>` per letter. Give the `<h1>` an `aria-label` and hide the letter spans from screen readers.
- Menubar: `role="menu"` with `menuitemcheckbox`/`menuitemradio`, arrow-key navigation, Esc to close and focus return. The prototype only handles Esc.
- Dock buttons need `aria-label`, and `aria-pressed` or equivalent for open/minimized state.
- `prefers-reduced-motion` must also disable the wobble toggle's effect and the genie, not only shorten durations (my `theme.css` rule only shortens durations).
- `user-select: none` on the desktop with selectable `about.md` text: make sure selection works there and in the terminal.

## E. Setup items I already did that this review affects

- `data.ts` icon strings (see section C).
- `index.html` hard-coded `data-theme="dark"` (see section C).
- Google Fonts `@import` in `src/theme.css` (see section C).
- Reduced-motion rule in `src/theme.css` is a stub (see section D).
- `Desktop.test.tsx` is a smoke test only.

## F. Suggested ticket breakdown (once the decisions above are made)

1. Theme tokens, fonts, light-mode contrast fixes, no-flash theme init
2. Pure logic modules and tests: layout, z-order, dock click logic, drag clamp, terminal `runCommand`
3. `Desktop` reducer and wiring
4. `Window` chrome: drag, minimize/genie, close, wobble, reduced motion
5. `MenuBar` and menus
6. `Dock`
7. Windows (Hello, About, Experience, Projects, Terminal, About this site): one ticket each or grouped
8. `BootScreen` and Restart
9. Accessibility pass
10. Content: real data, résumé, extraction of about copy
11. Responsive/mobile (separate epic, needs design)
12. Self-hosted deploy (server config, HTTPS, deploy script or CI job), meta/OG, noscript. Self-hosting also makes fonts a clearer case for bundling Inter (`@fontsource/inter`) instead of Google Fonts.

## Verification

Nothing to run. To review: open `design_handoff_tanzi_os/Tanzi OS.dc.html` through a static server and check B and C against the prototype (for example the layout at 1280x720, and the light-mode contrast numbers).

## Decisions log (all resolved)

1. Mobile: desktop first; mobile is a later epic after a mini-design.
2. Boot screen only on Restart; skipped under reduced motion.
3. Restart keeps theme, wallpaper and wobble; resets everything else.
4. localStorage persists theme (default `prefers-color-scheme`), wallpaper, wobble. Not window layout. Key prefix `tanzi-os:`.
5. Closing a window resets its internal state (terminal history, tab, verb). Only position/open/min live in `Desktop`.
6. Re-clamp windows on resize.
7. Minimum desktop size 1280x720; tune layout formulas to fit.
8. Terminal: add command history and usage messages; no tab completion.
9. Personal server, static `dist/`; no deep links in v1. Server details still open.
10. Add `<noscript>` summary and OG/meta tags.
11. Light mode: darken `neutral-400` (#5c6073) and `neutral-500` (#626679) for AA. Accent (#796cbf, ~4.1:1 on surface, 3.6:1 on bg) is NOT changed yet; needs a designer call.
12. Clock fixed to "Sat 3:42 PM" format (en-US).
