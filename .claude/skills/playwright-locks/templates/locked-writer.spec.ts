import { test, expect } from '@/fixtures/index.fixtures';
import { <Resource>Schema, type <Resource> } from '@/api/schemas/<resource>.schema';
import data from '@/data/<feature>.json';

/**
 * WRITER of a shared resource that cannot be duplicated: <name the resource and why it is unique>.
 *
 * `lock: '<resource-name>'` — every other spec that reads or writes the same resource declares
 * the same name, so none of them overlaps with this one, in any file or worker.
 * Tests that do not need the resource do not declare the lock and keep running in parallel.
 * `@locked` lets CI select these tests (`--grep @locked`): grep sees tags, not lock names.
 *
 * A lock gives exclusive access, not cleanup: if this test failed half-way the resource would
 * stay modified for the rest of the run. The hooks below take a snapshot and put it back, pass
 * or fail. They run inside the lock, so no other holder can see a half-restored resource.
 * (They do not run if the worker process is killed: reset the resource at the start of the run too.)
 */
test.describe('<Feature>', { tag: ['@e2e', '@locked'], lock: '<resource-name>' }, () => {
  let snapshot: <Resource> | undefined;

  test.beforeEach(async ({ authedApi }) => {
    snapshot = undefined;
    const response = await authedApi.<resource>.get();
    // Fixture-style guard, not an assertion: never store an error body as the snapshot.
    if (!response.ok()) throw new Error(`Cannot snapshot <resource-name>: HTTP ${response.status()}`);
    // Parsed, not just typed: the snapshot is written back later, so it must be a proven <Resource>.
    snapshot = <Resource>Schema.parse(await response.json());
  });

  test.afterEach(async ({ authedApi }) => {
    // beforeEach may have failed before taking the snapshot: nothing to put back then.
    if (snapshot === undefined) return;
    await authedApi.<resource>.update(snapshot);
  });

  test('should <verb> <noun> <qualifier>', { tag: ['@regression'] }, async ({ <pageName>Page, authedApi }) => {
    await test.step('Load <PageName> page', async () => {
      await <pageName>Page.load();
      await <pageName>Page.waitLoad();
    });

    await test.step('Change the shared resource', async () => {
      await <pageName>Page.<action>(data.<key>);
    });

    await expect(<pageName>Page.<locator>).toHaveText(data.<expected>);

    await test.step('Hand the shared resource back', async () => {
      await authedApi.<resource>.update(<Resource>Schema.parse(snapshot));
      await <pageName>Page.load();
      await <pageName>Page.waitLoad();
    });

    // The final assertion checks the restored state, so a broken restore fails here, not in a reader.
    await expect(<pageName>Page.<locator>).toHaveText(data.<original>);
  });
});

/*
 * File on the runner instead of a backend record (for example a storage-state file a spec must
 * rewrite)? Same shape with node:fs/promises:
 *
 *   let snapshot: Buffer | undefined;
 *   test.beforeEach(async () => { snapshot = await readFile(RESOURCE_PATH); });
 *   test.afterEach(async () => { if (snapshot) await writeFile(RESOURCE_PATH, snapshot); });
 *
 * and start the writer without reading the file it is about to replace:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 *
 * Prefer one storage-state file per role over a rewritten shared file: then no lock is needed.
 */
