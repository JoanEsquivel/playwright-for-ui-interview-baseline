import { mergeTests } from '@playwright/test';
import { pageFixture } from '../fixtures/page.fixtures';
import { e2eFixture } from '../fixtures/e2e.fixtures';

// export const test = mergeTests(pageFixture, e2eFixture);
export const test = mergeTests(pageFixture, e2eFixture);

export { expect, request } from '@playwright/test';