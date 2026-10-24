import { describe, expect, it } from 'vitest';
import { loadTicks, pruneTicks, saveTicks, ticksKey } from '../src/lib/tools/ticks';

const memory = () => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('tick storage', () => {
  it('saves and restores ticks per tool', () => {
    const s = memory();
    saveTicks('fence', ['Pickets', 'Posts, 4×4'], s);
    saveTicks('deck', ['Deck screws'], s);
    expect([...loadTicks('fence', s)]).toEqual(['Pickets', 'Posts, 4×4']);
    expect([...loadTicks('deck', s)]).toEqual(['Deck screws']);
    expect(s.m.has(ticksKey('fence'))).toBe(true);
  });
  it('removes the key when nothing is ticked', () => {
    const s = memory();
    saveTicks('fence', ['Pickets'], s);
    saveTicks('fence', [], s);
    expect(s.m.has(ticksKey('fence'))).toBe(false);
  });
  it('survives blocked storage, missing storage and bad JSON', () => {
    expect(() => saveTicks('fence', ['x'], broken)).not.toThrow();
    expect(loadTicks('fence', broken).size).toBe(0);
    expect(loadTicks('fence', null).size).toBe(0);
    const s = memory();
    s.setItem(ticksKey('fence'), '{not json');
    expect(loadTicks('fence', s).size).toBe(0);
    s.setItem(ticksKey('fence'), JSON.stringify(['ok', 3, null]));
    expect([...loadTicks('fence', s)]).toEqual(['ok']);
  });
  it('keeps ticks for items still on the list and drops the rest', () => {
    const t = pruneTicks(['Posts, 4×4', 'Rails, 8 ft', 'Pickets'], ['Posts, 4×4', 'Rails, 10 ft', 'Pickets', 'Gravel for post holes']);
    expect([...t]).toEqual(['Posts, 4×4', 'Pickets']);
  });
});
