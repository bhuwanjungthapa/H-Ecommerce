import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ProductPage() {
  const { id } = useParams();
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center mb-8 hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full rounded-lg shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-xl font-bold mb-4">
              ${Number(product.price).toFixed(2)}
            </p>
            <p className="text-gray-600 mb-6">{product.description}</p>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium">Category:</span>
              <span className="text-sm text-gray-600">{product.category}</span>
            </div>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-medium">Availability:</span>
              <span
                className={`text-sm ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.stock > 0
                  ? `${product.stock} in stock`
                  : "Out of stock"}
              </span>
            </div>
            <Button
              onClick={() => addItem(product)}
              size="lg"
              className="w-full"
              disabled={product.stock === 0}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
