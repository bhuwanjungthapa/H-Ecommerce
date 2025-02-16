// storage.ts
import {
  type Order,
  type OrderItem,
  type Category,
  type Product,
  type StockUpdate,
  type Tag,
  type Setting,
  insertOrderSchema,
  insertOrderItemSchema,
  insertCategorySchema,
  insertProductSchema,
  insertProductTagSchema,
  insertStockUpdateSchema,
  insertTagSchema,
  insertSettingSchema,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from "dotenv";
import { z } from "zod";
import { Currency } from "lucide-react";

dotenv.config();

// Ensure Supabase env vars exist
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  // PRODUCTS
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  createProduct(product: z.infer<typeof insertProductSchema>): Promise<Product>;
  updateProduct(
    id: number,
    product: Partial<Product>
  ): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // PRODUCT TAGS
  getProductTags(productId: number): Promise<any[]>;
  addProductTag(productId: number, tagId: number): Promise<any>;
  removeProductTag(productId: number): Promise<boolean>;

  // CATEGORIES
  getCategories(): Promise<Category[]>;
  createCategory(
    category: z.infer<typeof insertCategorySchema>
  ): Promise<Category>;
  updateCategory(
    id: number,
    category: Partial<Category>
  ): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // CATEGORY TAGS
  getCategoryTags(categoryId: number): Promise<any[]>;
  addCategoryTag(categoryId: number, tagId: number): Promise<any>;
  removeCategoryTag(categoryId: number): Promise<boolean>;

  // TAGS
  getTags(): Promise<Tag[]>;
  createTag(tag: z.infer<typeof insertTagSchema>): Promise<Tag>;
  updateTag(id: number, partial: Partial<Tag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;

  // ORDERS
  createOrder(
    order: z.infer<typeof insertOrderSchema>,
    items: z.infer<typeof insertOrderItemSchema>[]
  ): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // SETTINGS
  getSettings(): Promise<Setting[]>;
  createSetting(setting: z.infer<typeof insertSettingSchema>): Promise<Setting>;
  updateSetting(
    id: number,
    setting: Partial<Setting>
  ): Promise<Setting | undefined>;

  // STOCK UPDATES
  logStockUpdate(
    update: z.infer<typeof insertStockUpdateSchema>
  ): Promise<StockUpdate>;
}

export class SupabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune every 24h
    });
  }

  // -------------------
  // PRODUCTS
  // -------------------
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from("products").select(`
        *,
        category:categories (
          id,
          name
        ),
        product_tags (
          tags (
            id,
            name,
            slug
          )
        )
      `);
    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      imageUrl: p.image_url,
      categoryId: p.category_id,
      stockQuantity: p.stock_quantity,
      createdAt: new Date(p.created_at),
      tags: (p.product_tags || []).map((pt: any) => pt.tags).filter(Boolean),
      category: p.category,
    }));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories (
          id,
          name
        ),
        tags:product_tags (
          tag:tags (
            id,
            name,
            slug
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return undefined;
    return {
      ...data,
      imageUrl: data.image_url,
      categoryId: data.category_id,
      stockQuantity: data.stock_quantity,
      createdAt: new Date(data.created_at),
      tags: (data.tags || []).map((t: any) => t.tag).filter(Boolean),
      category: data.category,
    };
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId);
    if (error) throw error;
    return data || [];
  }

  async createProduct(
    product: z.infer<typeof insertProductSchema>
  ): Promise<Product> {
    // If base64 image, upload
    if (product.imageUrl && product.imageUrl.startsWith("data:")) {
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;
      const base64Data = product.imageUrl.split(",")[1];
      const contentType = product.imageUrl.split(";")[0].split(":")[1];

      const { data: imageData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, Buffer.from(base64Data, "base64"), { contentType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(imageData.path);
      product.imageUrl = publicUrlData?.publicUrl;
    }

    const productToInsert = {
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.imageUrl,
      category_id: product.categoryId,
      stock_quantity: product.stockQuantity,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(productToInsert)
      .select()
      .single();
    if (error) throw error;

    return {
      ...data,
      imageUrl: data.image_url,
      categoryId: data.category_id,
      stockQuantity: data.stock_quantity,
      createdAt: new Date(data.created_at),
      tags: [],
    };
  }

  async updateProduct(
    id: number,
    updates: Partial<Product>
  ): Promise<Product | undefined> {
    // If base64 image, upload
    if (updates.imageUrl && updates.imageUrl.startsWith("data:")) {
      // same logic...
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;
      const base64Data = updates.imageUrl.split(",")[1];
      const contentType = updates.imageUrl.split(";")[0].split(":")[1];

      const { data: imageData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, Buffer.from(base64Data, "base64"), { contentType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(imageData.path);

      updates.imageUrl = publicUrlData?.publicUrl;
    }

    const updatesToApply: any = {};
    if (updates.name !== undefined) updatesToApply.name = updates.name;
    if (updates.description !== undefined)
      updatesToApply.description = updates.description;
    if (updates.price !== undefined) updatesToApply.price = updates.price;
    if (updates.imageUrl !== undefined)
      updatesToApply.image_url = updates.imageUrl;
    if (updates.categoryId !== undefined)
      updatesToApply.category_id = updates.categoryId;
    if (updates.stockQuantity !== undefined)
      updatesToApply.stock_quantity = updates.stockQuantity;

    const { data, error } = await supabase
      .from("products")
      .update(updatesToApply)
      .eq("id", id)
      .select(
        `
        *,
        category:categories (
          id,
          name
        ),
        tags:product_tags (
          tag:tags (
            id,
            name,
            slug
          )
        )
      `
      )
      .single();
    if (error) throw error;
    if (!data) return undefined;

    return {
      ...data,
      imageUrl: data.image_url,
      categoryId: data.category_id,
      stockQuantity: data.stock_quantity,
      createdAt: new Date(data.created_at),
      tags: (data.tags || []).map((t: any) => t.tag).filter(Boolean),
      category: data.category,
    };
  }

  async deleteProduct(id: number): Promise<boolean> {
    // Remove product tags first
    await this.removeProductTag(id);

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    return true;
  }

  // -------------------
  // PRODUCT TAGS
  // -------------------
  async getProductTags(productId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("product_tags")
      .select(
        `
        tag:tags (
          id,
          name,
          slug
        )
      `
      )
      .eq("product_id", productId);
    if (error) throw error;
    return (data || []).map((pt: any) => pt.tag).filter(Boolean);
  }

  async addProductTag(productId: number, tagId: number): Promise<any> {
    // Insert ignoring duplicates
    const { data, error } = await supabase
      .from("product_tags")
      .insert({ product_id: productId, tag_id: tagId })
      .select()
      .single();
    // If it's a "duplicate key" error (due to unique constraint), ignore it
    if (error && !error.message.includes("duplicate key")) {
      throw error;
    }
    return data; // might be null if it was a duplicate
  }

  async removeProductTag(productId: number): Promise<boolean> {
    const { error } = await supabase
      .from("product_tags")
      .delete()
      .eq("product_id", productId);
    if (error) throw error;
    return true;
  }

  // -------------------
  // CATEGORIES
  // -------------------
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from("categories").select(`
        *,
        category_tags (
          tags (
            id,
            name,
            slug
          )
        )
      `);
    if (error) throw error;
    return (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      createdAt: new Date(cat.created_at),
      tags: (cat.category_tags || []).map((ct: any) => ct.tags).filter(Boolean),
    }));
  }

  async createCategory(
    category: z.infer<typeof insertCategorySchema>
  ): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: category.name,
        slug: category.slug,
      })
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(data.created_at),
      tags: [],
    };
  }

  async updateCategory(
    id: number,
    updates: Partial<Category>
  ): Promise<Category | undefined> {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: updates.name,
        slug: updates.slug,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return undefined;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(data.created_at),
    };
  }

  async deleteCategory(id: number): Promise<boolean> {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  // -------------------
  // CATEGORY TAGS
  // -------------------
  async getCategoryTags(categoryId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("category_tags")
      .select(
        `
        tag:tags (
          id,
          name,
          slug
        )
      `
      )
      .eq("category_id", categoryId);
    if (error) throw error;
    return (data || []).map((ct: any) => ct.tag).filter(Boolean);
  }

  async addCategoryTag(categoryId: number, tagId: number): Promise<any> {
    const { data, error } = await supabase
      .from("category_tags")
      .insert({ category_id: categoryId, tag_id: tagId })
      .select()
      .single();
    // If duplicate key => ignore
    if (error && !error.message.includes("duplicate key")) {
      throw error;
    }
    return data;
  }

  async removeCategoryTag(categoryId: number): Promise<boolean> {
    const { error } = await supabase
      .from("category_tags")
      .delete()
      .eq("category_id", categoryId);
    if (error) throw error;
    return true;
  }

  // -------------------
  // TAGS
  // -------------------
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase.from("tags").select("*");
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      createdAt: new Date(t.created_at),
    }));
  }

  async createTag(tag: z.infer<typeof insertTagSchema>): Promise<Tag> {
    // Check for existing
    const { data: existing, error: checkErr } = await supabase
      .from("tags")
      .select("id")
      .or(`name.eq.${tag.name},slug.eq.${tag.slug}`)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) {
      throw new Error("Tag with same name or slug already exists");
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({ name: tag.name, slug: tag.slug })
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      createdAt: new Date(data.created_at),
    };
  }

  async updateTag(id: number, partial: Partial<Tag>): Promise<Tag | undefined> {
    // Check duplicates
    if (partial.name || partial.slug) {
      const { data: existing, error: checkErr } = await supabase
        .from("tags")
        .select("id")
        .neq("id", id)
        .or(
          [
            partial.name ? `name.eq.${partial.name}` : "",
            partial.slug ? `slug.eq.${partial.slug}` : "",
          ]
            .filter(Boolean)
            .join(",")
        )
        .maybeSingle();
      if (checkErr) throw checkErr;
      if (existing) {
        throw new Error("Tag with same name or slug already exists");
      }
    }

    const { data, error } = await supabase
      .from("tags")
      .update({
        name: partial.name,
        slug: partial.slug,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return undefined;

    return {
      ...data,
      createdAt: new Date(data.created_at),
    };
  }

  async deleteTag(id: number): Promise<boolean> {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  // -------------------
  // ORDERS
  // -------------------
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

    // Insert items & update stock
    await Promise.all(
      items.map(async (item) => {
        const { error: itemError } = await supabase
          .from("order_items")
          .insert({ ...item, order_id: newOrder.id });
        if (itemError) throw itemError;

        // Decrement product stock
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.productId)
          .single();
        if (prodErr) throw prodErr;

        if (prodData) {
          const newStock = prodData.stock_quantity - item.quantity;
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", item.productId);
          if (stockError) throw stockError;
        }
      })
    );

    return {
      ...newOrder,
      customerWhatsapp: newOrder.customer_whatsapp,
      orderStatus: newOrder.order_status,
      createdAt: new Date(newOrder.created_at),
      items: [],
    };
  }

  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase.from("orders").select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price
        )
      `);
    if (error) throw error;
    if (!data) return [];

    return data.map((o: any) => ({
      id: o.id,
      customerWhatsapp: o.customer_whatsapp,
      orderStatus: o.order_status,
      createdAt: new Date(o.created_at),
      items: (o.order_items || []).map((item: any) => ({
        id: item.id,
        orderId: o.id,
        productId: item.product_id,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
    }));
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
    }));
  }

  async updateOrderStatus(
    id: number,
    status: string
  ): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return undefined;

    const items = await this.getOrderItems(id);
    return {
      id: data.id,
      customerWhatsapp: data.customer_whatsapp,
      orderStatus: data.order_status,
      createdAt: new Date(data.created_at),
      items,
    };
  }

  // -------------------
  // SETTINGS
  // -------------------
  async getSettings(): Promise<Setting[]> {
    const { data, error } = await supabase.from("settings").select("*");
    if (error) throw error;

    return (data || []).map((s: any) => ({
      ...s,
      siteName: s.site_name,
      siteEmail: s.site_email,
      currency: s.currency,
      contactNumber: s.contact_number,
      whatsappNumber: s.whatsapp_number,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
    }));
  }

  async createSetting(
    setting: z.infer<typeof insertSettingSchema>
  ): Promise<Setting> {
    const insertData = {
      site_name: setting.siteName,
      site_email: setting.siteEmail,
      currency: setting.currency,
      contact_number: setting.contactNumber,
      whatsapp_number: setting.whatsappNumber,
    };

    const { data, error } = await supabase
      .from("settings")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      siteName: data.site_name,
      siteEmail: data.site_email,
      currency: data.currency,
      contactNumber: data.contact_number,
      whatsappNumber: data.whatsapp_number,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async updateSetting(
    id: number,
    setting: Partial<Setting>
  ): Promise<Setting | undefined> {
    const updateData: any = {};
    if (setting.siteName !== undefined) updateData.site_name = setting.siteName;
    if (setting.siteEmail !== undefined)
      updateData.site_email = setting.siteEmail;
    if (setting.currency !== undefined) updateData.currency = setting.currency;
    if (setting.contactNumber !== undefined)
      updateData.contact_number = setting.contactNumber;
    if (setting.whatsappNumber !== undefined)
      updateData.whatsapp_number = setting.whatsappNumber;

    const { data, error } = await supabase
      .from("settings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      siteName: data.site_name,
      siteEmail: data.site_email,
      currency: data.currency,
      contactNumber: data.contact_number,
      whatsappNumber: data.whatsapp_number,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // -------------------
  // STOCK UPDATES
  // -------------------
  async logStockUpdate(
    update: z.infer<typeof insertStockUpdateSchema>
  ): Promise<StockUpdate> {
    const { data, error } = await supabase
      .from("stock_updates")
      .insert({
        product_id: update.productId,
        change_amount: update.changeAmount,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      updatedAt: new Date(data.updated_at),
    };
  }
}

export const storage = new SupabaseStorage();
