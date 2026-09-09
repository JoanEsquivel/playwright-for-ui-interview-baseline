# API layer

## Client (`api/clients/<resource>.client.ts`)

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface <Resource>ListParams { limit?: number; skip?: number }

export class <Resource>Client {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: <Resource>ListParams = {}): Promise<APIResponse> {
    return this.request.get('/<resources>', { params: { ...params } });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/<resources>/${id}`);
  }

  async create(payload: Create<Resource>Input): Promise<APIResponse> {
    return this.request.post('/<resources>', { data: payload });
  }
}
```

Rules: relative paths, typed inputs, raw `APIResponse` out, no `expect`, no `throw`, no host.

## Schema (`api/schemas/<resource>.schema.ts`)

```ts
import { z } from 'zod';

export const <Resource>Schema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  createdAt: z.iso.datetime().optional(),
});
export type <Resource> = z.infer<typeof <Resource>Schema>;

export const <Resource>ListSchema = z.object({
  items: z.array(<Resource>Schema),
  total: z.number().int().nonnegative(),
});
```

Derive from a real response (`curl -s $API_BASE_URL/<resources>/1 | head -c 2000`). Keep objects non-strict. Add `.optional()` only when the payload shows the field can be absent.

## Fixtures (`fixtures/api.fixtures.ts`)

```ts
export interface ApiClients { <resource>: <Resource>Client; auth: AuthClient }
export interface ApiFixtures { api: ApiClients; authedApi: ApiClients }
export interface ApiWorkerFixtures { authToken: string }

export const apiFixture = base.extend<ApiFixtures, ApiWorkerFixtures>({
  api: async ({ request }, use) => { await use(createClients(request)); },
  authToken: [async ({}, use) => {
    const context = await request.newContext({ baseURL: env.API_BASE_URL });
    const response = await new AuthClient(context).login(env.API_USERNAME, env.API_PASSWORD);
    if (!response.ok()) throw new Error(`API login failed: ${response.status()} ${await response.text()}`);
    const { accessToken } = (await response.json()) as { accessToken: string };
    await context.dispose();
    await use(accessToken);
  }, { scope: 'worker' }],
  authedApi: async ({ authToken, baseURL }, use) => {
    const context = await request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${authToken}` } });
    await use(createClients(context));
    await context.dispose();
  },
});
```

Adapt `authToken` to the app's scheme (cookie session, API key header, OAuth client credentials) in this file only.

## Spec (`tests/api/<resource>.spec.ts`)

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { <Resource>Schema } from '../../api/schemas/<resource>.schema';
import data from '../../data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should return a <resource> by id', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.<resource>.getById(data.known<Resource>.id);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(<Resource>Schema);
    expect(<Resource>Schema.parse(body).id).toBe(data.known<Resource>.id);
  });

  test('should return 404 for an unknown id', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.<resource>.getById(data.missingId);
    expect(response.status()).toBe(404);
  });
});
```

## Hybrid: seed through the API, verify in the UI

```ts
test.describe('Orders', { tag: ['@e2e'] }, () => {
  let orderId: number;

  test.beforeEach(async ({ authedApi }) => {
    const response = await authedApi.orders.create(data.newOrder);
    if (!response.ok()) throw new Error(`Seeding failed: ${response.status()}`);
    orderId = OrderSchema.parse(await response.json()).id;
  });

  test.afterEach(async ({ authedApi }) => {
    await authedApi.orders.delete(orderId);
  });

  test('should show the seeded order in the list', { tag: ['@smoke'] }, async ({ ordersPage }) => {
    await ordersPage.load();
    await ordersPage.waitLoad();
    await expect(ordersPage.rowById(orderId)).toBeVisible();
  });
});
```

Seeding errors throw (they are preconditions, not the behavior under test).

## Config

The `api` project sets `use.baseURL: process.env.API_BASE_URL` and no browser. Extra headers common to every call (`Accept`, API keys) go in that project's `use.extraHTTPHeaders`.
