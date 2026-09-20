// Architecture rules are enforced here so every tool (Claude Code, Copilot, Cursor, CI) gets the same gate.
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const SPEC_FILES = ['tests/**/*.ts'];
const ACTION_LAYERS = ['pages/**/*.ts', 'api/**/*.ts'];
// Flat config replaces a rule's options per file instead of merging them, so every
// no-restricted-imports block below repeats this pattern.
const NO_PARENT_IMPORTS = {
  regex: '^\\.\\./',
  message: "Use the '@/' alias for imports outside the current folder; './' is fine.",
};
// The same applies to no-restricted-syntax: a block that sets it must list every selector it needs.
const NO_ASSERTIONS = {
  selector: "CallExpression[callee.name='expect'], CallExpression[callee.object.name='expect']",
  message: 'No assertions in page objects or API clients. Use waitFor() guards inside waitLoad() only.',
};
// API bodies are typed from the zod schemas in api/schemas, never by annotation, cast or hand-written shape.
const NO_UNKNOWN_BODY = {
  selector: "VariableDeclarator[id.typeAnnotation.typeAnnotation.type='TSUnknownKeyword']",
  message: 'Do not annotate a body as unknown. The client types it from the zod schema: `const cart = await response.json()`, then `expect(cart).toMatchSchema(CartSchema)`.',
};
const NO_TYPE_CASTS = {
  selector: "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
  message: 'Do not cast. Get the type from the zod schema: a typed client (`APIResponse<X>`) or `XSchema.parse(value)`.',
};
const NO_HANDWRITTEN_SHAPES = {
  selector: 'TSInterfaceDeclaration, TSTypeAliasDeclaration > TSTypeLiteral',
  message: 'Request and response shapes live in api/schemas as zod schemas. Import the inferred type (z.infer for responses, z.input for requests).',
};

export default defineConfig([
  {
    ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', '.playwright-cli/**', '.auth/**', '.claude/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }],
    },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },

  // ---- Specs: Playwright rules + import/goto/credential gates ----
  { files: SPEC_FILES, ...playwright.configs['flat/recommended'] },
  {
    files: SPEC_FILES,
    rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expect'] }],
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          message: 'Spec files import { test, expect } from the fixtures index, never from @playwright/test.',
          allowTypeImports: true,
        }],
        patterns: [NO_PARENT_IMPORTS],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name='goto']",
          message: 'Do not call page.goto() in specs. Use <pageName>.load().',
        },
        {
          selector: "CallExpression[callee.property.name=/^(login|submitLoginForm)$/] > Literal[value=/.+/]",
          message: 'Never hard-code credentials. Read them from utils/env or a data file.',
        },
        NO_UNKNOWN_BODY,
        NO_TYPE_CASTS,
      ],
    },
  },
  { files: ['tests/setup/**/*.ts'], rules: { 'playwright/expect-expect': 'off' } },

  // ---- Action layers: no assertions ----
  {
    files: ACTION_LAYERS,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          importNames: ['expect'],
          message: 'Assertions live in specs. Page objects and API clients only interact.',
        }],
        patterns: [NO_PARENT_IMPORTS],
      }],
      'no-restricted-syntax': ['error', NO_ASSERTIONS],
    },
  },

  // ---- API bodies typed from zod: no hand-written shapes in clients, no casts in fixtures ----
  { files: ['api/clients/**/*.ts'], rules: { 'no-restricted-syntax': ['error', NO_ASSERTIONS, NO_HANDWRITTEN_SHAPES] } },
  { files: ['fixtures/**/*.ts'], rules: { 'no-restricted-syntax': ['error', NO_UNKNOWN_BODY, NO_TYPE_CASTS] } },
]);
