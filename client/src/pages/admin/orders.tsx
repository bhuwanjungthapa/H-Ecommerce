// pages/admin/orders.tsx
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders", undefined, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch orders");
      }
      // If your API returns an object like { orders: [...] } instead of an array directly,
      // change the following line accordingly:
      // const data = await res.json();
      // return data.orders;
      return res.json();
    },
  });

  // Update order status (PATCH /api/orders/:id/status)
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, {
        status,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error updating order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsEditDialogOpen(false);
      setSelectedOrder(null);
      toast({ title: "Success", description: "Order updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Error updating order",
        description: String(err.message || err),
        variant: "destructive",
      });
    },
  });

  // Delete order (DELETE /api/orders/:id)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/orders/${id}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error deleting order");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order deleted" });
    },
    onError: (err: any) => {
      toast({
        title: "Error deleting order",
        description: String(err.message || err),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedOrder) return;
    updateMutation.mutate({ id: selectedOrder.id, status: newStatus });
  };

  const handleDelete = (order: Order) => {
    if (!confirm(`Delete order #${order.id}? This cannot be undone.`)) return;
    deleteMutation.mutate(order.id);
  };

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        </div>

        {isLoading ? (
          <div>Loading orders...</div>
        ) : error ? (
          <div className="text-red-600">Error: {(error as Error).message}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customerWhatsapp}</TableCell>
                      <TableCell>{order.orderStatus}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item) => (
                            <div key={item.id}>
                              Product #{item.productId} x {item.quantity} @{" "}
                              {item.price}
                            </div>
                          ))
                        ) : (
                          <em>No items</em>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(order)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(order)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Order Status Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Update order status for order #{selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <label className="font-medium">Status</label>
              <select
                className="border p-2 rounded w-full"
                value={selectedOrder?.orderStatus || ""}
                onChange={(e) => handleUpdateStatus(e.target.value)}
              >
                <option value="New">New</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
