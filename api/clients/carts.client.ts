import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface CartProductInput {
  id: number;
  quantity: number;
}

export class CartsClient {
  constructor(private readonly request: APIRequestContext) {}

  async add(userId: number, products: CartProductInput[]): Promise<APIResponse> {
    return this.request.post('/carts/add', { data: { userId, products } });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/carts/${id}`);
  }
}
