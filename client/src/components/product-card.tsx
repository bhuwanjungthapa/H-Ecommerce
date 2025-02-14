import { Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <Card className="w-full">
      <CardHeader>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover rounded-md"
        />
        <CardTitle className="mt-2">{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{product.description}</p>
        <div className="mt-2 flex justify-between items-center">
          <span className="font-bold text-lg">${Number(product.price).toFixed(2)}</span>
          <span className="text-sm text-gray-500">
            {product.stock} in stock
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => addItem(product)}
          className="w-full"
          disabled={product.stock === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
