// auth.ts
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
export interface AdminUser {
  id: string; // <-- changed to string
  email: string;
  createdAt: Date;
}
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Extend Express.User to include our AdminUser fields
declare global {
  namespace Express {
    interface User extends AdminUser {}
  }
}

// Extend session type to include supabaseToken
declare module "express-session" {
  interface SessionData {
    supabaseToken: string;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    // Make sure you have a real secret in production
    secret: process.env.REPL_ID || "some-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));

  // Protect non-GET routes for categories, products, orders, tags, and settings.
  app.use(
    [
      "/api/categories",
      "/api/products",
      "/api/orders",
      "/api/tags",
      "/api/settings",
    ],
    async (req, res, next) => {
      // Allow public GET requests (except for orders)
      if (req.method === "GET" && !req.path.includes("/api/orders")) {
        return next();
      }
      try {
        if (!req.session.supabaseToken) {
          return res.sendStatus(401);
        }
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(req.session.supabaseToken);
        if (error || !user) {
          return res.sendStatus(401);
        }
        // IMPORTANT: Use the string user.id (UUID) directly, do not parseInt
        req.user = {
          id: user.id,
          email: user.email!,
          createdAt: new Date(user.created_at!),
        };
        next();
      } catch (error) {
        console.error("Auth middleware error:", error);
        res.sendStatus(401);
      }
    }
  );

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      const { data: signupData, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (signupData.user) {
        req.session.supabaseToken = signupData.session?.access_token || "";
        const user: AdminUser = {
          id: signupData.user.id,
          email: signupData.user.email!,
          createdAt: new Date(signupData.user.created_at!),
        };
        res.status(201).json(user);
      } else {
        res.status(400).json({ message: "Registration failed" });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        req.session.supabaseToken = data.session?.access_token || "";
        const user: AdminUser = {
          id: data.user.id,
          email: data.user.email!,
          createdAt: new Date(data.user.created_at!),
        };
        res.json(user);
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    try {
      await supabase.auth.signOut();
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.sendStatus(200);
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    try {
      if (!req.session.supabaseToken) {
        return res.sendStatus(401);
      }
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(req.session.supabaseToken);
      if (error || !user) {
        return res.sendStatus(401);
      }
      const adminUser: AdminUser = {
        id: user.id,
        email: user.email!,
        createdAt: new Date(user.created_at!),
      };
      res.json(adminUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.sendStatus(401);
    }
  });
}
