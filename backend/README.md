# Kentaz Backend

MedusaJS-powered backend for the Kentaz e-commerce platform.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start PostgreSQL and Redis

Make sure PostgreSQL and Redis are running locally or update the connection URLs in `.env`.

### 4. Run Database Migrations

```bash
npm run db:migrate
```

### 5. Seed Initial Data (Optional)

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run develop
```

## API Endpoints

### Store API

- `GET /store/kentaz/products` - List products with filters
- `GET /store/kentaz/products/:id` - Get product details
- `GET /store/kentaz/products/:id/related` - Get related products
- `GET /store/kentaz/products/:id/reviews` - Get product reviews
- `POST /store/kentaz/products/:id/reviews` - Create a review
- `GET /store/kentaz/collections/:id/products` - Get collection products
- `GET /store/kentaz/categories` - List categories
- `GET /store/kentaz/featured` - Get featured products
- `GET /store/kentaz/best-sellers` - Get best sellers
- `GET /store/kentaz/search` - Search products
- `GET /store/kentaz/wishlist` - Get wishlist
- `POST /store/kentaz/wishlist` - Add to wishlist
- `DELETE /store/kentaz/wishlist/:productId` - Remove from wishlist

### Payment API

- `POST /store/kentaz/payment/initialize` - Initialize Paystack payment
- `POST /store/kentaz/payment/verify` - Verify payment status
- `GET /store/kentaz/payment/sessions` - List payment sessions

### Admin API

- `POST /admin/kentaz/products/import` - Import products
- `POST /admin/kentaz/products/export` - Export products
- `GET /admin/kentaz/analytics` - Get analytics dashboard
- `GET /admin/kentaz/analytics/sales` - Get sales analytics
- `GET /admin/kentaz/analytics/products` - Get product analytics
- `GET /admin/kentaz/reviews` - Manage reviews
- `POST /admin/kentaz/orders/:id/fulfill` - Fulfill order
- `POST /admin/kentaz/orders/:id/return` - Process return
- `GET /admin/kentaz/inventory` - Manage inventory

## Medusa Admin Dashboard

Access the admin dashboard at `http://localhost:7000` after starting the server.

## Available Scripts

- `npm run develop` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run build` - Build for production
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run lint` - Run linter

## Project Structure

```
backend/
├── medusa-config.js      # Medusa configuration
├── package.json
├── src/
│   ├── api/
│   │   └── routes/
│   │       ├── store/     # Store API routes
│   │       └── admin/     # Admin API routes
│   ├── models/            # Database models
│   ├── services/          # Custom services
│   ├── subscribers/       # Event subscribers
│   ├── migrations/        # Database migrations
│   └── scripts/           # Seed scripts
```

## Payment Integration

The backend includes Paystack integration for Nigerian Naira (NGN) payments.

### Paystack Setup

1. Create a Paystack account at https://paystack.com
2. Get your API keys from the Paystack dashboard
3. Add keys to `.env`:
   ```
   PAYSTACK_SECRET_KEY=sk_live_...
   PAYSTACK_PUBLIC_KEY=pk_live_...
   PAYSTACK_WEBHOOK_SECRET=whsec_...
   ```

## Customization

### Extending Product Model

The product model includes custom metadata fields:
- `category_id` - Links to custom categories
- `brand_id` - Brand identifier
- `rating` - Average product rating
- `review_count` - Number of reviews
- `is_bestseller` - Bestseller flag
- `is_featured` - Featured flag
- `estimated_delivery_days` - Delivery time estimate
- `specifications` - Custom specifications
- `materials` - Materials used
- `care_instructions` - Care instructions

## License

Proprietary - Kentaz E-commerce Platform
