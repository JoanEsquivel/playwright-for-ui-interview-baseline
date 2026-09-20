import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { LoginRequest, LoginResponse, User } from '@/api/schemas/auth.schema';

/**
 * Auth endpoints. Returns raw responses; assertions belong to specs.
 * `T` defaults to the success contract; a negative test passes the contract it expects: `login<ErrorResponse>(…)`.
 */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login<T = LoginResponse>(username: string, password: string): Promise<APIResponse<T>> {
    return this.request.post<T>('/auth/login', { data: { username, password } satisfies LoginRequest });
  }

  /** Requires an `Authorization: Bearer <token>` header on the request context. */
  async me<T = User>(): Promise<APIResponse<T>> {
    return this.request.get<T>('/auth/me');
  }
}
