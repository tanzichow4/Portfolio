# Handoff: tanzi.os — Tanzi Chowdhury's portfolio

## Overview
A personal software-engineering portfolio presented as a tiny desktop OS. The page is a full-viewport "desktop" with a functional menubar, draggable windows (hello, about, experience, projects, terminal), a dock that opens / focuses / minimizes windows, a working terminal, dark/light themes and switchable wallpapers. Playful micro-interactions (springy buttons, jumping letters, a clickable verb) carry the personality.

## About the design files
`Tanzi OS.dc.html` is a **design reference built in HTML** — a working prototype of the intended look and behavior, not production code. Recreate it in a real codebase. No codebase exists yet, so the recommendation is:

- **Vite + React + TypeScript** (static build → deploy to Vercel / Netlify / GitHub Pages)
- Plain CSS modules or a single `tokens.css` copied from `_ds/.../styles.css` (do not add Tailwind unless you want to — the token sheet already covers everything)
- `@phosphor-icons/react` for icons
- No state library needed — `useReducer` in one `Desktop` component is enough

To view the prototype: open the folder in VS Code and serve it with any static server (e.g. the *Live Server* extension, or `npx serve .`), then open `Tanzi OS.dc.html`. It needs to be served (not `file://`) and online (Inter + Phosphor load from CDNs).

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, shadows, copy and interactions are final-intent. Content (jobs, projects, facts, links, email) is **placeholder** — replace with real data.

## Suggested file structure
```
src/
  data.ts            // EXP, PROJECTS, LINKS, FACTS, VERBS — all content lives here
  theme.css          // tokens from styles.css + [data-theme="light"] overrides
  Desktop.tsx        // reducer: windows, z-order, menu, theme, wallpaper
  MenuBar.tsx
  Dock.tsx
  Window.tsx         // chrome: titlebar, drag, minimize/close, genie transform
  windows/Hello.tsx  About.tsx  Experience.tsx  Projects.tsx  Terminal.tsx  AboutSite.tsx
  BootScreen.tsx
  hooks/useDrag.ts
```

## Screens / views

### Desktop (root)
- `position: fixed; inset: 0; overflow: hidden; user-select: none`.
- Background = current wallpaper (see Tokens → Wallpapers).
- Clicking empty desktop closes any open menu.

### Menubar
- Fixed top, height **36px**, padding `0 12px`, font 13px. Background `color-mix(in srgb, var(--color-bg) 72%, transparent)` + `backdrop-filter: blur(10px)`, bottom edge `box-shadow: 0 1px 0 var(--color-divider)`. z-index 1000.
- Left: four menu triggers — **tanzi.os** (600 weight, accent color, `ph-circle-half` icon), **Windows**, **View**, **Help** (400, neutral-300). Trigger: padding 5px 10px, radius 6px; hover / open bg `color-mix(text 8–10%)`.
- Menu behavior: click toggles; while one is open, hovering another trigger switches to it; Esc, clicking the desktop, or clicking a window closes it; choosing an item runs it and closes.
- Dropdown: top 34px, min-width 240px, padding 6px, radius `--radius-lg` (14px), bg `--color-surface`, `--shadow-lg`. Items: padding 7px 10px, radius 6px, 13px; a 14px check column (accent `ph-check`, visible only when checked); optional right hint 11px neutral-500. Hover bg accent 16%, active accent 26%. Dividers: 1px `--color-divider`, margin 5px 8px.
- Menu contents:
  - **tanzi.os**: About this site · — · Restart… (boot screen, then reset window layout; keeps theme + wallpaper)
  - **Windows**: hello.txt / about.md / experience.log / projects / terminal (checked when visible; click opens/restores + focuses) · — · Minimize all · Show all · Tidy up (reset to default layout, all open)
  - **View**: Dark mode / Light mode (radio-style checks) · — · Wallpaper: Nebula / Grid / Plain · — · Wobbly windows (toggle)
  - **Help**: Terminal commands (opens terminal and runs `help`) · Résumé (PDF) · — · Say hi (mailto)
- Right: GitHub / LinkedIn / Email icon links (30×28, 16px icon, neutral-400 → text on hover, hover `translateY(-2px) rotate(-8deg)` springy), a theme toggle (moon in dark / sun in light; hover rotates 40°), then the clock (`Sat 3:42 PM`, tabular-nums, neutral-300, updates every 15s).

### Window chrome (shared)
- `position: absolute`, radius 14px, bg `--color-surface`, `overflow: hidden`, `transform-origin: top center`.
- Shadow: `--shadow-lg` on the top-most visible window, `--shadow-md` otherwise.
- Titlebar: padding `8px 8px 8px 16px`, 12px neutral-400, bg `--color-bg`, `cursor: grab`. Accent icon + filename, then right-aligned 24×24 `.btn.btn-icon` minimize (`ph-minus`) and close (`ph-x`). Double-click titlebar = minimize.
- Mousedown anywhere on a window brings it to front.
- Widths: hello 560, about 420, experience 520, projects 520, terminal 440, about-this-site 340.

### hello.txt
- Body padding 34px 38px. "Hi, my name is" 15px accent, preceded by a 22px waving hand that rotates −28° on hover.
- Name: 58px / 500 / −0.04em / line-height 1.02 on two lines ("Tanzi" / "Chowdhury."). **Each letter is its own inline-block span**: hover → `translateY(-12px) rotate(-6deg)` + color accent-400, transition `transform .45s cubic-bezier(.34,1.8,.64,1)`.
- "I **build** stuff." 30px/500 neutral-400. The verb is a button in text color with a 3px accent underline bar; click cycles build → break → fix → ship → debug → refactor → design. Hover `rotate(-4deg) scale(1.06)`, active `scale(.92)`.
- Hint: "psst — click the verb", 12px neutral-500, `ph-cursor-click`.
- Buttons (gap 12px, margin-top 28px): **See what I've built** (`.btn-primary`, opens projects) and **Say hi** (`.btn-secondary`, mailto). Padding 11px 18px, radius 10px. **Springy offset-shadow hover**: `transform: translate(-3px,-3px); box-shadow: 3px 3px 0 0 <accent | neutral-700>`; active returns to 0/none. Transition `transform .35s, box-shadow .35s cubic-bezier(.34,1.56,.64,1)`.

### about.md
- Padding 22px 24px; 14px/1.65 neutral-400 with key phrases in `--color-text`. Text selectable.
- Fact chips: pill, padding 6px 11px, bg `--color-bg`, `--shadow-sm`, 12.5px neutral-300, accent icon. Hover `rotate(-4deg) translateY(-3px)` springy.

### experience.log
- Two columns: 150px tab rail (inset right divider) | detail.
- Tabs: padding 9px 12px, radius 8px, 13px/500. Active: accent text, bg accent 12%, `inset 2px 0 0 accent`. Inactive neutral-500. Hover `translateX(4px)` springy.
- Detail: role 17px/500 + "@ Org" in accent; date 11px uppercase 0.08em 600 neutral-500; description 13.5px/1.6 neutral-400; `.tag.tag-accent` per technology.

### ~/projects
- 2-column grid, gap 10px, padding 14px. Tiles are links: padding 14px, radius 8px, bg `--color-bg`; 22px accent icon + small `ph-arrow-up-right`; name 14px/500; desc 12px neutral-500; `.tag.tag-neutral` (10px, 2px 7px).
- Hover `translateY(-5px) rotate(-1.5deg)` + `--shadow-md`; active `scale(.97)`.

### terminal
- Body 230px tall, scrollable, padding 14px 16px, `13px/1.6 ui-monospace, Menlo, monospace`. Click anywhere in body focuses the input. Auto-scroll to bottom on new output.
- Prompt `tanzi ~ %` in accent, unstyled input with accent caret.
- Commands: `help`, `whoami`, `ls`, `open <hello|about|experience|projects>`, `experience`, `projects`, `contact`, `theme dark|light`, `wallpaper nebula|grid|plain`, `tidy`, `restart`, `clear`, `sudo hire-tanzi` (easter egg → prints email), `sudo …` (hint), `rm …` ("absolutely not."). Unknown → `command not found: x — try "help"`.
- Line colors: echoed command = text; output = neutral-300; dim/system = neutral-500; highlights = accent-400.

### About this site
- Not in the dock; opened from the tanzi.os menu, centered. 52px "TC" outlined accent mark (hover rotate −14° scale 1.1), title, version line, short description.

### Dock
- Bottom-center, 14px from bottom, padding 8px, radius 18px, bg surface 78% + blur(12px), `--shadow-md`, z-index 900.
- Five window buttons (46×46, radius 12, bg `--color-bg`, 22px accent-400 icon), a 1px divider, then three link icons (neutral-300).
- Hover `translateY(-10px) scale(1.15)` with `cubic-bezier(.34,1.8,.64,1)`; links also rotate −8°.
- Indicator dot under window buttons: 4px accent; opacity 1 = visible, 0.4 = minimized, 0 = closed.
- **Click logic**: closed → open + focus · minimized → restore + focus · open but behind → focus · open and already front-most → **minimize**.

### Boot screen
- Full-screen `--color-bg`, centered 64px TC mark + 200×3px progress bar (accent fill on neutral-800). Progress ticks every 90ms by 7–21%; at 100% the desktop resets.

## Interactions & behavior
- **Drag**: mousedown on titlebar (ignore if the target is a button), track deltas on `window`. Clamp so ≥80px of the window stays on screen horizontally; y between 36 (under menubar) and `vh − 60`. Use pointer events in production for touch support.
- **Wobbly windows** (on by default): while dragging, `rotate(clamp(movementX × 0.7, −7°, 7°)) scale(1.015)`; on release springs back to 0 via `transform .45s cubic-bezier(.34,1.56,.64,1)`.
- **Minimize (genie-ish)**: `translate(dockCenterX − windowCenterX, vh − 40 − windowTop) scale(0.06)`, opacity 0, `pointer-events: none`; transition `transform .45s cubic-bezier(.55,0,.25,1), opacity .4s ease-in`. Restore reverses with the spring curve. Opening a closed window mounts it in the minimized pose and un-minimizes on the next frame so it flies out of the dock.
- **Close**: unmounts the window (state kept for position).
- **Z-order**: an ordered array of ids; focusing moves the id to the end. "Top-most" = last id that is open and not minimized.
- **Theme**: sets the light token overrides on the root (in production: `<html data-theme="light">` + CSS block). Persist to `localStorage` and default to `prefers-color-scheme` (not in the prototype — recommended).
- **Initial layout** (vw/vh = viewport, x clamped to `[16, vw − w − 16]`): hello (0.06vw, 72) · about (0.5vw, 64) · experience (0.05vw, max(380, 0.52vh)) · projects (0.42vw, max(300, 0.38vh)) · terminal (vw − 470, max(330, vh − 380)). Initial z-order back→front: projects, experience, terminal, about, hello.
- **Responsive (to build — not in prototype)**: below ~760px wide, drop dragging and render windows as a vertical stack of full-width cards with the dock fixed at the bottom as a tab bar; hide the menubar's text menus behind the TC mark.
- **Accessibility (to build)**: windows are `role="dialog"` with `aria-label`; menus use `role="menu"/"menuitemcheckbox"` with arrow-key navigation; respect `prefers-reduced-motion` (disable wobble, letter jumps and genie, keep fades).

## State
```ts
type WinId = 'hello' | 'about' | 'exp' | 'proj' | 'term' | 'site';
interface Win { x: number; y: number; open: boolean; min: boolean }
interface State {
  wins: Record<WinId, Win>;
  order: WinId[];                 // z-order, back → front
  menu: null | 'os' | 'win' | 'view' | 'help';
  theme: 'dark' | 'light';
  wall: 'nebula' | 'grid' | 'plain';
  wobble: boolean;
  drag: WinId | null; tilt: number;
  verb: number;                   // index into VERBS
  tab: number;                    // experience tab
  cmd: string; lines: { text: string; color: string }[];
  booting: boolean; bootPct: number;
}
```

## Design tokens (Nocturne)
Source of truth: `_ds/nocturne-2e43a37d-bc40-4a52-86c2-1db215d4365d/styles.css` — copy its `:root` block into `theme.css`.

**Dark (default)**
- bg `#161826` · surface `#232532` · text `#e9e9ed` · accent `#9184d9` · divider `color-mix(in srgb, #e9e9ed 16%, transparent)` · section `#262a60`
- neutral 100→900: `#f3f5fe #e4e7f5 #cfd3e5 #b2b6ca #9397ab #75798c #595d6c #3f424d #292b31`
- accent 100→900: `#f5f4ff #e7e5fe #d2cefd #b5abfc #968ae0 #796cbf #5d5294 #423a6a #2b2741`
- shadow-sm `0 0 0 1px #3f424d` · shadow-md `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)` · shadow-lg `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65)`

**Light overrides** (`[data-theme="light"]`)
- bg `#e4e7f5` · surface `#f3f5fe` · text `#292b31` · accent `#796cbf` · divider `color-mix(in srgb, #292b31 16%, transparent)` · section `#d2cefd`
- neutral and accent ramps are **reversed** (100 ↔ 900, 200 ↔ 800 …, 500 unchanged)
- shadow-sm `0 0 0 1px #cfd3e5` · shadow-md `0 0 0 1px #b2b6ca, 0 6px 18px rgba(40,44,80,.14)` · shadow-lg `0 0 0 1px #9397ab, 0 16px 40px rgba(40,44,80,.2)`

**Wallpapers**
- Nebula: `radial-gradient(900px 600px at 15% 100%, var(--color-section), transparent 70%), radial-gradient(800px 560px at 100% 0%, var(--color-accent-900), transparent 70%), var(--color-bg)`
- Grid: `radial-gradient(circle at 1px 1px, var(--color-neutral-800) 1px, transparent 0) 0 0 / 22px 22px, var(--color-bg)`
- Plain: `var(--color-bg)`

**Type**: Inter (400/500/600) for everything; headings max weight 500. Mono: `ui-monospace, Menlo, monospace`.
**Radii**: 4 / 8 / 14px (+ 10px buttons, 12px dock items, 18px dock, 999px chips).
**Easing**: spring `cubic-bezier(.34,1.56,.64,1)` · bouncy spring `cubic-bezier(.34,1.8,.64,1)` · minimize `cubic-bezier(.55,0,.25,1)`.
**Focus**: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`.
Nocturne classes used: `.btn .btn-primary .btn-secondary .btn-icon`, `.tag .tag-accent .tag-neutral`.

## Assets
- Icons: Phosphor (regular) — hand-waving, user, briefcase, folder, folder-open, terminal-window, info, minus, x, check, circle-half, moon, sun, github-logo, linkedin-logo, envelope-simple, cursor-click, arrow-up-right, graph, cooking-pot, stack, terminal, map-pin, code, horse, coffee.
- Font: Inter (Google Fonts, imported by styles.css).
- No images.

## Files
- `Tanzi OS.dc.html` — the prototype (template markup + a `Component` logic class at the bottom holding all data, state and behavior; the `run()` method is the terminal).
- `support.js` — runtime the prototype needs to open in a browser. Reference only; don't port.
- `_ds/nocturne-…/styles.css` — Nocturne tokens + component classes.
- `_ds/nocturne-…/_ds_bundle.js` — design-system loader used by the prototype.

## Content to replace
All in the `EXP`, `PROJECTS`, `LINKS`, `FACTS` constants and the about copy: real roles/dates/descriptions, real project names + URLs, GitHub/LinkedIn URLs, email, résumé PDF link.
