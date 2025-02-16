// pages/admin/dashboard.tsx

import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, DollarSign, Package, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Order, Product, OrderItem, Setting } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  prefix,
  isLoading,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  prefix?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              {prefix}
              {value}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery<
    Setting[]
  >({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const siteName = settingsData?.[0]?.siteName || "MySite";
  const currency = settingsData?.[0]?.currency || "$";

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: orderItems, isLoading: isLoadingOrderItems } = useQuery<
    OrderItem[]
  >({
    queryKey: ["/api/order_items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/order_items");
      if (!res.ok) throw new Error("Failed to fetch order items");
      return res.json();
    },
  });

  const [newOrders, setNewOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (orders) {
      const filtered = orders.filter((o) => o.orderStatus === "New");
      filtered.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setNewOrders(filtered.slice(0, 5));
    }
  }, [orders]);

  let totalRevenue = 0;
  if (orderItems && orderItems.length > 0) {
    totalRevenue = orderItems.reduce(
      (acc, item) => acc + Number(item.price),
      0
    );
  }

  const totalProducts = products?.length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const averageStock = products
    ? Math.round(
        products.reduce((acc, p) => acc + (p.stockQuantity ?? 0), 0) /
          (products.length || 1)
      )
    : 0;
  const totalCategories = categories?.length ?? 0;

  const isLoading =
    isLoadingProducts ||
    isLoadingOrders ||
    isLoadingSettings ||
    isLoadingOrderItems ||
    isLoadingCategories;

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: Package,
      description: "Products in inventory",
    },
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      description: "Orders received",
    },
    {
      title: "Categories",
      value: totalCategories,
      icon: BarChart,
      description: "Product categories",
    },
  ];

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard {siteName ? `- ${siteName}` : ""}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} isLoading={isLoading} />
          ))}
          <StatCard
            title="Total Revenue"
            value={totalRevenue.toFixed(2)}
            description="Based on order items"
            icon={DollarSign}
            prefix="NRS "
            isLoading={isLoading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>New Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingOrders ? (
                <Skeleton className="h-12 w-full" />
              ) : newOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No new orders at the moment.
                </p>
              ) : (
                newOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerWhatsapp}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/orders">View</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
