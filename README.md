# Kentaz Platform

A modern e-commerce and booking platform built with Next.js 15, featuring a local mock API (simulating Medusa.js responses), Redux state management, and integrated payment processing.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **State Management**: Redux Toolkit
- **Authentication**: NextAuth.js (Google OAuth)
- **Payments**: Paystack
- **Media Storage**: Cloudinary
- **UI Components**: Framer Motion, Lucide Icons
- **API**: Local mock API (Medusa-style responses)

## Features

- [x] Product catalog with grid view
- [x] Shopping cart with Redux persistence
- [x] Wishlist functionality
- [x] Product detail pages with image galleries
- [x] Checkout flow
- [x] Booking system for therapy sessions & podcast studio
- [x] User authentication (Google OAuth)
- [x] Admin dashboard pages
- [x] Responsive design (mobile-first)
- [x] Modern UI components with Tailwind
- [x] 10 sample products included

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# NextAuth
NEXTAUTH_SECRET=your-32-char-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (shop)/            # Shop pages
│   │   ├── products/     # Product listing & detail
│   │   ├── cart/         # Shopping cart
│   │   └── checkout/     # Checkout page
│   ├── services/         # Booking pages
│   ├── account/          # User account pages
│   ├── admin/           # Admin dashboard
│   └── api/store/       # Mock API endpoints
├── components/
│   ├── ui/              # Reusable UI components
│   └── shop/           # E-commerce components
├── lib/                 # Utilities
├── store/               # Redux store
└── types/              # TypeScript definitions
```

## API Endpoints

The app includes a local mock API that returns Medusa-style responses:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/store/products` | GET | List all products |
| `/api/store/products/[handle]` | GET | Get product by handle |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/products` | Product listing (10 products) |
| `/products/[handle]` | Product detail |
| `/cart` | Shopping cart |
| `/checkout` | Checkout page |
| `/services` | Service listing |
| `/services/booking` | Book a service |
| `/login` | User login |
| `/register` | User registration |
| `/account` | Account dashboard |
| `/admin` | Admin dashboard |

## Sample Products

The app includes 10 sample products across categories:
- Electronics (Headphones, Smart Watch, Speaker, Charger)
- Accessories (Backpack, Wallet)
- Clothing (T-Shirt, Denim Jacket)
- Home (Plant Pots, Diffuser)

## Connecting Real Backend

To connect a real Medusa.js backend:

1. Install Medusa: `npx create-medusa-app@latest backend`
2. Start backend: `cd backend && npm run dev`
3. Update API calls to use Medusa hooks instead of local mock API

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

MIT
# kentaz-backend
