# Typing API bodies from zod

**Rule:** no request or response body is ever `unknown`, `any`, cast with `as`, or described by a hand-written `interface`. The zod schema in `api/schemas/` is the only place a shape is written, and every type is inferred from it. Decision record: `docs/decisions.md` §14. Agent rules: `AGENTS.md` rule 12, `.claude/rules/api.md`, `.claude/rules/tests.md`.

## The problem this replaces

Specs used to read every body as `unknown` and then validate it twice, once to assert and once more only to obtain a type:

```ts
const body: unknown = await response.json();
expect(body).toMatchSchema(CartSchema);
expect(CartSchema.parse(body).userId).toBe(data.cart.userId);   // second validation, just for the type
```

Meanwhile the types the schemas already exported (`Cart`, `Product`, …) were imported by nothing, clients declared request shapes as separate interfaces (`CartProductInput`, `ProductListParams`), and a fixture cast a login response by hand. The `unknown` annotation was not laziness: `response.json()` returned `any`, and the annotation was the only thing keeping `any` out of the specs.

## How it works now

Three language features, no new dependency.

**1. Types are inferred from the schema.** `z.infer` for responses, `z.input` for requests and query params.

```ts
// api/schemas/carts.schema.ts
export const AddCartRequestSchema = z.object({
  userId: z.number().int().positive(),
  products: z.array(z.object({ id: z.number().int().positive(), quantity: z.number().int().positive() })),
});
export type AddCartRequest = z.input<typeof AddCartRequestSchema>;

export const CartSchema = z.object({ /* … */ });
export type Cart = z.infer<typeof CartSchema>;
```

`z.input` is used for requests because it is what a caller has to provide; if a schema ever gains a default or a transform, `z.output` would demand more than the caller sends. Response schemas describe the wire format, so they carry no `transform`, `default` or `coerce`, and `z.infer` is exactly what `json()` returns.

**2. Playwright carries the type.** Since 1.63 `APIResponse<T>` and `request.get<T>()`/`post<T>()`/… are generic, and `json()` returns `Promise<T>`. Clients stay thin and unparsed, but typed:

```ts
// api/clients/carts.client.ts
async add<T = Cart>(payload: AddCartRequest): Promise<APIResponse<T>> {
  return this.request.post<T>('/carts/add', { data: payload });
}
```

`T` defaults to the success contract. A negative test states the contract it expects instead of pretending the error body is a `Product`:

```ts
const response = await api.products.getById<ErrorResponse>(data.missingProductId);
```

That keeps union types, and therefore conditionals, out of tests.

**3. `satisfies` pins literals Playwright cannot check.** Playwright types `data` and `params` as `any`, so a literal built inside a client is checked explicitly:

```ts
return this.request.post<T>('/auth/login', { data: { username, password } satisfies LoginRequest });
```

The spec then validates once:

```ts
const cart = await response.json();          // Cart
expect(cart).toMatchSchema(CartSchema);      // runtime proof of that type
expect(cart.userId).toBe(data.cart.userId);  // business rules on the same value
```

## What the static type is, and is not

`APIResponse<Cart>` is a **claim** made by the client, not a fact: nothing at compile time can know what a server returns. `toMatchSchema` is the **proof**, which is why the order in a spec is fixed (status → typed body → `toMatchSchema` → business rules) and no property is read before the matcher passes. A hard `expect` stops the test, so an unproven body is never used. Contract drift still fails with the zod path in the message (`✖ Invalid input: expected string, received number → at userId`).

Outside specs there is no matcher, so a fixture or hook that needs a value from a response parses it, which both types and validates: `LoginResponseSchema.parse(await response.json()).accessToken`.

Clients never `parse` a request. Request types are compile-time only, so a negative test can still send an invalid *value* (an unknown id, a wrong password). Sending an invalid *shape* on purpose needs its own request schema that describes that shape.

`unknown` keeps one legitimate home: the `received` parameter of `toMatchSchema` in `fixtures/index.fixtures.ts`. A matcher is a validation boundary and must accept anything.

## Enforcement

| Violation | Caught by |
|---|---|
| `const body: unknown = …` in a spec or fixture | `no-restricted-syntax` (`NO_UNKNOWN_BODY`) |
| `as { … }` cast in a spec or fixture (`as const` allowed) | `no-restricted-syntax` (`NO_TYPE_CASTS`) |
| `interface` or object type alias in `api/clients/**` | `no-restricted-syntax` (`NO_HANDWRITTEN_SHAPES`) |
| an untyped body leaking as `any` | `@typescript-eslint/no-unsafe-*` (already in `recommendedTypeChecked`) |
| wrong property (`cart.userID`), wrong request shape | `tsc --noEmit`, part of `pnpm lint` |
| schema no longer matches the API | `toMatchSchema` at runtime |

## Other sources of types that were evaluated

Checked against each project's documentation on 2026-09-20. Nothing here is installed; re-check before adopting.

| Option | What it gives | Verdict |
|---|---|---|
| Hand-derived zod schema + `z.infer`/`z.input` + `APIResponse<T>` | One source for the runtime check and the static type; zero dependencies; works for any API, documented or not | **Adopted** |
| API publishes an OpenAPI document → generate the zod schemas ([Orval](https://orval.dev/docs/guides/zod/) with `client: 'zod'`, or the [Hey API `zod` plugin](https://heyapi.dev/openapi-ts/plugins/zod), which emits request, response and definition schemas) | The same single-source model, with the API owner's document as the origin instead of a captured sample | **Optional path**, see below |
| [openapi-typescript](https://openapi-ts.dev/introduction) | TypeScript types only ("runtime-free types") | **Not enough alone**: no runtime validator, so the type and the contract check would come from two sources again |
| [openapi-zod-client](https://github.com/astahmer/openapi-zod-client) | zod + a zodios client | **Rejected**: its repository states it is not maintained anymore |
| [`z.fromJSONSchema()`](https://zod.dev/json-schema) at runtime | A zod schema built from a JSON Schema while the tests run | **Rejected for typing**: it returns an untyped `ZodType`, so there is nothing to infer, and zod documents it as experimental, outside its stable API |
| [`z.toJSONSchema()`](https://zod.dev/json-schema) | JSON Schema (including an `openapi-3.0` target) produced from a zod schema | **Not a typing mechanism**; useful to publish or diff the contract the tests enforce |

### When the API has an OpenAPI document

Generating beats hand-deriving when the document is maintained by the API's owners, because the schemas then track the declared contract instead of one captured sample. The rules of this kit still apply:

1. Generated schemas land in `api/schemas/generated/` and are never edited by hand; regenerate from the document. A script in `package.json` does it, so an agent does not improvise the command.
2. `api/schemas/<resource>.schema.ts` re-exports what the clients need (schema + inferred type), so clients and specs import from the same place as today.
3. Clients, fixtures and specs do not change: they consume `z.infer`/`z.input` types either way.
4. A generated response schema that uses `transform`, `default` or `coerce` breaks the "wire format" rule; configure the generator not to emit them, or business rules must run on `Schema.parse(body)` for that schema.
5. The generator is a dev dependency and its version is pinned, like `@playwright/test`.

This repository's example API (DummyJSON) is consumed without an OpenAPI document, so its schemas are hand-derived from real responses, which is also the path `playwright-create-test` follows by default.
