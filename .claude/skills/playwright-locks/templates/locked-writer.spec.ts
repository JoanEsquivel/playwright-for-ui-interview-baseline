import { test, expect } from '../../fixtures/index.fixtures';
import data from '../../data/<feature>.json';

/**
 * WRITER of a shared resource that cannot be duplicated: <name the resource and why it is unique>.
 *
 * `lock: '<resource-name>'` — every other spec that reads or writes the same resource declares
 * the same name, so none of them overlaps with this one, in any file, worker or project.
 * Tests that do not need the resource do not declare the lock and keep running in parallel.
 *
 * A lock gives exclusive access, not cleanup: if this test crashed half-way the resource would
 * stay modified for the rest of the run. The hooks below take a snapshot and always put it back,
 * pass or fail. They run inside the lock, so no other holder can see a half-restored resource.
 */
test.describe('<Feature>', { tag: ['@e2e'], lock: '<resource-name>' }, () => {
  let snapshot: <Snapshot>;

  test.beforeEach(async ({ authedApi }) => {
    // Snapshot the current state before touching it (clients return the unparsed APIResponse).
    snapshot = await (await authedApi.<resource>.get()).json();
  });

  test.afterEach(async ({ authedApi }) => {
    await authedApi.<resource>.update(snapshot);
  });

  test('should <verb> <noun> <qualifier>', { tag: ['@regression'] }, async ({ <name>Page }) => {
    await test.step('Load <Name> page', async () => {
      await <name>Page.load();
      await <name>Page.waitLoad();
    });

    await test.step('Change the shared resource', async () => {
      await <name>Page.<action>(data.<key>);
    });

    await expect(<name>Page.<locator>).toHaveText(data.<expected>);
  });
});

/*
 * File on the runner instead of a backend record (for example a storage-state file a spec must
 * rewrite)? Same shape with node:fs/promises:
 *
 *   let snapshot: Buffer;
 *   test.beforeEach(async () => { snapshot = await readFile(RESOURCE_PATH); });
 *   test.afterEach(async () => { await writeFile(RESOURCE_PATH, snapshot); });
 *
 * and start the writer without reading the file it is about to replace:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 *
 * Prefer one storage-state file per role over a rewritten shared file: then no lock is needed.
 */
