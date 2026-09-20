import { test, expect } from '@/fixtures/index.fixtures';
import { CartSchema } from '@/api/schemas/carts.schema';
import data from '@/data/api.json';

test.describe('Carts API', { tag: ['@api'] }, () => {
  test('should create a cart and compute totals', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.carts.add(data.cart);
    expect(response.status()).toBe(201);
    const cart = await response.json();
    expect(cart).toMatchSchema(CartSchema);

    const expectedQuantity = data.cart.products.reduce((sum, p) => sum + p.quantity, 0);
    expect(cart.userId).toBe(data.cart.userId);
    expect(cart.totalProducts).toBe(data.cart.products.length);
    expect(cart.totalQuantity).toBe(expectedQuantity);
    expect(cart.discountedTotal).toBeLessThanOrEqual(cart.total);
  });

  test('should return an existing cart', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.carts.getById(1);
    expect(response.status()).toBe(200);
    const cart = await response.json();
    expect(cart).toMatchSchema(CartSchema);
  });
});
