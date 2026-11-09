# T07 requirements: window contents

## Goal

Fill the six window bodies (Hello, About, Experience, Projects, Terminal, About this site) with the spec's content and interactions, all copy coming from `src/data.ts` and all internal state living in the window components. Connect the terminal to the existing `runCommand`, history and effect path, including Help → Terminal commands, and correct the estimated window heights against the real windows at 1280x720.

## Current state (observed, so the planner does not redo finished work)

- `src/windows/*.tsx` are stubs returning `null`. `WindowLayer` renders `Window` with no children and passes no dispatch to window bodies.
- `Window` already provides the chrome, `inert` when minimized, focus raising and a `.win-body` slot. It sets `user-select: none` inline on the whole window and `min-height` to `WIN_META[id].height`, so a nominal height larger than the content leaves a blank band.
- Closing unmounts a window (`key={id}`, filtered on `open`), so decision 5 follows if state stays in the component. Minimizing keeps it mounted.
- `runCommand`, `PROMPT`, `TERMINAL_BANNER` (`src/logic/terminal.ts`), `emptyHistory`, `pushHistory`, `historyUp`, `historyDown` (`src/logic/history.ts`), `effectToAction` (`src/logic/system.ts`) and `linkAttrs` (`src/logic/menu.ts`) exist and are tested. `clear` maps to no app action and is the terminal's own concern.
- The Help → Terminal commands item only dispatches `{ type: 'open', id: 'term' }`. T05 left running `help` to this ticket.
- `data.ts` has `NAME`, `ROLE`, `EMAIL`, `VERSION`, `EXP`, `PROJECTS`, `FACTS`, `VERBS`, `LINKS`. It has no hello copy, about copy, or About this site copy.
- Nominal heights are estimates: hello 420, about 460, exp 300, proj 330, term 310, site 340. Rough sums from the spec suggest about, term and site are noticeably too tall.
- The global reduced-motion rule only shortens durations, so hover transforms must be removed explicitly (`MenuBar.css` and `Dock.css` are the precedent).

## Acceptance criteria

### A. Shared: content source, mounting, state

- **AC1** Each open window renders its own body inside its `Window`. No placeholder or empty body remains.
- **AC2** All visible copy, accessible labels and hrefs in the window bodies come from `src/data.ts`. This includes the new hello copy, about copy (with its emphasized phrases) and About this site copy, plus the labels added by this ticket. T10 can replace the copy by editing `data.ts` alone. The email is used only through `EMAIL` or `LINKS`, and the existing email-appears-once test still passes.
- **AC3** Internal state resets on close and survives minimize:
  - Close then reopen returns the verb to `VERBS[0]`, the experience tab to the first entry, and the terminal to the banner alone with empty input and empty command history.
  - Minimize then restore, Minimize all then Show all, and Tidy up on a window that stays open all keep that state, including text typed but not yet submitted.
- **AC4** `State` in `types.ts` and the `Desktop` reducer gain no field holding terminal lines, command history, input text, selected tab or verb.
- **AC5** Typing in the terminal input dispatches no `Desktop` action and does not re-render `Desktop`, `MenuBar` or `Dock`.
- **AC6** A pointer drag that starts in any window body does not move the window. Pointer-down in a body still raises the window (existing behaviour).
- **AC7** The body of every window uses tokens only, with no hard-coded colours, and renders correctly in both themes.
- **AC8** Under `prefers-reduced-motion: reduce`, no transform is applied on hover or press to any element in AC15, AC17, AC21, AC24, AC29 or AC33. Colour, background and shadow changes may remain.
- **AC9** Every element that translates on hover (name letters, hello buttons, fact chips, experience tabs, project tiles) is hover-stable. With the pointer resting anywhere in its at-rest box, including the bottom edge, it settles in its hover pose and does not flicker. A click anywhere in the at-rest box of an interactive element activates it.
- **AC10** Every interactive element in the window bodies is reachable by keyboard in visual order and shows the `:focus-visible` ring, not clipped by the window's `overflow: hidden`. Controls styled without native chrome (the verb, the tabs, the terminal input) keep the ring. Minimized windows contribute no tab stops.
- **AC11** Tab stops in DOM order are:
  - hello: Minimize, Close, verb, See what I've built, Say hi
  - about: Minimize, Close
  - experience: Minimize, Close, selected tab, tab panel
  - projects: Minimize, Close, four tiles
  - terminal: Minimize, Close, input
- **AC12** Text contrast is verified by unit tests using `tests/helpers/contrast.ts`, in dark and light, at 4.5:1 or better for every text pair added here, including composited backgrounds:
  - each terminal tone (`cmd`, `out`, `dim`, `acc`) and the prompt on `--color-surface`
  - the active experience tab label on its tinted background
  - inactive tab, date and description on `--color-surface`
  - project description on `--color-bg`
  - `tag-accent` and `tag-neutral` text on their backgrounds
  - hello accent line, hint and verb on `--color-surface`
  - "See what I've built" label at rest, hovered and pressed
  - The active tab and the primary button's hover and pressed states fail with the spec's `--color-accent` on a tint (about 4.0:1 for the dark active tab by hand calculation). They must be corrected with existing tokens, without changing token values.

### B. Hello

- **AC13** The body has padding 34px 38px. The greeting "Hi, my name is" is 15px accent, preceded by a 22px waving hand. The hand rotates −28° on hover and is hidden from assistive technology.
- **AC14** The name is an `<h1>` at 58px, weight 500, −0.04em, line-height 1.02, on exactly two lines: the first word of `NAME`, then the rest of `NAME` followed by a period. Its accessible name is exactly `NAME`. Each letter is its own inline-block element hidden from assistive technology.
- **AC15** Hovering a letter gives `translateY(-12px) rotate(-6deg)` and `--color-accent-400`, with `transform .45s` on `--ease-bouncy`.
- **AC16** The line "I &lt;verb&gt; stuff." is 30px, weight 500, neutral-400, and stays on one line for every entry in `VERBS`. The verb is a native `<button>` in text colour with a 3px accent underline bar. Its accessible name is exactly the current verb.
- **AC17** Clicking the verb, or pressing Enter or Space on it, advances through `VERBS` in order and wraps from the last to the first. It has `rotate(-4deg) scale(1.06)` on hover and `scale(.92)` while pressed. The window's height does not change as the verb changes.
- **AC18** The hint "psst — click the verb" is 12px neutral-500 with an aria-hidden cursor-click icon.
- **AC19** "See what I've built" is a native button (`.btn-primary`) that opens or restores the projects window and brings it to the front. Hello stays open.
- **AC20** "Say hi" is a link (`.btn-secondary`) to `mailto:` plus `EMAIL`, with no `target`, and changes no window state.
- **AC21** Both buttons have gap 12px, margin-top 28px, padding 11px 18px, radius 10px. On hover they use `translate(-3px,-3px)` and `box-shadow: 3px 3px 0 0` in accent (primary) or neutral-700 (secondary). While pressed they return to no offset and no shadow. Both animate transform and box-shadow over .35s on `--ease-spring`.

### C. About and About this site

- **AC22** about.md has padding 22px 24px 24px and 14px/1.65 neutral-400 text, with the emphasized phrases in `--color-text`. The text can really be selected by dragging in a browser, and the selection stays after the pointer is released.
- **AC23** `FACTS` render as a list of pills in `FACTS` order: padding 6px 11px, radius 999px, `--color-bg`, `--shadow-sm`, 12.5px neutral-300, with an aria-hidden accent icon.
- **AC24** Hovering a pill gives `rotate(-4deg) translateY(-3px)` on `--ease-bouncy`.
- **AC25** About this site has body padding 26px 24px 24px and shows, in order: the 52px "TC" mark (radius 14px, 1px accent outline, accent text at 18px weight 600, hidden from assistive technology), the title "tanzi.os" (18px, weight 500, a heading), and "Version " plus `VERSION` plus " · Portfolio edition" (12px neutral-500).
- **AC26** A short description follows the version line (13px/1.6 neutral-400). Hovering the mark gives `rotate(-14deg) scale(1.1)` over .6s on `--ease-bouncy`.

### D. Experience and Projects

- **AC27** experience.log has a 150px tab rail with an inset right divider, and a detail panel with minimum body height 250px. There is one tab per `EXP` entry, in order, labelled with `org`. The first is selected on open.
- **AC28** Tabs follow the tabs pattern: `tablist` with vertical orientation and an accessible name, `tab` with `aria-selected`, `tabpanel` labelled by its tab and focusable. Only the selected tab is a tab stop. ArrowDown and ArrowUp move and select with wrap-around, Home and End go to the first and last, and focus follows.
- **AC29** Tabs are padding 9px 12px, radius 8px, 13px weight 500. Active has an accent-family label (AC12), accent background at 12% and `inset 2px 0 0` accent. Inactive is neutral-500. Hover gives `translateX(4px)` on `--ease-spring`.
- **AC30** The panel shows the selected entry only:
  - role at 17px weight 500 as a heading, plus "@ org" in accent
  - date at 11px, uppercase via CSS, 0.08em, weight 600, neutral-500
  - description at 13.5px/1.6 neutral-400
  - one `.tag.tag-accent` per technology
  - Panel text is selectable by dragging. Switching tabs does not change the window's height with the current content.
- **AC31** The projects window shows `PROJECTS` in `PROJECTS` order as a list in a two-column grid, gap 10px, padding 14px. Each tile is one link: padding 14px, radius 8px, `--color-bg`, a 22px accent icon, a 13px arrow-up-right in neutral-500, name 14px weight 500 as a heading, description 12px neutral-500, and `.tag.tag-neutral` tags at 10px with padding 2px 7px.
- **AC32** Each tile's `href` comes from `PROJECTS`, and its target and rel come from `linkAttrs`. Icons are hidden from assistive technology. The link's accessible name contains the project name and description with the words separated, never run together.
- **AC33** Hovering a tile gives `translateY(-5px) rotate(-1.5deg)` and `--shadow-md`. While pressed it is `scale(.97)`.
- **AC34** The projects titlebar visibly reads `~/projects`, as in the spec and prototype. The window's accessible name, its Minimize and Close labels, the dock label and the Windows menu entry all stay `projects`. The display string lives in `data.ts`.

### E. Terminal

- **AC35** The body is 230px tall and scrolls vertically, padding 14px 16px, `13px/1.6` in `--font-mono`. It opens with `TERMINAL_BANNER` and an empty input.
- **AC36** The input row shows the prompt from `PROMPT` in accent, then an unstyled input with an accent caret, `--color-text`, and spellcheck, autocomplete and autocapitalize off. The input has an accessible label. Output is exposed as a labelled `log` that does not contain the input.
- **AC37** Line colours follow `tone`: `cmd` `--color-text`, `out` neutral-300, `dim` neutral-500, `acc` accent-400. Lines preserve spacing (`pre-wrap`) so `padEnd` columns stay aligned.
- **AC38** Lines are rendered as plain text: an entered `<b>x</b>` appears literally. A long command with no spaces wraps, with no horizontal scrollbar.
- **AC39** Enter runs the input through `runCommand`, appends the returned lines, clears the input and applies every effect once. Non-clear effects go through `effectToAction` and the existing dispatch path, so `theme` and `wallpaper` persist exactly as the menu's do.
- **AC40** Each command has its observable result:
  - `open <file>` opens or restores that window and brings it to the front
  - `theme` and `wallpaper` change the setting
  - `tidy` resets the layout
  - `clear` removes all lines including the banner, and keeps the command history
  - an empty Enter prints only the prompt line
  - bad arguments print the existing usage messages
- **AC41** After any command except `restart`, focus stays in the input.
- **AC42** New output scrolls the body to the bottom, so the input row stays visible.
- **AC43** Up and Down use the existing history functions: Up recalls older commands, Down recalls newer and finally restores the in-progress draft. The caret ends at the end of the text. Tab does not complete: it moves focus out as usual.
- **AC44** A plain click anywhere in the body focuses the input. A drag that selects output text keeps the selection and does not move focus to the input.
- **AC45** Help → Terminal commands opens or restores the terminal, brings it to the front and runs `help` exactly once per activation, including under React StrictMode:
  - From closed, the result is the banner, then the echoed `help` and its output.
  - From open or minimized, the output is appended and earlier lines and unsent input are kept.
  - Two activations produce two runs.
  - The run is not added to the Up/Down history.
- **AC46** The terminal does not take focus on page load or when opened from the dock or menu.

### F. Window heights and layout

- **AC47** At 1280x720 with the current `data.ts`, each window's rendered height is within 2px of its `WIN_META` height, with no blank band below the content. For experience this holds on every tab.
- **AC48** With corrected heights, the existing layout formulas are unchanged and every default window's real rectangle stays above the dock's top edge at 1280x720 and at a larger viewport. About this site keeps its existing position formula.

### G. Tests and quality

- **AC49** Component tests (Testing Library) cover AC2-AC5, AC14, AC16, AC17, AC19, AC20, AC27, AC28, AC30, AC32, AC34-AC41, AC43, AC45 and AC46.
- **AC50** Playwright at 1280x720 covers:
  - real rendered heights and dock clearance (AC47, AC48)
  - real text selection in about, the experience panel and the terminal (AC22, AC30, AC44)
  - auto-scroll (AC42) and focus retention (AC41)
  - hover poses and hover stability (AC9), and reduced motion (AC8)
  - full Tab order (AC11) and tab keyboard navigation (AC28)
  - the terminal changing theme and opening a window end to end
  - Help → Terminal commands from closed, minimized and open (AC45)
  - close and reopen reset (AC3)
- **AC51** QA visually compares all six windows against the prototype in both themes and records the result in the QA report.
- **AC52** Existing tests whose assumptions this ticket breaks are updated without being weakened, and each change is commented and listed in the QA report and autobuild log as a deliberate requirement change. No test is deleted or skipped. Known cases:
  - `tests/Desktop.wiring.test.tsx` (10 window buttons, exactly two buttons per window, `.win-title` equal to the title): windows now have 12 buttons in total, with hello's two extra pinned, and the projects titlebar reads `~/projects`.
  - `tests/e2e/chrome.spec.ts` (10 window buttons, 16 on the page, Tab-count tests, the position in the comment near line 459): now 12 and 18.
  - Default positions pinned in `tests/e2e/desktop.spec.ts`, `tests/e2e/menubar.spec.ts` and `tests/logic/layout.test.ts`, if the corrected heights move them.
  - Tab-count tests in `tests/e2e/dock.spec.ts` and `tests/e2e/menubar.spec.ts`.
  - `tests/logic/menu.test.ts` for Terminal commands, only if its action shape must change. It must still open the terminal.
- **AC53** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e` all pass. No console errors or warnings appear during e2e.

## Out of scope

- `BootScreen`, and Restart's full reset of internal window state (T08, as T05 assigned it). Until then `restart` runs the existing layout reset, and terminal, tab and verb state may survive it. Tests must not pin that state surviving.
- The app-wide accessibility pass (T09), including moving focus into a window when it opens or returning focus when it closes.
- Replacing placeholder content, the real résumé, real URLs, and re-measuring heights after real content lands (T10).
- Mobile and touch-specific behaviour (T11).
- Tab completion (decision 8), and any new terminal command or new argument to `open`, such as `terminal` or `site`.
- Changing `runCommand` output, moving terminal strings out of `src/logic/terminal.ts`, or changing token values.
- A scrollback or history length cap.
- Window resizing, internal scrolling for windows other than the terminal, and changes to drag, genie or z-order rules.
- Editing `docs/design-decisions.md`.

## Assumptions

1. **Where copy lives.** CLAUDE.md requires all content in `data.ts`, so T07 adds the prototype's hello, about and site copy there now. T10 then only swaps values.
2. **Restart.** T05's requirements and the backlog give the full reset to T08, so it is not duplicated here. T08 must reset verb, tab and terminal state to meet decision 3.
3. **Tidy up does not reset internal state** of windows that stay open. Only decision 5's close and decision 3's Restart reset it. Tidy reopens closed windows, which start fresh.
4. **`~/projects`.** The README heading and prototype titlebar both use it, while T03/T04 shipped `projects`. Only the visible titlebar changes, because the dock, menu and accessible names are specified or tested as `projects`.
5. **Heights.** `WIN_META` is corrected to measured values rather than dropping `min-height`, so layout maths use real sizes (decision 7). The T02 6px terminal offset should then disappear.
6. **Verb name.** The accessible name is the verb itself, so the visible label matches the name. The prototype's "Click me" title may stay as a description.
7. **Tabs.** The spec calls them tabs, so the ARIA tabs pattern is used now rather than left to T09. Selection follows focus. The panel is focusable because it has no focusable content.
8. **Headings.** Hello is the only `h1`. Experience role, project names and the site title are lower-level headings, styled as the spec says.
9. **Terminal focus ring.** "Unstyled input" is read as no border or background. The spec's global focus rule still applies, so the ring stays. T09 may revisit it.
10. **Help run and history.** The menu's `help` is not typed by the user, so it is not added to Up/Down history. Its echo is shown, as in the prototype.
11. **No autofocus.** The prototype has none, and taking focus on load would raise the terminal over Hello.
12. **Links.** Project tiles use `linkAttrs`, matching the T05 and T06 link rule, rather than the prototype's unconditional `target="_blank"`. The placeholder `#` hrefs therefore get no target until T10 supplies real URLs.
13. **Contrast corrections (AC12).** CLAUDE.md requires AA and decision 11 sets the precedent, so the spec's accent on tinted backgrounds gives way where it fails. Only the affected text changes, using existing tokens.
14. **Hover stability (AC9)** extends T06's AC18 to window contents, because the spec's lifts cause the same flicker.
15. **Selectable areas** follow the prototype and section D: about body, experience detail and terminal. Hello and About this site stay non-selectable.
16. **`.tag-neutral` in light mode.** Its background equals the tile's `--color-bg`, so the chip shape disappears, though the text passes AA. Kept as specified and noted for T09.
17. **Existing-test edits are sanctioned requirement changes,** following the T04-T06 precedent (AC52).

## Suggested grouping for the plan

Each group can be one or more small tasks, in this order:

1. Section A foundations: `data.ts` copy, per-window body mounting and dispatch access.
2. Section C: About and About this site (static content).
3. Section B: Hello.
4. Section D: Experience and Projects (`data.ts`-driven lists).
5. Section E: Terminal, then the Help → Terminal commands wiring.
6. Section F: height correction, then the Section G test updates that depend on it.

## Open questions

No blocking questions.
