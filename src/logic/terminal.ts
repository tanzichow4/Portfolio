import { EMAIL, EXP, NAME, PROJECTS, ROLE, VERSION } from '../data';
import type { Line, Theme, Wall, WinId } from '../types';

export const PROMPT = 'tanzi ~ % ';

export interface HelpChannel {
  request(): void;
  subscribe(run: () => void): () => void;
}

// Lets the Help menu reach a terminal that may not be mounted yet.
export function createHelpChannel(): HelpChannel {
  let listener: (() => void) | null = null;
  let pending = 0;
  return {
    request() {
      if (listener) listener();
      else pending += 1;
    },
    subscribe(run) {
      listener = run;
      const n = pending;
      pending = 0;
      for (let i = 0; i < n; i += 1) run();
      return () => {
        if (listener === run) listener = null;
      };
    },
  };
}

export type TerminalEffect =
  | { type: 'open'; id: WinId }
  | { type: 'theme'; theme: Theme }
  | { type: 'wallpaper'; wall: Wall }
  | { type: 'tidy' }
  | { type: 'restart' }
  | { type: 'clear' };

export const TERMINAL_BANNER: readonly Line[] = [
  { text: `tanzi.os v${VERSION} — type "help" to look around`, tone: 'dim' },
];

const OPEN_TARGETS: ReadonlyMap<string, WinId> = new Map<string, WinId>([
  ['hello', 'hello'],
  ['hello.txt', 'hello'],
  ['about', 'about'],
  ['about.md', 'about'],
  ['experience', 'exp'],
  ['experience.log', 'exp'],
  ['projects', 'proj'],
  ['projects/', 'proj'],
]);

const THEMES: readonly Theme[] = ['dark', 'light'];
const WALLS: readonly Wall[] = ['nebula', 'grid', 'plain'];

const out = (text: string): Line => ({ text, tone: 'out' });
const dim = (text: string): Line => ({ text, tone: 'dim' });
const acc = (text: string): Line => ({ text, tone: 'acc' });

export function runCommand(raw: string): { lines: Line[]; effects: TerminalEffect[] } {
  const trimmed = raw.trim();
  const words = trimmed === '' ? [] : trimmed.split(/\s+/);
  const head = words[0] ?? '';
  const arg = words.slice(1).join(' ');
  const echo: Line = { text: PROMPT + trimmed, tone: 'cmd' };

  if (head === '') return { lines: [echo], effects: [] };
  if (head === 'clear') return { lines: [], effects: [{ type: 'clear' }] };
  if (head === 'restart') return { lines: [echo], effects: [{ type: 'restart' }] };

  const lines: Line[] = [echo];
  const effects: TerminalEffect[] = [];

  switch (head) {
    case 'help':
      lines.push(
        acc('whoami · ls · open <file> · experience · projects · contact'),
        acc('theme dark|light · wallpaper nebula|grid|plain · tidy · restart · clear'),
      );
      break;
    case 'whoami':
      lines.push(out(`${NAME} — ${ROLE}. builds stuff.`));
      break;
    case 'ls':
      lines.push(out('hello.txt   about.md   experience.log   projects/'));
      break;
    case 'experience':
      for (const e of EXP) lines.push(out(e.when.padEnd(12) + e.role + ' @ ' + e.org));
      break;
    case 'projects':
      for (const p of PROJECTS) lines.push(out(p.name.padEnd(12) + p.desc));
      break;
    case 'contact':
      lines.push(out(`${EMAIL} · linkedin`));
      break;
    case 'open': {
      if (arg === '') {
        lines.push(dim('usage: open <hello|about|experience|projects>'));
        break;
      }
      const id = OPEN_TARGETS.get(arg);
      if (id === undefined) {
        lines.push(dim(`open: no such file: ${arg}`));
      } else {
        lines.push(dim(`opening ${arg}…`));
        effects.push({ type: 'open', id });
      }
      break;
    }
    case 'theme': {
      const theme = THEMES.find((t) => t === arg);
      if (theme === undefined) {
        lines.push(dim('usage: theme dark|light'));
      } else {
        lines.push(dim(`theme → ${theme}`));
        effects.push({ type: 'theme', theme });
      }
      break;
    }
    case 'wallpaper': {
      const wall = WALLS.find((w) => w === arg);
      if (wall === undefined) {
        lines.push(dim('usage: wallpaper nebula|grid|plain'));
      } else {
        lines.push(dim(`wallpaper → ${wall}`));
        effects.push({ type: 'wallpaper', wall });
      }
      break;
    }
    case 'tidy':
      lines.push(dim('windows tidied.'));
      effects.push({ type: 'tidy' });
      break;
    case 'sudo':
      if (arg === 'hire-tanzi') {
        lines.push(
          dim('[sudo] password for recruiter: ********'),
          acc(`access granted → ${EMAIL}`),
        );
      } else {
        lines.push(dim('nice try. (psst: sudo hire-tanzi)'));
      }
      break;
    case 'rm':
      lines.push(acc('absolutely not.'));
      break;
    default:
      lines.push(dim(`command not found: ${head} — try "help"`));
  }

  return { lines, effects };
}
