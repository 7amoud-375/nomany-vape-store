import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AgeVerificationModal from "../components/common/AgeVerificationModal";

const CustomerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <AgeVerificationModal />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;