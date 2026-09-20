# Test lock semantics

Source of truth: `TestDetails` in `@playwright/test` 1.63 (`lock?: string | string[]`), the [Test locks docs](https://playwright.dev/docs/test-parallel#test-locks) and the [1.63.0 release notes](https://github.com/microsoft/playwright/releases/tag/v1.63.0). Behaviour marked *(measured)* was observed in the reference demo.

## API

`lock` is a key of the details object, next to `tag` and `annotation`. It is accepted by `test()`, `test.describe()` and their variants (`only`, `skip`, `fixme`, `fail`, …).

```ts
test('title', { lock: 'user-settings' }, async ({ page }) => {});
test('title', { lock: ['seeded-account', 'payment-sandbox'] }, async () => {});
test.describe('group', { tag: ['@e2e'], lock: 'seeded-account' }, () => {});
```

- A lock is a **name**. Nothing to register, configure or clean up. Two tests coordinate because they spell the same string.
- Same name → never concurrent, "even when they are declared in different files or belong to different projects". Different name or no name → unaffected.
- `lock: ['a', 'b']` starts only when **all** are free. It blocks holders of `a`, holders of `b` and holders of both; not holders of `c`.
- A group lock applies to every test in the `describe`; a test inside can add more names.

## When it is held

"Playwright acquires all the locks of a test before the test starts and releases them when it finishes."

- Held for the **whole test**: fixtures setup, `beforeEach`, body, `afterEach`, fixtures teardown. The browser context is created *inside* the lock, so a `storageState` file is read inside it too.
- Released after teardown. *(measured)* the next holder started 6 ms after the previous one ended.
- Because `afterEach` runs inside the lock, a restore done there is never observed half-way by another holder.

## Exclusive, not read/write

Locks are plain mutexes. There is no "many readers, one writer": three read-only tests holding the same name also take turns with each other. *(measured)* That cost is small but real; it is one more reason to make readers independent of the resource when possible.

## Granularity depends on the file mode

| Mode | Unit that holds the lock |
|---|---|
| `fullyParallel: true` (kit standard) | each test acquires and releases individually |
| default file mode (`fullyParallel: false`) | the file runs as one unit on one worker; a lock declared by **any** test is held for the **whole file** |
| `test.describe.configure({ mode: 'serial' })` | the serial group is one unit again |
| `beforeAll` / `afterAll` present | tests run in a few chunks; the lock is held for a whole chunk |

Keep `fullyParallel: true` and avoid `beforeAll` in locked files, or the lock serialises more than you intended.

## How the scheduler applies it (read in the 1.63.0 runner source)

- A test's locks are its own plus those of every enclosing `describe` (union).
- The scheduling unit is a *job* (a group of tests that must run together on one worker). A job's locks are the union of its tests' locks; this is why the file mode above changes the granularity.
- The dispatcher keeps held locks **in the memory of the runner process**. When a worker is free it takes the first queued job whose locks are all free and skips the others. A waiting test therefore does not occupy a worker: the worker runs lock-free tests meanwhile. If only locked jobs are left, workers idle.
- Nothing is written to disk or shared between processes. That is the mechanical reason locks cannot cross shards or jobs.

## Worker, project, shard

- **Worker**: an OS process. Separate memory and browser contexts; a module-level variable is not shared between workers. Shared things are therefore always *outside* the test process: a file, an account, a backend record, a sandbox.
- **Project**: a named configuration in the same run, scheduled on the same worker pool. **Locks apply across projects.**
- **Shard**: a separate `playwright test --shard=i/n` invocation, usually on another machine. **Locks do not cross shards**, nor concurrent jobs or workflow runs (`ci.md`).
- `testInfo.parallelIndex` is the stable slot number (`0..workers-1`); `testInfo.workerIndex` grows every time a worker process restarts. Use `parallelIndex` when printing timelines. Both are numbered per invocation: worker 0 of shard 1 and worker 0 of shard 2 are unrelated.

## Setup projects

A `setup` project that *creates* the shared resource (for example the storage-state file) does not need the lock: projects with `dependencies: ['setup']` start only after it finished. A lock is for tests that overlap in time.

## What a lock is not

- Not an order: "not at the same time", never "A before B".
- Not cleanup: exclusive access only.
- Not distributed: one process, one run.
- Not a substitute for isolation: it serialises the participants, so every locked test is a test that no longer runs in parallel with its peers.
