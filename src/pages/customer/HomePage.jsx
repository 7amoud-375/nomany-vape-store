import HeroSlider from "../../components/sections/HeroSlider";
import FeaturedCategories from "../../components/sections/FeaturedCategories";
import FeaturedProducts from "../../components/sections/FeaturedProducts";
import BestSellers from "../../components/sections/BestSellers";
import WhyChooseUs from "../../components/sections/WhyChooseUs";

const HomePage = () => {
  return (
    <div>
      <HeroSlider />
      <FeaturedCategories />
      <FeaturedProducts />
      <BestSellers />
      <WhyChooseUs />
    </div>
  );
};

export default HomePage;