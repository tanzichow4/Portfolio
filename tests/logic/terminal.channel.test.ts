import { describe, expect, it, vi } from 'vitest';
import { createHelpChannel } from '../../src/logic/terminal';

describe('T07 createHelpChannel', () => {
  it('T07 AC45: a request before any subscriber runs once on subscribe', () => {
    const ch = createHelpChannel();
    ch.request();
    const run = vi.fn();
    ch.subscribe(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('T07 AC45: two requests before subscribing give two runs', () => {
    const ch = createHelpChannel();
    ch.request();
    ch.request();
    const run = vi.fn();
    ch.subscribe(run);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('T07 AC45: a request while subscribed runs immediately, once per request', () => {
    const ch = createHelpChannel();
    const run = vi.fn();
    ch.subscribe(run);
    expect(run).not.toHaveBeenCalled();
    ch.request();
    expect(run).toHaveBeenCalledTimes(1);
    ch.request();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('T07 AC45: a second subscribe after unsubscribe replays nothing', () => {
    const ch = createHelpChannel();
    ch.request();
    const first = vi.fn();
    const off = ch.subscribe(first);
    off();
    const second = vi.fn();
    ch.subscribe(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('T07 AC45: after unsubscribe, requests queue for the next subscriber', () => {
    const ch = createHelpChannel();
    const first = vi.fn();
    const off = ch.subscribe(first);
    off();
    ch.request();
    expect(first).not.toHaveBeenCalled();
    const second = vi.fn();
    ch.subscribe(second);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('T07 AC45: a stale unsubscribe does not remove a newer subscriber', () => {
    const ch = createHelpChannel();
    const offA = ch.subscribe(vi.fn());
    const b = vi.fn();
    ch.subscribe(b);
    offA();
    ch.request();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('T07 AC45: channels are independent', () => {
    const a = createHelpChannel();
    const b = createHelpChannel();
    a.request();
    const run = vi.fn();
    b.subscribe(run);
    expect(run).not.toHaveBeenCalled();
  });
});
