import { z } from 'zod';

export const CartProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  total: z.number().nonnegative(),
  discountPercentage: z.number(),
  thumbnail: z.url(),
});

export const CartSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  products: z.array(CartProductSchema),
  total: z.number().nonnegative(),
  discountedTotal: z.number().nonnegative(),
  totalProducts: z.number().int().nonnegative(),
  totalQuantity: z.number().int().nonnegative(),
});
export type Cart = z.infer<typeof CartSchema>;
