import { test as setup, expect } from '../fixtures/index.fixtures';

import path from 'path';

const authFile = path.join(__dirname, '../.auth/auth.json');

setup('authenticate', async ({ e2e, page }) => {
    await e2e.login();
    // End of authentication steps.

    await page.context().storageState({ path: authFile });
});


