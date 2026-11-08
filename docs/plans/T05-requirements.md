# T05 requirements: `MenuBar` and menus

## Goal

Add the fixed 36px menubar: four keyboard-operable menus (tanzi.os, Windows, View, Help), the GitHub/LinkedIn/Email links, a theme toggle and a clock always shown in the en-US "Sat 3:42 PM" format (decision 12). The menus open, restore and arrange windows and change theme, wallpaper and wobble. Those three settings persist in `localStorage` (decision 4), are kept by Restart (decision 3), and are applied through the same single path that the terminal's `TerminalEffect`s will use in T07.

## Current state (observed, so the planner does not redo finished work)

- `src/MenuBar.tsx` is a stub (`return null`). `Desktop` does not render it.
- `src/types.ts` already has `MenuId = null | 'os' | 'win' | 'view' | 'help'`, `Theme = 'dark' | 'light'`, `Wall = 'nebula' | 'grid' | 'plain'`. `State` is `{ wins, order, vw, vh }`: T03 removed `menu`, `theme`, `wall`, `wobble` and `booting`, and this ticket adds back what it needs.
- `src/logic/desktop.ts` `desktopReducer` already handles `open` (it opens a closed window, restores a minimized one and raises it), `close`, `minimize`, `restore`, `focus`, `dockClick`, `move`, `minimizeAll`, `showAll`, `tidy`, `restart` and `resize`. `tidy` and `restart` both return `initialDesktop(vw, vh)`, which closes "About this site". This ticket does not need to rebuild any of these window actions.
- `src/logic/terminal.ts` exports `TerminalEffect` (`open`, `theme`, `wallpaper`, `tidy`, `restart`, `clear`). Nothing applies these effects yet because the Terminal UI is T07.
- `src/Desktop.tsx` hard-codes `background: var(--wall-nebula)` and passes `wobble={true}` to `WindowLayer`. `Window` already turns tilt off when `wobble` is false or reduced motion is on.
- `src/theme.css` has `--wall-nebula`, `--wall-grid`, `--wall-plain`, the `[data-theme='light']` overrides, a global `:focus-visible` ring, easing tokens and a reduced-motion rule.
- `index.html` has an inline script that reads `tanzi-os:theme`. It accepts only `'dark'`/`'light'`, otherwise falls back to `prefers-color-scheme`, and falls back to `'dark'` if anything throws. It sets `<html data-theme>` before first paint.
- `src/data.ts` has `LINKS` (label, icon, href; Email uses `mailto:${EMAIL}`), `EMAIL`, `RESUME_URL = '/resume.pdf'`, `WIN_TITLES` and `WIN_ICONS`. There are no menu labels yet. `public/resume.pdf` does not exist yet (T10).
- `src/hooks/reducedMotion.ts` exports `prefersReducedMotion()`.
- `Window` raises itself on `onPointerDownCapture` and `onFocus`. Windows have y >= 36, so they never sit under a 36px menubar.
- Test constraints:
  - `tests/logic/purity.test.ts` forbids `window`, `document`, `localStorage`, `Date`, timers and React imports in `src/logic/*.ts`. Its `EXPECTED` list must name every module, so adding a logic module means extending that list (a sanctioned change, as in T04).
  - `tests/Desktop.wiring.test.tsx` (line 75) and `tests/e2e/chrome.spec.ts` (line 130) assert exactly 10 buttons page-wide.
  - Several `chrome.spec.ts` tests assume the first Tab press lands on "Minimize hello.txt".
  - All of these will change once the menubar exists. See AC40.

## Acceptance criteria

### Menubar layout

- **AC1** Desktop renders the menubar at every supported size (1280x720 and up). Its spec: fixed to the top, full width, 36px tall, horizontal padding 12px, 13px text, background `color-mix(in srgb, var(--color-bg) 72%, transparent)` with `backdrop-filter: blur(10px)`, bottom edge `0 1px 0 var(--color-divider)`, z-index 1000. It sits above every window (window z-indexes stay below 1000).
- **AC2** The menubar is landmark-reachable (inside a `<header>` or `<nav>` with an accessible name). The left group is an element with `role="menubar"` and an accessible name. It holds four triggers in this order: "tanzi.os" (weight 600, accent color, preceded by a decorative `CircleHalf` icon hidden with `aria-hidden`), then "Windows", "View" and "Help" (weight 400, neutral-300). Trigger padding is 5px 10px with radius 6px. The background is text 8% on hover and text 10% while that trigger's menu is open.
- **AC3** On the right, in order:
  - Three links built from `LINKS`, each 30x28 with a 16px icon in neutral-400 that turns to text color on hover. Each has an accessible name equal to its `label`.
  - A theme toggle button showing a moon in dark mode and a sun in light mode. Its accessible name says what it does ("Switch to light mode" or "Switch to dark mode").
  - The clock.
- **AC4** The GitHub and LinkedIn links open in a new tab with `rel="noopener noreferrer"`. The Email link is a plain `mailto:` link with no `target`.
- **AC5** All visible menubar copy comes from `src/data.ts`: menu and item labels, the "email" hint, the theme-toggle names and the menubar and menu accessible names. No email address or URL is written anywhere outside `data.ts`.

### Menu behavior (pointer)

- **AC6** Clicking a trigger opens its dropdown. Clicking the same trigger again closes it. At most one menu is open at any time.
- **AC7** While a menu is open, moving the pointer over another trigger switches to that trigger's menu. When no menu is open, hovering opens nothing.
- **AC8** These close the open menu:
  - a pointer-down on the empty desktop (the window under it is otherwise unaffected), or anywhere outside the menubar and the open dropdown
  - a pointer-down on a window. That window is still raised as usual.
  - the Escape key
  - choosing an item
- **AC9** Dropdown appearance: placed 34px from the menubar top, left-aligned to its trigger, min-width 240px, padding 6px, radius 14px, `--color-surface` background, `--shadow-lg`.
  - Items: padding 7px 10px, radius 6px, 13px text in the text color.
  - A 14px check column shows an accent `Check` icon only when the item is checked. The column keeps its width when the item is unchecked.
  - An optional right-hand hint uses 11px neutral-500.
  - Hover background is accent 16%. Pressed background is accent 26%.
  - Dividers are 1px `--color-divider` with a 5px 8px margin.

### Menu behavior (keyboard and ARIA)

- **AC10** Each trigger has `role="menuitem"`, `aria-haspopup="menu"`, and `aria-expanded` that matches its menu's open state. Each open dropdown has `role="menu"` and is labelled by its trigger.
- **AC11** Item roles:
  - Plain actions use `role="menuitem"`.
  - The five Windows-menu window items and "Wobbly windows" use `role="menuitemcheckbox"`.
  - "Dark mode"/"Light mode" and the three wallpaper items use `role="menuitemradio"` (two separate radio groups).
  - Checkable items expose `aria-checked` that matches the visible check.
  - Dividers are `role="separator"`.
  - The decorative check icons are hidden from assistive technology.
- **AC12** The menubar uses roving tabindex, so it adds one tab stop to the sequence. Tab reaches the triggers before any window control. ArrowLeft and ArrowRight move focus between triggers and wrap around. Home and End go to the first and last trigger.
- **AC13** With focus on a trigger:
  - Enter, Space or ArrowDown opens its menu and focuses the first item.
  - ArrowUp opens its menu and focuses the last item.
- **AC14** Inside an open menu:
  - ArrowDown and ArrowUp move between items, skip separators and wrap around.
  - Home and End jump to the first and last item.
  - Enter or Space activates the focused item.
  - ArrowRight and ArrowLeft close the menu and open the next or previous menu (wrapping), with its first item focused.
- **AC15** Escape closes the menu and returns focus to its trigger. Choosing an item, by keyboard or pointer, closes the menu and returns focus to the trigger. The exception is an item that opens or restores a window: focus may then go to that window, but it must not be lost to `<body>`. Tab or Shift+Tab out of an open menu closes it.
- **AC16** Pressing Escape when no menu is open changes nothing: no window state changes and no error.
- **AC17** Every trigger, item, link and the theme toggle shows the `:focus-visible` ring when focused by keyboard. Prototype-style `all: unset` resets must not remove it.

### Menu contents and actions

- **AC18 tanzi.os menu.**
  - "About this site" opens the `site` window and brings it to the front. Its z-index stays pinned per `zIndexFor`.
  - Then a divider.
  - Then "Restart…" (with the ellipsis character), which resets the window layout exactly like the reducer's `restart` (default positions, all five dock windows open and not minimized, `site` closed). Theme, wallpaper and wobble keep their current values.
- **AC19 Windows menu.**
  - Five items labelled with `WIN_TITLES` for hello, about, exp, proj and term, in that order. Each is checked exactly when that window is open and not minimized.
  - Choosing one opens it if closed, restores it if minimized, and brings it to the front in every case (the reducer's `open`).
  - Then a divider.
  - "Minimize all" minimizes every open window.
  - "Show all" restores every minimized window.
  - "Tidy up" applies the reducer's `tidy`: default layout, all five open, `site` closed.
- **AC20 View menu.**
  - "Dark mode" and "Light mode", with exactly one checked, matching the current theme.
  - A divider.
  - "Wallpaper: Nebula", "Wallpaper: Grid", "Wallpaper: Plain", with exactly one checked, matching the current wallpaper.
  - A divider.
  - "Wobbly windows", checked when wobble is on. Choosing it toggles wobble.
- **AC21 Help menu.**
  - "Terminal commands" opens or restores the terminal window and brings it to the front.
  - "Résumé (PDF)" opens `RESUME_URL` in a new tab (`noopener`).
  - A divider.
  - "Say hi", with the hint "email", navigates to `mailto:${EMAIL}` using the value from `data.ts`.
- **AC22** Choosing a radio item that is already checked, such as "Dark mode" while dark, leaves the state unchanged and still closes the menu.

### Theme, wallpaper, wobble

- **AC23** On first render, the React theme equals the `data-theme` value that the inline script in `index.html` set on `<html>`. There is no flash of the other theme and no second, conflicting fallback rule.
  - Startup with a stored `'light'` loads light.
  - Startup with a stored `'dark'` loads dark.
  - With nothing stored, or an invalid value, startup follows `prefers-color-scheme`.
  - If storage throws, startup uses dark.
- **AC24** Changing the theme from the View menu, the toggle or a `theme` effect does three things: it updates `<html data-theme>` straight away, it updates the toggle icon and label, and it writes `tanzi-os:theme` = `'dark'` or `'light'`. The theme toggle switches dark to light and light to dark.
- **AC25** The desktop background is `var(--wall-<wall>)` for the current wallpaper. Default is `nebula`. Changing the wallpaper writes `tanzi-os:wallpaper` = `'nebula'`, `'grid'` or `'plain'`. On load, a stored valid value is used. A missing or invalid value, or a storage exception, gives `nebula`.
- **AC26** Wobble defaults to on. Toggling it writes `tanzi-os:wobble` = `'true'` or `'false'`. On load, a stored `'true'` or `'false'` is used, and anything else (or a storage exception) gives on. The current wobble value is passed to `WindowLayer`. The hard-coded `wobble={true}` is removed, so dragging with wobble off produces no tilt.
- **AC27** Every `localStorage` read and write sits in try/catch and uses the `tanzi-os:` key prefix. When `getItem` or `setItem` throws, the app still renders and the setting still changes for the session. No other keys are written. Window layout is not persisted.
- **AC28** One path applies theme, wallpaper, open, tidy and restart changes. Both the menubar and `TerminalEffect` values go through it. A unit test shows that applying the `TerminalEffect`s `{type:'theme'}`, `{type:'wallpaper'}`, `{type:'open'}`, `{type:'tidy'}` and `{type:'restart'}` gives the same state (and the same persistence writes) as the matching menu action. `clear` stays the terminal's own concern.
- **AC29** Restart (from the menu or a `restart` effect) and Tidy up keep the current theme, wallpaper and wobble. The persisted values stay as they are.

### Clock

- **AC30** The clock shows the visitor's local time in the exact format `<Wkd> <h>:<mm> <AM|PM>`. `Wkd` is the en-US three-letter weekday (Sun to Sat). The hour runs 1 to 12 with no leading zero. Minutes are two digits. The parts are separated by single ASCII spaces, not U+202F or U+00A0. The output does not depend on the browser locale. Examples:
  - Saturday 15:42 gives "Sat 3:42 PM".
  - Monday 00:05 gives "Mon 12:05 AM".
  - Friday 12:00 gives "Fri 12:00 PM".
  - Sunday 09:07 gives "Sun 9:07 AM".
- **AC31** The formatting is a pure function covered by unit tests, including midnight, noon, 11:59 PM and every weekday. If it lives in `src/logic` it must pass the purity guard, which bans `Date`, so it would have to take plain numbers.
- **AC32** The clock is visible on first render with no blank frame. It updates on an interval of at most 15s. The interval is cleared on unmount, and StrictMode double mounting does not leak a second interval. It uses tabular numerals, neutral-300 and padding 0 6px 0 10px. It is not focusable. It is exposed as text, ideally a `<time>` element with a machine-readable `dateTime`.

### Motion and accessibility

- **AC33** Hover motion: links get `translateY(-2px) rotate(-8deg)` with the bouncy spring, and the theme toggle gets `rotate(40deg)`. Under `prefers-reduced-motion: reduce` there is no transform motion; color changes may remain. Menus open and close without animation in both modes.
- **AC34** Under reduced motion the "Wobbly windows" item still toggles and persists, but dragging never tilts. This behaviour already exists in `Window`, and AC26 must not break it.
- **AC35** WCAG AA (4.5:1 for normal text) in both dark and light, verified by unit tests using `tests/helpers/contrast.ts`. The pairs to check:
  - menu item text on `--color-surface`
  - the same text on accent 16% and accent 26% blended over surface
  - the hint (neutral-500) on surface
  - trigger labels (neutral-300) and the "tanzi.os" label (accent)
  - the clock (neutral-300)

  Measure menubar text against the menubar background composited (72% `--color-bg`) over each solid wallpaper base color it can sit on: `--color-bg`, `--color-section`, `--color-accent-900`. Icon-only links and the toggle need 3:1 for their icon color against the menubar background.

- **AC36** Minimized windows stay unreachable while a menu is open or after menu actions. "Minimize all" leaves no window control in the tab order.

### Structure and tests

- **AC37** Logic that can be pure lives in `src/logic` and is unit tested. That covers next/previous item and trigger index with wrap and separator skipping, the clock formatting, the parsing and validation of stored theme, wallpaper and wobble values, and the settings and menu state transitions. The DOM-touching `localStorage` and `document.documentElement` helpers live in one small module outside `src/logic`, with tests for valid, invalid, missing and throwing storage.
- **AC38** Component tests (Testing Library) cover AC6-AC8, AC10-AC16 and AC18-AC22. That includes the checked states updating after an action, such as minimizing hello unchecking "hello.txt".
- **AC39** Playwright e2e at 1280x720 covers:
  - opening each menu by click and by keyboard
  - Escape returning focus
  - click-outside closing the menu
  - theme switching that survives a reload
  - wallpaper switching that survives a reload
  - wobble off giving no tilt while dragging
  - Tidy up and Restart restoring the default layout while keeping theme and wallpaper
  - the clock matching `^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (1[0-2]|[1-9]):[0-5]\d (AM|PM)$`
- **AC40** Existing tests whose assumptions the menubar breaks are updated without being weakened, and each change is listed in the QA report and autobuild log as a deliberate requirement change. Known cases:
  - The page-wide "exactly 10 buttons" checks are scoped to the window layer and keep the same strictness.
  - The Tab-order e2e tests account for the menubar tab stops placed before the windows.
  - The purity `EXPECTED` list adds any new logic module.

  No test is deleted or skipped.

- **AC41** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass. No console errors or warnings appear during e2e.

## Out of scope

- The boot screen and the boot progress for Restart (T08). In T05, Restart resets the layout straight away.
- Resetting window internal state on Restart (terminal history, experience tab, verb). Those windows have no content until T07, and T08 owns Restart's full reset.
- Running `help` inside the terminal from "Terminal commands". T05 only opens and focuses the terminal. T07 adds the Terminal UI and wires the command run, using the same effect path (AC28).
- Building the Terminal UI or wiring `runCommand` to an input (T07).
- The Dock (T06).
- Window contents (T07).
- The real résumé file and real links (T10). A missing `/resume.pdf` is acceptable.
- Mobile and responsive layouts (<760px), including the hide-menus-behind-TC-mark behaviour (decision 1, T11).
- Persisting window layout (decision 4).
- Hover tooltips beyond accessible names (T09 accessibility pass).
- Menu open/close animations.
- Changing `index.html`'s inline theme script. It is kept as-is and the app must agree with it.

## Assumptions

1. **"TC mark menu" means the first menu, "tanzi.os".** The spec and prototype style it as a bold accent label with the `CircleHalf` icon, not the outlined TC monogram, which belongs to "About this site" and the boot screen. Its contents are About this site, a divider and Restart….
2. **ARIA pattern.** The WAI-ARIA menubar pattern (`menubar` / `menuitem` / `menuitemcheckbox` / `menuitemradio`) is used rather than the disclosure pattern, because the spec's accessibility note names `role="menu"` and `menuitemcheckbox`. Menu triggers are `menuitem`, not `button`, so they do not count as buttons in role queries.
3. **Focus after choosing an item.** Focus returns to the trigger. Items that open or restore a window may move focus into that window instead, which is the planner's choice, but focus is never lost.
4. **Restart in T05 resets immediately.** It reuses the reducer's `restart`, with no boot screen. T08 will insert the boot screen in front of the same path.
5. **Keeping settings across Restart.** Restart and Tidy keep theme, wallpaper and wobble (decision 3), and the prototype's reset of wobble is not copied. How settings live alongside `State` (in it or beside it) is left to the planner, as long as AC28 and AC29 hold.
6. **Storage formats.** Theme is stored as `'dark'`/`'light'` (matching the inline script), wallpaper as `'nebula'`/`'grid'`/`'plain'`, and wobble as `'true'`/`'false'`. A value is written only when the user changes the setting, so with nothing stored the theme keeps following `prefers-color-scheme` on later loads. No live listener for OS theme changes is added.
7. **Clock.** The clock uses the visitor's local time zone, a fixed en-US format and ASCII spaces. Modern ICU inserts U+202F before AM/PM, and decision 12's literal "Sat 3:42 PM" uses a plain space. A 15s interval is enough. Aligning ticks to the minute is optional.
8. **Link targets.** External http(s) links get `target="_blank" rel="noopener noreferrer"`. `mailto:` links have no target. "Résumé (PDF)" opens in a new tab. This settles the open note in design-decisions B for the menubar only.
9. **Theme toggle naming.** Its accessible name describes the action ("Switch to light mode" / "Switch to dark mode"). It is not `aria-pressed`, since it toggles between two named states. The prototype's tooltip text "Toggle theme" may be kept as the `title`.
10. **Hover-to-switch is pointer only.** Keyboard switching uses ArrowLeft and ArrowRight (AC14).
11. **Pointer-down closes the menu.** The prototype closed menus on mousedown, so outside clicks close on pointer-down rather than on click. A pointer-down on a trigger is handled by the trigger's own toggle and is not treated as outside.
12. **Contrast measurement.** The composite approach in AC35 is used because the menubar is translucent. Gradients are approximated by their solid stops, as T01 did for solid token pairs.
13. **Copy location.** All menu labels and accessible names go into `src/data.ts`, per CLAUDE.md. `WIN_TITLES` is reused for the Windows-menu items.
14. **Existing-test edits are sanctioned requirement changes.** The page-wide 10-button checks and the first-Tab-lands-on-hello e2e tests are adjusted (AC40), following the T04 precedent.

## Open questions

No blocking questions.
