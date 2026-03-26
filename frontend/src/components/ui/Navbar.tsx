"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShoppingCart, Heart, User, Menu, X, Search, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearUser, setUser } from "@/store/userSlice";
import { removeAuthToken } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { WishlistSidebar } from "@/components/cart/WishlistSidebar";

const navigation = [
  { name: "Products", href: "/products" },
  { name: "Services", href: "/services" },
  { name: "About", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const cartItems = useAppSelector((state) => state.cart.items);
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const { user, isAuthenticated } = useAppSelector((state) => state.user);

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (token && !user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            dispatch(setUser(data));
          }
        })
        .catch(() => {
          removeAuthToken();
        });
    }
  }, [dispatch, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const openCart = () => {
    window.dispatchEvent(new CustomEvent("open-cart"));
  };

  const handleLogout = () => {
    removeAuthToken();
    dispatch(clearUser());
    router.push('/');
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "bg-white/95 backdrop-blur-lg border-b border-[#C9A84C]/20 shadow-lg shadow-black/5"
          : "bg-white/80 backdrop-blur-sm"
      )}
    >
      <nav className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold tracking-wider animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
              KENTAZ
            </span>
          </Link>

          <div className="hidden md:flex md:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative text-sm font-medium tracking-wide transition-colors hover:text-[#C9A84C] group",
                  pathname === item.href ? "text-[#C9A84C]" : "text-[#2D2D2D]"
                )}
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#C9A84C] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="hidden lg:flex items-center">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B] group-focus-within:text-[#C9A84C] transition-colors" />
            <input
              type="text"
              placeholder="Search luxury products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 pl-11 pr-4 py-2.5 text-sm rounded-full border border-[#E5E5E5] bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/50 text-[#1A1A1A] placeholder:text-[#6B6B6B] transition-all"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 md:gap-2">
          <WishlistSidebar />

          <button
            onClick={openCart}
            className="relative p-2 md:p-3 text-[#2D2D2D] hover:text-[#C9A84C] transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#C9A84C] text-white text-[10px] font-bold flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          {isAuthenticated && user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/account">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#2D2D2D] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span>{user.name?.split(' ')[0]}</span>
                </Button>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-[#2D2D2D] hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex text-[#2D2D2D] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10"
              >
                <User className="h-4 w-4 mr-2" />
                <span>Login</span>
              </Button>
            </Link>
          )}

          <button
            className="md:hidden p-2 text-[#2D2D2D]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#C9A84C]/20 bg-white/98 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="pb-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-full border border-[#E5E5E5] bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 text-[#1A1A1A] placeholder:text-[#6B6B6B]"
                />
              </div>
            </form>
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block py-3 px-4 text-sm font-medium rounded-lg transition-colors",
                    pathname === item.href
                      ? "text-[#C9A84C] bg-[#C9A84C]/10"
                      : "text-[#2D2D2D] hover:text-[#C9A84C] hover:bg-[#FAFAFA]"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-[#E5E5E5]">
              {isAuthenticated && user ? (
                <div className="space-y-1">
                  <Link
                    href="/account"
                    className="flex items-center gap-3 py-3 px-4 text-sm font-medium text-[#2D2D2D] hover:text-[#C9A84C] rounded-lg hover:bg-[#FAFAFA] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    Account
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 py-3 px-4 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-3 py-3 px-4 text-sm font-medium text-[#2D2D2D] hover:text-[#C9A84C] rounded-lg hover:bg-[#FAFAFA] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
