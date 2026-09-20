import { test, expect } from '../../fixtures/index.fixtures';
import { env } from '../../utils/env';
import { ErrorResponseSchema, LoginResponseSchema, UserSchema } from '../../api/schemas/auth.schema';
import data from '../../data/api.json';

test.describe('Auth API', { tag: ['@api'] }, () => {
  test('should return tokens and profile for valid credentials', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.auth.login(env.API_USERNAME, env.API_PASSWORD);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(LoginResponseSchema);
    expect(LoginResponseSchema.parse(body).username).toBe(env.API_USERNAME);
  });

  test('should reject invalid credentials', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.auth.login(data.invalidCredentials.username, data.invalidCredentials.password);
    expect(response.status()).toBe(400);
    const errorBody: unknown = await response.json();
    expect(errorBody).toMatchSchema(ErrorResponseSchema);
  });

  test('should return the current user for a bearer token', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.auth.me();
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(UserSchema);
    expect(UserSchema.parse(body).username).toBe(env.API_USERNAME);
  });
});
