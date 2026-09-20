import { test, expect } from '@/fixtures/index.fixtures';
import { ErrorResponseSchema, type ErrorResponse } from '@/api/schemas/auth.schema';
import { ProductListSchema, ProductSchema } from '@/api/schemas/products.schema';
import data from '@/data/api.json';

test.describe('Products API', { tag: ['@api'] }, () => {
  test('should list products with pagination', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.list({ limit: 5, skip: 10, select: 'id,title,price,category' });
    expect(response.status()).toBe(200);
    const list = await response.json();
    expect(list).toMatchSchema(ProductListSchema);
    expect(list.products).toHaveLength(5);
    expect(list.skip).toBe(10);
    expect(list.total).toBeGreaterThan(5);
  });

  test('should return a product by id', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.getById(data.knownProduct.id);
    expect(response.status()).toBe(200);
    const product = await response.json();
    expect(product).toMatchSchema(ProductSchema);
    expect(product.id).toBe(data.knownProduct.id);
    expect(product.category).toBe(data.knownProduct.category);
  });

  test('should return 404 for an unknown product', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.getById<ErrorResponse>(data.missingProductId);
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error).toMatchSchema(ErrorResponseSchema);
  });

  test('should search products by keyword', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.search(data.searchQuery);
    expect(response.status()).toBe(200);
    const list = await response.json();
    expect(list).toMatchSchema(ProductListSchema);
    expect(list.total).toBeGreaterThan(0);
  });
});
