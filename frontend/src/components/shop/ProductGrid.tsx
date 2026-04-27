'use client';

import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProductSkeleton } from '@/components/ui/Skeleton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToWishlist, removeFromWishlist } from '@/store/wishlistSlice';
import { formatPrice } from '@/lib/utils';

interface Product {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  images?: { url: string }[];
  price?: number;
  variants?: { size?: string; color?: string; price: number; stock?: number }[];
  category?: string;
  tags?: string[];
  ratings?: { avg: number; count: number };
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const dispatch = useAppDispatch();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  const getPrice = (product: Product) => {
    if (product.variants?.[0]?.price) return product.variants[0].price;
    if (product.price) return product.price;
    return 0;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const isInWishlist = wishlistItems.some((item) => item._id === product._id);
        const price = getPrice(product);
        const imageUrl = product.images?.[0]?.url || '/placeholder.jpg';

        return (
          <Card key={product._id} hover className="group overflow-hidden">
            <div className="relative aspect-square bg-muted">
              <SafeImage
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              
              {product.tags?.includes('featured') && (
                <Badge className="absolute top-3 left-3" variant="secondary">
                  Featured
                </Badge>
              )}

              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isInWishlist) {
                      dispatch(removeFromWishlist(product._id));
                    } else {
                      dispatch(addToWishlist({ _id: product._id, name: product.name, slug: product.slug, thumbnail: imageUrl }));
                    }
                  }}
                  className="p-2 rounded-full bg-background/90 backdrop-blur hover:bg-background transition-colors"
                >
                  <Heart
                    className={`h-4 w-4 ${isInWishlist ? 'fill-primary text-primary' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4">
              <Link href={`/products/${product.slug}`}>
                <h3 className="font-medium line-clamp-1 hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {product.category || 'Uncategorized'}
                </p>
              </Link>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{formatPrice(price)}</p>
                </div>
                <Link href={`/products/${product.slug}`}>
                  <button className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    View
                  </button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}