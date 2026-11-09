# T07 plan: window contents

Source: `docs/plans/00-requirements.md` (Current state, Assumptions 1-17, AC1-AC53), `CLAUDE.md`, `docs/design-decisions.md` (decisions 1, 3, 5, 7, 8, 11; sections B, C, D), `design_handoff_tanzi_os/README.md` and the prototype's window markup. Existing code read: `src/{Desktop,Window,WindowLayer,MenuBar,data,theme.css,types}`, `src/logic/{terminal,history,system,menu,layout,windows,desktop,drag,motion}.ts`, `src/hooks/useDrag.ts`, `eslint.config.js`, `vite.config.ts`, and every test that pins buttons, Tab order, heights or positions.

T1-T12 below are tasks inside ticket T07, not backlog tickets.

## 1. Goal and scope

**Goal.** Fill the six window bodies (Hello, About, Experience, Projects, Terminal, About this site) with the spec's content and interactions, all copy coming from `src/data.ts` and all internal state living in the window components. Connect the terminal to the existing `runCommand`, history and effect path, including Help → Terminal commands, and correct the estimated window heights against the real windows at 1280x720.

**Out of scope** (carried over):

- `BootScreen`, and Restart's full reset of internal window state (T08). Until then `restart` runs the existing layout reset, and terminal, tab and verb state may survive it. Tests must not pin that state surviving.
- The app-wide accessibility pass (T09), including moving focus into a window when it opens or returning focus when it closes.
- Replacing placeholder content, the real résumé, real URLs, and re-measuring heights after real content lands (T10).
- Mobile and touch-specific behaviour (T11).
- Tab completion (decision 8), and any new terminal command or new argument to `open`, such as `terminal` or `site`.
- Changing `runCommand` output, moving terminal strings out of `src/logic/terminal.ts`, or changing token values.
- A scrollback or history length cap.
- Window resizing, internal scrolling for windows other than the terminal, and changes to drag, genie or z-order rules.
- Editing `docs/design-decisions.md`.

## 2. Acceptance criteria

Copied from `00-requirements.md` with the same numbers. One AC is added (AC54, marked). Other gaps are handled by the decisions in section 8 and by the extra test edits in section 7a, which AC52's general rule already covers.

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
- **AC54 (added)** Under `prefers-reduced-motion: reduce`, hovering the waving hand (AC13) or the "TC" mark (AC26) applies no transform. AC8's list omits these two, and CLAUDE.md requires reduced motion to be respected.

## 3. Architecture

**Approach.** Each body is a self-contained component holding its own state with `useState`, so decision 5 and AC3 follow from `key={id}` unmounting on close and staying mounted on minimize. `Desktop` gains no window-content state. Terminal logic reuses `runCommand`, the history functions and `effectToAction` unchanged.

**Mounting (AC1).** `WindowLayer` gains one optional prop, `renderBody?: (id: WinId) => ReactNode`, and renders `{renderBody?.(id)}` as the `Window`'s children. `Desktop` supplies it. It must stay optional, and `dispatch` on `WindowLayer` must stay `Dispatch<DesktopAction>`. `tsconfig` includes `tests/`, and the harnesses in `tests/WindowLayer.test.tsx` and `tests/MenuBar.test.tsx` pass no bodies and a narrower dispatch. Changing the type would break typecheck, so this choice also keeps those files untouched.

**Help → Terminal commands (AC45).** A closed terminal has no instance to call, and calling `setState` directly in an effect fails lint (`react-hooks/set-state-in-effect`, enabled by the recommended config). The design is a small channel:

- `createHelpChannel(): HelpChannel` in `src/logic/terminal.ts`, with `request(): void` and `subscribe(run: () => void): () => void`. It keeps one optional listener and a pending count.
- `request` calls the listener if there is one. Otherwise it increments `pending`.
- `subscribe` stores the listener, calls `run` once per pending request, sets `pending` to 0, and returns an unsubscribe that clears the listener.
- `Desktop` holds it with `const [helpChannel] = useState(createHelpChannel)`. No re-render is needed for a request.
- `Terminal` calls `useEffect(() => helpChannel?.subscribe(runHelp), [helpChannel, runHelp])`. `runHelp` is a stable `useCallback` that does `setLines((prev) => [...prev, ...runCommand('help').lines])` and does not touch history.
- From closed, the request waits as pending until the terminal mounts. From open or minimized, it runs immediately. StrictMode's second subscribe finds `pending` at 0, so it runs once.
- `menuModel`'s Terminal commands entry keeps its action and adds one field: `cmd: { type: 'action', action: { type: 'open', id: 'term' }, runHelp: true }`. `MenuCmd`'s action variant gains `runHelp?: true`. `tests/logic/menu.test.ts` uses `toMatchObject`, so it needs no edit.
- `MenuBar` gains optional `onTerminalHelp?: () => void`. In `choose`, after dispatching, it calls `onTerminalHelp?.()` when `item.cmd.runHelp` is set.

**The host and face split (AC9), carried over from T06.** A translated element moves away from the pointer and flickers. So every element in AC9 has a static host, which is the semantic or interactive element and owns the at-rest box, and a child face, which paints and transforms and has `pointer-events: none`. Hover and active selectors go on the host and style the face.

**Contract for coder and test-writer: where each AC property lives.**

| Element        | Host (static, hit box, ARIA, focus ring)            | Face (paint, padding, `transform`, `transition`)                               |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Name letter    | `span.hello-letter`                                 | `span.hello-letter-face` (colour, transform)                                   |
| Hello buttons  | `button.hello-cta` (`type="button"`), `a.hello-cta` | `span.btn.btn-primary.hello-cta-face`, `span.btn.btn-secondary.hello-cta-face` |
| Fact pill      | `li.fact`                                           | `span.fact-face`                                                               |
| Experience tab | `button.exp-tab` (`role="tab"`, `type="button"`)    | `span.exp-tab-face`                                                            |
| Project tile   | `a.proj-tile` inside `li`                           | `div.proj-face`                                                                |

- A hovered host's own computed `transform` stays `none`; tests read the face. Faces are in normal flow, so the host shrink-wraps them (the dock's faces were absolute because its hosts had a fixed size). Hosts reset `padding: 0; border: 0; background: transparent; appearance: none; color: inherit; font: inherit; text-decoration: none`, and carry the same radius as the face so the ring follows it.
- `.btn-primary:hover` in `theme.css` cannot match a `pointer-events: none` face, so `Hello.css` declares hover and active backgrounds on `.hello-cta:hover .btn-primary` and the equivalents.
- The verb, hand and "TC" mark rotate or scale but do not translate, so they are outside AC9 and transform themselves.
- Tests must click hosts, not faces, because user-event rejects `pointer-events: none` targets.

**Files and public surface.**

- `src/data.ts` (edit, T1). Add, with the prototype's copy verbatim:
  - `HELLO_COPY = { greeting, verbPrefix: 'I', verbSuffix: 'stuff.', hint, primary, secondary }`
  - `ABOUT_COPY`: an array of paragraphs, each an array of `{ text: string; em?: true }`
  - `SITE_COPY = { mark: 'TC', title: 'tanzi.os', versionPrefix: 'Version ', edition: ' · Portfolio edition', desc }`
  - `EXPERIENCE_LABELS = { tablist: 'Experience', at: '@' }`
  - `TERMINAL_LABELS = { input: 'Terminal command', log: 'Terminal output' }`
  - `WIN_BAR_TITLES: Partial<Record<WinId, string>> = { proj: '~/projects' }`
- `src/windows/WindowBody.tsx` (new, T1). Default export `WindowBody({ id, dispatch, helpChannel }: { id: WinId; dispatch: Dispatch<AppAction>; helpChannel?: HelpChannel })`, a switch on `id`.
- `src/windows/{Hello,About,AboutSite,Experience,Projects,Terminal}.tsx` (replace stubs) with one matching `.css` each. Hello takes `dispatch`. Terminal takes `dispatch` and `helpChannel?`. The others take no props.
- `vite.config.ts` (edit, T1). Add `/src\/windows\/\w+\.css/` to `test.css.include`. Without it those stylesheets are not processed in Vitest (as `Window.css`, `MenuBar.css` and `Dock.css` needed). This is the only non-`src` source edit.
- `src/Window.tsx` (edit, T7). The visible title becomes `WIN_BAR_TITLES[id] ?? title`. The `aria-label`, button labels and everything else keep using `title`. Body-level `user-select` is applied by each selectable area and `Window`'s inline `user-select: none` stays.
- `src/logic/windows.ts` (edit in T2, T3, T4, T6, T7, T9): `WIN_META` heights, one per task.
- `src/logic/menu.ts`, `src/MenuBar.tsx`, `src/logic/terminal.ts`, `src/Desktop.tsx` (edits, T1 and T11).
- No new file in `src/logic/`, because `tests/logic/purity.test.ts` pins the exact module list. Reuse `wrapIndex` from `logic/menu.ts` for the verb and tabs.

**Markup notes that are easy to get wrong.**

- **Terminal structure.** `div.term-body` (the 230px scroller, `onClick` focus) contains `div[role=log]` and then the input row. The scroller must contain the input, and the log must not scroll on its own: Chromium makes a scroller with no focusable child a Tab stop, which would break AC11.
- **Hello h1.** `h1[aria-label=NAME]` contains two `span.hello-line` (`aria-hidden="true"`, `display: flex`). The lines come from `NAME`: first word, then the rest plus `.`. Hosts use `white-space: pre` so a space in a later name keeps its width.
- **Verb.** No `all: unset`. Reset explicitly and set `letter-spacing: inherit; line-height: inherit`. Draw the 3px bar with `::after` so the accessible name stays exactly the verb. Omit `aria-label` and `title`.
- **Hello row.** `white-space: nowrap`, so AC16 holds for every verb.
- **Tile accessible name.** Use block `h2` and `p`, and render a literal `{' '}` between tag spans so tag names do not run together. Do not use `aria-label` on the tile. Whitespace is ignored by the flex container.
- **Tabs.** Roving `tabIndex` on the hosts; `id="exp-tab-${i}"`, `aria-controls="exp-panel"`; one `div#exp-panel[role=tabpanel][tabIndex=0]` with `aria-labelledby` set to the selected tab. Focus moves in the key handler through a ref array, as `MenuBar` does.
- **Panel ring.** The panel touches the window's right and bottom edges, so it needs `outline-offset: -2px` or the window's `overflow: hidden` clips it (AC10).
- **Headings.** Only Hello has `h1`. Role, project name and site title are `h2`. Every heading resets `margin: 0; line-height: inherit` and sets its own size and letter-spacing, because `theme.css` sets `line-height: 1.12`, a margin and letter-spacing.
- **Selectable areas.** `-webkit-user-select: text; user-select: text` on `.about-body`, `.exp-panel` and `.term-body`.
- **Terminal input.** `PROMPT.trimEnd()` beside a `gap: 8px`, matching the prototype and aligning with the echoed lines. Input: `flex: 1; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--color-text); caret-color: var(--color-accent); font: inherit`. `aria-label={TERMINAL_LABELS.input}`, `spellCheck={false}`, `autoComplete="off"`, `autoCapitalize="off"`. No `autoFocus` (AC46). No `<form>`.
- **Terminal lines.** `white-space: pre-wrap; overflow-wrap: anywhere`, `.term-body { overflow-x: hidden; overflow-y: auto }`, one class per tone. React text children only, never `dangerouslySetInnerHTML`.
- **Terminal submit, in the key handler (not in an updater or effect, so effects run once).** Ignore Enter when `nativeEvent.isComposing`. Call `runCommand(input)`, append `lines` (or replace with `lines` when a `clear` effect is present), `setHistory(pushHistory(history, input))`, `setInput('')`, then dispatch each non-null `effectToAction(e)`.
- **History keys.** `preventDefault`, then apply `historyUp` or `historyDown`. If the value changed, set a ref flag read by a `useLayoutEffect` (no deps, as `MenuBar` does) that calls `setSelectionRange(len, len)`. If it did not change, call `setSelectionRange` directly, otherwise the flag would stay set and move the caret on the next keystroke.
- **Click focus (AC44).** In the scroller's `onClick`, do nothing if the target is the input or if `window.getSelection()?.isCollapsed === false`. Otherwise focus the input.
- **Auto-scroll (AC42).** `useLayoutEffect` on `[lines]` sets `scrollTop = scrollHeight`.

**Contrast corrections (AC12), hand-calculated, using existing tokens only.**

| Pair                                         | Spec colour fails            | Use                  | Dark    | Light |
| -------------------------------------------- | ---------------------------- | -------------------- | ------- | ----- |
| Active tab label on accent 12% over surface  | `--color-accent` (dark 3.97) | `--color-accent-400` | 6.2     | 4.6   |
| Primary button label, hovered, on accent 12% | `--color-accent` (dark 3.97) | `--color-accent-300` | above 7 | 5.3   |
| Primary button label, pressed, on accent 22% | `--color-accent` (dark 3.4)  | `--color-accent-300` | above 7 | 4.6   |

`--color-accent-400` is not enough for pressed in light (4.0), which is why the button uses 300. All the other AC12 pairs pass with their specified tokens. If a test still fails, use the nearest existing token that passes in both themes and log it. Add no tokens.

**Data and API changes.** `data.ts` constants above; `createHelpChannel` and `HelpChannel`; `MenuCmd.runHelp`; optional `renderBody` and `onTerminalHelp` props; `WIN_META` heights. `State`, `DesktopAction`, `AppAction` and the reducers do not change (AC4). No network, env or storage change.

**Dependencies.** None added. The extra Phosphor icons (`CursorClick`, `FolderOpen`, `ArrowUpRight`, `HandWaving`) are imported directly by the components that use them.

## 4. Design

**User flow.** On load all five windows show real content. Clicking the verb cycles it. "See what I've built" brings projects forward. Experience tabs switch the detail, by mouse or arrow keys. Project tiles open their links. The terminal accepts the spec's commands and can drive the desktop. Help → Terminal commands raises the terminal and prints the help text.

**States.**

- Loading: none. Content is synchronous and fonts swap in as before.
- Empty: the terminal after `clear` has no lines and only the input row. Lists are non-empty with the current data.
- Error: bad commands print the existing usage or "command not found" lines. A missing mail handler or blocked tab is left to the browser and does not change desktop state.
- Success: each interaction's visible result is listed in its AC.
- Interaction: hover (stable lift), pressed, keyboard focus (ring on the static host, no lift, as T06 decided).

**1280x720 and larger.** Default layouts come from unchanged formulas with corrected heights. Estimated window heights and positions at 1280x720:

| Window | Height                  | y at 720            | Note                            |
| ------ | ----------------------- | ------------------- | ------------------------------- |
| hello  | about 420               | 72                  | measure                         |
| about  | about 340 (was 460)     | 64                  | measure                         |
| exp    | 290 (40 titlebar + 250) | 354 (was 344)       | fixed by AC27 if the panel fits |
| proj   | about 376 (was 330)     | about 268 (was 300) | measure, bottom is 644          |
| term   | 270 (40 + 230)          | 340 (was 334)       | fixed by AC35                   |
| site   | about 290 (was 340)     | 180                 | position formula unchanged      |

**Measurement rule.** The coder sets each height in the same task as the body, using Chromium at 1280x720 after `document.fonts.ready`, with `Math.ceil` of the settled rendered height. Rounding up matters: `yFit` places `proj` so that it ends exactly at 644, and a fractional height rounded down would overlap the dock by a sub-pixel amount and fail the strict T06 AC2 test. Mobile is not built (decision 1).

**Accessibility.** Native controls. AC28 tabs pattern. Labelled `log` and input. `h1` with an exact name over `aria-hidden` letters. Icons and the mark are `aria-hidden`. Rings come from the global `:focus-visible` and are never removed. The ring on the terminal input shows on mouse focus too, since browsers always match `:focus-visible` on text inputs (Assumption 9).

**Reduced motion.** Each stylesheet ends with `@media (prefers-reduced-motion: reduce)` setting `transform: none` on the same hover and active selectors, covering letters, verb, hello buttons, pills, tabs, tiles, hand and mark (AC8, AC54). `theme.css` only shortens durations. Colour, background and shadow changes remain.

## 5. Risk and security

Auth, secrets and server data do not apply. Storage goes only through the existing settings path.

- **R1. Terminal input rendered as markup (AC38).** Safeguard: text children only, no `dangerouslySetInnerHTML` (T9). A test enters `<b>x</b>` and asserts no `b` element exists, and a source grep covers `src/windows/`.
- **R2. Input validation.** `runCommand` already handles arbitrary strings, and its output is data. Effects are typed and only `effectToAction` maps them (T9). Length caps are out of scope.
- **R3. Reverse tabnabbing on tiles.** Safeguard: spread `linkAttrs(p.href)` and never hand-write attributes (T7). Tests pin the output for a placeholder and a stubbed `https:` href.
- **R4. Help running twice or not at all under StrictMode (AC45).** Safeguard: the channel design, whose drain makes a repeated subscribe harmless (T11). Logic tests for the channel and a StrictMode component test.
- **R5. Effects applied twice.** Safeguard: effects dispatch in the key handler, never in an updater (T9). Mock-dispatch test asserts exactly one call.
- **R6. Hover flicker at the bottom edge (AC9).** Safeguard: the host and face split (T2, T4-T8), and e2e sampling as in T06 (T5, T8).
- **R7. Reduced-motion transforms remain.** Safeguard: explicit `transform: none` blocks; raw CSS and e2e tests (T2, T3, T5, T8).
- **R8. Focus ring clipped or removed (AC10).** Safeguard: no `all: unset` or `outline: none` in `src/windows/*.css` (raw CSS test), `outline-offset: -2px` on the panel (T6), and an e2e rectangle check on each stop (T12).
- **R9. An extra Tab stop from a scroller (AC11).** Safeguard: the scroller contains the input (T9). The exact 20-stop list in T12 catches a regression.
- **R10. Windows temporarily overlapping the dock between tasks.** If proj's content landed before its height was corrected, it would reach y 676 and break T06 AC2 and the click at `b.y + b.height - 10`. Safeguard: each body task corrects its own height (a change from the suggested grouping).
- **R11. Text selection cleared by re-renders or by click focus.** Safeguard: `WindowLayer` keeps a stable DOM order, and the click handler checks the selection (T10). Real-browser e2e (T12).
- **R12. Copy hard-coded in components.** Safeguard: `data.ts` only (T1). The source check in `tests/MenuBar.test.tsx` scans all of `src/` for strings such as `Say hi`, `Terminal commands`, `Restart`, `Tidy up`, `Show all`, `Dark mode` and `Light mode`, so these must not appear outside `data.ts`, **including in comments**.
- **R13. Purity test trips on `src/logic/terminal.ts`.** Code there must not use the words `window`, `document`, `Date` or similar outside comments (T11).
- **R14. Existing tests loosened.** Safeguard: section 7a gives each edit exactly, landing in the task that causes it. Each carries a comment and is listed in the QA report and autobuild log.
- **R15. Tests activating a mail client or navigating.** Safeguard: T06's approach (jsdom `preventDefault`, e2e route stubs; never activate Say hi in e2e).

## 6. Gaps check

- **Auth:** none in this app, not applicable.
- **Validation:** terminal input is the only free text (R1, R2).
- **Error handling:** terminal failure lines. No async work. `localStorage` remains in the existing try/catch path.
- **Mobile:** out of scope (decision 1, T11).
- **Accessibility:** AC10-AC12, AC14, AC16, AC28, AC32, AC36, AC54. Focus into opened windows is T09.
- **Config and env vars:** one `vite.config.ts` test-only line. No env vars.
- **Tests:** logic, component, raw CSS, contrast, Desktop integration, e2e, and the sanctioned edits in 7a.

## 7. Tasks

Coder edits `src/` only, plus the one `vite.config.ts` line in T1. Test-writer runs after coder on each task and owns `tests/`. Each task must leave lint, typecheck and unit tests green once test-writer has finished. New tests are named with a `T07 ACn:` prefix. CSS means tokens only, with no hex or `rgb(`, no `all: unset`, no `outline: none`.

Every task whose number appears in 7a must apply exactly those edits. They are not optional and must not be deferred.

- **T1. Foundations: copy and body mounting.** ACs: AC1 (mechanism), AC2, AC4.
  - Coder: add the `data.ts` constants; add `src/windows/WindowBody.tsx` (the stubs still return `null`, and `helpChannel` is typed from a `HelpChannel` export added now to `logic/terminal.ts` with `createHelpChannel`); add `renderBody` to `WindowLayer` and supply it from `Desktop`; add the `vite.config.ts` line.
  - Test-writer: literal-value tests for the new constants, confirming `ABOUT_COPY` has at least one `em` segment; `tests/WindowLayer.test.tsx` additive case for `renderBody` receiving each open id, and no body with no prop; `tests/logic/terminal.test.ts` additive channel cases (request while unsubscribed then subscribe runs once; a second subscribe after unsubscribe runs nothing; request while subscribed runs immediately; two requests give two runs). No 7a edits.
- **T2. About body.** ACs: AC1, AC7, AC8, AC9 (structure), AC22-AC24, AC47.
  - Coder: `About.tsx` and `About.css` with hover and reduced-motion rules, and `WIN_META.about.height` per the measurement rule.
  - Test-writer: new `tests/windows/About.test.tsx` (text and order from `data.ts`, `em` phrases, list, hidden icons), raw CSS test. No 7a edits (`about` y stays 64).
- **T3. About this site body.** ACs: AC1, AC7, AC25, AC26, AC47, AC48, AC54.
  - Coder: `AboutSite.tsx` and `.css` with hover and reduced-motion rules, and `WIN_META.site.height`.
  - Test-writer: new `tests/windows/AboutSite.test.tsx`, raw CSS test including AC54. No 7a edits.
- **T4. Hello body, at rest.** ACs: AC1, AC2, AC3 (verb), AC7, AC10, AC12 (rest pairs), AC13, AC14, AC16-AC20, AC21 (layout), AC47.
  - Coder: `Hello.tsx` and `.css` without hover, active or reduced-motion rules; `WIN_META.hello.height` if measured more than 2px from 420.
  - Test-writer: apply 7a block T4. New `tests/windows/Hello.test.tsx` covers the two-line `h1` and exact name, letter count, verb wrap by click, Enter and Space, one `open proj` dispatch, the mailto link with no target, `type="button"`. New `tests/windows.contrast.test.ts` modelled on `tests/menubar.contrast.test.ts`, with the hello pairs. Raw CSS test.
- **T5. Hello motion.** ACs: AC8, AC9, AC12 (hover and pressed), AC13, AC15, AC17, AC21, AC54.
  - Coder: add hover, active and reduced-motion rules to `Hello.css`, including the AC12 hover and pressed tokens and backgrounds.
  - Test-writer: extend the raw CSS and contrast tests. New `tests/e2e/windows.motion.spec.ts` covers settled hover matrices on faces (host stays `none`), pressed pose, AC9 sampling at the bottom edge across at least 800ms and a click there (never activate Say hi; assert on `:hover` only), and reduced motion.
- **T6. Experience body, at rest, with keyboard.** ACs: AC1, AC2, AC3 (tab), AC7, AC10, AC12, AC27, AC28, AC29 (at rest), AC30, AC47, AC48.
  - Coder: `Experience.tsx`, `.css` without hover or reduced-motion rules, and `WIN_META.exp.height` = 290 unless the measurement differs.
  - Test-writer: apply 7a block T6. New `tests/windows/Experience.test.tsx` covers roles, roving tabindex, arrows with wrap, Home and End with focus following, panel labelling, one entry shown, tag classes.
- **T7. Projects body, at rest, and `~/projects`.** ACs: AC1, AC2, AC7, AC10, AC12, AC31, AC32, AC34, AC47, AC48.
  - Coder: `Projects.tsx`, `.css` without hover or reduced-motion rules, the `Window.tsx` title change, and `WIN_META.proj.height`.
  - Test-writer: apply 7a block T7 and pin the literal proj y from the measured height. New `tests/windows/Projects.test.tsx` covers order, `href`, `linkAttrs` output, separated words in the name, hidden icons, and the titlebar reading `~/projects` with every other name staying `projects`.
- **T8. Pill, tab and tile motion.** ACs: AC8, AC9, AC24, AC29, AC33.
  - Coder: add hover, active and reduced-motion rules to `Experience.css` and `Projects.css`. `About.css` already has its rules from T2.
  - Test-writer: raw CSS tests, and extend `tests/e2e/windows.motion.spec.ts` to pills, tabs and tiles (stub link navigation).
- **T9. Terminal: rendering and running commands.** ACs: AC1-AC5, AC7, AC12, AC35-AC41, AC46, AC47, AC48.
  - Coder: `Terminal.tsx` and `.css` with lines, input row, `submit` and effects, and `WIN_META.term.height` = 270 unless measured otherwise.
  - Test-writer: apply 7a block T9. New `tests/windows/Terminal.test.tsx` with mock dispatch covers banner, tones, plain text, every AC40 command, one dispatch per effect, `clear`, focus retained, no autofocus, and history kept after `clear` (via T10's test; here assert `pushHistory` behaviour only through the visible state available). New `tests/Desktop.terminal.test.tsx` covers AC3 and AC5: to assert AC5, `vi.mock` `Dock` and `MenuBar` with render-counting wrappers, because a `Profiler` above `Desktop` also fires for descendant-only commits.
- **T10. Terminal history, click focus and auto-scroll.** ACs: AC42-AC44, and AC40 (`clear` keeps history).
  - Coder: Up and Down handling with the caret rule, the scroller `onClick`, the `useLayoutEffect` scroll.
  - Test-writer: extend `Terminal.test.tsx` for Up, Down and draft restore, the caret at the end including Up at the oldest entry, Tab moving out, click focus, and focus not moving with a non-collapsed selection. No 7a edits.
- **T11. Help → Terminal commands.** ACs: AC45.
  - Coder: wire `menuModel`'s `runHelp`, `MenuBar`'s `onTerminalHelp`, `Desktop`'s channel, and `Terminal`'s subscribe effect.
  - Test-writer: extend `tests/logic/menu.test.ts` additively for `runHelp: true` on that item only. New cases in `tests/Desktop.terminal.test.tsx` under `StrictMode` cover from closed, minimized and open, unsent input kept, two activations giving two runs, and Up not recalling `help`. No 7a edits.
- **T12. Cross-window e2e and final height check.** ACs: AC3, AC6, AC10, AC11, AC22, AC30, AC41, AC42, AC44, AC45, AC47, AC48, AC50.
  - Coder: only if a measurement has drifted, correct `WIN_META`.
  - Test-writer: new `tests/e2e/windows.spec.ts` with `watchErrors` in every test, waiting for `document.fonts.ready` before measuring:
    - heights within 2px at 1280x720 and every experience tab; rectangles against the dock at 1280x720 and 1920x1080
    - real selection in about, the panel and terminal output, surviving pointer release, with focus not moving to the input
    - body drag leaves the window in place; pointer-down in a body raises it
    - exact 20-stop Tab order inside windows with locators, ring style on each, ring rectangle inside the window, stops skipped when minimized
    - tab keyboard navigation
    - auto-scroll keeps the input visible; focus stays after commands
    - `theme light` and `open projects` end to end, including `tanzi-os:theme` stored
    - Help from closed, minimized and open
    - close and reopen reset for verb, tab and terminal; minimize and Show all keep them, including unsent text

**After T12 (QA stage, no coder or test-writer work).** Run the full AC53 set. Complete AC51 in a real browser in both themes. Grep `src/windows/` for `dangerouslySetInnerHTML`, hex colours and hard-coded copy. Check that `git diff` on existing tests shows only the 7a edits and additive cases. List every 7a edit in the QA report and autobuild log.

### 7a. Existing tests this ticket changes (sanctioned, deliberate requirement changes)

These must not loosen any assertion. Every count and list stays pinned exactly. Each edit carries `// DELIBERATE REQUIREMENT CHANGE (T07 AC52): <reason>` and keeps its test title. No test is deleted or skipped. Line numbers are as of commit `1a7cbc9`.

**Tab-stop and button totals after each task.** `[data-win]` role-button and page role-button counts do not change after T4, because `role="tab"` is not `button` to `getByRole`. `querySelectorAll('[data-win] button')` does count tabs, since they are native buttons.

| After    | Window stops | Page stops | First dock index | Window + dock stops | Stops with term and about minimized | `[data-win] button` (DOM) |
| -------- | ------------ | ---------- | ---------------- | ------------------- | ----------------------------------- | ------------------------- |
| baseline | 10           | 23         | 15               | 18                  | 19                                  | 10                        |
| T4       | 13           | 26         | 18               | 21                  | 22                                  | 12                        |
| T6       | 15           | 28         | 20               | 23                  | 24                                  | 15                        |
| T7       | 19           | 32         | 24               | 27                  | 28                                  | 15                        |
| T9       | 20           | 33         | 25               | 28                  | 28                                  | 15                        |

**Block T4 (Hello).**

1. `tests/Desktop.wiring.test.tsx:80`: `toHaveLength(10)` becomes 12.
2. `tests/Desktop.wiring.test.tsx:101-104`: the expected list becomes, for hello only, `['Minimize hello.txt', 'Close hello.txt', 'build', "See what I've built"]`. Every other window keeps exactly its two. The `type="button"` loop and the two `getByRole` checks stay.
3. `tests/Desktop.menubar.test.tsx:321`: 10 becomes 12.
4. `tests/Desktop.dock.test.tsx:340,346,359`: 23 becomes 26, `slice(15)` becomes `slice(18)`, and `Set` size 23 becomes 26.
5. `tests/e2e/chrome.spec.ts:157`: 10 becomes 12. `:165`: 16 becomes 18.
6. `tests/e2e/chrome.spec.ts`, new local helper `stopNames(page, n)`. Each entry is: the element's `aria-label`; else `'tabpanel'` for `role="tabpanel"`; else the text of an `h2` inside it; else its trimmed text. Later blocks reuse it.
7. `tests/e2e/chrome.spec.ts:339-340` (AC23 Tab visits): use `stopNames(page, 13)` and expect `['Minimize hello.txt', 'Close hello.txt', 'build', "See what I've built", 'Say hi']` followed by Minimize and Close for each of the four other windows.
8. `tests/e2e/chrome.spec.ts:357-362` (AC23 Space): `stopNames(page, 7)`, with the hello five inserted before `'Minimize about.md', 'Close about.md'`.
9. `tests/e2e/chrome.spec.ts:371` (AC10): `tabLabels(page, 7)` becomes 10.
10. `tests/e2e/dock.spec.ts:614,617,618`: 23 becomes 26, `slice(15)` becomes `slice(18)`, and `Set` size 18 becomes 21.
11. `tests/e2e/dock.spec.ts:630,633`: loop 19 becomes 22, and update the comment.

**Block T6 (Experience).** The tabs are native buttons but not role buttons.

1. `tests/Desktop.menubar.test.tsx:321`: 12 becomes 15.
2. `tests/Desktop.dock.test.tsx:340,346,359`: 28, `slice(20)`, 28.
3. `tests/e2e/chrome.spec.ts` (AC23 Tab visits): 15 stops, with `'Northwind', 'tabpanel'` inserted after `'Close experience.log'`.
4. `tests/e2e/chrome.spec.ts:371` (AC10): 10 becomes 12.
5. `tests/e2e/chrome.spec.ts:313` (AC17/AC19): `tabLabels(page, 26)` becomes `tabLabels(page, 35)`. That is 30 stops with the terminal minimized in the finished page plus the same 5-stop margin, set here so it needs no further edit. After the click, Chromium's starting point can sit after the minimized window, so "Close projects" can land at stop 26 or later from this task on. All assertions stay.
6. `tests/e2e/dock.spec.ts:614,617,618`: 28, `slice(20)`, 23.
7. `tests/e2e/dock.spec.ts:630,633`: 24.
8. Positions, exp y 344 becomes 354 (or the formula result `min(380, 644 - height)` if the height differs): `tests/e2e/desktop.spec.ts:23`, `tests/e2e/menubar.spec.ts:59`.

**Block T7 (Projects).**

1. `tests/Desktop.wiring.test.tsx:96`: the expected text becomes `id === 'proj' ? '~/projects' : title`.
2. `tests/Desktop.dock.test.tsx:340,346,359`: 32, `slice(24)`, 32.
3. `tests/e2e/chrome.spec.ts` (AC23 Tab visits): 19 stops, with `'Pathfinder', 'Pantry', 'tinyq', 'dotfiles'` inserted after `'Close projects'`.
4. `tests/e2e/dock.spec.ts:614,617,618`: 32, `slice(24)`, 27.
5. `tests/e2e/dock.spec.ts:630,633`: 28.
6. Positions, proj y 300 becomes `min(300, 644 - height)` as a literal (about 268): `tests/e2e/desktop.spec.ts:24`, `tests/e2e/menubar.spec.ts:60`.

**Block T9 (Terminal).** Term y at 1920x1080 becomes 700 from the unclamped formula (1004 − 270 = 734, so the clamp no longer applies). At 1280x720 it becomes 340.

1. `tests/Desktop.dock.test.tsx:340,346,359`: 33, `slice(25)`, 33.
2. `tests/e2e/chrome.spec.ts` (AC23 Tab visits): 20 stops, adding `'Minimize terminal', 'Close terminal', 'Terminal command'` at the end in place of the two terminal entries.
3. `tests/e2e/dock.spec.ts:614,617,618`: 33, `slice(25)`, 28. Lines 630 and 633 stay at 28, because the terminal is minimized there.
4. 694 becomes 700: `tests/Desktop.wiring.test.tsx:161`, `tests/logic/desktop.test.ts:369`, `tests/logic/system.test.ts:181`, `tests/e2e/chrome.spec.ts:123`, `tests/e2e/desktop.spec.ts:50`.
5. 334 becomes 340: `tests/e2e/desktop.spec.ts:25`, `tests/e2e/menubar.spec.ts:61`.
6. `tests/e2e/chrome.spec.ts:459-460`: the comment and `translate(-390px, 346px)` become term at 810,340, `dy 720 - 40 - 340 = 340`, `translate(-390px, 340px)`.

If a measured height differs from this plan's fixed values (exp 290, term 270), derive the same literal from `layout()`'s formula, keep it a literal, and note it in the task's commit.

**Checked and needing no edit:**

- `tests/logic/layout.test.ts`: it reads `WIN_META` and has no literal positions.
- `tests/logic/menu.test.ts`: `toMatchObject` still passes with `runHelp`.
- `tests/e2e/menubar.spec.ts` Tab tests: lines 194, 267, 506, 527 and 541 only cover the menubar, a menu, or Minimize all, whose 14-press loop still covers the unchanged 13-stop cycle. Only its `REFERENCE` positions change (blocks T6, T7, T9).
- `tests/MenuBar.test.tsx:794`, `tests/WindowLayer.test.tsx` and `tests/Window.test.tsx`: their harnesses render no bodies.
- `tests/logic/windows.test.ts`: heights stay under its limit.
- `tests/logic/purity.test.ts`: no module added.
- `tests/Desktop.dock.test.tsx:93,105`: they read `WIN_META`.
- `chrome.spec.ts:282` and `menubar.spec.ts:287`: `b.height - 10` falls in proj's 14px bottom padding, not on a tile, and stays clear of other windows and the dock once proj's height is corrected.
- `dock.spec.ts` `dragTitle('proj')`: x 638 falls in the 3px gap between hello and about at both the old and new y.
- `chrome.spec.ts:254-276,326-331`: body points land on name letters or empty space, not on controls.

## 8. Open questions

None need a human. Decided unattended from the spec, decisions log and requirements:

1. **Each body task corrects its own height,** instead of one height task at the end as the suggested grouping has it. Otherwise proj would overlap the dock between tasks and break existing tests (R10).
2. **Heights are rounded up** with `Math.ceil`, because a rounded-down height would make proj overlap the dock by a fraction of a pixel.
3. **Help uses a small channel,** not `Desktop` state. It survives the closed case without storing terminal content, is StrictMode-safe, and passes the `set-state-in-effect` lint rule. The menu action shape is unchanged, so `menu.test.ts` needs no edit (AC52 allowed for one).
4. **`renderBody` is an optional prop,** so existing harnesses and `WindowLayer`'s narrower dispatch type stay untouched.
5. **Host and face everywhere AC9 applies,** so `.btn-primary`, `.btn-secondary`, pill and tile styles live on the face. AC19 and AC20's classes are therefore on the inner span, and hover backgrounds are re-declared on the host selector.
6. **`--color-accent-300` for the primary button's hover and pressed label,** and `--color-accent-400` for the active tab. These are the smallest changes that pass AA in both themes, and no token value changes.
7. **Tile accessible name comes from content,** with literal spaces between tags, rather than an `aria-label`, so tags stay available to screen readers.
8. **The verb has no `title`.** Assumption 6 says the prototype's "Click me" may stay; it is omitted because the hint already says it and it would add a second description.
9. **All names use `h2`** below Hello's `h1`, since each window is a peer region.
10. **AC54 added,** for the hand and the mark under reduced motion. It costs two selectors.
11. **The existing tests in 7a go beyond AC52's known list:** `tests/Desktop.menubar.test.tsx:321`, `tests/Desktop.dock.test.tsx` (Tab order), the three further 694 pins, and `tests/e2e/chrome.spec.ts:313`. AC52's general rule covers them, held to the same no-loosening standard. `tests/e2e/menubar.spec.ts` needs no Tab-count edit, despite being in AC52's list.
12. **Tab and panel focus raise the experience window,** as all window focus already does. No change.
