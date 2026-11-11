# T15 QA report

Environment: Chromium (Playwright script, 1280x720, dark and light) against `npx vite --port 5199`; server stopped afterwards. The Playwright MCP browser was unavailable (Chrome not installed), so the manual walk used a scripted Chromium instead.

## Automated suites

- npm run lint: pass
- npm run typecheck: pass
- npm test: 56 files, 1423 tests pass
- npm run test:e2e: 267 passed (chromium and chromium-preview)
- Not run: build, format:check

## Manual walk (dark and light, identical results)

- First load: only [data-win=hello] in the DOM (AC4). Pass.
- Dock: hello pressed; about, experience, projects, terminal not pressed (AC5). Pass.
- Windows menu: five items, only hello.txt checked, plus Minimize all, Show all, Tidy up (AC6). Pass.
- "More about me", "What I've been up to", "See what I've built" open about, exp and proj. A second activation leaves the window open, not minimized, on top (AC15). Pass.
- Layout: hello spans y 72 to 545. Buttons sit on two rows (y 417-457 and 469-510) with no overlap or clipping and no inner scroll (AC17). Pass.
- Tab order: tanzi.os, LinkedIn, Email, theme toggle, hello minimize, close, build, See what I've built, More about me, What I've been up to, Say hi, then the dock (AC11). Pass.
- Tidy up opens all five (AC10). Pass.
- Restart from the menu returns to hello only, focus on tanzi.os (AC8, AC9). Pass.
- Restart from the terminal returns to hello only; the terminal closes (AC8). Pass.
- Console errors, warnings and failed requests: none.

## Notes

- A newly opened window covers part of hello, so hello buttons cannot be pointer-clicked until hello is raised. Expected overlap, not a bug.
- Minimized-then-restore via a hello button was not manually walked; it relies on the unit and e2e coverage, which passed.

## Bugs found

None.

PASS
