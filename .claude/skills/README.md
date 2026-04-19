# Claude Code Skills — Playwright Project

## Available Skills

| Skill | Invoke when... |
|-------|----------------|
| `playwright-cli` | You need to open a browser, navigate, click, type, take screenshots, or interact with a live page |
| `playwright-create-test` | You want to create a new page object, fixture entry, and spec file from scratch |
| `modify-tests` | You want to update or delete an existing test, locator, action method, or page object |
| `scan-to-scripts` | You have a URL or path and want Claude to scan the page and generate Playwright scripts automatically |
| `scan-to-test-cases` | You have a URL or workflow description and want ISTQB-style test case documents in Markdown format |

## Always-Active Rules

Architecture rules, the directory map, file responsibilities, and common mistakes live in `CLAUDE.md` at the project root. They are always loaded — no skill invocation required.

## Skill Memory

Each skill logs project-specific learnings to `.claude/skills/memory/<skill-name>.md`.
Claude reads these at the start of each invocation and appends to them when something new is discovered.

## Do Not Touch

`playwright-cli` is a system skill. Never modify its `SKILL.md` or `references/` directory.
