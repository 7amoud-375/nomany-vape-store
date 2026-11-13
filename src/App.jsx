import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useLanguage } from "./context/LanguageContext";
import { ADMIN_LOGIN_PATH } from "./constants";
import CustomerLayout from "./layouts/CustomerLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import ScrollToTop from "./components/common/ScrollToTop";
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
const ReturnPolicyPage = lazy(() => import("./pages/customer/ReturnPolicyPage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("./pages/customer/CheckoutPage"));
const WishlistPage = lazy(() => import("./pages/customer/WishlistPage"));
const SearchPage = lazy(() => import("./pages/customer/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/customer/NotFoundPage"));
const AdminLoginPage = lazy(() => import("./pages/customer/AdminLoginPage"));

const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardProducts = lazy(() => import("./pages/dashboard/DashboardProducts"));
const DashboardCategories = lazy(() => import("./pages/dashboard/DashboardCategories"));
const DashboardBrands = lazy(() => import("./pages/dashboard/DashboardBrands"));
const DashboardOffers = lazy(() => import("./pages/dashboard/DashboardOffers"));
const DashboardOrders = lazy(() => import("./pages/dashboard/DashboardOrders"));
const DashboardStockAlerts = lazy(() => import("./pages/dashboard/DashboardStockAlerts"));
const DashboardAnalytics = lazy(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings"));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function App() {
  const { dir } = useLanguage();

  return (
    // No background utility here on purpose — index.css paints the canvas on
    // <html>, so the theme cannot lose a specificity tie between
    // `bg-secondary-light` and `dark:bg-slate-950`.
    <div dir={dir} className="min-h-screen">
      {/* Inside the router, above the routes: every navigation starts at the top. */}
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Storefront — no accounts, checkout is guest-only */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:id" element={<CategoryPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/return-policy" element={<ReturnPolicyPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>

          {/* Unlisted admin sign-in. Not linked from anywhere in the UI. */}
          <Route path={ADMIN_LOGIN_PATH} element={<AdminLoginPage />} />

          {/* Dashboard — DashboardLayout gates on the admin role, and
              the API rejects unauthenticated writes regardless. */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="products" element={<DashboardProducts />} />
            <Route path="categories" element={<DashboardCategories />} />
            <Route path="brands" element={<DashboardBrands />} />
            <Route path="offers" element={<DashboardOffers />} />
            <Route path="orders" element={<DashboardOrders />} />
            <Route path="stock-alerts" element={<DashboardStockAlerts />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
