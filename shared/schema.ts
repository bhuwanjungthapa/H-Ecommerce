import { z } from "zod";

// Admin User type and schema
export type AdminUser = {
  id: number;
  email: string;
  createdAt: Date;
};

// Create insert schema with validation
export const insertAdminUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
}).strict();

// Category type and schema
export type Category = {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
};

export const insertCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required")
});

// Product type and schema
export type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
  stockQuantity: number;
  createdAt: Date;
};

export const insertProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  imageUrl: z.string().optional(),
  categoryId: z.number().optional(),
  stockQuantity: z.number().min(0, "Stock quantity must be positive")
});

// Order type and schema
export type Order = {
  id: number;
  customerWhatsapp: string;
  orderStatus: string;
  createdAt: Date;
};

export const insertOrderSchema = z.object({
  customerWhatsapp: z.string().min(1, "WhatsApp number is required"),
  orderStatus: z.string().default("New")
});

// Order Item type and schema
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
  price: z.number().min(0, "Price must be positive")
});

// Product Tag type and schema
export type ProductTag = {
  id: number;
  productId: number;
  tag: string;
};

export const insertProductTagSchema = z.object({
  productId: z.number(),
  tag: z.string().min(1, "Tag is required")
});

// Stock Update type and schema
export type StockUpdate = {
  id: number;
  productId: number;
  changeAmount: number;
  updatedAt: Date;
};

export const insertStockUpdateSchema = z.object({
  productId: z.number(),
  changeAmount: z.number()
});