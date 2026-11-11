import type { Icon } from '@phosphor-icons/react';
import type { WinId } from './types';
import {
  Briefcase,
  ChartLineUp,
  ChartPieSlice,
  Code,
  EnvelopeSimple,
  Folder,
  HandWaving,
  GameController,
  Horse,
  Info,
  LinkedinLogo,
  MapPin,
  Microphone,
  Plant,
  Smiley,
  Trophy,
  TerminalWindow,
  User,
} from '@phosphor-icons/react';

// All content lives here. Experience, projects and contact come from the résumés in experience/.
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
export const EMAIL = 'tanzichow4@gmail.com';
export const VERSION = '1.0';

export const DOCK_LABELS = {
  landmark: 'Dock',
  state: { open: 'Open', minimized: 'Minimized', closed: 'Closed' },
} as const;

export const EXP: Exp[] = [
  {
    when: '2026 — Now',
    role: 'Software Developer',
    org: 'Tartigrade Ltd.',
    desc: 'Led onboarding for a multi-tenant web platform and built a natural-language-to-SQL engine on a local model. Also wrote a security review.',
    tags: ['React', 'Express', 'Keycloak', 'LLMs'],
  },
  {
    when: '2024 — 2026',
    role: 'Software Developer / Tester',
    org: 'General Dynamics Mission Systems',
    desc: 'Redesigned a legacy system, cutting runtime from 33 hours to 3. Automated deploy config in Python and raised coverage by 80% with PyTest.',
    tags: ['Python', 'PyTest', 'GitLab CI/CD'],
  },
  {
    when: '2021 — 2026',
    role: 'B.Sc. Software Engineering',
    org: 'University of Calgary',
    desc: 'Software engineering degree, with IoT, data and ML projects.',
    tags: ['Software Engineering', 'IoT', 'ML'],
  },
];

// `icon` is a Phosphor component
export const PROJECTS: Project[] = [
  {
    name: 'Voice Calendar',
    icon: Microphone,
    href: '#',
    desc: 'Speak an event, get it on your calendar. iOS and Gemini.',
    tags: ['Swift', 'Gemini API'],
  },
  {
    name: 'Indoor Garden',
    icon: Plant,
    href: '#',
    desc: 'IoT garden monitoring, live dashboard for 10+ sensors.',
    tags: ['Docker', 'React'],
  },
  {
    name: 'Grocery Prices',
    icon: ChartLineUp,
    href: '#',
    desc: 'Forecasts grocery prices 7 days out at 80% accuracy.',
    tags: ['Airflow', 'Spark'],
  },
  {
    name: 'Driver Safety',
    icon: Smiley,
    href: '#',
    desc: 'Emotion detection from faces, 80% accuracy on RAF-DB.',
    tags: ['TensorFlow', 'CNN'],
  },
];

export const LINKS: LinkItem[] = [
  { label: 'LinkedIn', icon: LinkedinLogo, href: 'https://linkedin.com/in/tanzi-chowdhury/' },
  { label: 'Email', icon: EnvelopeSimple, href: `mailto:${EMAIL}` },
];

export const FACTS: Fact[] = [
  { icon: MapPin, label: 'Calgary, AB' },
  { icon: Code, label: 'Python · JavaScript · Swift' },
  { icon: Trophy, label: 'Sports enthusiast' },
  { icon: Horse, label: 'Mediocre at chess' },
  { icon: GameController, label: 'Loves to game' },
];

export const HELLO_COPY = {
  greeting: 'Hi, my name is',
  verbPrefix: 'I',
  verbSuffix: 'stuff.',
  hint: 'psst — click the verb',
  primary: "See what I've built",
  about: 'More about me',
  experience: "What I've been up to",
  secondary: 'Say hi',
} as const;

export interface AboutSegment {
  text: string;
  em?: true;
}

// Each paragraph is a list of segments; `em` marks an emphasized phrase.
export const ABOUT_COPY: AboutSegment[][] = [
  [
    {
      text: "I'm a software engineer who enjoys seeing projects built from the ground up and ",
    },
    { text: 'making ideas come to life', em: true },
    { text: ". I'm fascinated by random facts and love " },
    { text: 'visualizing data', em: true },
    { text: '.' },
  ],
  [
    { text: 'Currently building ' },
    { text: 'web platforms, automation and data tooling', em: true },
    { text: '.' },
  ],
];

export const VIZ_COPY = { body: 'Coming soon' } as const;

export const SITE_COPY = {
  mark: 'TC',
  title: 'tanzi.os',
  versionPrefix: 'Version ',
  edition: ' · Portfolio edition',
  desc: 'A tiny desktop that happens to be a portfolio. Drag the windows, poke the dock, try the terminal.',
} as const;

export const BOOT_COPY = {
  dialog: 'Restarting tanzi.os',
  progress: 'Restart progress',
  done: 'tanzi.os restarted',
} as const;

export const EXPERIENCE_LABELS = { tablist: 'Experience', at: '@' } as const;

export const PHONE_HEADINGS = { about: 'About', projects: 'Projects', links: 'Links' } as const;

export const TERMINAL_LABELS = { input: 'Terminal command', log: 'Terminal output' } as const;

// Visible titlebar text where it differs from the window's accessible title.
export const WIN_BAR_TITLES: Partial<Record<WinId, string>> = { proj: '~/projects' };

export const VERBS = ['build', 'break', 'fix', 'ship', 'debug', 'refactor', 'design'];
export const RESUME_URL = '/resume.pdf';

export const WIN_TITLES: Readonly<Record<WinId, string>> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
  viz: 'dataviz',
  site: 'About this site',
};

export const WIN_ICONS: Readonly<Record<WinId, Icon>> = {
  hello: HandWaving,
  about: User,
  exp: Briefcase,
  proj: Folder,
  term: TerminalWindow,
  viz: ChartPieSlice,
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
