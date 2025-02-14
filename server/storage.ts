import {
  type Order,
  type Product,
  type OrderItem,
  type Category,
  type ProductTag,
  type StockUpdate,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import session from "express-session";
import createMemoryStore from "memorystore";

import dotenv from "dotenv";
dotenv.config(); // Load .env variables

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Use memory store for session
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: z.infer<typeof insertProductSchema>): Promise<Product>;
  updateProduct(
    id: number,
    product: Partial<Product>
  ): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  createOrder(
    order: z.infer<typeof insertOrderSchema>,
    items: z.infer<typeof insertOrderItemSchema>[]
  ): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(
    category: z.infer<typeof insertCategorySchema>
  ): Promise<Category>;
  updateCategory(
    id: number,
    category: Partial<Category>
  ): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  getProductTags(productId: number): Promise<ProductTag[]>;
  addProductTag(
    tag: z.infer<typeof insertProductTagSchema>
  ): Promise<ProductTag>;
  removeProductTag(productId: number, tag: string): Promise<boolean>;
  logStockUpdate(
    update: z.infer<typeof insertStockUpdateSchema>
  ): Promise<StockUpdate>;
}

export class SupabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async getProducts(): Promise<Product[]> {
    const { data } = await supabase.from("products").select();
    return data || [];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data } = await supabase
      .from("products")
      .select()
      .eq("id", id)
      .single();
    return data || undefined;
  }

  async createProduct(
    product: z.infer<typeof insertProductSchema>
  ): Promise<Product> {
    // If product has an image, upload it to Supabase Storage first
    if (product.imageUrl && product.imageUrl.startsWith("data:")) {
      const { data: imageData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(
          `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          Buffer.from(product.imageUrl.split(",")[1], "base64"),
          { contentType: product.imageUrl.split(";")[0].split(":")[1] }
        );

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(imageData.path);

      product.imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(
    id: number,
    updates: Partial<Product>
  ): Promise<Product | undefined> {
    // Handle image upload if there's a new image
    if (updates.imageUrl && updates.imageUrl.startsWith("data:")) {
      const { data: imageData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(
          `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          Buffer.from(updates.imageUrl.split(",")[1], "base64"),
          { contentType: updates.imageUrl.split(";")[0].split(":")[1] }
        );

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(imageData.path);

      updates.imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const { error } = await supabase.from("products").delete().eq("id", id);

    return !error;
  }

  async createOrder(
    order: z.infer<typeof insertOrderSchema>,
    items: z.infer<typeof insertOrderItemSchema>[]
  ): Promise<Order> {
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert(order)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items and update product stock in parallel
    await Promise.all(
      items.map(async (item) => {
        // Create order item
        const { error: itemError } = await supabase
          .from("order_items")
          .insert({ ...item, orderId: newOrder.id });

        if (itemError) throw itemError;

        // Update product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId)
          .single();

        if (product) {
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock: product.stock - item.quantity })
            .eq("id", item.productId);

          if (stockError) throw stockError;
        }
      })
    );

    return newOrder;
  }

  async getOrders(): Promise<Order[]> {
    const { data } = await supabase.from("orders").select();
    return data || [];
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const { data } = await supabase
      .from("order_items")
      .select()
      .eq("orderId", orderId);
    return data || [];
  }

  async updateOrderStatus(
    id: number,
    status: string
  ): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCategories(): Promise<Category[]> {
    const { data } = await supabase.from("categories").select();
    return data || [];
  }

  async createCategory(
    category: z.infer<typeof insertCategorySchema>
  ): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(
    id: number,
    updates: Partial<Category>
  ): Promise<Category | undefined> {
    try {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      // First check if there are any products in this category
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("category_id", id);

      if (products && products.length > 0) {
        throw new Error("Cannot delete category that contains products");
      }

      const { error } = await supabase.from("categories").delete().eq("id", id);

      return !error;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  }

  async getProductTags(productId: number): Promise<ProductTag[]> {
    const { data } = await supabase
      .from("product_tags")
      .select()
      .eq("product_id", productId);
    return data || [];
  }

  async addProductTag(
    tag: z.infer<typeof insertProductTagSchema>
  ): Promise<ProductTag> {
    const { data, error } = await supabase
      .from("product_tags")
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeProductTag(productId: number, tag: string): Promise<boolean> {
    const { error } = await supabase
      .from("product_tags")
      .delete()
      .eq("product_id", productId)
      .eq("tag", tag);

    return !error;
  }

  async logStockUpdate(
    update: z.infer<typeof insertStockUpdateSchema>
  ): Promise<StockUpdate> {
    const { data, error } = await supabase
      .from("stock_updates")
      .insert(update)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const storage = new SupabaseStorage();
