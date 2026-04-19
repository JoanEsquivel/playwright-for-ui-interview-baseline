# Skill Memory

This folder stores project-specific learnings discovered during skill executions.
Each skill has its own file. Claude reads these at the start of each invocation
and appends to them when something new is discovered.

## Files

| File | Skill |
|------|-------|
| `create-test.md` | playwright-create-test |
| `modify-tests.md` | modify-tests |
| `scan-to-tests.md` | scan-to-tests |

## Format

Each memory file uses sections:
- **Selector Patterns** — app-specific locator knowledge (e.g., "this page uses data-testid, not roles")
- **Auth & Navigation** — findings about login flow, redirects, session behavior
- **Known Issues / Gotchas** — anything non-obvious that caused failures and how it was resolved

## Rules

- Only record things that are non-obvious and would save future effort
- Do not duplicate what is already in CLAUDE.md or the skill itself
- Do not manually edit these files unless correcting outdated information
- Use ISO date format: `[YYYY-MM-DD]`
