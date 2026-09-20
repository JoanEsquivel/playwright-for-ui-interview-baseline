# Test locks in CI/CD

## The rule

**A test lock is a mutex inside one `playwright test` process. It is not a distributed lock.** Held locks live in the memory of the runner's dispatcher (`semantics.md`); nothing is shared between processes or machines.

| CI shape | Do locks work? |
|---|---|
| One job, any number of workers (`playwright-parallel.yml`, `playwright-serial.yml`) | yes |
| Several projects / browsers in the **same** invocation (`BROWSERS=chromium,firefox`) | yes, locks apply across projects |
| Sharded matrix (`--shard=i/n`, `playwright-sharded.yml`) | **no**: each shard is its own process; both believe they hold the lock, and both are right about their own process |
| Browser matrix as separate jobs | **no** |
| Two workflow runs at once (two PRs, push + nightly) against the same environment | **no** |
| A colleague running the suite locally against the same environment | **no** |

## Evidence

The first iteration of the reference demo ran two lock-protected tests (`{ lock: 'shared-account' }`, each taking an atomic `mkdir` as the shared resource) two ways:

- one invocation, 4 workers → both acquired, ~900 ms apart (exactly the hold time); no collision;
- two invocations, `--shard=1/2` and `--shard=2/2`, launched together → `1 failed … 1 passed`, `Shard exit codes: 0, 1`.

Same tests, same lock name; the only change was splitting them across processes. (Recoverable from the demo's history: `git show b22e218:docs/PLAYWRIGHT_SHARDING_AND_LOCK.md`, `b22e218:scripts/cross-shard-lock-demo.mjs`.)

## What to do when the resource is shared across processes

In order of preference:

1. **Unique per test.** Key data on `testInfo.testId`; nothing shared, nothing to lock.
2. **One resource per worker or shard.** One account per shard (`E2E_USERNAME_${{ matrix.shardIndex }}`), one tenant per job; per worker with `testInfo.parallelIndex`. Keep the `lock` inside each shard if tests there still share it.
3. **Idempotent operation**, so overlap is harmless.
4. **Keep the participants out of the shards.** Tag them (`@locked`) and run them in one non-sharded job (`--grep @locked`), shard the rest with `--grep-invert @locked`. *(kit guidance, not measured in the demo)*
5. **Serialise whole runs** with a GitHub `concurrency` group when the conflict is between workflow runs, not inside one. *(kit guidance, not measured in the demo)*

   ```yaml
   concurrency:
     group: e2e-${{ vars.BASE_URL || 'default-env' }}   # one run at a time per environment
     cancel-in-progress: false                          # queue, do not cancel a run that holds the environment
   ```

6. **External distributed lock** only when the resource genuinely cannot be partitioned. It is outside Playwright and outside this kit; treat it as infrastructure, with timeouts and stale-lock handling.

Also ask: would locking serialise enough tests to cancel the benefit of sharding? If so, the resource needs partitioning, not a lock.

## Settings that matter in CI

- **Workers.** `ubuntu-latest` has 4 cores; Playwright defaults to half. Fewer workers hide races, they do not fix them. Stress jobs pass `--workers=4` explicitly.
- **Retries.** The standard config has `retries: CI ? 2 : 0`, which hides contention in normal runs. Any job whose purpose is to validate locks runs with `--retries=0`.
- **Slower runners collide more.** Same code: 1 of 9 readers failed on a laptop, 5 of 9 on the runner. A suite that is "fine locally" is not evidence.
- **Reporters.** Normal jobs keep `[['blob'], ['github'], ['list']]`. A job that is *expected* to fail drops `github` so it does not annotate the pull request.
- **Reports.** Same as every kit workflow: merge the blob to HTML, upload with `if: ${{ !cancelled() }}`.
- **Secrets.** A second role means a second pair of secrets (`E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD`); add them to `utils/env`, `.env.example`, `AGENTS.md` and the workflow `env:` block.

## Optional: the two-job proof workflow

`../templates/playwright-locks.yml` runs on separate runners:

| Job | Runs | Must be |
|---|---|---|
| `without-locks` | the race config (lock-free copies, 4 workers, retries 0, repeat-each 3) with `continue-on-error: true` on the step; writes "Race reproduced" or "No collision this time" to `$GITHUB_STEP_SUMMARY` | green job, red step |
| `with-locks` | the whole suite stressed (`--workers=4 --repeat-each=2 --retries=0`) | green; a failure fails the workflow |

Real outcome in the reference repo: without locks `5 failed, 8 passed (33.0s)` with three different symptoms; with locks `15 passed (30.0s)`.

Use the full workflow for tutorials and for a race you need to keep demonstrable. For a product suite keep only the idea of the second job: a scheduled or on-demand **stress run with retries off**. Do not keep an expected-to-fail job in a product pipeline.

Reading a run: `without-locks` green with a red step is normal, open the job summary and the `playwright-report-without-locks` artifact. If `with-locks` is red, read the trace before blaming the lock (`reproduce-and-verify.md`, section C).

Tokens are the `playwright-ci` ones (`{{BASE_URL}}`, `{{PM}}`, `{{PM_RUN}}`, `{{PM_EXEC}}`); the workflow reuses `.github/actions/setup-playwright`. Validate with `ruby -ryaml -e 'YAML.load_file(ARGV[0])' <file>`.
