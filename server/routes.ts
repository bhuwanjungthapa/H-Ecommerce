// route.ts
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertProductSchema,
  insertOrderSchema,
  insertCategorySchema,
  insertOrderItemSchema,
  insertTagSchema,
} from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // ---------------------------
  // Product Tags endpoints
  // ---------------------------
  app.get("/api/product-tags/:productId", async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const tags = await storage.getProductTags(productId);
      res.json(tags); // e.g. [{id, name, slug}, ...]
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/product-tags", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const { productId, tagId } = req.body;
      const tag = await storage.addProductTag(productId, tagId);
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/product-tags/:productId", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const productId = parseInt(req.params.productId);
      await storage.removeProductTag(productId);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Category Tags endpoints
  // ---------------------------
  app.get("/api/category-tags/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const tags = await storage.getCategoryTags(categoryId);
      res.json(tags); // e.g. [{id, name, slug}, ...]
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/category-tags", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const { categoryId, tagId } = req.body;
      const link = await storage.addCategoryTag(categoryId, tagId);

      // Inherit category tag to all products in this category
      const products = await storage.getProductsByCategory(categoryId);
      for (const p of products) {
        try {
          await storage.addProductTag(p.id, tagId);
        } catch (err) {
          console.error(`Failed to add tag ${tagId} to product ${p.id}:`, err);
        }
      }

      res.json(link);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/category-tags/:categoryId", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const categoryId = parseInt(req.params.categoryId);
      await storage.removeCategoryTag(categoryId);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Categories endpoints
  // ---------------------------
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const parsed = insertCategorySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      // Create the category
      const category = await storage.createCategory(parsed.data);

      // If tags array was included, add them
      if (Array.isArray(req.body.tags)) {
        for (const tagId of req.body.tags) {
          await storage.addCategoryTag(category.id, tagId);
        }
      }

      res.status(201).json(category);
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const { id: _, tags, ...updateData } = req.body;

      const parsed = insertCategorySchema.partial().safeParse(updateData);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const category = await storage.updateCategory(id, parsed.data);
      if (!category) return res.status(404).send("Category not found");

      // Remove old tags, then add new ones
      if (Array.isArray(tags)) {
        await storage.removeCategoryTag(id);
        for (const tagId of tags) {
          await storage.addCategoryTag(id, tagId);
        }
      }

      // Return final updated category
      const updatedCats = await storage.getCategories();
      const finalCat = updatedCats.find((c) => c.id === id);
      res.json(finalCat);
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const success = await storage.deleteCategory(parseInt(req.params.id));
      if (!success) return res.status(404).send("Category not found");
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Products endpoints
  // ---------------------------
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const { tags, ...productData } = req.body;
      const parsed = insertProductSchema.safeParse(productData);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const product = await storage.createProduct(parsed.data);

      // If tags array was included, attach them
      if (Array.isArray(tags)) {
        for (const tagId of tags) {
          await storage.addProductTag(product.id, tagId);
        }
      }

      // Inherit category tags if categoryId is set
      if (product.categoryId) {
        const categoryTags = await storage.getCategoryTags(product.categoryId);
        for (const catTag of categoryTags) {
          // catTag = {id, name, slug}
          await storage.addProductTag(product.id, catTag.id);
        }
      }

      const productWithTags = await storage.getProduct(product.id);
      res.status(201).json(productWithTags);
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const { id: _, tags, ...updateData } = req.body;

      const parsed = insertProductSchema.partial().safeParse(updateData);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const product = await storage.updateProduct(id, parsed.data);
      if (!product) return res.status(404).send("Product not found");

      // If tags were provided, remove old, re-add new
      if (Array.isArray(tags)) {
        await storage.removeProductTag(id);
        for (const tagId of tags) {
          await storage.addProductTag(id, tagId);
        }

        // Re-inherit category tags
        if (product.categoryId) {
          const categoryTags = await storage.getCategoryTags(
            product.categoryId
          );
          for (const catTag of categoryTags) {
            await storage.addProductTag(id, catTag.id);
          }
        }
      }

      const updatedProduct = await storage.getProduct(id);
      res.json(updatedProduct);
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const success = await storage.deleteProduct(parseInt(req.params.id));
      if (!success) return res.status(404).send("Product not found");
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Orders endpoints
  // ---------------------------
  // Must be logged in for GET
  app.get("/api/orders", async (req, res) => {
    // if (!req.user) return res.sendStatus(403); // remove if you want public
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    // Public or not? Your choice
    try {
      const parsed = insertOrderSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);
      if (!Array.isArray(req.body.items)) {
        return res.status(400).json({ message: "Order items are required" });
      }
      const itemsParsed = z
        .array(insertOrderItemSchema)
        .safeParse(req.body.items);
      if (!itemsParsed.success) return res.status(400).json(itemsParsed.error);
      const order = await storage.createOrder(parsed.data, itemsParsed.data);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(
        parseInt(req.params.id),
        status
      );
      if (!order) return res.status(404).send("Order not found");
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete entire order
  app.delete("/api/orders/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      // If you want a method in storage to delete an order by ID:
      // We'll do a quick approach here
      await storage.logStockUpdate; // just for reference, ignore if not needed

      // 1) remove all order_items
      const { error: itemsErr } = await storage.supabase
        .from("order_items")
        .delete()
        .eq("order_id", parseInt(req.params.id));
      if (itemsErr) throw itemsErr;

      // 2) remove the order
      const { error: orderErr, data } = await storage.supabase
        .from("orders")
        .delete()
        .eq("id", parseInt(req.params.id));
      if (orderErr) throw orderErr;
      if (!data || data.length === 0)
        return res.status(404).send("Order not found");

      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Tags Endpoints
  // ---------------------------
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tags", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const parsed = insertTagSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);
      const tag = await storage.createTag(parsed.data);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tags/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const { id: _, ...updateData } = req.body;
      const parsed = insertTagSchema.partial().safeParse(updateData);
      if (!parsed.success) return res.status(400).json(parsed.error);
      const tag = await storage.updateTag(id, parsed.data);
      if (!tag) return res.status(404).send("Tag not found");
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const success = await storage.deleteTag(parseInt(req.params.id));
      if (!success) return res.status(404).send("Tag not found");
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------
  // Settings Endpoints
  // ---------------------------
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings[0] || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    try {
      const updated = await storage.updateSetting(1, req.body);
      if (!updated) return res.status(404).send("Settings not found");
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
