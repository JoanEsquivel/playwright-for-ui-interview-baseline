# Decision guide: lock, isolate or serialise

## The three questions, in order

1. **Can I remove the sharing?** Own user, own record, own file per test. Key data on `testInfo.testId`; seed through the API in `beforeEach`, delete in `afterEach`.
2. **Can I make it read-only for most tests?** Written once by the setup project, only read afterwards (one `.auth/<role>.json` per role). Reads do not conflict.
3. **Only then: lock it**, on *every* participant.

## Choosing the tool

| Situation | Technique |
|---|---|
| Independent reads of public pages | parallel tests, no lock |
| Tests only read a shared thing | no lock |
| Writable data can be partitioned | unique resource per test / worker / shard |
| Different roles need different sessions | one setup test per role writing `.auth/<role>.json`; `test.use({ storageState })` per spec. **Not** a lock |
| One exclusive resource within one run | named test lock on every participant |
| Two independent exclusive resources in one test | `lock: ['a', 'b']` |
| Resource shared across shards, CI jobs, machines or concurrent runs | partition it or coordinate outside Playwright (`ci.md`) |
| Tests depend on each other's results | redesign: setup project or fixture. Do not lock |
| Every test mutates the same global state | serial strategy (`--workers=1`, `playwright-ci`); a lock on everything is the same thing with more typing |
| Login reused by many tests | setup project + `storageState` |

## Lock vs the older workarounds

| Workaround | Problem | Lock |
|---|---|---|
| `--workers=1` / `fullyParallel: false` | whole suite pays; correct and several times slower | only the participants take turns |
| `test.describe.configure({ mode: 'serial' })` | only helps when the colliding tests live in the same file; couples them (one failure skips the rest) | works across files, workers and projects; tests stay independent |
| sleeps, retries | the failure gets rarer, not fixed; retries hide it | removes the overlap |
| one project with `workers: 1` | serialises the project, not the resource; other projects still collide | follows the resource wherever it is used |

Target picture: ~95 % of the suite parallel and lock-free, a few tests declaring the resources they cannot avoid sharing.

## Resources that typically need a lock

Seeded or shared user account · admin account · shared tenant · mutable database record with a fixed id · feature flags and global app settings · environment configuration · third-party sandbox with one slot (payments, SMS, e-mail inbox) · rate-limited API · physical device · a file on the runner that a test rewrites.

Not on this list: authentication state per role, test data a test can create for itself, anything read-only.

## Review checklist (before approving a lock)

1. Could this resource be made unique per test instead of locked?
2. Is the resource shared only inside one run, or across CI jobs too?
3. Would locking serialise enough tests to cancel the benefit of parallelism or sharding?
4. Is the lock protecting a real external resource, or hiding test coupling?
5. Should CI allocate one account or tenant per shard instead?
6. Does every test that touches the resource declare the lock (grep the resource handle, not the lock name)?
7. Does every writer restore the resource in `afterEach`?

## Naming

- kebab-case noun of the resource: `seeded-account`, `payment-sandbox`, `feature-flags`.
- One name per resource, not per feature or file. Two names for the same resource protect nothing.
- Do not build names dynamically unless the resource really is per-key (`lock: \`tenant-${tenantId}\`` is fine when tenants are independent).
- List the project's lock names and what they protect in `AGENTS.md` or the agent memory so the next test reuses them.
