import { describe, expect, it } from 'vitest';
import { EMAIL, EXP, LINKS, NAME, PROJECTS, ROLE, VERSION } from '../../src/data';
import { PROMPT, TERMINAL_BANNER, runCommand } from '../../src/logic/terminal';
import type { Line } from '../../src/types';

const echo = (s: string): Line => ({ text: 'tanzi ~ % ' + s, tone: 'cmd' });
const out = (text: string): Line => ({ text, tone: 'out' });
const dim = (text: string): Line => ({ text, tone: 'dim' });
const acc = (text: string): Line => ({ text, tone: 'acc' });

const emailHref = LINKS.find((l) => l.label === 'Email')!.href;
const emailPlain = emailHref.replace(/^mailto:/, '');

describe('runCommand general rules', () => {
  it('AC19: PROMPT is "tanzi ~ % "', () => {
    expect(PROMPT).toBe('tanzi ~ % ');
  });

  it('AC19: the first line echoes the trimmed input with tone cmd', () => {
    const r = runCommand('   whoami \t');
    expect(r.lines[0]).toEqual(echo('whoami'));
  });

  it('AC19: matching is case-sensitive', () => {
    const r = runCommand('HELP');
    expect(r.lines).toEqual([echo('HELP'), dim('command not found: HELP — try "help"')]);
    expect(r.effects).toEqual([]);
    expect(runCommand('Open hello').effects).toEqual([]);
    expect(runCommand('open HELLO').effects).toEqual([]);
    expect(runCommand('theme Dark').effects).toEqual([]);
  });

  it('AC19: arguments are split on any whitespace and rejoined with single spaces', () => {
    expect(runCommand('open    about').effects).toEqual([{ type: 'open', id: 'about' }]);
    expect(runCommand('open\tabout').effects).toEqual([{ type: 'open', id: 'about' }]);
    expect(runCommand('open\nabout').effects).toEqual([{ type: 'open', id: 'about' }]);
    expect(runCommand('  sudo   hire-tanzi ').lines[2]).toEqual(acc(`access granted → ${EMAIL}`));
    expect(runCommand('open a   b\tc').lines[1]).toEqual(dim('open: no such file: a b c'));
  });

  it('AC20: empty and whitespace-only input give only the echo and no effects', () => {
    for (const raw of ['', ' ', '   ', '\t', '\n \t ']) {
      const r = runCommand(raw);
      expect(r.lines).toEqual([echo('')]);
      expect(r.effects).toEqual([]);
    }
  });

  it('AC21: at most one effect per call, only for effect commands', () => {
    const inputs = [
      'help',
      'whoami',
      'ls',
      'experience',
      'projects',
      'contact',
      'open about',
      'theme dark',
      'wallpaper grid',
      'tidy',
      'restart',
      'clear',
      'sudo hire-tanzi',
      'rm -rf /',
      'foo',
      '',
      'open',
      'open nope',
      'theme',
      'wallpaper x',
    ];
    const withEffect = new Set([
      'open about',
      'theme dark',
      'wallpaper grid',
      'tidy',
      'restart',
      'clear',
    ]);
    for (const i of inputs) {
      const r = runCommand(i);
      expect(r.effects.length, i).toBeLessThanOrEqual(1);
      expect(r.effects.length === 1, i).toBe(withEffect.has(i));
    }
  });
});

describe('runCommand outputs', () => {
  it('AC22: help prints two acc lines', () => {
    const r = runCommand('help');
    expect(r.lines).toEqual([
      echo('help'),
      acc('whoami · ls · open <file> · experience · projects · contact'),
      acc('theme dark|light · wallpaper nebula|grid|plain · tidy · restart · clear'),
    ]);
    expect(r.effects).toEqual([]);
  });

  it('AC22: whoami prints name and role from data', () => {
    const r = runCommand('whoami');
    expect(r.lines).toEqual([echo('whoami'), out(`${NAME} — ${ROLE}. builds stuff.`)]);
    expect(r.effects).toEqual([]);
  });

  it('AC22: whoami ignores extra words', () => {
    expect(runCommand('whoami foo').lines.slice(1)).toEqual(runCommand('whoami').lines.slice(1));
  });

  it('AC22: ls prints the file listing', () => {
    expect(runCommand('ls').lines).toEqual([
      echo('ls'),
      out('hello.txt   about.md   experience.log   projects/'),
    ]);
  });

  it('AC22: experience prints one line per EXP entry', () => {
    const r = runCommand('experience');
    expect(r.lines).toEqual([
      echo('experience'),
      ...EXP.map((e) => out(e.when.padEnd(12) + e.role + ' @ ' + e.org)),
    ]);
    expect(r.lines.length).toBe(EXP.length + 1);
  });

  it('AC22: projects prints one line per PROJECTS entry', () => {
    const r = runCommand('projects');
    expect(r.lines).toEqual([
      echo('projects'),
      ...PROJECTS.map((p) => out(p.name.padEnd(12) + p.desc)),
    ]);
  });

  it('AC22: contact prints the email and linkedin', () => {
    expect(runCommand('contact').lines).toEqual([echo('contact'), out(`${EMAIL} · linkedin`)]);
  });
});

describe('runCommand open', () => {
  const table: [string, string][] = [
    ['hello', 'hello'],
    ['hello.txt', 'hello'],
    ['about', 'about'],
    ['about.md', 'about'],
    ['experience', 'exp'],
    ['experience.log', 'exp'],
    ['projects', 'proj'],
    ['projects/', 'proj'],
  ];
  for (const [name, id] of table) {
    it(`AC23: open ${name} opens ${id}`, () => {
      const r = runCommand(`open ${name}`);
      expect(r.lines).toEqual([echo(`open ${name}`), dim(`opening ${name}…`)]);
      expect(r.effects).toEqual([{ type: 'open', id }]);
    });
  }

  it('AC23: unknown files print no-such-file with no effect', () => {
    const r = runCommand('open nothing');
    expect(r.lines).toEqual([echo('open nothing'), dim('open: no such file: nothing')]);
    expect(r.effects).toEqual([]);
  });

  it('AC23: terminal and site are not openable', () => {
    for (const n of ['terminal', 'site', 'term', 'exp', 'proj']) {
      const r = runCommand(`open ${n}`);
      expect(r.lines[1]).toEqual(dim(`open: no such file: ${n}`));
      expect(r.effects).toEqual([]);
    }
  });

  it('AC23: no argument prints usage', () => {
    for (const raw of ['open', 'open   ']) {
      const r = runCommand(raw);
      expect(r.lines[1]).toEqual(dim('usage: open <hello|about|experience|projects>'));
      expect(r.effects).toEqual([]);
    }
  });

  it('AC23: prototype-chain names are not files (R1)', () => {
    for (const n of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      const r = runCommand(`open ${n}`);
      expect(r.lines[1]).toEqual(dim(`open: no such file: ${n}`));
      expect(r.effects).toEqual([]);
    }
  });
});

describe('runCommand theme and wallpaper', () => {
  for (const t of ['dark', 'light']) {
    it(`AC24: theme ${t} prints and returns the effect`, () => {
      const r = runCommand(`theme ${t}`);
      expect(r.lines).toEqual([echo(`theme ${t}`), dim(`theme → ${t}`)]);
      expect(r.effects).toEqual([{ type: 'theme', theme: t }]);
    });
  }

  it('AC24: bad theme arguments print usage with no effect', () => {
    for (const raw of [
      'theme',
      'theme blue',
      'theme dark now',
      'theme constructor',
      'theme __proto__',
      'theme DARK',
    ]) {
      const r = runCommand(raw);
      expect(r.lines.length, raw).toBe(2);
      expect(r.lines[1], raw).toEqual(dim('usage: theme dark|light'));
      expect(r.effects, raw).toEqual([]);
    }
  });

  for (const w of ['nebula', 'grid', 'plain']) {
    it(`AC25: wallpaper ${w} prints and returns the effect`, () => {
      const r = runCommand(`wallpaper ${w}`);
      expect(r.lines).toEqual([echo(`wallpaper ${w}`), dim(`wallpaper → ${w}`)]);
      expect(r.effects).toEqual([{ type: 'wallpaper', wall: w }]);
    });
  }

  it('AC25: bad wallpaper arguments print usage with no effect', () => {
    for (const raw of [
      'wallpaper',
      'wallpaper red',
      'wallpaper grid now',
      'wallpaper toString',
      'wallpaper __proto__',
      'wallpaper GRID',
    ]) {
      const r = runCommand(raw);
      expect(r.lines.length, raw).toBe(2);
      expect(r.lines[1], raw).toEqual(dim('usage: wallpaper nebula|grid|plain'));
      expect(r.effects, raw).toEqual([]);
    }
  });
});

describe('runCommand tidy, restart, clear', () => {
  it('AC26: tidy prints windows tidied and returns the tidy effect', () => {
    const r = runCommand('tidy');
    expect(r.lines).toEqual([echo('tidy'), dim('windows tidied.')]);
    expect(r.effects).toEqual([{ type: 'tidy' }]);
  });

  it('AC26: tidy ignores extra words', () => {
    expect(runCommand('tidy now').effects).toEqual([{ type: 'tidy' }]);
  });

  it('AC26: restart returns only the echo plus the restart effect', () => {
    const r = runCommand('restart');
    expect(r.lines).toEqual([echo('restart')]);
    expect(r.effects).toEqual([{ type: 'restart' }]);
  });

  it('AC27: clear returns no lines and the clear effect', () => {
    const r = runCommand('clear');
    expect(r.lines).toEqual([]);
    expect(r.effects).toEqual([{ type: 'clear' }]);
    expect(runCommand('  clear  ').lines).toEqual([]);
  });
});

describe('runCommand easter eggs and unknown commands', () => {
  it('AC28: sudo hire-tanzi prints the password prompt then access granted', () => {
    const r = runCommand('sudo hire-tanzi');
    expect(r.lines).toEqual([
      echo('sudo hire-tanzi'),
      dim('[sudo] password for recruiter: ********'),
      acc(`access granted → ${EMAIL}`),
    ]);
    expect(r.effects).toEqual([]);
  });

  it('AC28: any other sudo prints the hint', () => {
    for (const raw of [
      'sudo',
      'sudo rm',
      'sudo hire-tanzi now',
      'sudo hire-bob',
      'sudo HIRE-TANZI',
    ]) {
      const r = runCommand(raw);
      expect(r.lines, raw).toEqual([echo(raw), dim('nice try. (psst: sudo hire-tanzi)')]);
      expect(r.effects, raw).toEqual([]);
    }
  });

  it('AC29: rm prints absolutely not', () => {
    for (const raw of ['rm', 'rm -rf /', 'rm file']) {
      const r = runCommand(raw);
      expect(r.lines).toEqual([echo(raw), acc('absolutely not.')]);
      expect(r.effects).toEqual([]);
    }
  });

  it('AC30: unknown heads print command not found', () => {
    const r = runCommand('foo bar');
    expect(r.lines).toEqual([echo('foo bar'), dim('command not found: foo — try "help"')]);
    expect(r.effects).toEqual([]);
  });

  it('AC30: prototype-chain heads are not commands (R1)', () => {
    for (const h of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const r = runCommand(h);
      expect(r.lines[1]).toEqual(dim(`command not found: ${h} — try "help"`));
      expect(r.effects).toEqual([]);
    }
  });

  it('AC30: markup is echoed verbatim as text with no effect (R2)', () => {
    const raw = '<img src=x onerror=1>';
    const r = runCommand(raw);
    expect(r.lines[0]).toEqual(echo(raw));
    expect(r.lines[1]).toEqual(dim('command not found: <img — try "help"'));
    expect(r.effects).toEqual([]);
  });

  it('AC30: very long and mixed-whitespace input is handled (R3)', () => {
    const long = 'x'.repeat(10000);
    const r = runCommand(long);
    expect(r.lines[0].text).toBe(PROMPT + long);
    expect(r.effects).toEqual([]);
    const spaced = 'open' + ' '.repeat(10000) + 'about';
    expect(runCommand(spaced).effects).toEqual([{ type: 'open', id: 'about' }]);
    expect(() => runCommand('\t\n\r   open \n\t about \r\n')).not.toThrow();
  });
});

describe('banner and email', () => {
  it('AC31: banner is a single dim line with the version', () => {
    expect([...TERMINAL_BANNER]).toEqual([
      dim(`tanzi.os v${VERSION} — type "help" to look around`),
    ]);
  });

  it('AC32: contact and sudo hire-tanzi contain the Email link address', () => {
    expect(emailPlain).not.toContain('mailto:');
    expect(emailPlain).toContain('@');
    expect(runCommand('contact').lines[1].text).toContain(emailPlain);
    expect(runCommand('sudo hire-tanzi').lines[2].text).toContain(emailPlain);
    expect(EMAIL).toBe(emailPlain);
  });

  it('AC32: the email literal appears exactly once in src/', () => {
    const files = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(files).length).toBeGreaterThan(5);
    let count = 0;
    const where: string[] = [];
    for (const [path, src] of Object.entries(files)) {
      const n = src.split(emailPlain).length - 1;
      count += n;
      if (n) where.push(path);
    }
    expect(where).toEqual(['/src/data.ts']);
    expect(count).toBe(1);
  });
});
