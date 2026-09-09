# API flow — from real response to spec

## A. Probe

```bash
source .env
curl -s -i "$API_BASE_URL/<path>" | head -40                       # status + headers + body start
curl -s "$API_BASE_URL/<path>" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(Array.isArray(j)?j[0]:j,null,2).slice(0,3000))})"
```

Authenticated endpoints: obtain a token with the app's login call (`curl -s -X POST "$API_BASE_URL/<login>" -H 'Content-Type: application/json' -d '{"username":"'"$API_USERNAME"'","password":"'"$API_PASSWORD"'"}'`) and pass `-H "Authorization: Bearer <token>"`. Probe the negative cases too (missing id → 404, bad payload → 400) and note the exact status codes and error shape.

## B. Schema (`api/schemas/<resource>.schema.ts`)

- One `z.object` per payload shape; `id: z.number().int().positive()`, strings `.min(1)` when never empty, `z.email()`, `z.url()`, `z.iso.datetime()` where the sample shows those formats.
- `.optional()` only for fields absent in at least one real sample.
- Export `XSchema`, `type X = z.infer<typeof XSchema>`, list wrappers (`XListSchema`), and reuse a shared `ErrorResponseSchema`.

## C. Client (`api/clients/<resource>.client.ts`)

- Class `<Resource>Client` with `constructor(private readonly request: APIRequestContext)`.
- One method per endpoint, typed params (`interface <Resource>ListParams`), relative path, returns `Promise<APIResponse>`. No parsing, no assertions.

## D. Fixture wiring (`fixtures/api.fixtures.ts`)

Add the client to `ApiClients` and to `createClients`. Both `api` and `authedApi` pick it up.

## E. Spec (`tests/api/<resource>.spec.ts`)

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { <Resource>Schema, <Resource>ListSchema } from '../../api/schemas/<resource>.schema';
import { ErrorResponseSchema } from '../../api/schemas/auth.schema';
import data from '../../data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should list <resources>', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.<resource>.list({ limit: 5 });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(<Resource>ListSchema);
    expect(<Resource>ListSchema.parse(body).items.length).toBeGreaterThan(0);
  });

  test('should return 404 for an unknown id', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.<resource>.getById(data.missingId);
    expect(response.status()).toBe(404);
    const errorBody: unknown = await response.json();
    expect(errorBody).toMatchSchema(ErrorResponseSchema);
  });
});
```

Use `authedApi` for protected endpoints. Put ids, search terms and invalid inputs in `data/api.json`. Use the status codes observed in the probe; never `ok()` as a substitute for a specific code.

## F. Run

```bash
pnpm lint
pnpm exec playwright test tests/api/<resource>.spec.ts --project=api
```

Schema failures print the zod path (`products[0].brand: expected string, received undefined`) → check the sample again before loosening the schema; loosen only with evidence from a real payload.
