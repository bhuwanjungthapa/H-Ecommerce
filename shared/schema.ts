// schema.ts

import { z } from "zod";

// ======================
//  SETTINGS
// ======================
export type Setting = {
  id: number;
  siteName: string;
  siteEmail: string;
  contactNumber?: string;
  whatsappNumber?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

// We'll assume one row or many rows are possible.
export const insertSettingSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteEmail: z.string().email("Please enter a valid email"),
  currency: z.string().min(2, "Currency is required"),
  contactNumber: z.string(),
  whatsappNumber: z.string(),
});

// ======================
//  TAGS
// ======================
export type Tag = {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
};

export const insertTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  slug: z.string().min(1, "Slug is required"),
});

// ======================
//  CATEGORIES
// ======================
export type Category = {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
};

export const insertCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

// ======================
//  PRODUCTS
// ======================
export type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: number; // renamed to camelCase
  stockQuantity: number;
  createdAt: Date;
};

export const insertProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  imageUrl: z.string().optional(),
  categoryId: z.number().optional(),
  stockQuantity: z.number().min(0, "Stock quantity must be positive"),
});

// ======================
//  ORDERS
// ======================
export type Order = {
  id: number;
  customerWhatsapp: string;
  orderStatus: string;
  createdAt: Date;
};

export const insertOrderSchema = z.object({
  customerWhatsapp: z.string().min(1, "WhatsApp number is required"),
  orderStatus: z.string().default("New"),
});

// ======================
//  ORDER ITEMS
// ======================
export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
};

export const insertOrderItemSchema = z.object({
  orderId: z.number(),
  productId: z.number(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
});

// ======================
//  PRODUCT TAGS
//  (join table between products & tags, if needed)
// ======================
export type ProductTag = {
  id: number;
  productId: number;
  tagId: number;
};

export const insertProductTagSchema = z.object({
  productId: z.number(),
  tagId: z.number(),
});

// ======================
//  STOCK UPDATES
// ======================
export type StockUpdate = {
  id: number;
  productId: number;
  changeAmount: number;
  updatedAt: Date;
};

export const insertStockUpdateSchema = z.object({
  productId: z.number(),
  changeAmount: z.number(),
});
