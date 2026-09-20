# CI strategy guide

## Serial vs parallel vs sharded

| Aspect | Serial | Parallel | Sharded |
|---|---|---|---|
| Command | `playwright test --workers=1` | `playwright test` (workers = CPU/2) | `playwright test --shard=i/n` per job |
| Machines | 1 | 1 | n (+1 merge job) |
| Needs isolated tests | no | yes | yes (+ `fullyParallel: true` for balanced shards) |
| Report | single blob → html | single blob → html | n blobs → `merge-reports` → html |
| Best for | rate-limited targets, suites where everything shares state, debugging order issues | most suites | long suites, multi-browser, release gates |
| Test locks (`lock`, 1.63+) | pointless (nothing overlaps) | **work**: same-name tests take turns, the rest stays parallel | **do not cross shards**: each shard is its own process |
| Cost | lowest | low | n× minutes, fastest wall-clock |

## Test locks and CI

Full guide: `playwright-locks` skill (`references/ci.md`). What a CI author must know:

- A test lock is a mutex inside **one** `playwright test` process. It replaces the serial strategy when only a few tests share a resource that cannot be duplicated: those tests take turns (costing roughly the sum of their durations), the other workers keep running lock-free tests. In the reference demo's CI the lock-free copies gave `5 failed, 8 passed`; the whole suite with locks, stressed, `15 passed`.
- It works in a single job with any number of workers and between projects of the same invocation and phase. It does **not** work across shards, browser-matrix jobs, two workflow runs at once, or a colleague's local run against the same environment.
- Shared across processes → partition the resource; the ordered options (and which of them are kit guidance rather than measured) are in `playwright-locks/references/ci.md`.
- `retries: CI ? 2 : 0` hides contention. Validate locks in a job with `--retries=0`, and pass `--workers=4`: the runner default (2 on public repositories, 1 on private ones) overlaps less or not at all, and slower runners collide *more* than laptops.
- A job that is expected to fail (a race demonstration) uses `continue-on-error` on the step, writes the outcome to `$GITHUB_STEP_SUMMARY`, and drops the `github` reporter so it does not annotate the pull request. Tutorials only; never in a product pipeline.

## Trigger policy

| Event | Run | Why |
|---|---|---|
| `pull_request` | `lint` + parallel `--grep @smoke` | fast feedback, cheap |
| `push` to main | `lint` + parallel full | protect main |
| `schedule` nightly | sharded full (all browsers if needed) | catch drift, long suites |
| `workflow_dispatch` | serial / sharded on demand | debugging, release |

## Blob reports and merging

`blob` reporter writes `blob-report/report-<shard>.zip`. Each shard uploads it as `blob-report-<i>`; the merge job downloads with `pattern: blob-report-*`, `merge-multiple: true`, then `playwright merge-reports --reporter html ./all-blob-reports` produces one `playwright-report/`. Single-job workflows still merge their one blob to keep artifacts uniform.

## Secrets and variables checklist

- Secrets: `E2E_USERNAME`, `E2E_PASSWORD`, `API_USERNAME`, `API_PASSWORD`
- Variables (optional, default to the values in the workflow): `BASE_URL`, `API_BASE_URL`
- Never echo secrets; never commit `.env`

## Speed levers, in order

1. Install only the needed browser (`chromium`) and cache by Playwright version.
2. `@smoke` on PRs.
3. Parallel workers (default) → sharding when > ~10 min.
4. Reuse auth via the setup project (one login per run, not per test).
5. Seed data through the API instead of the UI.
6. `trace: 'on-first-retry'` (not `'on'`), `screenshot: 'only-on-failure'`, no video.

## Multi-browser matrix (add to any strategy)

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
env:
  BROWSERS: ${{ matrix.browser }}
steps:
  - uses: ./.github/actions/setup-playwright
    with:
      browsers: ${{ matrix.browser }}
```

The standard config creates `ui-<browser>` / `e2e-<browser>` projects for non-chromium values.
