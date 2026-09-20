import { test, expect } from '../../fixtures/index.fixtures';
import { ErrorResponseSchema } from '../../api/schemas/auth.schema';
import { ProductListSchema, ProductSchema } from '../../api/schemas/products.schema';
import data from '../../data/api.json';

test.describe('Products API', { tag: ['@api'] }, () => {
  test('should list products with pagination', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.list({ limit: 5, skip: 10, select: 'id,title,price,category' });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductListSchema);
    const list = ProductListSchema.parse(body);
    expect(list.products).toHaveLength(5);
    expect(list.skip).toBe(10);
    expect(list.total).toBeGreaterThan(5);
  });

  test('should return a product by id', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.getById(data.knownProduct.id);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductSchema);
    const product = ProductSchema.parse(body);
    expect(product.id).toBe(data.knownProduct.id);
    expect(product.category).toBe(data.knownProduct.category);
  });

  test('should return 404 for an unknown product', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.getById(data.missingProductId);
    expect(response.status()).toBe(404);
    const errorBody: unknown = await response.json();
    expect(errorBody).toMatchSchema(ErrorResponseSchema);
  });

  test('should search products by keyword', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.search(data.searchQuery);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductListSchema);
    expect(ProductListSchema.parse(body).total).toBeGreaterThan(0);
  });
});
