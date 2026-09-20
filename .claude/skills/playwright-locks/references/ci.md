# Test locks in CI/CD

## The rule

**A test lock is a mutex inside one `playwright test` process. It is not a distributed lock.** Held locks live in the memory of the runner's dispatcher (`semantics.md`); nothing is shared between processes or machines.

| CI shape | Do locks work? |
|---|---|
| One job, any number of workers (`playwright-parallel.yml`, `playwright-serial.yml`) | yes |
| Several projects / browsers in the **same** invocation (`BROWSERS=chromium,firefox`) | yes, between projects of the same phase (`semantics.md`) |
| Sharded matrix (`--shard=i/n`, `playwright-sharded.yml`) | **no**: each shard is its own process; both believe they hold the lock, and both are right about their own process |
| Browser matrix as separate jobs | **no** |
| Two workflow runs at once (two PRs, push + nightly), or two workflows of the same push, against the same environment | **no** |
| A colleague running the suite locally against the same environment | **no** |

## Evidence

The first iteration of the reference demo ran two lock-protected tests (`{ lock: 'shared-account' }`, each taking an atomic `mkdir` as the shared resource) two ways:

- one invocation, 4 workers → both acquired, ~900 ms apart (exactly the hold time); no collision;
- two invocations launched together, `--shard=1/2` and `--shard=2/2`, each with `--workers=1 --no-deps` so that the only concurrency left was between the two processes → one process printed `1 failed`, the other `1 passed (1.5s)`; `Shard exit codes: 0, 1`.

Same tests, same lock name; the only change was splitting them across processes. (Recoverable from the demo's history: `git show b22e218:docs/PLAYWRIGHT_SHARDING_AND_LOCK.md`, `b22e218:scripts/cross-shard-lock-demo.mjs`.)

## What to do when the resource is shared across processes

This is the canonical list; other kit files point here. In order of preference:

1. **Unique per test.** Key data on `testInfo.testId`; nothing shared, nothing to lock.
2. **One resource per worker or shard.** One account per shard, one tenant per job (per worker: index a pool with `testInfo.parallelIndex` inside a fixture). Tests of one shard that still share that shard's resource keep a lock with a **static** name; the name cannot contain the shard or worker index at run time (`semantics.md`).
3. **Idempotent operation**, so overlap is harmless.

The first three come from the demo's research. The next two are **kit guidance, not measured in the demo**:

4. **Keep the participants out of the shards.** Locked tests carry the `@locked` tag (`SKILL.md` §2). Run them in one non-sharded job with `--grep @locked` and shard the rest with `--grep-invert @locked`. That job uploads its blob under its own artifact name matching the merge job's pattern (for example `blob-report-locked`), or its results are missing from the merged report.
5. **Serialise whole runs** with a GitHub `concurrency` group when the conflict is between workflow runs, not inside one:

   ```yaml
   concurrency:
     group: e2e-${{ vars.BASE_URL || 'default-env' }}   # one run at a time per environment
     cancel-in-progress: false                          # never cancel the run that holds the environment
   ```

   With `cancel-in-progress: false` GitHub keeps one run in progress and **one** pending per group; a newer run replaces the pending one. It is not an unbounded queue. The same `group` must be in **every** workflow that touches the environment (parallel, sharded, serial, locks); it is scoped to the repository and does nothing for a colleague's local run.

6. **External distributed lock** only when the resource genuinely cannot be partitioned. It is outside Playwright and outside this kit; treat it as infrastructure, with timeouts and stale-lock handling.

Per-shard secrets, valid expression syntax (an expression cannot be nested inside another):

```yaml
env:
  E2E_USERNAME: ${{ secrets[format('E2E_USERNAME_{0}', matrix.shardIndex)] }}
  E2E_PASSWORD: ${{ secrets[format('E2E_PASSWORD_{0}', matrix.shardIndex)] }}
```

Also ask: would locking serialise enough tests to cancel the benefit of sharding? If so, the resource needs partitioning, not a lock.

## Settings that matter in CI

- **Workers.** `ubuntu-latest` has 4 cores on public repositories (Playwright default: 2 workers) and 2 cores on private ones (1 worker: no overlap at all). Fewer workers hide races, they do not fix them. Stress jobs pass `--workers=4` explicitly.
- **Retries.** The standard config has `retries: CI ? 2 : 0`, which hides contention in normal runs. Any job whose purpose is to validate locks runs with `--retries=0`.
- **Slower runners collide more.** Same code: 1 of 9 readers failed in the laptop's captured run, 5 of 9 on the runner. A suite that is "fine locally" is not evidence.
- **Reporters.** Normal jobs keep `[['blob'], ['github'], ['list']]`. A job that is *expected* to fail drops `github` so it does not annotate the pull request.
- **Reports.** Same as every kit workflow: merge the blob to HTML, upload with `if: ${{ !cancelled() }}`.
- **Secrets.** A second role means a second pair of secrets (`E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD`); add them to `utils/env`, `.env.example`, `AGENTS.md` and the workflow `env:` block.

## Optional: the two-job proof workflow

`../templates/playwright-locks.yml`, for tutorials and for a race you need to keep demonstrable:

| Job | Runs | Must be |
|---|---|---|
| `without-locks` | the race config (lock-free copies, 4 workers, retries 0, repeat-each 3) with `continue-on-error: true` on the step; writes "Race reproduced" or "No collision this time" to `$GITHUB_STEP_SUMMARY` | green job, red step |
| `with-locks` (`needs: without-locks`) | the whole suite stressed (`--workers=4 --repeat-each=2 --retries=0`) | green; a failure fails the workflow |

Real outcome in the reference repo (different workloads, so not a speed comparison): the lock-free copies `5 failed, 8 passed (33.0s)` with three different symptoms; the whole suite with locks `15 passed (30.0s)`.

The demo ran both jobs at the same time, which was safe only because its shared resource was a file local to each runner. The template chains them with `needs:` because a backend resource (seeded account, sandbox) is shared between runners: a lock-free job running next to the locked one would make it fail for a reason no lock can fix. For the same reason, do not let this workflow run at the same time as `playwright-parallel.yml` against such a resource (item 5 above).

For a product suite keep only the idea of the second job: a scheduled or on-demand **stress run with retries off**. Do not keep an expected-to-fail job in a product pipeline.

Reading a run: `without-locks` green with a red step is normal, open the job summary and the `playwright-report-without-locks` artifact. If `with-locks` is red, read the trace before blaming the lock (`reproduce-and-verify.md`, section C).

Tokens used by the template, from the `playwright-ci` vocabulary: `{{BASE_URL}}`, `{{API_BASE_URL}}`, `{{PM_EXEC}}`. It reuses `.github/actions/setup-playwright`. Drop the `API_*` lines when the project has no API layer. Validate after replacing tokens: `ruby -ryaml -e 'YAML.load_file(ARGV[0])' <file>`.
