import type { APIRequestContext, APIResponse } from '@playwright/test';

/** Auth endpoints. Returns raw responses; assertions belong to specs. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/auth/login', { data: { username, password } });
  }

  /** Requires an `Authorization: Bearer <token>` header on the request context. */
  async me(): Promise<APIResponse> {
    return this.request.get('/auth/me');
  }
}
