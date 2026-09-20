import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { LoginRequest, LoginResponse } from '@/api/schemas/auth.schema';

/**
 * SCAFFOLD: adjust the login endpoint and payload to the real API. Returns raw responses.
 * `T` defaults to the success contract; a negative test passes the one it expects: `login<ErrorResponse>(…)`.
 */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login<T = LoginResponse>(username: string, password: string): Promise<APIResponse<T>> {
    return this.request.post<T>('/auth/login', { data: { username, password } satisfies LoginRequest });
  }
}
