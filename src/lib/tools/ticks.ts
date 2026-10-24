/**
 * Ticked materials-list items, saved per tool in localStorage so they survive a reload.
 * Items are keyed by name: a quantity change keeps a tick, an item that disappears loses it.
 * Every storage access is wrapped: private windows and blocked storage just mean no memory.
 */
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const ticksKey = (tool: string) => `exteriormath:ticks:${tool}`;

function store(s?: Store | null): Store | null {
  if (s !== undefined) return s;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadTicks(tool: string, s?: Store | null): Set<string> {
  try {
    const raw = store(s)?.getItem(ticksKey(tool));
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveTicks(tool: string, ticks: Iterable<string>, s?: Store | null): void {
  try {
    const st = store(s);
    if (!st) return;
    const arr = [...ticks];
    if (arr.length) st.setItem(ticksKey(tool), JSON.stringify(arr));
    else st.removeItem(ticksKey(tool));
  } catch {
    /* storage full or blocked: ticks just won't persist */
  }
}

/** Keep only ticks for items that are still on the list. */
export function pruneTicks(ticks: Iterable<string>, names: readonly string[]): Set<string> {
  const keep = new Set(names);
  return new Set([...ticks].filter((t) => keep.has(t)));
}
