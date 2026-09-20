# API layer

**The zod schema is the only place a shape is written.** Every type in the API layer is inferred from a schema, so the runtime check and the static type cannot drift apart. Write the schema first, then the client. There is never a `body: unknown`, an `any`, an `as` cast or a hand-written `interface` for a payload; if a type is missing, a schema is missing. Alternatives (OpenAPI, JSON Schema) and rationale: `docs/api-typing.md`.

## Schema (`api/schemas/<resource>.schema.ts`) — written first

```ts
import { z } from 'zod';

// Responses: z.infer. They describe the wire format, so no transform/default/coerce here.
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
export type <Resource>List = z.infer<typeof <Resource>ListSchema>;

// Requests and query params: z.input (what the caller must provide).
export const Create<Resource>RequestSchema = z.object({ name: z.string().min(1) });
export type Create<Resource>Request = z.input<typeof Create<Resource>RequestSchema>;

export const <Resource>ListQuerySchema = z.object({
  limit: z.number().int().nonnegative().optional(),
  skip: z.number().int().nonnegative().optional(),
});
export type <Resource>ListQuery = z.input<typeof <Resource>ListQuerySchema>;

export const <Resource>SearchQuerySchema = z.object({ q: z.string() });
export type <Resource>SearchQuery = z.input<typeof <Resource>SearchQuerySchema>;

// Shared across resources; keep one copy.
export const ErrorResponseSchema = z.object({ message: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
```

Derive from a real response (`curl -s $API_BASE_URL/<resources>/1 | head -c 2000`). Keep objects non-strict. Add `.optional()` only when the payload shows the field can be absent. Every exported schema exports its inferred type on the next line.

## Client (`api/clients/<resource>.client.ts`)

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  Create<Resource>Request, <Resource>, <Resource>List, <Resource>ListQuery, <Resource>SearchQuery,
} from '@/api/schemas/<resource>.schema';

export class <Resource>Client {
  constructor(private readonly request: APIRequestContext) {}

  async list<T = <Resource>List>(query: <Resource>ListQuery = {}): Promise<APIResponse<T>> {
    return this.request.get<T>('/<resources>', { params: { ...query } });
  }

  async getById<T = <Resource>>(id: number): Promise<APIResponse<T>> {
    return this.request.get<T>(`/<resources>/${id}`);
  }

  async create<T = <Resource>>(payload: Create<Resource>Request): Promise<APIResponse<T>> {
    return this.request.post<T>('/<resources>', { data: payload });
  }

  // A literal built inside the method is pinned with `satisfies`, because Playwright types `data`/`params` as any:
  async search<T = <Resource>List>(term: string): Promise<APIResponse<T>> {
    return this.request.get<T>('/<resources>/search', { params: { q: term } satisfies <Resource>SearchQuery });
  }
}
```

Rules: relative paths, inputs typed with `z.input` types, raw `APIResponse<T>` out (Playwright 1.63+ makes `APIResponse` and `get/post/…` generic), `T` defaults to the success contract and a negative test overrides it (`getById<ErrorResponse>(id)`). No `interface` or object type alias in this folder (lint), no parsing, no `expect`, no `throw`, no host. Clients never `parse` a request, so a negative test can still send invalid values.

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
    const { accessToken } = LoginResponseSchema.parse(await response.json()); // never an `as` cast
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
import { test, expect } from '@/fixtures/index.fixtures';
import { ErrorResponseSchema, <Resource>Schema, type ErrorResponse } from '@/api/schemas/<resource>.schema';
import data from '@/data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should return a <resource> by id', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.<resource>.getById(data.known<Resource>.id);
    expect(response.status()).toBe(200);
    const <resource> = await response.json();               // typed <Resource> by the client
    expect(<resource>).toMatchSchema(<Resource>Schema);      // runtime proof of that type
    expect(<resource>.id).toBe(data.known<Resource>.id);     // business rules on the same value
  });

  test('should return 404 for an unknown id', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.<resource>.getById<ErrorResponse>(data.missingId);
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error).toMatchSchema(ErrorResponseSchema);
  });
});
```

Order is fixed: status → typed body → `toMatchSchema` → business rules. The static type is the client's claim and `toMatchSchema` is its proof, so no property is read before the matcher passes and the payload is validated once. `: unknown` and `as` on a body are lint errors. Request data from `data/api.json` is checked against the `z.input` type by `tsc` when it is passed to the client (`api.<resource>.create(data.new<Resource>)`).

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
