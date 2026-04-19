# scan-to-test-cases — Learnings

## Selector Patterns
<!-- [YYYY-MM-DD] <page or element>: <what was learned> -->
- [2026-04-19] saucedemo form fields use `data-test` attributes (not data-testid): `username`, `password`, `login-button`, `firstName`, `lastName`, `postalCode`, `continue`, `finish`, `checkout`, `add-to-cart-<product-slug>`. Accessible textbox names: "Username", "Password", "First Name", "Last Name", "Zip/Postal Code".
- [2026-04-19] Cart icon is not a role=link with accessible name — use CSS `.shopping_cart_link`.

## Auth & Navigation
<!-- [YYYY-MM-DD] <finding> -->
- [2026-04-19] After login, session persists via cookies — can navigate directly to `/checkout-step-one.html` without re-doing cart flow in the same browser session.
- [2026-04-19] The login page displays all accepted usernames publicly (standard_user, locked_out_user, problem_user, performance_glitch_user, error_user, visual_user) and the shared password `secret_sauce`.

## Known Issues / Gotchas
<!-- [YYYY-MM-DD] <issue and resolution> -->
- [2026-04-19] Checkout step one validation is SEQUENTIAL, not aggregated: clicking Continue surfaces only the FIRST missing field as an `h3` error banner. Order of precedence: First Name → Last Name → Postal Code. Tests must click Continue multiple times to observe all three error messages. Exact error texts: `Error: First Name is required`, `Error: Last Name is required`, `Error: Postal Code is required`.
- [2026-04-19] Error banner is dismissible (has an X button). Dismissing it does not alter form state; re-submitting empty re-triggers the same error.
- [2026-04-19] Postal Code field is NOT format-restricted server-side — accepts any string including non-numeric values. Only required-field validation exists.
- [2026-04-19] Tax rate on saucedemo is 8% of item total (e.g., $29.99 × 0.08 = $2.40 rounded).
