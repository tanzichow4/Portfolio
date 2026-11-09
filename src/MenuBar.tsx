import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
} from 'react';
import { Check, CircleHalf, Moon, Sun } from '@phosphor-icons/react';
import Clock from './Clock';
import { LINKS, MENUBAR_LABELS, MENU_TITLES } from './data';
import {
  firstItem,
  lastItem,
  linkAttrs,
  MENU_ORDER,
  menuModel,
  menuTransition,
  nextTrigger,
  stepItem,
  type MenuEntry,
  type TopMenu,
} from './logic/menu';
import type { Settings } from './logic/settings';
import type { AppAction } from './logic/system';
import type { MenuId, State } from './types';
import './MenuBar.css';

type Item = Extract<MenuEntry, { kind: 'item' }>;

export default function MenuBar({
  wins,
  settings,
  dispatch,
}: {
  wins: State['wins'];
  settings: Settings;
  dispatch: Dispatch<AppAction>;
}) {
  const [open, setOpen] = useState<MenuId>(null);
  const [roving, setRoving] = useState<TopMenu>('os');
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<TopMenu, HTMLButtonElement | null>>>({});
  const pendingFocus = useRef<'first' | 'last' | null>(null);

  const entries = useMemo(
    () => (open === null ? [] : menuModel(open, { wins, settings })),
    [open, wins, settings],
  );

  // Move focus into a freshly opened menu once it has rendered.
  useLayoutEffect(() => {
    const want = pendingFocus.current;
    if (want === null || open === null) return;
    pendingFocus.current = null;
    const index = want === 'first' ? firstItem(entries) : lastItem(entries);
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  });

  const close = useCallback(
    (refocus: boolean) => {
      if (open === null) return;
      setOpen(null);
      if (refocus) triggers.current[open]?.focus();
    },
    [open],
  );

  // Listeners exist only while a menu is open.
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !headerRef.current?.contains(e.target)) close(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const openMenu = (id: TopMenu, focus: 'first' | 'last' | null) => {
    pendingFocus.current = focus;
    setRoving(id);
    setOpen(id);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: TopMenu) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        const next = nextTrigger(id, e.key === 'ArrowRight' ? 1 : -1);
        setRoving(next);
        if (open !== null) setOpen(next);
        triggers.current[next]?.focus();
        break;
      }
      case 'Home':
      case 'End': {
        e.preventDefault();
        const next = e.key === 'Home' ? MENU_ORDER[0] : MENU_ORDER[MENU_ORDER.length - 1];
        setRoving(next);
        if (open !== null) setOpen(next);
        triggers.current[next]?.focus();
        break;
      }
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        openMenu(id, 'first');
        break;
      case 'ArrowUp':
        e.preventDefault();
        openMenu(id, 'last');
        break;
      case 'Tab':
        if (open !== null) setOpen(null);
        break;
    }
  };

  const onItemKeyDown = (e: KeyboardEvent<HTMLElement>, id: TopMenu, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const next = stepItem(entries, index, e.key === 'ArrowDown' ? 1 : -1);
        menuRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
        break;
      }
      case 'Home':
      case 'End': {
        e.preventDefault();
        const next = e.key === 'Home' ? firstItem(entries) : lastItem(entries);
        menuRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.currentTarget.click();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        openMenu(nextTrigger(id, e.key === 'ArrowRight' ? 1 : -1), 'first');
        break;
      case 'Tab':
        // Park focus on the trigger so the browser continues from there.
        setRoving(id);
        triggers.current[id]?.focus();
        setOpen(null);
        break;
    }
  };

  const choose = (item: Item) => {
    if (item.cmd.type === 'action') dispatch(item.cmd.action);
    close(true);
  };

  const dark = settings.theme === 'dark';

  const renderItem = (e: Item, index: number, id: TopMenu) => {
    const inner = (
      <>
        <span className="mb-check">
          {e.checked ? <Check size={14} weight="bold" aria-hidden="true" /> : null}
        </span>
        <span>{e.label}</span>
        {e.hint ? <span className="mb-hint">{e.hint}</span> : null}
      </>
    );
    const common = {
      role: e.role,
      tabIndex: -1,
      className: 'mb-item',
      'data-index': index,
      'aria-checked': e.checked,
      onKeyDown: (ev: KeyboardEvent<HTMLElement>) => onItemKeyDown(ev, id, index),
      onKeyUp: (ev: KeyboardEvent<HTMLElement>) => {
        if (ev.key === ' ') ev.preventDefault();
      },
    };
    if (e.cmd.type === 'link') {
      const cmd = e.cmd;
      return (
        <a
          key={e.key}
          {...common}
          href={cmd.href}
          {...(cmd.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : linkAttrs(cmd.href))}
          onClick={() => close(true)}
        >
          {inner}
        </a>
      );
    }
    return (
      <button key={e.key} type="button" {...common} onClick={() => choose(e)}>
        {inner}
      </button>
    );
  };

  return (
    <header className="mb" ref={headerRef} aria-label={MENUBAR_LABELS.landmark}>
      <div
        role="menubar"
        aria-label={MENUBAR_LABELS.menubar}
        className="mb-menus"
        onBlur={(e) => {
          const to = e.relatedTarget;
          if (open !== null && to instanceof Node && !headerRef.current?.contains(to)) {
            setOpen(null);
          }
        }}
      >
        {MENU_ORDER.map((id) => (
          <div role="none" className="mb-slot" key={id}>
            <button
              type="button"
              role="menuitem"
              id={`mb-trigger-${id}`}
              aria-haspopup="menu"
              aria-expanded={open === id}
              tabIndex={roving === id ? 0 : -1}
              className={id === 'os' ? 'mb-trigger mb-trigger-os' : 'mb-trigger'}
              data-open={open === id}
              ref={(el) => {
                triggers.current[id] = el;
              }}
              onClick={() => {
                setRoving(id);
                setOpen(menuTransition(open, { type: 'click', id }));
              }}
              onFocus={() => setRoving(id)}
              onPointerEnter={() => {
                const next = menuTransition(open, { type: 'hover', id });
                if (next !== open) setOpen(next);
                setRoving(id);
              }}
              onKeyDown={(e) => onTriggerKeyDown(e, id)}
              onKeyUp={(e) => {
                if (e.key === ' ') e.preventDefault();
              }}
            >
              {id === 'os' ? <CircleHalf size={14} weight="fill" aria-hidden="true" /> : null}
              {MENU_TITLES[id]}
            </button>
            {open === id ? (
              <div
                role="menu"
                aria-labelledby={`mb-trigger-${id}`}
                className="mb-menu"
                ref={menuRef}
              >
                {entries.map((e, i) =>
                  e.kind === 'sep' ? (
                    <div key={e.key} role="separator" className="mb-sep" />
                  ) : (
                    renderItem(e, i, id)
                  ),
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mb-right">
        {LINKS.map((l) => (
          <a
            key={l.label}
            className="mb-link"
            href={l.href}
            aria-label={l.label}
            {...linkAttrs(l.href)}
          >
            <l.icon size={16} aria-hidden="true" />
          </a>
        ))}
        <button
          type="button"
          className="mb-toggle"
          aria-label={dark ? MENUBAR_LABELS.toLight : MENUBAR_LABELS.toDark}
          title={MENUBAR_LABELS.toggleTitle}
          onClick={() => dispatch({ type: 'toggleTheme' })}
        >
          {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
        </button>
        <Clock />
      </div>
    </header>
  );
}
