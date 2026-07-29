export const homepage = {
  hero: {
    enabled: true,
    autoplay: true,
    interval: 5000,
  },
  featuredCategories: {
    enabled: true,
    titleAr: "الأقسام المميزة",
    titleEn: "Featured Categories",
  },
  featuredProducts: {
    enabled: true,
    titleAr: "منتجات مميزة",
    titleEn: "Featured Products",
    limit: 4,
  },
  latestProducts: {
    enabled: true,
    titleAr: "أحدث المنتجات",
    titleEn: "Latest Products",
    limit: 4,
  },
  offers: {
    enabled: true,
    titleAr: "عروض خاصة",
    titleEn: "Special Offers",
  },
  bestSellers: {
    enabled: true,
    titleAr: "الأكثر مبيعاً",
    titleEn: "Best Sellers",
    limit: 4,
  },
  popularProducts: {
    enabled: true,
    titleAr: "المنتجات الشائعة",
    titleEn: "Popular Products",
    limit: 4,
  },
  whyChooseUs: {
    enabled: true,
    titleAr: "لماذا تختارنا؟",
    titleEn: "Why Choose Us?",
    features: [
      {
        id: 1,
        titleAr: "منتجات أصلية",
        titleEn: "Authentic Products",
        descriptionAr: "نضمن لك منتجات أصلية 100% من الماركات العالمية",
        descriptionEn: "We guarantee 100% authentic products from global brands",
        icon: "ShieldCheck",
      },
      {
        id: 2,
        titleAr: "توصيل سريع",
        titleEn: "Fast Delivery",
        descriptionAr: "نوصل طلباتك في أسرع وقت ممكن إلى باب منزلك",
        descriptionEn: "We deliver your orders as fast as possible to your doorstep",
        icon: "Truck",
      },
      {
        id: 3,
        titleAr: "أسعار تنافسية",
        titleEn: "Competitive Prices",
        descriptionAr: "أفضل الأسعار في السوق مع ضمان الجودة",
        descriptionEn: "Best prices in the market with quality guarantee",
        icon: "Tag",
      },
      {
        id: 4,
        titleAr: "دعم فني 24/7",
        titleEn: "24/7 Support",
        descriptionAr: "فريق دعم فني متاح على مدار الساعة لمساعدتك",
        descriptionEn: "Technical support team available 24/7 to help you",
        icon: "Headphones",
      },
    ],
  },
  testimonials: {
    enabled: true,
    titleAr: "آراء عملائنا",
    titleEn: "Customer Testimonials",
  },
  newsletter: {
    enabled: true,
    titleAr: "اشترك في نشرتنا الإخبارية",
    titleEn: "Subscribe to Our Newsletter",
    subtitleAr: "احصل على أحدث العروض والأخبار مباشرة إلى بريدك",
    subtitleEn: "Get the latest offers and news directly to your email",
    placeholderAr: "أدخل بريدك الإلكتروني",
    placeholderEn: "Enter your email",
    buttonAr: "اشترك",
    buttonEn: "Subscribe",
  },
};

export default homepage;
