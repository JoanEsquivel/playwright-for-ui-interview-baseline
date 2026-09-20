---
name: test-locks-learnings
description: Non-obvious lessons from building and reviewing the Playwright test locks research (lock option, 1.63) — mistakes actually made, and the state of locks in this repo
metadata:
  type: project
---

Source: the author's research repo <https://github.com/JoanEsquivel/playwright-lock-demo>, integrated into the kit on 2026-09-20. Procedure and semantics live in the `playwright-locks` skill; this file keeps only what went wrong and what is specific to this repo.

- 2026-09-13: The demo's first version had two real bugs, found in review (its commit `12feb51`): public `ui` specs inherited the project `storageState` and read the shared file **without** the lock; the writer restored the resource only at the end of the test body, so a failure poisoned the rest of the run.
- 2026-09-13: Writers never failed; only readers did, in another file, with messages that look like app bugs (`Received: "<other user>"`, `Unexpected end of JSON input`). Look for who writes what the failing test reads.
- 2026-09-13: The tutorial's first wording of the `beforeAll`/serial granularity was wrong. On 2026-09-20 the kit integration repeated the pattern: "locks apply across projects" and "setup needs no lock" were written from the docs and were incomplete — the runner has one dispatcher per **phase**, and here `api` shares phase 1 with `setup`. Check lock claims against the runner source, not from memory or the README.
- 2026-09-20: A workflow copied from the demo and generalised failed review twice: it dropped the `API_*` env the kit's `api` project needs, and it ran the lock-free and locked jobs side by side, safe only when the resource is a runner-local file. Re-derive templates for the kit's defaults instead of copying.
- 2026-09-20: `--grep` sees tags, not lock names: locked tests carry `@locked`.
- 2026-09-20: **This repo has no locked test and no lock name yet.** As far as observed, SauceDemo keeps its state in the browser context and DummyJSON simulates writes without persisting them, so nothing here is genuinely shared between tests. Do not add a lock "as an example".

**Why:** contention looks like an application bug or CI noise, passes on retry, and costs hours when the class is not recognised; and confident statements about scheduler behaviour were wrong twice.
**How to apply:** fails only with several workers → reproduce with `--workers=4 --repeat-each=3 --retries=0` including the specs that write what it reads; isolate first, lock only what cannot be duplicated, on every participant. When a lock is added to this project, record its name and the resource it protects here.
