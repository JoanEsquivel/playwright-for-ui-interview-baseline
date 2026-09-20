import { z } from 'zod';

// Every request and response shape is written once, here, as a zod schema; the JSDoc types are inferred from it.

/** SCAFFOLD: adjust to the real login payload. */
export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
/** @typedef {z.input<typeof LoginRequestSchema>} LoginRequest */

/** SCAFFOLD: derive from a real login response (`curl -s -X POST $API_BASE_URL/auth/login …`). */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
});
/** @typedef {z.infer<typeof LoginResponseSchema>} LoginResponse */

export const ErrorResponseSchema = z.object({ message: z.string() });
/** @typedef {z.infer<typeof ErrorResponseSchema>} ErrorResponse */
