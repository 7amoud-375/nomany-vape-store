import { useState, useMemo } from "react";
import { X, ImageIcon, Search } from "lucide-react";
import { useData } from "../../context/DataContext";
import Modal from "../ui/Modal";

const GalleryPicker = ({ isOpen, onClose, onSelect, language = "ar" }) => {
  const { products, categories, brands, banners, offers } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  /*
   * A real upload from api/upload.php comes back as a root-relative path —
   * "/uploads/xyz.jpg", not an absolute URL — so the app stays portable
   * across localhost, www/non-www and http-before-the-certificate (see
   * normalise_image_url() in api/index.php). This picker used to only accept
   * a src starting with "data:image" or "http", which every real uploaded
   * image fails: the gallery read "No images available" no matter how many
   * products had photos. Any non-empty string is a valid <img src>.
   */
  const isUsableImage = (src) => typeof src === "string" && src.trim() !== "";

  // Collect all images from the app
  const allImages = useMemo(() => {
    const images = new Set();

    // Product images
    products.forEach((p) => {
      p.images?.forEach((img) => {
        if (isUsableImage(img)) {
          images.add({ src: img, source: language === "ar" ? "منتج" : "Product", name: p.nameAr || p.nameEn });
        }
      });
    });

    // Category images
    categories.forEach((c) => {
      if (isUsableImage(c.image)) {
        images.add({ src: c.image, source: language === "ar" ? "قسم" : "Category", name: c.nameAr || c.nameEn });
      }
    });

    // Brand logos
    brands.forEach((b) => {
      if (isUsableImage(b.logo)) {
        images.add({ src: b.logo, source: language === "ar" ? "ماركة" : "Brand", name: b.name });
      }
    });

    // Banner images
    banners.forEach((b) => {
      if (isUsableImage(b.image)) {
        images.add({ src: b.image, source: language === "ar" ? "بنر" : "Banner", name: b.titleAr || b.titleEn });
      }
    });

    // Offer images
    offers.forEach((o) => {
      if (isUsableImage(o.image)) {
        images.add({ src: o.image, source: language === "ar" ? "عرض" : "Offer", name: o.titleAr || o.titleEn });
      }
    });

    return Array.from(images);
  }, [products, categories, brands, banners, offers, language]);

  const filteredImages = allImages.filter((img) =>
    (img.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === "ar" ? "اختيار من المعرض" : "Choose from Gallery"}
      size="xl"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "ar" ? "بحث في الصور..." : "Search images..."}
            className="input-field w-full pl-10"
          />
        </div>

        {/* Images Grid */}
        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
            {filteredImages.map((img, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect(img.src);
                  onClose();
                }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={img.src}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://placehold.co/100x100/004741/FFFFFF?text=Img";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 truncate w-full">
                    {img.name}
                  </span>
                </div>
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary/80 text-on-primary text-[10px]">
                  {img.source}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {language === "ar" ? "لا توجد صور متاحة" : "No images available"}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {language === "ar" ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GalleryPicker;