import { NextResponse } from 'next/server';

const products = [
  {
    id: 'prod_001',
    title: 'Classic Slim Fit Denim Jeans',
    description: 'Premium quality slim fit denim jeans with stretch comfort. Perfect for casual and semi-formal occasions. Features reinforced stitching and premium hardware.',
    handle: 'slim-fit-denim-jeans',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
    images: [
      { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600' },
      { url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600' },
    ],
    price: { amount: 8999, currency_code: 'ngn' },
    options: [
      { name: 'Size', values: ['28', '30', '32', '34', '36'] },
      { name: 'Color', values: ['Blue', 'Black', 'Navy'] },
    ],
    variants: [
      { id: 'var_001_28_blue', title: '28 / Blue', prices: [{ amount: 8999 }], inventory_quantity: 10, options: { Size: '28', Color: 'Blue' } },
      { id: 'var_001_30_blue', title: '30 / Blue', prices: [{ amount: 8999 }], inventory_quantity: 15, options: { Size: '30', Color: 'Blue' } },
      { id: 'var_001_32_blue', title: '32 / Blue', prices: [{ amount: 8999 }], inventory_quantity: 12, options: { Size: '32', Color: 'Blue' } },
      { id: 'var_001_28_black', title: '28 / Black', prices: [{ amount: 8999 }], inventory_quantity: 8, options: { Size: '28', Color: 'Black' } },
      { id: 'var_001_30_black', title: '30 / Black', prices: [{ amount: 8999 }], inventory_quantity: 10, options: { Size: '30', Color: 'Black' } },
      { id: 'var_001_32_black', title: '32 / Black', prices: [{ amount: 8999 }], inventory_quantity: 10, options: { Size: '32', Color: 'Black' } },
    ],
    collection: { id: 'col_01', title: 'Male Fashion', handle: 'male-fashion' },
    tags: [{ id: 'tag_01', value: 'bestseller' }],
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_002',
    title: 'Premium Cotton Polo Shirt',
    description: 'Soft breathable cotton polo shirt. Classic fit with ribbed collar. Available in multiple colors. Perfect for both casual and smart-casual occasions.',
    handle: 'premium-cotton-polo',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1625910513413-5fc4e5e40687?w=600',
    images: [{ url: 'https://images.unsplash.com/photo-1625910513413-5fc4e5e40687?w=600' }],
    price: { amount: 4999, currency_code: 'ngn' },
    options: [
      { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Color', values: ['White', 'Navy', 'Black', 'Burgundy'] },
    ],
    variants: [
      { id: 'var_002_S_white', title: 'S / White', prices: [{ amount: 4999 }], inventory_quantity: 20, options: { Size: 'S', Color: 'White' } },
      { id: 'var_002_M_white', title: 'M / White', prices: [{ amount: 4999 }], inventory_quantity: 25, options: { Size: 'M', Color: 'White' } },
      { id: 'var_002_L_white', title: 'L / White', prices: [{ amount: 4999 }], inventory_quantity: 20, options: { Size: 'L', Color: 'White' } },
      { id: 'var_002_S_navy', title: 'S / Navy', prices: [{ amount: 4999 }], inventory_quantity: 15, options: { Size: 'S', Color: 'Navy' } },
    ],
    collection: { id: 'col_01', title: 'Male Fashion', handle: 'male-fashion' },
    tags: [],
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_018',
    title: 'Stiletto Heels',
    description: 'Elegant 4-inch stiletto heels in premium leather. Cushioned insole for all-day comfort. Classic design that never goes out of style.',
    handle: 'stiletto-heels',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600',
    images: [{ url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' }],
    price: { amount: 9999, currency_code: 'ngn' },
    options: [
      { name: 'Size', values: ['35', '36', '37', '38', '39', '40', '41'] },
      { name: 'Color', values: ['Black', 'Nude', 'Red'] },
    ],
    variants: [
      { id: 'var_018_35_black', title: '35 / Black', prices: [{ amount: 9999 }], inventory_quantity: 5, options: { Size: '35', Color: 'Black' } },
      { id: 'var_018_36_black', title: '36 / Black', prices: [{ amount: 9999 }], inventory_quantity: 8, options: { Size: '36', Color: 'Black' } },
      { id: 'var_018_37_black', title: '37 / Black', prices: [{ amount: 9999 }], inventory_quantity: 10, options: { Size: '37', Color: 'Black' } },
      { id: 'var_018_38_black', title: '38 / Black', prices: [{ amount: 9999 }], inventory_quantity: 10, options: { Size: '38', Color: 'Black' } },
      { id: 'var_018_37_red', title: '37 / Red', prices: [{ amount: 9999 }], inventory_quantity: 7, options: { Size: '37', Color: 'Red' } },
      { id: 'var_018_38_red', title: '38 / Red', prices: [{ amount: 9999 }], inventory_quantity: 5, options: { Size: '38', Color: 'Red' } },
    ],
    collection: { id: 'col_07', title: 'Shoes', handle: 'shoes' },
    tags: [{ id: 'tag_12', value: 'featured' }],
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_009',
    title: 'Radiance Glow Serum',
    description: 'Vitamin C brightening serum for luminous, even-toned skin. Reduces dark spots in 4 weeks. Powerful antioxidant formula.',
    handle: 'radiance-glow-serum',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
    images: [{ url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600' }],
    price: { amount: 7999, currency_code: 'ngn' },
    options: [
      { name: 'Size', values: ['15ml', '30ml', '50ml'] },
    ],
    variants: [
      { id: 'var_009_15ml', title: '15ml', prices: [{ amount: 7999 }], inventory_quantity: 40, options: { Size: '15ml' } },
      { id: 'var_009_30ml', title: '30ml', prices: [{ amount: 12999 }], inventory_quantity: 40, options: { Size: '30ml' } },
      { id: 'var_009_50ml', title: '50ml', prices: [{ amount: 17999 }], inventory_quantity: 40, options: { Size: '50ml' } },
    ],
    collection: { id: 'col_04', title: 'Skincare Products', handle: 'skincare' },
    tags: [{ id: 'tag_06', value: 'bestseller' }],
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_027',
    title: 'Luxury Gift Box Set',
    description: 'Premium gift box with skincare trio, bath bomb, and scented candle. Beautifully packaged in a keepsake box.',
    handle: 'luxury-gift-box-set',
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600',
    images: [{ url: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600' }],
    price: { amount: 7999, currency_code: 'ngn' },
    options: [
      { name: 'Theme', values: ['Spa Day', 'Romantic', 'Self Care', 'Birthday'] },
    ],
    variants: [
      { id: 'var_027_spa', title: 'Spa Day', prices: [{ amount: 7999 }], inventory_quantity: 20, options: { Theme: 'Spa Day' } },
      { id: 'var_027_romantic', title: 'Romantic', prices: [{ amount: 7999 }], inventory_quantity: 20, options: { Theme: 'Romantic' } },
      { id: 'var_027_selfcare', title: 'Self Care', prices: [{ amount: 7999 }], inventory_quantity: 15, options: { Theme: 'Self Care' } },
      { id: 'var_027_birthday', title: 'Birthday', prices: [{ amount: 8999 }], inventory_quantity: 5, options: { Theme: 'Birthday' } },
    ],
    collection: { id: 'col_10', title: 'Gift Items', handle: 'gift-items' },
    tags: [{ id: 'tag_18', value: 'featured' }],
    created_at: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  const product = products.find(p => p.handle === handle);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ product });
}
