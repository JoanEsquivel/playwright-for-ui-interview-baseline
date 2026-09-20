# Things that bite people

Each item was hit or measured in the reference demo (<https://github.com/JoanEsquivel/playwright-lock-demo>); two of them were bugs in the demo's own first version, found in review.

## 1. Everyone must opt in

A lock protects nothing on its own; it is an agreement between tests. A test that touches the resource without declaring the lock is invisible to the scheduler and collides as before.

*Real case:* the demo's public-page specs inherited the project-level `storageState` and so read the shared session file **without** the lock. Fix: tests that do not need the resource stop touching it (`test.use({ storageState: { cookies: [], origins: [] } })`); tests that need it use the group form.

No lint rule can enforce this. Find participants by grepping the **resource handle** (file path, account variable, client method), not the lock name.

## 2. A lock is not cleanup

Exclusive access only. If a writer crashes half-way, the resource stays modified and every later holder fails *with* the lock in place.

*Real case:* the demo's writer first restored the file only at the end of the test body. Fix: snapshot in `beforeEach`, restore in `afterEach`, which runs even when the test fails and still inside the lock (`../templates/locked-writer.spec.ts`).

## 3. File mode changes the granularity

With `fullyParallel: false` a lock declared by any test is held for the whole file; `mode: 'serial'` makes the group one unit; `beforeAll`/`afterAll` make Playwright run the file in a few chunks and the lock is held per chunk. Details in `semantics.md`. The demo's tutorial got the `beforeAll` wording wrong on first writing: verify such claims against the docs or the runner, not from memory.

## 4. A lock is not an order

"Not at the same time", never "A before B". Dependencies belong in a setup project or a fixture.

## 5. A lock lives inside one run

One `playwright test` process. Shards, matrix jobs and concurrent workflow runs do not see each other's locks (`ci.md`).

## 6. Retries hide races

With `retries: 2` a collision usually passes on the retry and is never reported. Investigate contention with `--retries=0`; validate a lock with `--retries=0`.

## 7. One race, several symptoms

The same overlap produced, in different runs:

| Symptom | What happened |
|---|---|
| `Expected: "<user A>"  Received: "<user B>"` on a header/profile assertion | reader loaded the resource while the writer held it |
| `Expected: hidden  Received: visible` on a role-only element | same |
| `Error reading storage state from <file>: Unexpected end of JSON input` | reader opened the file during the few ms the writer was writing it (torn read) |

All look like application bugs or infrastructure noise. None is. Signs that it is contention: fails only with several workers, passes alone, passes on retry, the *received* value belongs to another test's data.

## 8. Writers never fail, readers do

A writer asserts on its own browser and passes. The damage shows up in whoever reads the shared thing, often in another file. Do not look for the bug in the failing spec only: look for who else writes what it reads.

## 9. Few workers and fast machines hide it

`ubuntu-latest` has 4 cores and Playwright defaults to half (2 workers): fewer overlaps, so the race goes unnoticed for months. Force `--workers=4` (or more) when reproducing. Slower machines *widen* the window: the demo collided 1 of 9 readers on a laptop and 5 of 9 on the CI runner.

## 10. It may not reproduce on a given run

Timing-dependent. Raise `--repeat-each`, raise workers, re-run. "Passed once without the lock" proves nothing.

## 11. Locks are exclusive

Readers holding the same name serialise against each other too. If many read-only tests pile up behind one lock, make them independent of the resource instead.

## 12. `parallelIndex`, not `workerIndex`, in timelines

`workerIndex` grows each time a worker restarts (after every failure), which makes overlaps unreadable.
