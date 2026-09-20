import { test, expect } from '@/fixtures/index.fixtures';
import { env } from '@/utils/env';
import { ErrorResponseSchema, LoginResponseSchema, UserSchema, type ErrorResponse } from '@/api/schemas/auth.schema';
import data from '@/data/api.json';

test.describe('Auth API', { tag: ['@api'] }, () => {
  test('should return tokens and profile for valid credentials', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.auth.login(env.API_USERNAME, env.API_PASSWORD);
    expect(response.status()).toBe(200);
    const session = await response.json();
    expect(session).toMatchSchema(LoginResponseSchema);
    expect(session.username).toBe(env.API_USERNAME);
  });

  test('should reject invalid credentials', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.auth.login<ErrorResponse>(data.invalidCredentials.username, data.invalidCredentials.password);
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error).toMatchSchema(ErrorResponseSchema);
  });

  test('should return the current user for a bearer token', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.auth.me();
    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user).toMatchSchema(UserSchema);
    expect(user.username).toBe(env.API_USERNAME);
  });
});
