import { AdminLayout } from "@/components/layout/admin-layout";

export default function AdminProducts() {
  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        </div>
        {/* Product management features will be added here */}
      </div>
    </AdminLayout>
  );
}
