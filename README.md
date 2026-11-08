# tanzi.os

My portfolio, presented as a tiny desktop OS: draggable windows, a dock, a menubar,
a working terminal, themes and wallpapers.

Built with Vite, React and TypeScript. The design spec is in
[`design_handoff_tanzi_os/README.md`](design_handoff_tanzi_os/README.md).

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm install   # also downloads the Playwright Chromium browser (postinstall)
npm run dev
```

## Scripts

| Command              | What it does                   |
| -------------------- | ------------------------------ |
| `npm run dev`        | Start the dev server           |
| `npm run build`      | Typecheck and build to `dist/` |
| `npm run preview`    | Serve the production build     |
| `npm test`           | Run tests (Vitest)             |
| `npm run test:watch` | Run tests in watch mode        |
| `npm run lint`       | ESLint                         |
| `npm run format`     | Format with Prettier           |
| `npm run typecheck`  | `tsc --noEmit`                 |

Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to skip the browser download (for example on a build-only server).

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests and build.

## Layout

```
src/
  data.ts         all content (experience, projects, links, facts, verbs)
  theme.css       Nocturne tokens, light overrides, wallpapers
  Desktop.tsx     window, z-order, menu, theme and wallpaper state
  MenuBar.tsx  Dock.tsx  Window.tsx  BootScreen.tsx
  windows/        Hello, About, Experience, Projects, Terminal, AboutSite
  hooks/          useDrag
  test/           test setup
```

## Content

Placeholder content (roles, projects, links, email, `/resume.pdf`) lives in `src/data.ts`.
Put the real résumé at `public/resume.pdf`.
