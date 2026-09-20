# Failure taxonomy

| Class | Symptoms | Confirm with | Typical fix |
|---|---|---|---|
| **locator** | `locator resolved to 0 elements`, strict-mode violation (2+ elements), wrong element clicked | `snapshot` at the failing step; `find "<name>"` | Update the locator from the snapshot; add `.filter({ hasText })`; keep the property name |
| **timing** | timeout on `waitLoad()` or first action after navigation; also fails when run alone under `--repeat-each` (if it only fails next to other tests, see **contention**) | trace timeline; `requests` shows late XHR | Correct anchor in `waitLoad()`; `waitFor()` guard before the interaction; assert the post-condition of the previous step |
| **data** | expected text/count differs but the page looks right | compare `data/*.json` with the live values | Fix data; seed through the API; compute expected values from captured inputs |
| **auth** | redirect to login, 401/403, empty storage state | `.auth/*.json` age; `pnpm test:setup` output | Regenerate storage state; fix `E2E.login()` anchor; fix `authToken` fixture |
| **environment** | `ECONNREFUSED`, missing env var error from `utils/env`, browser not installed | run the command from the error message | `.env`, `playwright install`, network |
| **app-bug** | the test is right (verified in the snapshot and against the requirement) but the app shows different behavior | reproduce manually with `playwright-cli` | Bug report (template); optional `test.fixme('<id>')` |
| **contention** | fails only with several workers; passes alone and on retry; the *received* value belongs to another test's data (another user's name, a role-only element visible); `Error reading storage state …: Unexpected end of JSON input`; the failing test is a **reader**, the writer passes | `--workers=4 --repeat-each=3 --retries=0` on the reader plus the specs that write what it reads; timeline fixture from `playwright-locks` shows the overlap; grep who else touches the account/record/file | Isolate: own data per test, one `.auth/<role>.json` per role. Not possible → `lock` on every participant + restore in the writer's `afterEach` (`playwright-locks` skill). In sharded CI a lock is not enough: partition the resource |
| **flaky** | intermittent; passes on retry; no other test involved | `--repeat-each=10`; trace of a failing attempt | Remove the race inside the test: wait for the specific post-condition, disable animations if needed |

Decision rule: if two classes seem possible, pick the one the trace proves; never fix two things at once.
