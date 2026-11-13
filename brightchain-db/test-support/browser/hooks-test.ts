/**
 * Runs the React hooks from brightchain-react-components against real
 * IndexedDB in a real page: a write made through a second connection (as a
 * second tab would make it) must appear in the rendered list.
 * Bundle with esbuild and open hooks.html. document.title becomes DONE or FAILED.
 */
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { BrightDbProvider, useDocument, useLiveQuery } from '../../../brightchain-react-components/src/lib/hooks/brightdb';
import { openBrowserDb } from '../../src/browser';

type Person = { _id: string; name: string };
const results: Array<{ name: string; ok: boolean; detail?: unknown }> = [];

async function until(check: () => boolean, what: string, ms = 5000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    results.push({ name, ok: true, detail: await fn() });
  } catch (error) {
    results.push({ name, ok: false, detail: String((error as Error)?.stack ?? error) });
  }
}

function List() {
  const { data, loading } = useLiveQuery<Person>('people');
  return h('ul', { id: 'list', 'data-loading': String(loading) }, data.map((p) => h('li', { key: p._id }, p.name)));
}

let saveDoc: ((p: Person) => Promise<void>) | undefined;
function One() {
  const { data, save } = useDocument<Person>('people', 'solo');
  saveDoc = save;
  return h('p', { id: 'solo' }, data ? data.name : 'none');
}

async function main(): Promise<void> {
  const name = `bc-hooks-${Math.random().toString(36).slice(2, 8)}`;
  const view = await openBrowserDb(name);
  const other = await openBrowserDb(name); // a second connection, like another tab
  const host = document.createElement('div');
  document.body.append(host);
  createRoot(host).render(h(BrightDbProvider, { db: view as never, intervalMs: 100 }, h(List), h(One)));
  const items = () => [...host.querySelectorAll('#list li')].map((n) => n.textContent);

  await step('renders an empty list from IndexedDB', async () => {
    await until(() => host.querySelector('#list')?.getAttribute('data-loading') === 'false', 'first load');
    if (items().length !== 0) throw new Error('expected an empty list');
  });
  await step('a write through another connection appears in the list', async () => {
    await other.collection('people').insertOne({ _id: 'a', name: 'Ada' });
    await until(() => items().includes('Ada'), 'Ada to appear');
    return items();
  });
  await step('a write through the same connection appears too', async () => {
    await view.collection('people').insertOne({ _id: 'b', name: 'Bo' });
    await until(() => items().includes('Bo'), 'Bo to appear');
    return items();
  });
  await step('useDocument saves, and sees an edit from the other connection', async () => {
    await until(() => saveDoc !== undefined, 'hook mounted');
    await saveDoc!({ _id: 'solo', name: 'First' });
    await until(() => host.querySelector('#solo')?.textContent === 'First', 'saved doc to render');
    await other.collection('people').replaceById('solo', { _id: 'solo', name: 'Second' });
    await until(() => host.querySelector('#solo')?.textContent === 'Second', 'edit from other connection');
  });
  await step('a delete through another connection removes the row', async () => {
    await other.collection('people').deleteById('a');
    await until(() => !items().includes('Ada'), 'Ada to disappear');
    return items();
  });

  const failed = results.some((r) => !r.ok);
  document.getElementById('results')!.textContent = JSON.stringify(results, null, 2);
  document.title = failed ? 'FAILED' : 'DONE';
}

void main().catch((error) => {
  document.getElementById('results')!.textContent = String(error?.stack ?? error);
  document.title = 'FAILED';
});
