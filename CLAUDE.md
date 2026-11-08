# Project rules (all agents read this)

tanzi.os is a portfolio presented as a tiny desktop OS (draggable windows, dock, menubar, terminal).

## Read first

- `design_handoff_tanzi_os/README.md` is the design spec. `Tanzi OS.dc.html` is a prototype reference, not code to port.
- `docs/design-decisions.md` holds resolved decisions and known spec gaps. Follow its "Decisions log". Do not re-litigate those.

## Stack

- Vite + React 19 + TypeScript (strict), no state library (`useReducer` in `Desktop`)
- Styling: plain CSS with tokens from `src/theme.css` (Nocturne). No Tailwind.
- Icons: `@phosphor-icons/react` components. Font: Inter via `@fontsource/inter`.
- Package manager: npm. Node 24 (`.nvmrc`).

## Commands (exact)

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:5173)
- Build: `npm run build`
- Lint / type check: `npm run lint` / `npm run typecheck`
- Unit tests: `npm test` (Vitest + Testing Library). End to end: `npm run test:e2e` (Playwright, Chromium, 1280x720)
- Format: `npm run format` (a hook runs this after every edit); check with `npm run format:check`

## Layout

- Source `src/`, tests `tests/` (unit/component in `tests/`, Playwright in `tests/e2e/*.spec.ts`), plans `docs/plans/`, QA reports `docs/qa/`
- `src/data.ts` holds all content. Never hard-code copy, links or the email elsewhere.
- Keep logic pure and separate from components (layout, z-order, dock click, drag clamp, terminal `runCommand`) so it can be unit tested.

## Conventions

- Desktop first, minimum supported size 1280x720. Mobile (<760px) is a later epic, so do not build it unless a plan says so.
- A window's internal state (terminal history, experience tab, verb) lives in the window component and resets when it closes. `Desktop` only keeps position, open and minimized.
- Persist only theme, wallpaper and wobble in localStorage (keys prefixed `tanzi-os:`), always inside try/catch.
- Use pointer events (not mouse events) for drag. Respect `prefers-reduced-motion` (no wobble, genie or letter jumps).
- Semantic HTML, labelled controls, keyboard reachable. Minimized windows must not be focusable.
- Light and dark must both meet WCAG AA for text. Check contrast when adding colors.

## Never do

- Never edit `.env` files or commit secrets.
- Never delete or weaken a test to make it pass.
- Never run destructive git commands.
- Never push.
- Do not edit `design_handoff_tanzi_os/`. It is read-only reference.

## Workflow

Features run through `/feature <description>`. The human approves the plan before any code is written.
