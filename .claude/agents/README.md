# QA Bot Agent System

## Overview

`qa_bot` is the single entry point for all QA tasks in this project. It reads your intent and routes to the right specialist automatically — no need to remember individual skill names.

## Agents

| File | Scope | Purpose |
|------|-------|---------|
| `qa_bot.md` | project | Orchestrator — routes tasks, coordinates specialists, holds project memory |
| `qa_scanner.md` | project | Scans live URLs → Playwright scripts or ISTQB test case docs |
| `qa_writer.md` | project | Creates new page objects, fixtures, and spec files |
| `qa_modifier.md` | project | Updates, fixes, renames, or deletes existing tests and locators |

## How to Invoke

Type `@qa-bot` followed by your task, or simply describe a QA task — Claude Code auto-delegates to `qa_bot` based on its description. Specialists are spawned by `qa_bot` automatically; do not invoke them directly.

## Routing

| You say... | qa_bot does |
|---|---|
| "Scan /cart.html and generate tests" | → qa-scanner (scan-to-scripts) |
| "Generate ISTQB docs for the inventory page" | → qa-scanner (scan-to-test-cases) |
| "Scan /cart.html — give me both tests and test case docs" | → 2× qa-scanner **in parallel** |
| "Scan cart AND inventory pages" | → 2× qa-scanner **in parallel** |
| "Add a new page object for product details" | → qa-writer |
| "Fix the broken remove button locator" | → qa-modifier |
| "Add page object AND fix cart locator" | → qa-writer + qa-modifier **in parallel** |

## Memory

`qa_bot` has `memory: project` — it auto-creates `.claude/agent-memory/qa-bot/MEMORY.md` on first use, tracking which pages have been processed and any non-obvious routing decisions. Specialists read the existing per-skill memory files at `.claude/skills/memory/<skill>.md` before each task.

## Skill Mapping

| Specialist | Skills loaded |
|------------|--------------|
| qa-scanner | `playwright-cli`, `scan-to-scripts`, `scan-to-test-cases` |
| qa-writer | `playwright-create-test` |
| qa-modifier | `modify-tests`, `playwright-cli` |
