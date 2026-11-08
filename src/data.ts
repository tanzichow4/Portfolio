import type { Icon } from '@phosphor-icons/react';
import type { WinId } from './types';
import {
  Briefcase,
  Code,
  Coffee,
  CookingPot,
  EnvelopeSimple,
  Folder,
  GithubLogo,
  Graph,
  HandWaving,
  Horse,
  Info,
  LinkedinLogo,
  MapPin,
  Stack,
  Terminal,
  TerminalWindow,
  User,
} from '@phosphor-icons/react';

// All content lives here. PLACEHOLDER — replace with real data.
export interface Exp {
  when: string;
  role: string;
  org: string;
  desc: string;
  tags: string[];
}
export interface Project {
  name: string;
  icon: Icon;
  href: string;
  desc: string;
  tags: string[];
}
export interface LinkItem {
  label: string;
  icon: Icon;
  href: string;
}
export interface Fact {
  icon: Icon;
  label: string;
}

export const NAME = 'Tanzi Chowdhury';
export const ROLE = 'software engineer';
export const EMAIL = 'hello@tanzi.dev';
export const VERSION = '1.0';

export const EXP: Exp[] = [
  {
    when: '2025 — Now',
    role: 'Software Engineer',
    org: 'Northwind',
    desc: 'Build and maintain internal developer tooling and the services behind it — faster CI, saner deploys, fewer 2am pages.',
    tags: ['TypeScript', 'Go', 'Postgres', 'AWS'],
  },
  {
    when: '2024',
    role: 'SWE Intern',
    org: 'Brightline',
    desc: 'Shipped a real-time notifications pipeline end to end, from the queue consumers to the settings UI.',
    tags: ['Python', 'Kafka', 'React'],
  },
  {
    when: '2023',
    role: 'Research Assistant',
    org: 'University Lab',
    desc: 'Wrote data tooling for a systems research group and helped benchmark a distributed cache.',
    tags: ['C++', 'Rust', 'Linux'],
  },
];

// `icon` is a Phosphor component
export const PROJECTS: Project[] = [
  {
    name: 'Pathfinder',
    icon: Graph,
    href: '#',
    desc: 'Graph search, visualized. Draw walls, watch A* think.',
    tags: ['TypeScript', 'Canvas'],
  },
  {
    name: 'Pantry',
    icon: CookingPot,
    href: '#',
    desc: 'Recipes from whatever is already in your fridge.',
    tags: ['React Native', 'SQLite'],
  },
  {
    name: 'tinyq',
    icon: Stack,
    href: '#',
    desc: 'A durable job queue on Postgres, in 600 lines.',
    tags: ['Go', 'Postgres'],
  },
  {
    name: 'dotfiles',
    icon: Terminal,
    href: '#',
    desc: 'My over-tuned setup, bootstrapped in one command.',
    tags: ['Shell', 'Nix'],
  },
];

export const LINKS: LinkItem[] = [
  { label: 'GitHub', icon: GithubLogo, href: 'https://github.com/' },
  { label: 'LinkedIn', icon: LinkedinLogo, href: 'https://linkedin.com/' },
  { label: 'Email', icon: EnvelopeSimple, href: `mailto:${EMAIL}` },
];

export const FACTS: Fact[] = [
  { icon: MapPin, label: 'New York' },
  { icon: Code, label: 'TypeScript · Go · Python' },
  { icon: CookingPot, label: 'Ambitious home cook' },
  { icon: Horse, label: 'Mediocre at chess' },
  { icon: Coffee, label: 'Runs on oat lattes' },
];

export const VERBS = ['build', 'break', 'fix', 'ship', 'debug', 'refactor', 'design'];
export const RESUME_URL = '/resume.pdf';

export const WIN_TITLES: Readonly<Record<WinId, string>> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
  site: 'About this site',
};

export const WIN_ICONS: Readonly<Record<WinId, Icon>> = {
  hello: HandWaving,
  about: User,
  exp: Briefcase,
  proj: Folder,
  term: TerminalWindow,
  site: Info,
};

export const CHROME_LABELS = { minimize: 'Minimize', close: 'Close' } as const;

export const MENU_TITLES = { os: 'tanzi.os', win: 'Windows', view: 'View', help: 'Help' } as const;

export const MENU_ITEMS = {
  restart: 'Restart…',
  minimizeAll: 'Minimize all',
  showAll: 'Show all',
  tidy: 'Tidy up',
  dark: 'Dark mode',
  light: 'Light mode',
  wallNebula: 'Wallpaper: Nebula',
  wallGrid: 'Wallpaper: Grid',
  wallPlain: 'Wallpaper: Plain',
  wobble: 'Wobbly windows',
  termCommands: 'Terminal commands',
  resume: 'Résumé (PDF)',
  sayHi: 'Say hi',
  sayHiHint: 'email',
} as const;

export const MENUBAR_LABELS = {
  landmark: 'System menu bar',
  menubar: 'Menus',
  toLight: 'Switch to light mode',
  toDark: 'Switch to dark mode',
  toggleTitle: 'Toggle theme',
} as const;
