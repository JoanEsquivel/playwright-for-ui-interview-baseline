import { z } from 'zod';

// Every request and response shape is written once, here, as a zod schema; the types are inferred.
// Responses use z.infer (they describe the wire format: no transform/default/coerce); requests use z.input.

/** SCAFFOLD: adjust to the real login payload. */
export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.input<typeof LoginRequestSchema>;

/** SCAFFOLD: derive from a real login response (`curl -s -X POST $API_BASE_URL/auth/login …`). */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const ErrorResponseSchema = z.object({ message: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
