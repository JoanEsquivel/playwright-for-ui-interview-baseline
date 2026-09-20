# JavaScript variant

Same architecture, same rules, JavaScript with `// @ts-check` + JSDoc instead of TypeScript. Use only when the project owner asks for JS.

## Differences

| Topic | TypeScript | JavaScript |
|---|---|---|
| File extension | `.ts` | `.js` (CommonJS runtime; no `"type": "module"`) |
| Types | interfaces, `readonly` fields | JSDoc (`/** @type {import('@playwright/test').Locator} */`) |
| Fixtures typing | `base.extend<PageFixtures>({…})` | `base.extend({…})` (untyped; keep names consistent) |
| Config | `playwright.config.ts` exporting `STORAGE_STATE` | `playwright.config.js` (`module.exports`/`export` both work) |
| Lint | `typescript-eslint` type-checked rules | `@eslint/js` recommended + `eslint-plugin-playwright`; drop `tsc` from `lint` |
| Schema validation | zod + `toMatchSchema` | identical (zod works in JS) |

## Page object

```js
// @ts-check
import { test } from '@playwright/test';

export class <PageName>Page {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = '/<route>';
    this.heading = page.getByRole('heading', { name: '<Title>' }).describe('<Title> heading');
    this.primaryButton = page.getByRole('button', { name: '<Label>' }).describe('<Label> button');
  }

  async load() { await this.page.goto(this.url); }

  async waitLoad() {
    await test.step('Wait for <PageName> page to load', async () => {
      await this.heading.waitFor({ state: 'visible' });
    });
  }

  /** @param {string} value */
  async <verbNoun>(value) {
    await this.primaryButton.click();
  }
}
```

## Fixtures

```js
import { test as base } from '@playwright/test';
import { <PageName>Page } from '@/pages/<page>';

export const pageFixture = base.extend({
  <pageName>Page: async ({ page }, use) => { await use(new <PageName>Page(page)); },
});
```

`fixtures/index.fixtures.js`

```js
import { expect as baseExpect, mergeTests } from '@playwright/test';
import { z } from 'zod';
import { pageFixture } from './page.fixtures';
import { e2eFixture } from './e2e.fixtures';
import { apiFixture } from './api.fixtures';

export const test = mergeTests(pageFixture, e2eFixture, apiFixture);
export const expect = baseExpect.extend({
  /** @param {unknown} received @param {import('zod').ZodType} schema */
  toMatchSchema(received, schema) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      message: () => (result.success ? 'Expected payload NOT to match schema' : `Payload does not match schema:\n${z.prettifyError(result.error)}`),
    };
  },
});
```

## `utils/env.js`

```js
/** @param {string} name */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`);
  return value;
}
export const env = {
  get BASE_URL() { return requireEnv('BASE_URL'); },
  get E2E_USERNAME() { return requireEnv('E2E_USERNAME'); },
  get E2E_PASSWORD() { return requireEnv('E2E_PASSWORD'); },
  get API_BASE_URL() { return requireEnv('API_BASE_URL'); },
  get API_USERNAME() { return requireEnv('API_USERNAME'); },
  get API_PASSWORD() { return requireEnv('API_PASSWORD'); },
};
```

## Spec

Identical to TS except the import path ends in `.fixtures` (no extension) and there are no type annotations. The `@/` alias works the same way: Playwright reads `"paths": { "@/*": ["./*"] }` from `jsconfig.json` when there is no `tsconfig.json`, and editors use it for navigation. `const cart = await response.json();` then `expect(cart).toMatchSchema(CartSchema)`, then business rules on `cart`.

## API typing (JS)

Same rule as TS: the zod schema is the only place a shape is written, and types are inferred from it through JSDoc, which `checkJs` and editors read.

```js
// api/schemas/<resource>.schema.js
export const <Resource>Schema = z.object({ id: z.number().int().positive(), name: z.string().min(1) });
/** @typedef {z.infer<typeof <Resource>Schema>} <Resource> */

export const Create<Resource>RequestSchema = z.object({ name: z.string().min(1) });
/** @typedef {z.input<typeof Create<Resource>RequestSchema>} Create<Resource>Request */

// api/clients/<resource>.client.js
/**
 * @param {import('@/api/schemas/<resource>.schema').Create<Resource>Request} payload
 * @returns {Promise<import('@playwright/test').APIResponse<import('@/api/schemas/<resource>.schema').<Resource>>>}
 */
async create(payload) {
  return this.request.post('/<resources>', { data: payload });
}
```

Never describe a payload with a hand-written `@typedef {{ id: number }}`; infer it. A fixture that needs a value from a response parses it: `LoginResponseSchema.parse(await response.json()).accessToken`.

## `eslint.config.mjs` (JS)

```js
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';

const SPEC_FILES = ['tests/**/*.js'];
const ACTION_LAYERS = ['pages/**/*.js', 'api/**/*.js'];
// Repeated in every no-restricted-imports block: flat config replaces options per file, it does not merge them.
const NO_PARENT_IMPORTS = { regex: '^\\.\\./', message: "Use the '@/' alias for imports outside the current folder; './' is fine." };

export default defineConfig([
  { ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', '.playwright-cli/**', '.auth/**'] },
  js.configs.recommended,
  { rules: {
      'no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }],
      // Playwright fixtures that take no dependencies must still destructure: `async ({}, use) => …`.
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
  } },
  { files: SPEC_FILES, ...playwright.configs['flat/recommended'] },
  { files: SPEC_FILES, rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'no-restricted-imports': ['error', { paths: [{ name: '@playwright/test', message: 'Import test/expect from the fixtures index.' }], patterns: [NO_PARENT_IMPORTS] }],
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.property.name='goto']", message: 'Use <pageName>.load().' },
        { selector: "CallExpression[callee.property.name=/^(login|submitLoginForm)$/] > Literal[value=/.+/]", message: 'Never hard-code credentials.' }],
  } },
  { files: ['tests/setup/**/*.js'], rules: { 'playwright/expect-expect': 'off' } },
  { files: ACTION_LAYERS, rules: {
      'no-restricted-imports': ['error', { paths: [{ name: '@playwright/test', importNames: ['expect'], message: 'Assertions live in specs.' }], patterns: [NO_PARENT_IMPORTS] }],
      'no-restricted-syntax': ['error', { selector: "CallExpression[callee.name='expect'], CallExpression[callee.object.name='expect']", message: 'No assertions in page objects or API clients.' }],
  } },
]);
```

Dev dependencies for JS: `@playwright/test` (pinned), `@playwright/cli` (pinned), `dotenv`, `zod`, `eslint`, `@eslint/js`, `eslint-plugin-playwright`.
