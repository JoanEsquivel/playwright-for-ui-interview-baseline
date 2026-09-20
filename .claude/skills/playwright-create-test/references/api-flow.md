# API flow — from real response to spec

## A. Probe

```bash
source .env
curl -s -i "$API_BASE_URL/<path>" | head -40                       # status + headers + body start
curl -s "$API_BASE_URL/<path>" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(Array.isArray(j)?j[0]:j,null,2).slice(0,3000))})"
```

Authenticated endpoints: obtain a token with the app's login call (`curl -s -X POST "$API_BASE_URL/<login>" -H 'Content-Type: application/json' -d '{"username":"'"$API_USERNAME"'","password":"'"$API_PASSWORD"'"}'`) and pass `-H "Authorization: Bearer <token>"`. Probe the negative cases too (missing id → 404, bad payload → 400) and note the exact status codes and error shape.

## B. Schema (`api/schemas/<resource>.schema.ts`) — always before the client

The schema is the only place a shape is written; every type is inferred from it. If the API publishes an OpenAPI document, read `docs/api-typing.md` before writing schemas by hand.

- One `z.object` per payload shape; `id: z.number().int().positive()`, strings `.min(1)` when never empty, `z.email()`, `z.url()`, `z.iso.datetime()` where the sample shows those formats.
- `.optional()` only for fields absent in at least one real sample.
- **Responses:** export `XSchema` and `type X = z.infer<typeof XSchema>`, list wrappers (`XListSchema` + `XList`), and reuse the shared `ErrorResponseSchema` + `ErrorResponse`. No `transform`, `default` or `coerce`: a response schema describes the wire format.
- **Requests and query params:** one schema per body or query (`CreateXRequestSchema`, `XListQuerySchema`) with `type CreateXRequest = z.input<typeof CreateXRequestSchema>`, from the payload you sent in the probe.
- Every exported schema has its inferred type on the next line.

## C. Client (`api/clients/<resource>.client.ts`)

- Class `<Resource>Client` with `constructor(private readonly request: APIRequestContext)`.
- One method per endpoint, relative path, no parsing, no assertions. Types come only from the schema file: `async getById<T = X>(id: number): Promise<APIResponse<T>> { return this.request.get<T>(…) }`; bodies and queries take the `z.input` types; a literal built inside the method is pinned with `satisfies XRequest`.
- No `interface`, no object type alias, no `any`, no cast in this file. Lint rejects them.

## D. Fixture wiring (`fixtures/api.fixtures.ts`)

Add the client to `ApiClients` and to `createClients`. Both `api` and `authedApi` pick it up.

## E. Spec (`tests/api/<resource>.spec.ts`)

```ts
import { test, expect } from '@/fixtures/index.fixtures';
import { <Resource>Schema, <Resource>ListSchema } from '@/api/schemas/<resource>.schema';
import { ErrorResponseSchema, type ErrorResponse } from '@/api/schemas/auth.schema';
import data from '@/data/api.json';

test.describe('<Resource> API', { tag: ['@api'] }, () => {
  test('should list <resources>', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.<resource>.list({ limit: 5 });
    expect(response.status()).toBe(200);
    const list = await response.json();                       // typed <Resource>List by the client
    expect(list).toMatchSchema(<Resource>ListSchema);          // proves the type at runtime
    expect(list.items.length).toBeGreaterThan(0);              // same value, no second parse
  });

  test('should return 404 for an unknown id', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.<resource>.getById<ErrorResponse>(data.missingId);
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error).toMatchSchema(ErrorResponseSchema);
  });
});
```

Never `const body: unknown`, never `as`, never `Schema.parse(body)` just to get a type: lint rejects the first two and the third is a second validation of the same payload. A negative case names the contract it expects through the method's type parameter.

Use `authedApi` for protected endpoints. Put ids, search terms and invalid inputs in `data/api.json`. Use the status codes observed in the probe; never `ok()` as a substitute for a specific code.

## F. Run

```bash
pnpm lint
pnpm exec playwright test tests/api/<resource>.spec.ts --project=api
```

Schema failures print the zod path (`products[0].brand: expected string, received undefined`) → check the sample again before loosening the schema; loosen only with evidence from a real payload.
