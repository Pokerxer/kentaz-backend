# 🚀 Kentaz Platform — OpenCode Agent Instructions

> Build a modern e-commerce & booking platform powered by Next.js 15, Medusa.js v2, and real payment processing.

---

## 🎯 Project Overview

Build a complete full-stack platform featuring:
- **E-commerce store** with product browsing, cart, and checkout (Medusa.js powered)
- **Booking system** for therapy sessions and podcast studio rentals
- **Admin dashboard** via Medusa Admin for managing products, orders, and bookings
- **Auth system** with Google OAuth via NextAuth.js
- **Media management** via Cloudinary
- **Payment processing** via Paystack

---

## 📋 Environment Variables

Create a `.env.local` file in the project root:

```env
# Medusa Backend (Required)
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_your_publishable_key

# NextAuth
NEXTAUTH_SECRET=your-32-char-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Paystack (Optional)
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

---

## 🗂️ Deliverables Checklist

### Core Infrastructure
- [x] Next.js 15 app with App Router setup
- [x] TypeScript configuration
- [x] Medusa React integration
- [ ] Medusa.js v2 backend setup (separate directory)

### Authentication & Users
- [x] NextAuth.js with Google OAuth provider
- [x] User session management
- [x] Protected routes for authenticated users
- [x] Admin role-based access control

### E-commerce Features
- [x] Product catalog with grid/list views (Medusa powered)
- [x] Product detail pages with image galleries
- [x] Redux store with cart slice
- [x] Redux store with wishlist slice
- [x] Shopping cart with quantity management
- [ ] Cart persistence across sessions
- [ ] Paystack checkout integration
- [ ] Order confirmation flow
- [ ] Order history page

### Booking System
- [x] Service listing (therapy + podcast studio)
- [ ] Calendar-based availability view
- [ ] Time slot selection
- [ ] Booking confirmation
- [ ] User booking history

### Admin Panel
- [x] Admin dashboard pages
- [ ] Medusa Admin integration for product/order management
- [ ] Cloudinary image upload for products/avatars

### Data & Seed
- [ ] 10 sample products with images (via Medusa admin)
- [ ] 2 services (therapy + podcast studio)
- [ ] Sample orders and bookings

### Polish & UX
- [x] Mobile-responsive design throughout
- [x] Loading skeletons for async content
- [ ] Toast notifications for actions
- [ ] Error boundaries and fallback UI
- [ ] SEO meta tags on all pages

### Documentation
- [x] README.md with setup instructions
- [x] Environment variable documentation

---

## 🔧 Medusa.js Integration

This storefront uses **Medusa.js v2** as its commerce backend.

### Installation

```bash
# 1. Create Medusa backend (separate directory)
npx create-medusa-app@latest backend

# 2. Install dependencies in storefront
npm install medusa-react @tanstack/react-query@4.22
```

### Key Hooks

```tsx
import { useProducts, useProduct, useCart, useCollections } from 'medusa-react';

// Fetch products
const { products, isLoading } = useProducts();

// Fetch single product by handle
const { product } = useProduct('product-handle');

// Manage cart
const { cart, createCart, addItem, updateItem } = useCart();
```

### MedusaProvider Setup

```tsx
import { MedusaProvider } from '@/lib/medusa/provider';

<MedusaProvider
  baseUrl={process.env.MEDUSA_BACKEND_URL}
  publishableApiKey={process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}
>
  {children}
</MedusaProvider>
```

---

## 📁 Project Structure

```
kentaz/
├── app/
│   ├── (auth)/            # Auth pages
│   ├── (shop)/            # Shop pages
│   │   ├── products/
│   │   ├── cart/
│   │   └── checkout/
│   ├── services/          # Booking pages
│   ├── account/           # User account
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/
│   ├── ui/               # Reusable UI
│   └── shop/             # E-commerce components
├── lib/
│   └── medusa/           # Medusa client
├── store/                 # Redux store
└── README.md
```

---

## 🔌 Medusa Store API

Medusa provides REST APIs at `http://localhost:9000/store`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/store/products` | GET | List products |
| `/store/products/:id` | GET | Get product |
| `/store/collections` | GET | List collections |
| `/store/carts` | POST | Create cart |
| `/store/carts/:id/line-items` | POST | Add to cart |
| `/store/regions` | GET | List regions |

---

## ✅ Success Criteria

1. Medusa backend running at localhost:9000
2. Storefront loads products from Medusa
3. Cart operations work (add, remove, update)
4. Checkout flow integrates with Paystack
5. Mobile experience is seamless

---

## 📚 Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa React](https://docs.medusajs.com/medusa-react/overview)
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Paystack](https://paystack.com/docs/)

---

*Build something amazing! ✨*
