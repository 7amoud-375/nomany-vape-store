import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AgeVerificationModal from "../components/common/AgeVerificationModal";
import PageDecorations from "../components/common/PageDecorations";

const CustomerLayout = () => {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Fixed and behind everything, so it never affects layout or scrolling. */}
      <PageDecorations />
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
