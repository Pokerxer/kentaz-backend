 

## TECH STACK
- **Frontend**: Next.js 15 (App Router, TypeScript)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (via Mongoose)
- **Styling**: Tailwind CSS v4 + custom design tokens
- **State Management**: Redux Toolkit + RTK Query
- **Media/Assets**: Cloudinary (image upload, optimization, transformation)
- **Payments**: Paystack (Nigerian market, NGN currency)
- **Auth**: NextAuth.js v5 (credentials + Google OAuth)

---

## BRAND IDENTITY
- **Brand Name**: Kentaz Emporium
- **Location**: Abuja, Nigeria (West Africa)
- **Tagline**: "Luxury. Lifestyle. Wellness."
- **Color Palette** (Lifted/Light theme for modern luxury feel):
  - Primary: #C9A84C (gold)
  - Secondary: #2D2D2D (charcoal for text/dark elements)
  - Background: #FAFAFA (off-white/cream)
  - Surface: #FFFFFF (white cards)
  - Surface Alt: #F5F5F0 (warm cream)
  - Accent: #1A1A1A (near black for contrast)
  - Muted: #6B6B6B (muted text)
  - Gold Light: #E8D48A (hover states)
- **Typography**:
  - Display: Playfair Display (serif, for headings)
  - Body: Inter (sans-serif)
- **Aesthetic**: High-end luxury — sophisticated, lifted, and modern — Rolls-Royce meets African elegance

---

## BUSINESS CATEGORIES & SERVICES

### Physical Products (E-Commerce)
1. Male, Female & Kiddies Fashion
2. Skincare Products
3. Luxury Human Hair
4. Bags & Purses
5. Shoes
6. Accessories
7. Perfumes
8. Gift Items

### Service Bookings
1. Mental Health Consultation / Therapy (book sessions)
2. Podcast Studio Rental (book time slots)

---

## PAGES & FEATURES TO BUILD


### 1. Homepage (`/`)
- Full-screen hero section with animated gold gradient text: 
  "Luxury. Lifestyle. Wellness."
- Floating navigation bar (logo left, links center, cart + profile right)
- Featured Categories grid (8 product categories with hover animations)
- "Services" section showcasing Mental Health & Podcast Studio
- Trending Products carousel (RTK Query fetching from backend)
- Testimonials section
- Instagram feed strip (static placeholder, 6 images from Cloudinary)
- Footer with: logo, address (Suite 35, 911 Mall Usuma Street), 
  WhatsApp (07081856411), Instagram (@KENTAZ EMPORIUM), newsletter signup

### 2. Shop (`/shop`)
- Sidebar filters: category, price range, size, color
- Product grid with Cloudinary-optimized images
- Sort by: newest, price low/high, popularity
- Infinite scroll or pagination
- Quick-add to cart overlay on hover

### 3. Product Detail (`/shop/[slug]`)
- Image gallery (Cloudinary transformations: zoom, thumbnails)
- Size/color/variant selector
- Add to cart + Add to wishlist
- Quantity selector
- Related products section
- Review & ratings section

### 4. Cart (`/cart`)
- Redux-managed cart state (persisted to localStorage)
- Item list with Cloudinary thumbnails
- Quantity update / remove item
- Order summary with subtotal, shipping estimate
- "Proceed to Checkout" CTA

### 5. Checkout (`/checkout`)
- Multi-step: Shipping Info → Review → Payment
- Paystack inline payment integration
- Order confirmation with reference number

### 6. Services (`/services`)
- Mental Health Consultation booking page:
  - Therapist profiles (Cloudinary photos)
  - Calendar slot picker
  - Session types: In-person / Virtual
  - Paystack payment for session fee
- Podcast Studio booking page:
  - Studio photos (Cloudinary gallery)
  - Hourly slot calendar
  - Equipment list
  - Paystack payment

### 7. Booking Confirmation (`/bookings/[id]`)
- Booking summary
- Add to Google Calendar button
- WhatsApp reminder option

### 8. Auth Pages
- `/auth/login` — Email/password + Google OAuth
- `/auth/register` — Full registration form
- `/auth/forgot-password`

### 9. User Dashboard (`/dashboard`)
- Profile management (Cloudinary avatar upload)
- Order history with status tracking
- Booking history
- Wishlist
- Address book

### 10. Admin Panel (`/admin`)
- Protected route (admin role only)
- Products CRUD (Cloudinary upload)
- Orders management + status updates
- Bookings calendar view
- Customer list
- Revenue analytics charts (Recharts)
- Inventory management

---

## DATABASE SCHEMA (MongoDB / Mongoose)

```typescript
// User
{
  _id, name, email, password (hashed), role: 'customer'|'admin'|'therapist',
  avatar (Cloudinary URL), addresses[], wishlist[], createdAt
}

// Product
{
  _id, name, slug, description, category, 
  images: [{ url, publicId }], // Cloudinary
  variants: [{ size, color, price, stock }],
  tags[], featured: Boolean, ratings: { avg, count }
}

// Booking
{
  _id, userId, serviceType: 'therapy'|'podcast',
  therapistId?, date, timeSlot, duration,
  status: 'pending'|'confirmed'|'cancelled'|'completed',
  paystackRef, amount, notes, createdAt
}

// Review
{
  _id, productId, userId, rating (1-5), comment, createdAt
}

// Order
{
  _id, userId, paystackRef, 
  status, items[], shippingAddress, total, createdAt
}