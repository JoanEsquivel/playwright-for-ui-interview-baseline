// @ts-check

/** SCAFFOLD: adjust the login endpoint and payload to the real API. Returns raw responses. */
export class AuthClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
  }

  /**
   * The body type comes from the zod schema, never from a hand-written shape.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<import('@playwright/test').APIResponse<import('@/api/schemas/auth.schema').LoginResponse>>}
   */
  async login(username, password) {
    /** @type {import('@/api/schemas/auth.schema').LoginRequest} */
    const data = { username, password };
    return this.request.post('/auth/login', { data });
  }
}
