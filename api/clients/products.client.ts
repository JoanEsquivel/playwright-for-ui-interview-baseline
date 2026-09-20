import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface ProductListParams {
  limit?: number;
  skip?: number;
  /** Comma-separated field names, e.g. "id,title,price". */
  select?: string;
}

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: ProductListParams = {}): Promise<APIResponse> {
    return this.request.get('/products', { params: { ...params } });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  async search(query: string): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q: query } });
  }
}
