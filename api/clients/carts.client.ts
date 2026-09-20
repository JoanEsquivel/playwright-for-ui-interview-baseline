import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { AddCartRequest, Cart } from '@/api/schemas/carts.schema';

export class CartsClient {
  constructor(private readonly request: APIRequestContext) {}

  async add<T = Cart>(payload: AddCartRequest): Promise<APIResponse<T>> {
    return this.request.post<T>('/carts/add', { data: payload });
  }

  async getById<T = Cart>(id: number): Promise<APIResponse<T>> {
    return this.request.get<T>(`/carts/${id}`);
  }
}
