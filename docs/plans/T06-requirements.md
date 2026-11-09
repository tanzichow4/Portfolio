# T06 requirements: `Dock`

## Goal

Add the bottom-centre dock: five window buttons that open, restore, focus or minimize their windows through the existing click logic, a divider, three link icons, and an indicator dot showing each window's state. It must be fully keyboard and screen-reader usable, respect reduced motion, and give the open and restore flows left unverified by T04 a real UI path that is tested end to end.

## Current state (observed, so the planner does not redo finished work)

- `src/Dock.tsx` is a stub (`return null`) and `Desktop` does not render it.
- `dockClickAction` in `src/logic/dock.ts` returns `open`, `restore`, `focus` or `minimize`. The reducer already handles `{ type: 'dockClick', id }`, and `appReducer` forwards it. No new click logic is needed.
- `DOCK_IDS` in `src/logic/windows.ts` is hello, about, exp, proj, term, in that order. `site` is excluded.
- `src/data.ts` already has `WIN_TITLES`, `WIN_ICONS` and `LINKS`. It has no dock copy yet.
- `linkAttrs` in `src/logic/menu.ts` gives http(s) links `target="_blank" rel="noopener noreferrer"` and `mailto:` links no target.
- `Window` already has the genie pose and the fly-out on open. `genieOffset` aims at viewport centre x and `vh - 40`.
- `DOCK_CLEARANCE = 76` in `src/logic/layout.ts` assumes the dock's top edge is at `vh - 76`. `yFit` keeps each default window's nominal rectangle above that line.
- `src/theme.css` has `--ease-bouncy` and a global `:focus-visible` ring. Its reduced-motion rule only shortens durations, so hover transforms still apply unless they are explicitly removed (see `MenuBar.css` for the precedent).
- `MenuBar` closes on a capture-phase `pointerdown` on `document` outside itself.
- Window z-indexes are `order index + 10`, `site` is 800 and the menubar is 1000.
- Tests that pin the current page-wide button set (see AC30):
  - `tests/Desktop.wiring.test.tsx` line 82
  - `tests/Desktop.menubar.test.tsx` line 328
  - `tests/e2e/chrome.spec.ts` line 159

## Acceptance criteria

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

## Out of scope

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
- Editing `docs/design-decisions.md`. The resolutions below are recorded here only.

## Assumptions

1. **Tooltips (section B).** The native `title` attribute matches the prototype and meets the need for hover labels at no design cost. T05 deferred tooltips only for the menubar.
2. **Genie target (section B).** The target stays at viewport centre x and `vh - 40`, as T04 built it. The dock is viewport-centred, so this is the spec's "dock center". Per-button measuring is not needed.
3. **Button state (section D).** Section D allows "`aria-pressed` or equivalent". `aria-pressed` alone is two-state and cannot separate minimized from closed, so it is paired with the accessible description in AC21. The label stays fixed because a name should not change alongside a pressed state. `pressed` uses the same meaning as the Windows menu check.
4. **Link targets.** The prototype sets `target="_blank"` on every dock link, including mail. T05's rule (`mailto:` has no target) is followed instead, so the menubar and dock agree.
5. **Prototype details adopted where the README is silent.** These are the 6px gap, divider size and margin, the pressed transform (window buttons only), the 0.35s transform transition, the 0.2s dot transition, the dot placement, `cursor: pointer`, and the `--color-bg` link background.
6. **Hover stability (AC18) is an added requirement.** The spec's lift moves a button's bottom edge up about 6.5px, so in the prototype a pointer resting there can flicker and miss clicks. The spec's visual pose is unchanged.
7. **Hover only.** Keyboard focus shows the ring and does not lift the button, as the spec describes the transform for hover.
8. **Reduced motion removes hover transforms entirely,** following T05's AC33 and the spec's "disable ... keep fades".
9. **Tab order.** The dock follows the windows in DOM and tab order. The spec does not set this, and it keeps the existing tab-order tests valid. It also has no roving tabindex, since the dock is not a `menubar` or `toolbar` widget.
10. **Focus stays on the dock button.** The prototype does no focus management, and moving focus into windows belongs to T09. Staying put also lets a keyboard user press Enter repeatedly to minimize and restore.
11. **"About this site" and dock clicks.** That window is pinned at z 800, so a dock window can be front-most in `order` while still drawn beneath it. Clicking its button then minimizes it, as in the prototype and the tested `dockClickAction`. This is left unchanged.
12. **Minimized dot contrast.** The spec's 0.4 opacity comes to roughly 1.9:1 on the dock in dark mode by hand calculation, below 3:1 for non-text. It is kept because the spec is explicit and AC21 conveys the state non-visually. T09 should review this.
13. **Landmark.** `navigation` was chosen because the dock launches windows and external links. The name "Dock" is new copy and goes in `data.ts`, as do the state words.
14. **Existing-test edits are sanctioned requirement changes,** following the T04 and T05 precedent (AC30).

## Open questions

No blocking questions.
