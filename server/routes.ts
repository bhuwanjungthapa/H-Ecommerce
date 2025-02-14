import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProductSchema, 
  insertOrderSchema, 
  insertCategorySchema,
  insertOrderItemSchema 
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Categories
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const category = await storage.createCategory(parsed.data);
    res.status(201).json(category);
  });

  app.patch("/api/categories/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const parsed = insertCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const category = await storage.updateCategory(id, parsed.data);
    if (!category) return res.status(404).send("Category not found");
    res.json(category);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const success = await storage.deleteCategory(parseInt(req.params.id));
    if (!success) return res.status(404).send("Category not found");
    res.sendStatus(204);
  });

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).send("Product not found");
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const product = await storage.createProduct(parsed.data);
    res.status(201).json(product);
  });

  app.patch("/api/products/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const parsed = insertProductSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const product = await storage.updateProduct(parseInt(req.params.id), parsed.data);
    if (!product) return res.status(404).send("Product not found");
    res.json(product);
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const success = await storage.deleteProduct(parseInt(req.params.id));
    if (!success) return res.status(404).send("Product not found");
    res.sendStatus(204);
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    // Validate order items
    if (!Array.isArray(req.body.items)) {
      return res.status(400).json({ message: "Order items are required" });
    }

    const itemsParsed = z.array(insertOrderItemSchema).safeParse(req.body.items);
    if (!itemsParsed.success) {
      return res.status(400).json(itemsParsed.error);
    }

    const order = await storage.createOrder(parsed.data, itemsParsed.data);
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!req.user) return res.sendStatus(403);
    const { status } = req.body;
    const order = await storage.updateOrderStatus(parseInt(req.params.id), status);
    if (!order) return res.status(404).send("Order not found");
    res.json(order);
  });

  const httpServer = createServer(app);
  return httpServer;
}