import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Product, ProductList, ProductListQuery, ProductSearchQuery } from '@/api/schemas/products.schema';

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async list<T = ProductList>(query: ProductListQuery = {}): Promise<APIResponse<T>> {
    return this.request.get<T>('/products', { params: { ...query } });
  }

  async getById<T = Product>(id: number): Promise<APIResponse<T>> {
    return this.request.get<T>(`/products/${id}`);
  }

  async search<T = ProductList>(query: string): Promise<APIResponse<T>> {
    return this.request.get<T>('/products/search', { params: { q: query } satisfies ProductSearchQuery });
  }
}
