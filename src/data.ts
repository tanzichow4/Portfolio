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
  icon: string;
  href: string;
  desc: string;
  tags: string[];
}
export interface LinkItem {
  label: string;
  icon: string;
  href: string;
}
export interface Fact {
  icon: string;
  label: string;
}

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

// `icon` is a Phosphor component name from @phosphor-icons/react
export const PROJECTS: Project[] = [
  {
    name: 'Pathfinder',
    icon: 'Graph',
    href: '#',
    desc: 'Graph search, visualized. Draw walls, watch A* think.',
    tags: ['TypeScript', 'Canvas'],
  },
  {
    name: 'Pantry',
    icon: 'CookingPot',
    href: '#',
    desc: 'Recipes from whatever is already in your fridge.',
    tags: ['React Native', 'SQLite'],
  },
  {
    name: 'tinyq',
    icon: 'Stack',
    href: '#',
    desc: 'A durable job queue on Postgres, in 600 lines.',
    tags: ['Go', 'Postgres'],
  },
  {
    name: 'dotfiles',
    icon: 'Terminal',
    href: '#',
    desc: 'My over-tuned setup, bootstrapped in one command.',
    tags: ['Shell', 'Nix'],
  },
];

export const LINKS: LinkItem[] = [
  { label: 'GitHub', icon: 'GithubLogo', href: 'https://github.com/' },
  { label: 'LinkedIn', icon: 'LinkedinLogo', href: 'https://linkedin.com/' },
  { label: 'Email', icon: 'EnvelopeSimple', href: 'mailto:hello@tanzi.dev' },
];

export const FACTS: Fact[] = [
  { icon: 'MapPin', label: 'New York' },
  { icon: 'Code', label: 'TypeScript · Go · Python' },
  { icon: 'CookingPot', label: 'Ambitious home cook' },
  { icon: 'Horse', label: 'Mediocre at chess' },
  { icon: 'Coffee', label: 'Runs on oat lattes' },
];

export const VERBS = ['build', 'break', 'fix', 'ship', 'debug', 'refactor', 'design'];
export const RESUME_URL = '/resume.pdf';
