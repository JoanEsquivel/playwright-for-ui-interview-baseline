import { z } from 'zod';

export const LoginResponseSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.string(),
  image: z.url(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const ErrorResponseSchema = z.object({ message: z.string() });
