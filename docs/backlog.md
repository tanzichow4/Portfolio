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
- [ ] T08 `BootScreen` and Restart (decisions 2, 3: boot only on Restart, skipped under reduced motion, keeps theme/wallpaper/wobble)
- [-] T09 (deferred until after the MVP launch, per Tanzi) Accessibility pass (semantic HTML, labelled controls, keyboard reachable, minimized windows not focusable, WCAG AA light and dark)
- [ ] T10 Content: real data, résumé, extract about copy and hello text into `src/data.ts`
- [-] T11 Responsive/mobile (<760px): needs a mini-design first, see decision 1
- [-] T12 Self-hosted deploy: server details still open (decision 9). Meta/OG tags and `<noscript>` summary (decision 10) can be split out as a new ticket if wanted
- [ ] T13 Phone fallback page (<760px): a plain single-column page with name, about, experience, projects, links and résumé, from the same `src/data.ts` content, instead of the desktop (decision 13)
- [-] T14 Admin editing through a terminal command: skipped for now, per Tanzi. Needs real server-side or GitHub-backed auth, not a hidden command
