import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function Cart() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const { toast } = useToast();

  const handleWhatsAppCheckout = async () => {
    try {
      // Format WhatsApp message
      const message = items
        .map(
          (item) =>
            `${item.quantity}x ${item.product.name} - $${(
              Number(item.product.price) * item.quantity
            ).toFixed(2)}`
        )
        .join("\n");

      const total_message = `\nTotal: $${total.toFixed(2)}`;

      // Create order in backend
      await apiRequest("POST", "/api/orders", {
        customerName: "WhatsApp Customer",
        whatsappNumber: "1234567890",
        totalAmount: total,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
      });

      // Open WhatsApp
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message + total_message)}`,
        "_blank"
      );

      // Clear cart after successful order
      clearCart();

      toast({
        title: "Order Placed",
        description: "Your order has been sent via WhatsApp",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopping Cart</CardTitle>
      </CardHeader>
      <CardContent>
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div>
                <h3 className="font-medium">{item.product.name}</h3>
                <p className="text-sm text-gray-500">
                  ${Number(item.product.price).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  updateQuantity(item.product.id, Math.max(0, item.quantity - 1))
                }
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  updateQuantity(item.product.id, item.quantity + 1)
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="mt-4 flex justify-between items-center">
          <span className="font-bold">Total: ${total.toFixed(2)}</span>
          <Button onClick={handleWhatsAppCheckout}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Order via WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
