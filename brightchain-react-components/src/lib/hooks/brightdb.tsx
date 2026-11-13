/**
 * React hooks for BrightDB v2 in the browser (or anywhere): a provider that
 * holds one database and watches it for commits, and hooks that re-run their
 * query when the database changes, from this tab or another.
 *
 * The hooks depend only on the small `BrightDbLike` shape below, which the
 * database from `@brightchain/db/browser` (`openBrowserDb`) and the Node
 * `PortableBrightDb` both satisfy, so this package does not pull in the
 * database code itself.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type BrightDbDocument = { _id: string; [key: string]: unknown };

interface BrightDbCollectionLike<T extends BrightDbDocument> {
  findById(id: string): Promise<T | null>;
  find(filter?: Record<string, unknown>): { toArray(): Promise<T[]> };
  findByIndex(name: string, query?: Record<string, unknown>): Promise<T[]>;
  insertOne(document: T): Promise<unknown>;
  replaceById(id: string, document: T): Promise<unknown>;
  deleteById(id: string): Promise<unknown>;
}

/** The part of a BrightDB v2 database the hooks use. */
export interface BrightDbLike {
  collection<T extends BrightDbDocument = BrightDbDocument>(name: string): BrightDbCollectionLike<T>;
  /** Called after the database root moves; returns a function that stops listening. */
  subscribe(
    listener: () => void | Promise<void>,
    options?: { intervalMs?: number; onError?: (error: unknown) => void },
  ): Promise<() => void>;
}

interface BrightDbContextValue {
  db: BrightDbLike;
  /** Increases every time the database changes. Hooks re-run their queries when it does. */
  version: number;
}

const BrightDbContext = createContext<BrightDbContextValue | null>(null);

export interface BrightDbProviderProps {
  db: BrightDbLike;
  /** How often to look for commits made in other tabs. Default 250 ms. */
  intervalMs?: number;
  children: ReactNode;
}

/** Provides a database to the hooks below and watches it so they stay current. */
export function BrightDbProvider({ db, intervalMs = 250, children }: BrightDbProviderProps) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void db
      .subscribe(() => setVersion((v) => v + 1), { intervalMs })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [db, intervalMs]);
  const value = useMemo(() => ({ db, version }), [db, version]);
  return <BrightDbContext.Provider value={value}>{children}</BrightDbContext.Provider>;
}

function useContextValue(): BrightDbContextValue {
  const value = useContext(BrightDbContext);
  if (!value) throw new Error('BrightDB hooks must be used inside a <BrightDbProvider>');
  return value;
}

/** The database from the nearest provider. */
export function useBrightDb(): BrightDbLike {
  return useContextValue().db;
}

export interface QueryState<T> {
  data: T;
  /** True until the first result arrives. Later refreshes keep the previous data. */
  loading: boolean;
  error: Error | null;
}

/** Run an async read now and again whenever the database changes or `key` does. */
function useRead<T>(initial: T, key: string, read: (db: BrightDbLike) => Promise<T>): QueryState<T> {
  const { db, version } = useContextValue();
  const [state, setState] = useState<QueryState<T>>({ data: initial, loading: true, error: null });
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    let current = true;
    readRef
      .current(db)
      .then((data) => current && setState({ data, loading: false, error: null }))
      .catch((error: unknown) => current && setState((s) => ({ data: s.data, loading: false, error: error as Error })));
    return () => {
      current = false;
    };
  }, [db, version, key]);
  return state;
}

/** Documents in a collection matching a MongoDB-style filter, kept current. */
export function useLiveQuery<T extends BrightDbDocument = BrightDbDocument>(
  collection: string,
  filter: Record<string, unknown> = {},
): QueryState<T[]> {
  return useRead<T[]>([], `${collection}\u0000${JSON.stringify(filter)}`, (db) =>
    db.collection<T>(collection).find(filter).toArray(),
  );
}

/** Documents found through an ordered index (see `findByIndex`), kept current. */
export function useIndexQuery<T extends BrightDbDocument = BrightDbDocument>(
  collection: string,
  index: string,
  query: Record<string, unknown> = {},
): QueryState<T[]> {
  return useRead<T[]>([], `${collection}\u0000${index}\u0000${JSON.stringify(query)}`, (db) =>
    db.collection<T>(collection).findByIndex(index, query),
  );
}

export interface DocumentState<T extends BrightDbDocument> extends QueryState<T | null> {
  /** Insert the document, or replace it if it already exists. */
  save(document: T): Promise<void>;
  remove(): Promise<void>;
}

/** One document by id, kept current, with helpers to save and delete it. */
export function useDocument<T extends BrightDbDocument = BrightDbDocument>(
  collection: string,
  id: string,
): DocumentState<T> {
  const { db } = useContextValue();
  const state = useRead<T | null>(null, `${collection}\u0000${id}`, (d) => d.collection<T>(collection).findById(id));
  const save = useCallback(
    async (document: T) => {
      const target = db.collection<T>(collection);
      if ((await target.findById(id)) === null) await target.insertOne({ ...document, _id: id });
      else await target.replaceById(id, { ...document, _id: id });
    },
    [db, collection, id],
  );
  const remove = useCallback(async () => {
    await db.collection<T>(collection).deleteById(id);
  }, [db, collection, id]);
  return { ...state, save, remove };
}
