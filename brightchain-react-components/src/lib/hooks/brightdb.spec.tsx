import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  BrightDbProvider,
  useBrightDb,
  useDocument,
  useIndexQuery,
  useLiveQuery,
  type BrightDbDocument,
  type BrightDbLike,
} from './brightdb';

/** A small in-memory database that behaves like BrightDB for the hooks' purposes. */
function fakeDb() {
  const collections = new Map<string, Map<string, BrightDbDocument>>();
  const listeners = new Set<() => void | Promise<void>>();
  const calls = { find: 0, findById: 0, findByIndex: 0 };
  const table = (name: string) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name) as Map<string, BrightDbDocument>;
  };
  const notify = () => listeners.forEach((l) => void l());
  const db: BrightDbLike = {
    collection: (name) =>
      ({
        findById: async (id: string) => {
          calls.findById++;
          return table(name).get(id) ?? null;
        },
        find: (filter: Record<string, unknown> = {}) => ({
          toArray: async () => {
            calls.find++;
            return [...table(name).values()].filter((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
          },
        }),
        findByIndex: async (_index: string, query: Record<string, unknown> = {}) => {
          calls.findByIndex++;
          const equals = (query['equals'] as unknown[] | undefined)?.[0];
          return [...table(name).values()].filter((d) => equals === undefined || d['key'] === equals);
        },
        insertOne: async (doc: BrightDbDocument) => {
          table(name).set(doc._id, doc);
          notify();
        },
        replaceById: async (id: string, doc: BrightDbDocument) => {
          table(name).set(id, doc);
          notify();
        },
        deleteById: async (id: string) => {
          table(name).delete(id);
          notify();
        },
      }) as never,
    subscribe: async (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { db, listeners, calls, notify, table };
}

const wrapperFor = (db: BrightDbLike) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <BrightDbProvider db={db}>{children}</BrightDbProvider>;
  };

describe('BrightDB React hooks', () => {
  it('useLiveQuery loads, then refreshes when the database changes', async () => {
    const { db, table, notify } = fakeDb();
    table('people').set('a', { _id: 'a', city: 'oslo' });
    const { result } = renderHook(() => useLiveQuery('people', { city: 'oslo' }), { wrapper: wrapperFor(db) });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.map((d) => d._id)).toEqual(['a']);

    // A commit made elsewhere (another tab) shows up without the component doing anything.
    table('people').set('b', { _id: 'b', city: 'oslo' });
    table('people').set('c', { _id: 'c', city: 'bergen' });
    await act(async () => notify());
    await waitFor(() => expect(result.current.data.map((d) => d._id)).toEqual(['a', 'b']));
  });

  it('re-runs when the filter changes and keeps the previous data while loading', async () => {
    const { db, table } = fakeDb();
    table('p').set('a', { _id: 'a', city: 'oslo' });
    table('p').set('b', { _id: 'b', city: 'bergen' });
    const { result, rerender } = renderHook(({ city }) => useLiveQuery('p', { city }), {
      wrapper: wrapperFor(db),
      initialProps: { city: 'oslo' },
    });
    await waitFor(() => expect(result.current.data.map((d) => d._id)).toEqual(['a']));
    rerender({ city: 'bergen' });
    await waitFor(() => expect(result.current.data.map((d) => d._id)).toEqual(['b']));
  });

  it('does not re-query when a parent re-renders with an equal filter object', async () => {
    const { db, calls } = fakeDb();
    const { rerender, result } = renderHook(() => useLiveQuery('p', { city: 'oslo' }), { wrapper: wrapperFor(db) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = calls.find;
    rerender();
    rerender();
    await act(async () => undefined);
    expect(calls.find).toBe(before);
  });

  it('useIndexQuery runs an index query and refreshes', async () => {
    const { db, table, notify } = fakeDb();
    table('p').set('a', { _id: 'a', key: 'x' });
    const { result } = renderHook(() => useIndexQuery('p', 'by_key', { equals: ['x'] }), { wrapper: wrapperFor(db) });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    table('p').set('b', { _id: 'b', key: 'x' });
    await act(async () => notify());
    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });

  it('useDocument reads, saves (insert then replace) and removes', async () => {
    const { db } = fakeDb();
    const { result } = renderHook(() => useDocument<{ _id: string; name?: string }>('people', 'u1'), {
      wrapper: wrapperFor(db),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    await act(async () => result.current.save({ _id: 'u1', name: 'first' }));
    await waitFor(() => expect(result.current.data?.name).toBe('first'));
    await act(async () => result.current.save({ _id: 'ignored', name: 'second' }));
    await waitFor(() => expect(result.current.data).toEqual({ _id: 'u1', name: 'second' }));
    await act(async () => result.current.remove());
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it('reports a failing read as an error and recovers on the next change', async () => {
    const { db, notify } = fakeDb();
    let fail = true;
    const original = db.collection.bind(db);
    db.collection = ((name: string) => {
      const real = original(name);
      return {
        ...real,
        find: (filter?: Record<string, unknown>) => ({
          toArray: async () => {
            if (fail) throw new Error('storage unavailable');
            return real.find(filter).toArray();
          },
        }),
      };
    }) as BrightDbLike['collection'];
    const { result } = renderHook(() => useLiveQuery('p'), { wrapper: wrapperFor(db) });
    await waitFor(() => expect(result.current.error?.message).toBe('storage unavailable'));
    fail = false;
    await act(async () => notify());
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('stops listening on unmount, even if unmounted before subscribing finished', async () => {
    const { db, listeners } = fakeDb();
    const { unmount } = render(
      <BrightDbProvider db={db}>
        <span>child</span>
      </BrightDbProvider>,
    );
    await waitFor(() => expect(listeners.size).toBe(1));
    unmount();
    expect(listeners.size).toBe(0);

    let release: (stop: () => void) => void = () => undefined;
    const slow: BrightDbLike = {
      ...db,
      subscribe: () => new Promise<() => void>((resolve) => (release = resolve)),
    };
    const early = render(<BrightDbProvider db={slow}><span>x</span></BrightDbProvider>);
    early.unmount();
    const stopped = jest.fn();
    release(stopped);
    await waitFor(() => expect(stopped).toHaveBeenCalled());
  });

  it('hooks outside a provider fail with a clear message, and useBrightDb returns the database', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useLiveQuery('p'))).toThrow(/BrightDbProvider/u);
    spy.mockRestore();
    const { db } = fakeDb();
    const { result } = renderHook(() => useBrightDb(), { wrapper: wrapperFor(db) });
    expect(result.current).toBe(db);
    render(
      <BrightDbProvider db={db}>
        <span data-testid="ok">ok</span>
      </BrightDbProvider>,
    );
    expect(screen.getByTestId('ok')).toBeTruthy();
  });
});
