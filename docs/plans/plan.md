# T06 plan: `Dock`

Source: `docs/plans/00-requirements.md` (Current state, Assumptions 1-14, AC1-AC34), `CLAUDE.md`, `docs/design-decisions.md` (decisions 1, 11; sections B, C, D), `design_handoff_tanzi_os/README.md` ("Dock", "Interactions") and the prototype's dock markup. Existing code read: `src/Desktop.tsx`, `src/Dock.tsx`, `src/MenuBar.tsx`, `src/MenuBar.css`, `src/Window.tsx`, `src/WindowLayer.tsx`, `src/data.ts`, `src/theme.css`, `src/logic/{dock,windows,desktop,layout,motion}.ts`, `tests/logic/purity.test.ts`, `tests/menubar.contrast.test.ts`, `tests/Desktop.wiring.test.tsx`, `tests/Desktop.menubar.test.tsx`, `tests/e2e/{chrome,menubar,desktop}.spec.ts`.

T1-T5 below are tasks inside ticket T06, not backlog tickets.

## 1. Goal and scope

**Goal.** Add the bottom-centre dock: five window buttons that open, restore, focus or minimize their windows through the existing click logic, a divider, three link icons, and an indicator dot showing each window's state. It must be fully keyboard and screen-reader usable, respect reduced motion, and give the open and restore flows left unverified by T04 a real UI path that is tested end to end.

**Out of scope** (carried over):

- Window contents (T07), and re-checking nominal window heights against real content (T07).
- `BootScreen` and hiding the dock during boot (T08).
- The app-wide accessibility pass (T09), including moving focus into a window when it opens or restores from the dock.
- Real link URLs and real content (T10).
- The mobile tab-bar dock and touch-specific hover handling (decision 1, T11).
- Custom styled tooltips, and adding tooltips to the menubar links.
- Aiming the genie at each window's own dock button.
- Magnifying neighbouring dock items, dock drag or reorder, or context menus.
- Changing `dockClickAction`, the reducer's dock logic or the z-order rules.
- Keeping windows from being dragged or re-clamped under the dock (accepted in T03; Tidy up restores the layout).
- Editing `docs/design-decisions.md`.

## 2. Acceptance criteria

Copied from `00-requirements.md` with the same numbers. No ACs were added: the gaps found are handled by decisions in section 8 and by the extra test edit in section 7a, which AC30's general rule already covers.

### Layout and appearance

- **AC1** `Desktop` renders the dock at every supported size (1280x720 and up). It is horizontally centred in the viewport (within 1px), 14px from the bottom, with padding 8px, radius 18px, gap 6px between items, background `color-mix(in srgb, var(--color-surface) 78%, transparent)`, `backdrop-filter: blur(12px)`, `--shadow-md` and z-index 900. It stays centred and 14px from the bottom after a viewport resize.
- **AC2** At rest the dock's top edge is at `vh - 76` (within 1px), matching `DOCK_CLEARANCE`. At 1280x720, no default window's nominal rectangle intersects the dock.
- **AC3** The dock contains, left to right: exactly five window buttons (hello.txt, about.md, experience.log, projects, terminal, in `DOCK_IDS` order), one divider, then three links in `LINKS` order (GitHub, LinkedIn, Email). There is no button for "About this site".
- **AC4** Each window button is 46x46, radius 12px, background `--color-bg`, with its `WIN_ICONS` icon at 22px in `--color-accent-400`, and `cursor: pointer`.
- **AC5** Each link is 46x46, radius 12px, background `--color-bg`, with a 22px icon in `--color-neutral-300`. On hover the icon becomes `--color-text`.
- **AC6** The divider is 1px wide and 34px tall, `--color-divider`, with margin `0 4px 6px`. It is hidden from assistive technology and is not focusable.
- **AC7** The indicator dot sits under each window button: 4px, `--color-accent`, horizontally centred on the button, within the dock's padding. Its opacity is 1 when the window is open and not minimized, 0.4 when minimized, and 0 when closed, with a 0.2s opacity transition. The dot is hidden from assistive technology. Links have no dot.
- **AC8** The dock renders correctly in both themes using tokens only, with no hard-coded colours.

### Click behaviour

- **AC9** Clicking a window button produces the outcome the spec requires in each state:
  - closed: the window opens and becomes front-most
  - minimized: the window restores and becomes front-most
  - open but not front-most: the window becomes front-most, with position unchanged
  - open and front-most: the window minimizes
- **AC10** The dock has no click logic of its own. Each click goes through the existing `dockClick` reducer action exactly once.
- **AC11** Repeated clicks stay consistent. Clicking a front-most window's button alternates minimize and restore. Rapid clicks, including during the genie animation, leave the window in the state the reducer reports, never stuck invisible while `data-min="false"` or visible while `data-min="true"`.
- **AC12** A window that has moved keeps its position across minimize and restore, and across close and reopen from the dock.
- **AC13** A pointer-down on the dock does not start a drag and does not raise any window under it. Only the resulting button action changes the window state. Windows that overlap the dock stay behind it, and its controls stay clickable.
- **AC14** Clicking the dock while a menu is open closes the menu, and the clicked button or link still performs its action.
- **AC15** Dots, `aria-pressed` and the description (AC20, AC21) stay in sync with every other way of changing a window: its own Minimize and Close buttons, title-bar double-click, each Windows menu item, Minimize all, Show all, Tidy up and Restart. In the other direction, the Windows menu checks update after a dock click.

### Links

- **AC16** Each dock link's `href` comes from `LINKS`. GitHub and LinkedIn open in a new tab with `rel="noopener noreferrer"`. Email is a `mailto:` link with no `target`. Clicking a link changes no window state.

### Motion

- **AC17** On hover, a window button is transformed by `translateY(-10px) scale(1.15)`, and a link by `translateY(-10px) scale(1.15) rotate(-8deg)`. Both animate as `transform .35s` with `--ease-bouncy`. While pressed, a window button is `translateY(-4px) scale(.95)`.
- **AC18** Hover is stable. With the pointer resting anywhere inside a control's at-rest 46x46 box, including its bottom edge, the control settles in its hover pose and does not flicker between hover and rest as it lifts away. A click anywhere in that box activates that control. The dock does not clip a lifted control.
- **AC19** Under `prefers-reduced-motion: reduce`:
  - Hovering or pressing a dock control applies no transform. Colour and dot opacity changes may remain.
  - A dock click still opens, restores, focuses and minimizes correctly.
  - Windows opened or restored from the dock have no genie or fly-out transform. Fades remain.

### Accessibility

- **AC20** Each window button is a native `<button>` with `aria-label` exactly equal to its `WIN_TITLES` value. The label stays the same in every state. `aria-pressed` is `true` exactly when the window is open and not minimized, and `false` otherwise (matching the Windows menu check).
- **AC21** Each window button exposes its three-way state as an accessible description reading "Open", "Minimized" or "Closed", matching the dot, so minimized and closed can be told apart without seeing it.
- **AC22** Each link is a native `<a>` with `aria-label` equal to its `LINKS` label.
- **AC23** Every window button and link has a native `title` tooltip equal to its label. Every icon is hidden from assistive technology.
- **AC24** The dock is a `navigation` landmark with an accessible name of "Dock". Its name and the three state words live in `src/data.ts`. No other dock copy, URL or email address is written outside `data.ts`.
- **AC25** Keyboard:
  - All eight controls are reachable with Tab, in visual order, and each is its own tab stop.
  - The dock comes after the windows in the tab order, so the menubar stops and then "Minimize hello.txt" stay first.
  - Enter and Space activate a window button with the same outcomes as AC9.
- **AC26** After a keyboard activation, focus stays on that dock button in all four outcomes. It is never lost to `<body>`, including when the action minimizes a window.
- **AC27** Every dock control shows the `:focus-visible` ring when focused by keyboard, and the ring is not clipped. Minimized windows stay out of the tab order while tabbing through the dock.
- **AC28** Contrast, verified by unit tests using `tests/helpers/contrast.ts`, in dark and light. Each pair needs at least 3:1:
  - window icon (`--color-accent-400`) on `--color-bg`
  - link icon (`--color-neutral-300`) on `--color-bg`
  - hovered link icon (`--color-text`) on `--color-bg`
  - focus ring (`--color-accent`) on the dock background, composited at 78% over each solid wallpaper base it can sit on: `--color-bg`, `--color-section`, `--color-accent-900`

### Structure and tests

- **AC29** Component tests (Testing Library) cover AC3, AC7, AC9, AC11 (alternation), AC14-AC16 and AC20-AC26, including each state of the description and `aria-pressed`.
- **AC30** Existing tests whose assumptions the dock breaks are updated without being weakened, and each change is listed in the QA report and autobuild log as a deliberate requirement change. Known cases are the three in "Current state": the page-wide button list and count now also pin the five dock buttons, giving 16 buttons in total. No test is deleted or skipped.
- **AC31** Playwright e2e at 1280x720 closes the gaps T04 left, using real dock clicks:
  - each of the four click outcomes in AC9
  - close then dock click: the window first renders in the minimized pose (`scale(0.06)`) and ends at `transform: none` and opacity 1 (the fly-out)
  - minimize then dock click: the window returns to `transform: none` at its previous position
  - hover pose and hover stability at the bottom edge (AC17, AC18)
  - the reduced-motion behaviour in AC19
  - Tab order and keyboard activation (AC25, AC26)
- **AC32** The minimize target lies inside the dock: `(vw / 2, vh - 40)` falls within the dock's rectangle at 1280x720 and at a larger viewport.
- **AC33** QA visually checks the fly-out and the restore in a real browser, in both themes, and records the result in the QA report. T04 could not do this.
- **AC34** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass. No console errors or warnings appear during e2e.

## 3. Architecture

**Approach.** `Dock` is a stateless view of `state.desk.wins`. Every button dispatches `{ type: 'dockClick', id }` and nothing else, so `dockClickAction` and the reducer stay untouched (AC10). Dots, `aria-pressed` and the description all derive from the same `Win` on each render, so AC15 holds structurally and the Windows menu reads the same state.

**The key structural decision is a static host with a moving face (AC18).** The spec's lift moves a transformed control's bottom edge up about 6.5px, which is what causes the flicker and missed clicks. So the native `<button>` or `<a>` (the "host") never transforms and keeps the at-rest 46x46 hit box. A child `span` (the "face") paints the background and icon and carries every transform. The face has `pointer-events: none`, so the hit area is exactly the at-rest box, and a lifted face can never steal a neighbour's click. Hover and active rules select on the host and style the face.

**Contract for coder and test-writer: where each AC property lives.**

- On the host (`.dock-item`): the 46x46 size, `cursor: pointer`, the ARIA attributes, `title`, the focus ring, and hit-testing (AC4, AC18, AC20-AC23, AC27).
- On the face (`.dock-face`): the `--color-bg` background, 12px radius, icon colour, `transform` and `transition` (AC4, AC5, AC17). A hovered host's own computed `transform` stays `none`; tests read the face.
- The dot is a child of the host, so it stays in the dock's padding and does not lift.

**Files and public surface.**

- `src/data.ts` (edit). Add `DOCK_LABELS = { landmark: 'Dock', state: { open: 'Open', minimized: 'Minimized', closed: 'Closed' } } as const`.
- `src/logic/dock.ts` (edit, additive). This is state display, not click logic, and `dockClickAction` is not touched.
  - `DockWinState = 'open' | 'minimized' | 'closed'`
  - `dockWinState(w: Win): DockWinState`
  - `DOT_OPACITY: Readonly<Record<DockWinState, number>>` with the values 1, 0.4 and 0
  - The purity test forbids the whole word `window` in this file, so name parameters `w` or `win`.
- `src/Dock.tsx` (replace stub). Default export `Dock({ wins, dispatch }: { wins: State['wins']; dispatch: Dispatch<DesktopAction> })`.
- `src/Dock.css` (new), imported by `Dock.tsx`.
- `src/Desktop.tsx` (edit). Render `<Dock wins={state.desk.wins} dispatch={dispatch} />` after `WindowLayer`, as the last child of the root, which gives the AC25 tab order.

**Markup (children of `Dock`, in order).**

- Root: `<nav className="dock" aria-label={DOCK_LABELS.landmark}>`. Controls are direct children, with no list and no roving tabindex (Assumption 9).
- For each id in `DOCK_IDS`, a `<button type="button" className="dock-item dock-win">` with:
  - `aria-label` and `title` set to `WIN_TITLES[id]`
  - `aria-pressed` set to `state === 'open'`
  - `aria-describedby` set to `dock-state-${id}`
  - `onClick` dispatching `dockClick` for that id
  - children: `span.dock-face` holding the `WIN_ICONS[id]` icon at `size={22}` with `aria-hidden="true"`; `span.dock-dot` with `aria-hidden="true"` and inline `style={{ opacity: DOT_OPACITY[state] }}`; and `<span id="dock-state-${id}" hidden>` holding `DOCK_LABELS.state[state]`
- `<div className="dock-sep" aria-hidden="true" />`.
- For each of `LINKS`, an `<a className="dock-item dock-link">` with `href`, `aria-label` and `title` from the entry, `{...linkAttrs(l.href)}` (reused so the rule cannot drift), and one child `span.dock-face` holding the icon at 22 with `aria-hidden="true"`.

Controls must never unmount, get `disabled` or change `key`, because AC26 relies on the native element keeping focus. No focus code is needed.

**`Dock.css` (tokens only, no hex, no `all: unset`, no `outline: none`, no `overflow` on the dock).**

- `.dock`: `position: fixed; left: 0; right: 0; bottom: 14px; width: fit-content; margin-inline: auto; display: flex; align-items: flex-end; gap: 6px; padding: 8px; border-radius: 18px`, the AC1 background, `backdrop-filter: blur(12px); box-shadow: var(--shadow-md); z-index: 900`.
  - Use auto margins, not `translateX(-50%)`. The dock is 441px wide (odd), so a transform would land on a half pixel and blur the icons.
  - Height comes to 8 + 46 + 8 = 62, so the top edge is `vh - 76` (AC2).
  - `align-items: flex-end` with the divider's 6px bottom margin centres the 34px divider in the 46px row, as in the prototype.
- `.dock-item`: `position: relative; flex: none; display: block; width: 46px; height: 46px; padding: 0; border: 0; appearance: none; background: transparent; border-radius: 12px; cursor: pointer; color: inherit; font: inherit; text-decoration: none`.
- `.dock-face`: `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--color-bg); pointer-events: none; transition: transform .35s var(--ease-bouncy), color .15s`.
- `.dock-win .dock-face`: `color: var(--color-accent-400)`. `.dock-link .dock-face`: `color: var(--color-neutral-300)`.
- `.dock-dot`: `position: absolute; bottom: -5px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 2px; background: var(--color-accent); pointer-events: none; transition: opacity .2s` (prototype values; it spans 47-51px, inside the 8px padding).
- `.dock-sep`: `flex: none; width: 1px; height: 34px; margin: 0 4px 6px; background: var(--color-divider)`.
- Motion (added in T5), in this order, each selector on the host styling its face:
  - `.dock-win:hover`: `translateY(-10px) scale(1.15)`
  - `.dock-win:active`: `translateY(-4px) scale(.95)`, later in the file so it wins over hover
  - `.dock-link:hover`: `translateY(-10px) scale(1.15) rotate(-8deg)` and `color: var(--color-text)`
  - `.dock-item:hover { z-index: 1 }`, so a lifted face paints over its neighbours
  - last: `@media (prefers-reduced-motion: reduce)` setting `transform: none` on those same three face selectors (the `MenuBar.css` precedent; `theme.css` only shortens durations)

**Data and API changes.** Adds `DOCK_LABELS`, `DockWinState`, `dockWinState` and `DOT_OPACITY`. `State`, `DesktopAction`, the reducer and `WindowLayer` are unchanged. No network, env or config change.

**Dependencies.** None added. Icons already exist in `data.ts`, and `@testing-library/user-event` is already installed.

## 4. Design

**User flow.**

- Load: the dock sits bottom-centre with five lit dots.
- Click a back window's icon: it comes to the front. Click the icon again: it genies into the dock and the dot dims. Click again: it springs back.
- Close a window from its title bar and the dot goes out. Click the icon and the window flies out of the dock.
- Link icons open GitHub or LinkedIn in a new tab, or the mail client, and change nothing on the desktop.
- Keyboard: tabbing runs menubar, then window controls, then the eight dock controls. Enter or Space acts and focus stays on the button, so repeating the key toggles minimize and restore.

**States.**

- Loading: none, the dock renders synchronously.
- Empty: all windows closed or minimized. The dock remains with dots at 0 or 0.4 and is the main way back.
- Error: there is no fallible work inside the dock. A missing mail handler or a blocked pop-up is handled by the browser, and desktop state is unaffected.
- Success: per window, open (dot 1, pressed, "Open"), minimized (dot 0.4, not pressed, "Minimized"), closed (dot 0, not pressed, "Closed").
- Interaction: hover (lift, stable), pressed (window buttons only), keyboard focus (ring, no lift, per Assumption 7).

**1280x720 and larger.** The dock is 441x62 and CSS-centred, so resize needs no JS. Default windows end at y 644 or above, touching but not crossing the dock top at 1280x720 (`exp` and `term` both end exactly at 644). Windows can be dragged under the dock and stay behind it. Mobile is not built (decision 1).

**Accessibility.**

- `navigation` landmark named "Dock", native controls, fixed labels, and the pressed state paired with a three-way description (AC20, AC21).
- The description uses `aria-describedby` pointing at a `hidden` span, which takes precedence over `title` for the description. The state word therefore never enters the accessible name.
- Icons, dots and the divider are `aria-hidden`.
- The ring is the global `:focus-visible`. It sits on the static host and nothing clips it. On an open window the bottom of the ring crosses the dot; both are `--color-accent`, so it reads as one mark.
- Hand-calculated AC28 ratios all clear 3:1. The tightest are the focus ring at about 4.6:1 in dark and about 5:1 in light. If a test still fails, use the nearest existing token that passes in both themes, log it in the QA report, and add no new tokens unattended.
- The minimized dot's low contrast is accepted and left for T09 (Assumption 12).

**Reduced motion.** No hover or press transform. Colour and dot fades remain. `Window` already suppresses the genie and fly-out, so opening and restoring from the dock fades only.

## 5. Risk and security

Auth, secrets, storage and server data do not apply: the dock is a static client view with no user input. `href` values come only from `data.ts`.

- **R1. Hover flicker and missed clicks at the bottom edge (AC18).** Safeguard: the host/face split (T2, T3, T5). T5's e2e samples `:hover` and the face's matrix over time at the bottom edge and clicks at the box corners.
- **R2. Reduced-motion hover still transforms**, because `theme.css` only shortens durations. Safeguard: an explicit `transform: none` block after the hover rules (T5), with a raw CSS test and an e2e test.
- **R3. Reverse tabnabbing or referrer leak on new-tab links.** Safeguard: reuse `linkAttrs`, never hand-written attributes (T2). Tests pin `target` and `rel` on each link.
- **R4. Focus lost to `<body>` on minimize (AC26).** Safeguard: controls never unmount or disable (T2). Keyboard tests assert `document.activeElement` in all four outcomes (T4).
- **R5. Double dispatch or a second click path (AC10).** Safeguard: one `onClick` per button. A mock-dispatch test asserts exactly one call with the exact action (T2).
- **R6. A window stuck invisible after rapid clicks (AC11).** Safeguard: pose is derived from reducer state and no new timers are added. E2e clicks rapidly during the genie and asserts `data-min` matches the settled transform and opacity (T4).
- **R7. Dock draws under windows or the pinned site window (AC13).** Safeguard: z-index 900 is above `site` (800) and every window (order index + 10). E2e uses `elementFromPoint` with a window dragged under the dock and with `site` open (T4).
- **R8. Blurry icons from sub-pixel centring.** Safeguard: auto margins rather than a transform on `.dock` (T3).
- **R9. `window` in `logic/dock.ts` fails the purity test.** Safeguard: naming rule in section 3 (T1).
- **R10. Copy hard-coded in the component.** Safeguard: labels come only from `data.ts` (T1, T2); a QA grep covers `src/`.
- **R11. Existing tests "fixed" by loosening them.** Safeguard: section 7a gives every edit and each stays at least as strict (T4). Each carries a comment and is listed in the QA report and autobuild log.
- **R12. Tests navigate or launch a mail client.** Safeguard: jsdom link tests call `preventDefault` from a `document` click listener and assert the event reached the link. E2e fulfils the GitHub URL with `context.route` and never activates Email.

## 6. Gaps check

- **Auth:** none in this app, not applicable.
- **Validation:** no user input. Ids come from `DOCK_IDS`, and the reducer already guards unknown ids.
- **Error handling:** no async or fallible work. Browser-level link failures do not touch state.
- **Mobile:** out of scope (decision 1, T11).
- **Accessibility:** AC20-AC28 and section 4. Focus into opened windows is T09.
- **Config and env vars:** none. No change to Vite, ESLint, TypeScript, Playwright or `tests/setup.ts`.
- **Tests:** logic, component, raw CSS, contrast, Desktop integration, e2e, and the sanctioned edits in 7a.

## 7. Tasks

Coder edits `src/` only. Test-writer runs after coder on each task and owns `tests/`. Each task must leave lint, typecheck and unit tests green once test-writer has finished. New tests are named with an `ACn:` prefix.

- **T1. Dock copy and window-state helper.** ACs: AC7, AC21, AC24.
  - Coder: add `DOCK_LABELS` to `src/data.ts`; add `DockWinState`, `dockWinState` and `DOT_OPACITY` to `src/logic/dock.ts`.
  - Test-writer: additive cases in `tests/logic/dock.test.ts` for the three states and exact opacities (including open and minimized both true); literal `DOCK_LABELS` values. `dockClickAction` tests are unchanged, and the purity test needs no edit because no module is added.
- **T2. `Dock` component, unwired.** ACs: AC3, AC6 (attributes), AC7 (attributes), AC10, AC16, AC20-AC24.
  - Coder: replace the `src/Dock.tsx` stub with the section 3 markup, without the CSS import. Do not render it from `Desktop` yet.
  - Test-writer: new `tests/Dock.test.tsx` using `initialDesktop(1280, 720).wins` variants and a mock dispatch. Cover the order and count of controls, no site button, one `dockClick` per click with the exact action, `aria-label`, `title`, `aria-pressed` and `toHaveAccessibleDescription` in each state, inline dot opacity, `aria-hidden` on icons, dots and divider, links' `href`, `target` and `rel`, no dot on links, the named `navigation` landmark, and `type="button"`.
- **T3. Dock at-rest styles.** ACs: AC1, AC2, AC4, AC5, AC6, AC7, AC8, AC27, AC28.
  - Coder: add `src/Dock.css` with every rule in section 3 except the motion rules; import it in `Dock.tsx`.
  - Test-writer: new `tests/Dock.css.test.ts` reading `Dock.css?raw`, asserting the spec values, no hex or `rgb(` colours, no `all: unset`, no `outline: none`, no `overflow` and no `transform` on `.dock`. New `tests/dock.contrast.test.ts` modelled on `tests/menubar.contrast.test.ts` (local `mix`, helpers not edited), covering every AC28 pair in both themes.
- **T4. Wire the dock into `Desktop`.** ACs: AC2, AC9, AC11-AC16, AC19 (click outcomes), AC25-AC27, AC29-AC32.
  - Coder: render `Dock` last in `Desktop` (section 3). No other source change.
  - Test-writer, in this same task:
    - Apply every edit in section 7a. They must land here because this is the task that changes the counts.
    - New `tests/Desktop.dock.test.tsx` on the full `Desktop`, with `localStorage` and `data-theme` reset as in `Desktop.menubar.test.tsx`. Cover the four AC9 outcomes, alternation, AC12 state, AC14 for a button and a link (R12), AC15 for every listed route and for the Windows menu check after a dock click, AC25 tab sequence with `user.tab`, AC26 focus after Enter and Space in all four outcomes, and AC2's nominal rectangles from `layout(1280, 720)` and `WIN_META` against y 644.
    - New `tests/e2e/dock.spec.ts`, with `watchErrors` asserted in every test:
      - geometry and computed styles (AC1, AC2, AC4-AC7), including after `setViewportSize`
      - AC32 at 1280x720 and 1920x1080
      - the four AC9 outcomes with real clicks
      - fly-out: before clicking, install a `MutationObserver` on the root (`header`'s parent) that records the inline `transform` of the added `[data-win]` node, since polling cannot catch a two-frame pose; assert the recording contains `scale(0.06)`, then `transform: none` and opacity 1
      - restore to the previous position after a drag (AC12)
      - AC11 rapid clicks during the genie, settled state matches `data-min`
      - AC13: pointer-down on the dock padding leaves z-indexes unchanged with a window dragged beneath it, and `elementFromPoint` returns the dock with that window and with `site` open
      - AC14 with an open menu
      - AC16 per R12
      - AC25 and AC26 Tab order and keyboard activation
      - AC27: minimized windows are skipped and the ring has a non-`none` `outline-style` on all eight controls
      - AC19 click outcomes under `reducedMotion: 'reduce'`: the recorded pose has no `scale(`, and restore has no transform
- **T5. Hover and press motion.** ACs: AC5, AC17, AC18, AC19, AC31.
  - Coder: add the motion rules and the reduced-motion block to `src/Dock.css` (section 3).
  - Test-writer: extend `tests/Dock.css.test.ts` with the exact transforms, the `.35s` transition with `--ease-bouncy`, `pointer-events: none` on the face, and a reduced-motion block covering all three face selectors. New `tests/e2e/dock.motion.spec.ts`:
    - settled hover matrix on the face: window button `matrix(1.15, 0, 0, 1.15, 0, -10)`, link with rotation near -8deg and translate -10
    - the host's own transform stays `none`, and the pressed pose is checked between `mouse.down` and `mouse.up`
    - link icon colour on hover
    - AC18: at the host's bottom edge and box corners, sample across at least 800ms that the host matches `:hover` on every frame and the settled matrix does not change, then click there and assert the action ran, for a window button and a link (R12)
    - AC18: a lifted control's top is painted outside the dock's box and is not clipped
    - reduced motion: hover and press leave the face at `none`

**After T5 (QA stage, no coder or test-writer work).** Run the full AC34 set. Complete AC33 in a real browser in both themes. Run a grep for dock copy, URLs and `mailto:` outside `data.ts`. Check `git diff` on existing tests shows only the 7a edits and additive cases. List every 7a edit in the QA report and autobuild log.

### 7a. Existing tests the dock changes (sanctioned, deliberate requirement changes)

These are deliberate requirement changes under AC30. They **must not loosen any assertion**: every count, list and full-cycle check stays pinned exactly and the dock's controls are added to what is pinned. Each edit carries the comment `// DELIBERATE REQUIREMENT CHANGE (T06 AC30): <reason>` and keeps its test title. All land in T4. No test is deleted or skipped.

The page goes from 11 to 16 native buttons: 10 in windows, 1 theme toggle, 5 in the dock. The links are `link` role and do not count. In DOM order, the buttons outside windows are the toggle and then the dock.

1. `tests/Desktop.wiring.test.tsx` line 82. The expected list `['Switch to light mode']` becomes `['Switch to light mode', 'hello.txt', 'about.md', 'experience.log', 'projects', 'terminal']`. The window count of 10 on line 80 stays.
2. `tests/Desktop.menubar.test.tsx` lines 327-330. The expected list becomes the same six labels, and the comment changes to say the toggle and the five dock buttons are left.
3. `tests/e2e/chrome.spec.ts` lines 156-159. Keep the `[data-win]` count of 10 and the banner count of 1. Add a count of 5 for buttons inside `getByRole('navigation', { name: 'Dock' })`, plus one exact-name check per `TITLES` entry inside it. The page total becomes 16.
4. `tests/e2e/chrome.spec.ts` lines 304-307, "AC17/AC19: Minimize makes the window inert…". **This case is not in the requirements' known list, and it does break.** Two reasons:
   - The dock's "terminal" button is a legitimate tab stop whose label contains `terminal`, so the `includes('terminal')` filter fails.
   - The tab cycle grows, and from the inert button's position 18 presses no longer reach "Close projects".

   Change `tabLabels(page, 18)` to `tabLabels(page, 26)` (5 menubar + 8 window + 8 dock stops + 5 margin, the same margin T05 used). Replace the first assertion with two: the labels containing `terminal`, excluding the exact label `terminal`, equal `[]` (this still catches any control inside the window, as before); and `labels` contains `terminal` (new, and it proves the dock stop is reached). The "Close projects" assertion stays.

Checked and unaffected:

- `tests/e2e/menubar.spec.ts`: links are scoped to the banner, AC12's first six stops are unchanged, the AC36 loop of 14 still covers the 13-stop cycle and only checks `[data-win]`, and the click at (20, 700) is left of the dock.
- The remaining `chrome.spec.ts` tests: `tabPastMenubar` and the window stops come before the dock, and the drag and click points do not land on the dock.
- `desktop.spec.ts` (`nav` is not a `region`), the root's first child in `Desktop.menubar.test.tsx` AC1, and `MenuBar`, `Window` and `WindowLayer` tests (no `Desktop`).
- `tests/logic/purity.test.ts`: no module added.

## 8. Open questions

None need a human. Decided unattended from the spec, decisions log and requirements:

1. **Host and face split for AC18.** AC4, AC5 and AC17 say "button" and "link"; the visual properties and transforms are applied to the inner face so the hit box can stay still. The spec's visual pose is unchanged. This is the only way to meet "a click anywhere in that box activates that control" without enlarging the hit area.
2. **The face has `pointer-events: none`.** The hit area is exactly the at-rest box, so the part of a lifted icon above that box is not clickable. AC18 only requires the at-rest box, and this stops a lifted face overlapping a neighbour's box.
3. **The dot does not lift with the icon.** The prototype's dot is a child of the moving button. Keeping it on the static host keeps it inside the dock's padding as AC7 requires, including during hover. The `-5px` offset is the prototype's.
4. **Centring uses auto margins, not `translateX(-50%)`,** because the dock's 441px width is odd.
5. **The AC21 description uses `aria-describedby` to a `hidden` span.** `aria-description` is newer and less widely supported.
6. **State helper lives in `src/logic/dock.ts`.** It is display state, not click logic, and keeps the CLAUDE.md rule on pure logic.
7. **A fourth existing test changes** (7a item 4), beyond the three AC30 names. AC30's general rule covers it, and it is held to the same no-loosening standard.
8. **No ACs were added.**
