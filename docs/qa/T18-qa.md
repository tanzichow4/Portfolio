# T18 QA report

Method: dev server on port 5199, real Chromium via a Playwright script at 1280x720 (phone checks at 390 wide), both themes. Screenshots were viewed in dark and light. The MCP browser was unavailable (Chrome not installed), so I scripted the project's own Chromium.

## Suites

- `npm run lint`: pass. `npm run typecheck`: pass.
- `npm test`: first run 1 failed of 1588 (test name not captured, passed on both reruns, flaky). Reruns: 1588/1588.
- `npm run test:e2e` run 1: 327/327 pass.
- `npm run test:e2e` run 2: 1 failure, `start.spec.ts:219` "T15 AC15 What I've been up to never minimizes experience.log" (30s timeout). It passed when rerun alone. This is a T15 test unrelated to projects, so it is flaky and not a T18 regression, but it is worth watching.
- Not run: `npm run build`, `npm run format:check` (not requested).

## Passed (observed in browser, dark and light)

- Tile click opens the detail view in the same window. Window stays 520x385 at y 259 in list and detail. Titlebar stays `~/projects`.
- Detail content: name, desc, Capstone paragraph ("Capstone project: IoT garden monitoring with a live dashboard for 10+ sensors, built with Docker and React."), tags Docker and React. No blank or TODO text.
- Focus goes to "Back to projects" on open. Escape and the Back button both return with focus on the Indoor Garden tile. Enter and Space open and Space also goes back from the focused back button. Escape in the list does nothing (window stays open).
- Featured star: exactly one `role=img` "Featured" in the detail, a filled accent star on the tile (aria-describedby includes the star), and one on the phone page at 390 wide beside the name link. Seen with my own eyes in both dark and light: clearly visible and correctly placed.
- Scrolling: with 8 injected tiles the window stays 385x520, scrollHeight 997 vs clientHeight 345, no horizontal overflow, page does not scroll, wheel raises scrollTop to 300. Computed scrollbar-width is thin. scrollbar-color is dark `rgb(147,151,171) rgb(35,37,50)` and light `rgb(98,102,121) rgb(243,245,254)`, both token based.
- Close from detail then reopen shows the list (state resets).
- Console and network: no errors, warnings or failed requests on desktop or phone in either theme.
- Terminal `projects` output is unchanged (unit and e2e suites pass).

## Not verified by hand

- The styled scroll bar thumb was not visible in headless screenshots (overlay scroll bars). Only the computed style was checked.
- Detail Tab order and minimize/restore were covered by the passing automated suites, not by hand.
- 1920x1080 not walked.

## Bugs

No T18 bugs found.

Minor observation (not a failure, possibly pre-existing): in the light theme, tags on the list tiles show no visible pill background (neutral tag on the tile face), while in the detail view they render as pills.

RESULT: PASS (with one unrelated flaky e2e failure noted above)
