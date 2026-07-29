import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";

const DashboardLayout = () => {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      // If not logged in, or if logged in but NOT an admin -> redirect to home
      if (!isAuthenticated || userRole !== 'admin') {
        navigate("/");
      }
    }
  }, [isAuthenticated, isLoading, userRole, navigate]);

  if (isLoading || !isAuthenticated || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <DashboardSidebar />
      <div className={`flex-1 flex flex-col ${isRTL ? "lg:mr-64" : "lg:ml-64"}`}>
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;