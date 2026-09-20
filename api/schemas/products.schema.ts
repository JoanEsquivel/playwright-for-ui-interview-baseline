import { z } from 'zod';

export const ProductListQuerySchema = z.object({
  limit: z.number().int().nonnegative().optional(),
  skip: z.number().int().nonnegative().optional(),
  /** Comma-separated field names, e.g. "id,title,price". */
  select: z.string().optional(),
});
export type ProductListQuery = z.input<typeof ProductListQuerySchema>;

export const ProductSearchQuerySchema = z.object({ q: z.string() });
export type ProductSearchQuery = z.input<typeof ProductSearchQuerySchema>;

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  discountPercentage: z.number(),
  rating: z.number().min(0).max(5),
  stock: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  brand: z.string().optional(),
  sku: z.string(),
  thumbnail: z.url(),
  images: z.array(z.url()),
});
export type Product = z.infer<typeof ProductSchema>;

/** Summary returned by list/search when `select` narrows the fields. */
export const ProductSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

export const ProductListSchema = z.object({
  products: z.array(ProductSummarySchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
});
export type ProductList = z.infer<typeof ProductListSchema>;
