# Reproduce the race, then verify the lock

A lock is a claim ("these tests collide"). Prove the claim before and after: red without the lock, green with it, both with retries off.

## A. Reproduce without the lock

Conditions that make a collision likely: **retries 0**, **≥ 4 workers**, **every test repeated**, only the suspected participants.

Quick, no files:

```bash
pnpm exec playwright test <writer.spec> <reader.spec> --workers=4 --repeat-each=3 --retries=0 --reporter=list
```

Repeatable (a teaching repo, or a race you want to keep demonstrable): copy `../templates/playwright.race.config.ts` next to `playwright.config.ts`. It spreads the base config and changes only what matters:

| Setting | Value | Why |
|---|---|---|
| `retries` | `0` | a retry would hide the collision |
| `workers` | `4` (or `WORKERS`) | the default (half the cores) overlaps less |
| `repeatEach` | `3`, on the project | more chances to overlap; only the race specs repeat |
| `reporter` | no `github` | expected failures must not annotate a pull request |
| `trace` | `'retain-on-failure'` | `'on-first-retry'` never fires with retries 0 |
| `projects` | `setup` + one project on the race folder | the normal run never sees these specs |

`package.json` scripts (`demo:race` is expected to **fail**, `demo:locks` must be green):

```json
"demo:race": "playwright test -c playwright.race.config.ts",
"demo:locks": "playwright test --workers=4 --repeat-each=2 --retries=0"
```

Lock-free copies of locked specs (so both versions can run side by side) live in a folder no project of the main config points at, e.g. `tests/demo/race/`. They differ from the originals only by the missing `lock` option and a header comment, so `diff` shows the fix. That folder is a documented exception to the four-folder layout: record it in `AGENTS.md` (and in the project's decision log, if it has one). For a one-off investigation, skip the copies: remove the `lock` locally, reproduce, put it back.

## B. See the overlap: the timeline fixture

`../templates/timeline.fixtures.ts` is an `auto` fixture that prints start/end, the worker slot and the repeat index. Merge it in `fixtures/index.fixtures` while investigating; remove it afterwards unless the repo is a tutorial (it is a teaching aid, not a reporting layer).

Without the lock (trimmed, real output):

```text
23:17:40.427 ▶ start  [worker 3] should take over the shared session as admin … (run 3)
23:17:41.184 ▶ start  [worker 2] should show the customer name in the header (run 3)      ← starts while a writer holds the resource
23:17:46.987 ■ end    [worker 2] should show the customer name in the header (run 3) → failed
    Expected: "Casey Customer"
    Received: "Alex Admin"
  1 failed
  12 passed (11.8s)
```

How to read it: find the failed reader's `start`; look for a writer whose `start` is earlier and whose `end` is later. That interval is the collision.

With the lock:

```text
23:17:50.206 ▶ start  [worker 2] should show the home headline (run 1)
23:17:50.220 ▶ start  [worker 3] should take over the shared session as admin … (run 1)
23:17:51.057 ■ end    [worker 2] should show the home headline (run 1) → passed
23:17:56.750 ■ end    [worker 3] should take over the shared session as admin … (run 1) → passed
23:17:56.756 ▶ start  [worker 3] should show the customer name in the header (run 1)      ← only now
  8 passed (12.3s)
```

What it shows: lock-free tests ran in parallel with the writer; the first reader started 6 ms after the writer ended; holders of the same name ran one at a time. Cost: the holders run back to back, so they take roughly the sum of their durations (here ~6 s writer + ~3 s readers) while the rest of the suite is unaffected. Which holder goes first varies between runs: read the timeline, never assert on it.

## C. Verify the fix

```bash
pnpm lint
pnpm exec playwright test --workers=4 --repeat-each=2 --retries=0      # whole suite, stressed
```

Green several times in a row, output shown. If it goes red:

1. Read the failing test's trace first: the target may simply be down.
2. A participant is missing the lock (grep the resource handle).
3. A writer did not restore the resource (`afterEach`).
4. The file lost `fullyParallel`, or gained `beforeAll`/serial mode, and the timing changed.
5. The resource is also used by another run (shard, job, a colleague, a cron) → `ci.md`.

## D. Isolation alternative check

Before keeping the lock, spend five minutes on the alternative: can the writer use its own copy (another account, another file, a record it creates)? If yes, delete the lock and the race together.
