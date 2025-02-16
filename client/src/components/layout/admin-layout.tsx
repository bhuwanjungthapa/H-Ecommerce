import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Tag,
  Package,
  Settings,
  LogOut,
  ShoppingCart,
  FolderTree
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    title: "Categories",
    icon: FolderTree,
    href: "/admin/categories",
  },
  {
    title: "Products",
    icon: Package,
    href: "/admin/products",
  },
  {
    title: "Tags",
    icon: Tag,
    href: "/admin/tags",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/admin/orders",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin/settings",
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { logoutMutation } = useAuth();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/auth");
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block border-r bg-muted/40">
        <div className="flex flex-col gap-2 p-4">
          <div className="flex h-[60px] items-center px-6 border-b">
            <span className="text-xl font-bold">Admin Dashboard</span>
          </div>
          <ScrollArea className="flex-grow">
            <div className="flex flex-col gap-2 p-2">
              {menuItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-secondary text-secondary-foreground font-medium"
                    )}>
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </a>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="justify-start gap-2 text-red-500 hover:text-red-500 hover:bg-red-50"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </ScrollArea>
        </div>
      </div>
      <div className="flex flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}