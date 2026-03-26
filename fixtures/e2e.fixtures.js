import { E2E } from '../utils/e2e';
import { test as base } from '@playwright/test';



export const e2eFixture = base.extend({
    e2e: async ({ page }, use) => {
        await use(new E2E(page));
    }
});