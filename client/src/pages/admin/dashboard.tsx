import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, DollarSign, Package, ShoppingCart } from "lucide-react";
import { Order, Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>{prefix}{value}</>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const isLoading = productsLoading || ordersLoading;

  // For now, we'll show basic stats without order totals
  // Will implement order totals when we add the order items API
  const stats = [
    {
      title: "Total Products",
      value: products?.length ?? 0,
      icon: Package,
      description: "Products in inventory",
    },
    {
      title: "Total Orders",
      value: orders?.length ?? 0,
      icon: ShoppingCart,
      description: "Orders received",
    },
    {
      title: "Average Stock",
      value: products 
        ? Math.round(products.reduce((acc, p) => acc + (p.stockQuantity ?? 0), 0) / products.length)
        : 0,
      icon: DollarSign,
      description: "Average items in stock",
    },
    {
      title: "Categories",
      value: products
        ? new Set(products.map(p => p.categoryId)).size
        : 0,
      icon: BarChart,
      description: "Product categories",
    },
  ];

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              {...stat}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}