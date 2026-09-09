# QA agent guide — `qa-playwright-engineer`

How to invoke the agent from Claude Code, GitHub Copilot and Cursor, and which prompts get the best results. The agent applies the standards in `AGENTS.md` and works for any application: it reads targets and credentials from `.env`, never from memory.

## 1. Before you start

```bash
cp .env.example .env                          # fill BASE_URL, E2E_USERNAME, E2E_PASSWORD (+ API_* if the project has an API layer)
pnpm install && pnpm exec playwright install chromium --with-deps
pnpm test:setup                               # logs in once and writes .auth/user.json (storage state)
```

`.claude/settings.json` already allows the agent to run `lint`, `playwright test`, `playwright-cli`, `node scripts/*` and `curl` without permission prompts, and runs ESLint after every file it edits.

## 2. How to invoke

| Tool | Command or gesture |
|---|---|
| Claude Code, interactive | `claude --agent qa-playwright-engineer` (the agent drives the whole session), or in any session just describe a QA task and Claude delegates to it |
| Claude Code, scripted / CI | `claude -p --agent qa-playwright-engineer --permission-mode acceptEdits "<prompt>"` |
| Claude Code, one skill directly | `/playwright-scaffold`, `/playwright-create-test`, `/playwright-fix-test`, `/playwright-delete-test`, `/playwright-ci` |
| GitHub Copilot, VS Code | pick `qa-playwright-engineer` in the chat agent picker, or type `/qa-playwright-engineer <prompt>` |
| GitHub Copilot CLI | `copilot --agent qa-playwright-engineer --prompt "<prompt>"` |
| Cursor | no agent file; `AGENTS.md` and the skills load automatically. Describe the task, or pick a skill from the `/` menu (`/playwright-create-test`) |

The agent always preloads `playwright-architecture` (the standards) and `playwright-cli` (live browser). It loads the task skill it needs from your prompt.

## 3. What the agent needs from you

| Parameter | Where it looks | Give it in the prompt when |
|---|---|---|
| `BASE_URL`, `API_BASE_URL` | `.env`, `.env.example`, `AGENTS.md` | scaffolding a new project, or the target differs from `.env` |
| Credential variable names | `.env.example`, `AGENTS.md` | the app uses other names than `E2E_USERNAME` / `E2E_PASSWORD` |
| Language `ts` / `js` | `package.json`, existing files | scaffolding (defaults to TypeScript) |
| Package manager | `packageManager` field, lockfile | scaffolding (defaults to pnpm) |

If something required is missing it asks one question, then continues. State the values up front to skip the question.

## 4. Recommended prompts

### Scaffold a framework from zero

```
Create a Playwright framework in ../orders-web-tests for https://orders.example.com (UI) and https://api.orders.example.com (API). TypeScript, pnpm. Credentials will be E2E_USERNAME/E2E_PASSWORD and API_USERNAME/API_PASSWORD. Scan the login page and implement the real login flow.
```

Variants: add `JavaScript` for the JS variant; add `The app has no API` to skip the API layer; add `no login, public site` to drop the setup project.
Expect: generated project, `lint` and `test` output, and a checklist with anything it could not verify live.

### Add UI tests for a page

```
Add UI tests for /settings/profile: the form saves first name and last name, shows a validation error when the email is empty, and the Cancel button returns to /dashboard. Tag the happy path @smoke.
```

Public page variant: `The page is public; start logged out.`
Expect: a live snapshot summary, `pages/<page>.ts` (new or extended), the fixture entry, `tests/ui/<feature>.spec.ts`, `data/<feature>.json`, and the run output.

### Add an end-to-end flow

```
Add an E2E test that creates a project from the dashboard, opens it, adds a task and verifies the task appears in the list. Reuse existing page objects where they exist; add a flow method in utils/e2e.ts if steps repeat.
```

### Add API tests for an endpoint

```
Cover GET /orders and GET /orders/{id}: list with pagination (limit, skip), get by id, 404 for an unknown id, and 401 without a token. Derive the zod schema from a real response.
```

Expect: probe output (`curl`), `api/schemas/orders.schema.ts`, `api/clients/orders.client.ts`, the fixture wiring, `tests/api/orders.spec.ts`, and the run output.

### Fix a failing or flaky test

```
tests/ui/login.spec.ts fails on "should show an error for a locked out user". Here is the output: <paste>. Find the root cause first, then apply the smallest fix. Do not change the assertion unless the app behavior really changed.
```

Flaky variant: `It passes on retry about half the time; use --repeat-each and the trace to find the race.`
Expect: root cause in one sentence, failure class (locator / timing / data / auth / environment / app-bug / flaky), the diff, and a `--repeat-each=3` green run. If the app is wrong it writes a bug report under `bug-reports/` instead of patching the test.

### Delete tests safely

```
Delete tests/ui/cart.spec.ts and anything only it uses. Keep the cart page object if other specs still need it.
```

Page-object variant: `Remove the Wishlist page object entirely, including its fixture, flow methods, data and specs.`
Expect: list of removed and edited files, a grep showing zero orphaned references, `lint` and `--list` output.

### CI

```
Set up GitHub Actions: parallel run on pull requests with @smoke only, full suite on push to main, and a nightly sharded run with 4 shards. Add the lint gate.
```

Variants: `The target is rate-limited: run serially with one worker.` · `Add firefox and webkit to the nightly run.`
Expect: workflow files, the composite setup action, the list of secrets and variables to configure, and YAML validation output.

### Conventions and reviews

```
Where should a helper that formats prices for assertions live, and how do I share it between UI and API specs?
```

```
Review tests/e2e/checkout.spec.ts and pages/cart.ts against the standards in AGENTS.md. List violations with the rule number and the fix.
```

## 5. Prompt patterns

| Works | Why |
|---|---|
| Name the route, endpoint or spec file | The agent scans or runs exactly that |
| Say what outcome to verify, in user terms | Becomes the assertion; avoids tests without a clear check |
| State constraints: tags, project (`ui`/`api`/`e2e`), logged-out, data to use | Fewer questions, right file location |
| Paste the failing command and output | Skips a reproduction round |
| Ask for root cause before the fix | Prevents locator-guessing |

| Avoid | Why |
|---|---|
| "Write some tests for the app" | No target, no outcome; it will ask |
| Pasting selectors you remember | It must verify on the live page anyway; wrong selectors slow it down |
| "Make the test pass" | It will not weaken assertions; ask for the root cause instead |
| Mixing scaffold + tests + CI in one sentence | It will do them in order, but one task per prompt is easier to review |

## 6. Reading the report

Every task ends with: files created or modified (paths), the commands it ran with their output, anything observed on the live target that differs from the request, and next steps. The definition of done is `pnpm lint` clean plus a green targeted `playwright test` run. If a gate could not run, the report says so explicitly instead of claiming success.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| "This command requires approval" in `-p` mode | The command is not in the `.claude/settings.json` allowlist; add a `Bash(...)` pattern or run interactively |
| `Missing required environment variable "X"` | Fill it in `.env` (copy from `.env.example`) |
| Tests redirect to the login page | Storage state is stale: `pnpm test:setup` |
| `playwright-cli: command not found` | Use `pnpm exec playwright-cli …` (or `npx playwright-cli …`) |
| A skill does not show in the `/` menu | Folder name must equal the `name` in `SKILL.md`; in Claude Code run `/reload-plugins` |
| Copilot or Cursor ignore a rule | Regenerate mirrors with `pnpm sync:agents` (the Lint workflow fails when they drift) |
