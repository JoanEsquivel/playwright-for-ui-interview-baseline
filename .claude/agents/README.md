# QA Bot Agent

## Overview

`qa_bot` is the single agent for all QA tasks in this project. It handles scanning, test generation, ISTQB docs, scaffolding, and modification directly via skills — no specialist agents, no routing layers.

## Agent

| File | Purpose |
|------|---------|
| `qa_bot.md` | Single QA agent — invokes skills directly, holds project memory |

## How to Invoke

Type `@qa-bot` followed by your task, or simply describe a QA task — Claude Code auto-delegates to `qa_bot` based on its description.

## What qa_bot Does

| You say... | qa_bot invokes |
|---|---|
| "Scan /cart.html and generate tests" | `scan-to-scripts` |
| "Generate ISTQB docs for the inventory page" | `scan-to-test-cases` |
| "Scan /cart.html — give me both tests and test case docs" | `scan-to-scripts` + `scan-to-test-cases` **in parallel** |
| "Scan cart AND inventory pages" | 2× scan skills **in parallel** |
| "Add a new page object for product details" | `playwright-create-test` |
| "Fix the broken remove button locator" | `modify-tests` |
| "Add page object AND fix cart locator" | `playwright-create-test` + `modify-tests` **in parallel** |

## playwright-cli as Live Eyes

`playwright-cli` is invoked before any content is generated, any locator is designed, or any assertion is written. No QA artifact is produced from training knowledge or memory — real page observation is mandatory for every task.

## Skills

| Skill | Purpose |
|-------|---------|
| `playwright-cli` | Live browser observation — required before any content generation |
| `scan-to-scripts` | Scan live URL → page object + fixture + spec |
| `scan-to-test-cases` | Scan live URL → ISTQB Markdown in `testcases/` |
| `playwright-create-test` | Scaffold page objects + fixtures + specs |
| `modify-tests` | Update, fix, rename, or delete existing tests and locators |

## Memory

`qa_bot` has `memory: project` — auto-creates `.claude/agent-memory/qa-bot/MEMORY.md` on first use, tracking which pages have been processed and any non-obvious routing decisions. Skills read their own memory files at `.claude/skills/memory/<skill>.md` before each task.
