import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useLanguage } from "./context/LanguageContext";
import CustomerLayout from "./layouts/CustomerLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/customer/HomePage";

// Everything except the landing page is code-split: the dashboard alone was
// roughly half the bundle and no customer ever loads it.
const ProductsPage = lazy(() => import("./pages/customer/ProductsPage"));
const ProductDetailsPage = lazy(() => import("./pages/customer/ProductDetailsPage"));
const CategoriesPage = lazy(() => import("./pages/customer/CategoriesPage"));
const CategoryPage = lazy(() => import("./pages/customer/CategoryPage"));
const OffersPage = lazy(() => import("./pages/customer/OffersPage"));
const AboutPage = lazy(() => import("./pages/customer/AboutPage"));
const ContactPage = lazy(() => import("./pages/customer/ContactPage"));
const AuthPage = lazy(() => import("./pages/customer/AuthPage"));
const ProfilePage = lazy(() => import("./pages/customer/ProfilePage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("./pages/customer/CheckoutPage"));
const WishlistPage = lazy(() => import("./pages/customer/WishlistPage"));
const SearchPage = lazy(() => import("./pages/customer/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/customer/NotFoundPage"));

const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardProducts = lazy(() => import("./pages/dashboard/DashboardProducts"));
const DashboardCategories = lazy(() => import("./pages/dashboard/DashboardCategories"));
const DashboardBrands = lazy(() => import("./pages/dashboard/DashboardBrands"));
const DashboardOffers = lazy(() => import("./pages/dashboard/DashboardOffers"));
const DashboardOrders = lazy(() => import("./pages/dashboard/DashboardOrders"));
const DashboardCustomers = lazy(() => import("./pages/dashboard/DashboardCustomers"));
const DashboardAnalytics = lazy(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardBanners = lazy(() => import("./pages/dashboard/DashboardBanners"));
const DashboardTestimonials = lazy(() => import("./pages/dashboard/DashboardTestimonials"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings"));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function App() {
  const { dir } = useLanguage();

  return (
    <div dir={dir} className="min-h-screen bg-secondary-light dark:bg-slate-950 transition-colors duration-300">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:id" element={<CategoryPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Auth Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Dashboard Routes — DashboardLayout enforces the admin check, and
              firestore.rules enforces it again server-side. */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="products" element={<DashboardProducts />} />
            <Route path="categories" element={<DashboardCategories />} />
            <Route path="brands" element={<DashboardBrands />} />
            <Route path="offers" element={<DashboardOffers />} />
            <Route path="orders" element={<DashboardOrders />} />
            <Route path="customers" element={<DashboardCustomers />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="banners" element={<DashboardBanners />} />
            <Route path="testimonials" element={<DashboardTestimonials />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
