# Backlog

Work queue for `/autobuild`. Order matters: earlier tickets are foundations for later ones.
Source: section F of `docs/design-decisions.md` (decisions there are resolved, do not re-litigate).

Status markers (`/autobuild` updates these):

- `[ ]` todo
- `[x]` done (committed)
- `[!]` failed or blocked, with a one-line reason after it
- `[-]` skipped on purpose (needs a human decision)

## Tickets

- [x] T01 Theme tokens, fonts, light-mode contrast fixes, no-flash theme init (decisions 4, 11; bundle Inter via `@fontsource/inter`, remove the Google Fonts `@import`)
- [x] T02 Pure logic modules and unit tests: layout, z-order, dock click logic, drag clamp, terminal `runCommand` (decision 8: history and usage messages, no tab completion)
- [x] T03 `Desktop` reducer and wiring (decisions 5, 6, 7: position/open/minimized only, re-clamp on resize, min 1280x720)
- [x] T04 `Window` chrome: drag with pointer events, minimize/genie, close, wobble, reduced motion
- [x] T05 `MenuBar` and menus (decision 12: clock "Sat 3:42 PM", en-US)
- [x] T06 `Dock`
- [x] T07 Windows: Hello, About, Experience, Projects, Terminal, About this site (group sensibly, content from `src/data.ts`)
- [x] T08 `BootScreen` and Restart (decisions 2, 3: boot only on Restart, skipped under reduced motion, keeps theme/wallpaper/wobble)
- [-] T09 (deferred until after the MVP launch, per Tanzi) Accessibility pass (semantic HTML, labelled controls, keyboard reachable, minimized windows not focusable, WCAG AA light and dark)
- [!] needs human decision: real email, links, experience, project text and résumé PDF must come from Tanzi. T10 Content: real data, résumé, extract about copy and hello text into `src/data.ts`
- [-] T11 Responsive/mobile (<760px): needs a mini-design first, see decision 1
- [-] T12 Self-hosted deploy: server details still open (decision 9). Meta/OG tags and `<noscript>` summary (decision 10) can be split out as a new ticket if wanted
- [x] T13 Phone fallback page (<760px): a plain single-column page with name, about, experience, projects, links and résumé, from the same `src/data.ts` content, instead of the desktop (decision 13)
- [-] T14 Admin editing through a terminal command: skipped for now, per Tanzi. Needs real server-side or GitHub-backed auth, not a hidden command

## Round 2 (portfolio polish, per Tanzi)

Keep each ticket small. All copy goes in `src/data.ts`. Never invent facts, stats or links: use only what is already in `src/data.ts` or the résumés in `experience/`, and where a detail is missing leave a clearly marked `TODO(Tanzi)` field that renders nothing. Changing existing tests is allowed only where a requirement deliberately changed (mark each with `// DELIBERATE REQUIREMENT CHANGE: <reason>`), never to weaken coverage. Update the phone page (`PhonePage`) to match where the content changes. `docs/plans/` has the old requirements.

- [ ] T15 Start with only hello.txt open, plus hello.txt buttons. On first load and after Restart only the hello window is open (the rest start closed and stay reachable from the dock and menus). Hello gets a row of buttons that open windows: "See what I've built" (projects, already exists), "More about me" (about.md), "What I've been up to" (experience.log), alongside "Say hi". Buttons open and raise the window (same action path as the dock). Update `initialWindows`, the layout/dock tests and e2e that assume five open windows.
- [ ] T16 about.md rewrite and data-viz link. Replace the first paragraph with: a software engineer who enjoys seeing projects built from the ground up and making ideas come to life; fascinated by random facts and loves visualizing data (Tanzi's wording, light polish only). Keep the "Currently building…" paragraph as is. Add a button/link right below the text, "See some data viz", that opens a new placeholder window `viz` (new `WinId`, dock entry, title `dataviz`, short "Coming soon" body). Tanzi will fill that window later, so keep it a tiny self-contained component.
- [ ] T17 experience.log: bigger window and key stats. Make the window larger (still fits 1280x720 with the dock and menubar clear). Replace the one-sentence `desc` with a short list of impactful stats per role (`stats: string[]` in `data.ts`), built from figures already in the data (e.g. 33 hours to 3, +80% coverage, NL-to-SQL engine). The window body scrolls if needed. Also render the `@ Company` as a light-purple pill matching the Nocturne theme: a token in `src/theme.css`, WCAG AA text contrast in light and dark. Terminal `experience` output and the phone page keep working.
- [ ] T18 Project detail view. Clicking a project in the projects window opens an in-window detail view (back button, keyboard reachable, Escape goes back) with a longer description, tags and links, sourced from new optional `Project` fields in `data.ts` (`details`, `highlights`, `links`; fill from existing text and résumés, mark gaps `TODO(Tanzi)`). The project list scrolls (styled scroll bar from tokens) so more projects can be added. Detail view state lives in the window and resets on close. Add a `featured?: boolean` field and render a star (Phosphor `Star`, filled, with an accessible label "Featured") for featured projects. Set `featured: true` on Indoor Garden (capstone project) and say "Capstone" in its detail text. The phone page shows the star too.
