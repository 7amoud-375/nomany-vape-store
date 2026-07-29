import { Routes, Route } from "react-router-dom";
import { useLanguage } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import CustomerLayout from "./layouts/CustomerLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Customer Pages
import HomePage from "./pages/customer/HomePage";
import ProductsPage from "./pages/customer/ProductsPage";
import ProductDetailsPage from "./pages/customer/ProductDetailsPage";
import CategoriesPage from "./pages/customer/CategoriesPage";
import CategoryPage from "./pages/customer/CategoryPage";
import OffersPage from "./pages/customer/OffersPage";
import AboutPage from "./pages/customer/AboutPage";
import AuthPage from "./pages/customer/AuthPage"; // New Auth Page
import ProfilePage from "./pages/customer/ProfilePage"; // New Profile Page
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import WishlistPage from "./pages/customer/WishlistPage";
import SearchPage from "./pages/customer/SearchPage";
import NotFoundPage from "./pages/customer/NotFoundPage";

// Dashboard Pages
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardProducts from "./pages/dashboard/DashboardProducts";
import DashboardCategories from "./pages/dashboard/DashboardCategories";
import DashboardBrands from "./pages/dashboard/DashboardBrands";
import DashboardOffers from "./pages/dashboard/DashboardOffers";
import DashboardOrders from "./pages/dashboard/DashboardOrders";
import DashboardCustomers from "./pages/dashboard/DashboardCustomers";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics";
import DashboardBanners from "./pages/dashboard/DashboardBanners";
import DashboardSettings from "./pages/dashboard/DashboardSettings";

function App() {
  const { dir } = useLanguage();

  return (
    <AuthProvider>
      <div dir={dir} className="min-h-screen bg-secondary-light dark:bg-slate-950 transition-colors duration-300">
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
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} /> {/* New Route */}
          </Route>

          {/* Auth Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Dashboard Routes (protected for Admin only) */}
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
            <Route path="settings" element={<DashboardSettings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;