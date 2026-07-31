import { useState, useRef } from "react";
import { Upload, X, Loader2, Star, Link2, GripVertical } from "lucide-react";
import { uploadProductImage } from "../../services/storageService";
import toast from "react-hot-toast";

const MAX_IMAGES = 6;

/**
 * Manages a product's image list.
 *
 * Uploads go to our own server and only the resulting URL is stored. The first
 * image is the one shown on cards and in listings, and can be promoted without
 * re-uploading.
 */
const MultiImageUploader = ({ images = [], onChange, language = "ar" }) => {
  const isRtl = language === "ar";
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const remaining = MAX_IMAGES - list.length;

  const addFiles = async (files) => {
    const incoming = Array.from(files || []).filter((f) => f.type?.startsWith("image/"));
    if (incoming.length === 0) return;

    if (incoming.length > remaining) {
      toast.error(
        isRtl ? `الحد الأقصى ${MAX_IMAGES} صور` : `Maximum ${MAX_IMAGES} images`
      );
    }

    const batch = incoming.slice(0, Math.max(0, remaining));
    if (batch.length === 0) return;

    setUploading(true);
    const uploaded = [];

    for (const file of batch) {
      try {
        uploaded.push(await uploadProductImage(file));
      } catch (error) {
        console.error(error);
        toast.error(error.message || (isRtl ? "فشل رفع الصورة" : "Upload failed"));
      }
    }

    setUploading(false);

    if (uploaded.length > 0) {
      onChange([...list, ...uploaded]);
      toast.success(
        isRtl ? `تم رفع ${uploaded.length} صورة` : `Uploaded ${uploaded.length} image(s)`
      );
    }
  };

  const removeAt = (index) => {
    // The stored file is left in place on purpose: another product, or an older
    // order, may still be pointing at the same URL.
    onChange(list.filter((_, i) => i !== index));
  };

  const makePrimary = (index) => {
    if (index === 0) return;
    const next = [...list];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      toast.error(isRtl ? "الرابط لازم يبدأ بـ http أو /" : "URL must start with http or /");
      return;
    }
    if (list.length >= MAX_IMAGES) {
      toast.error(isRtl ? `الحد الأقصى ${MAX_IMAGES} صور` : `Maximum ${MAX_IMAGES} images`);
      return;
    }
    onChange([...list, url]);
    setUrlDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {isRtl ? "صور المنتج" : "Product images"}
        </label>
        <span className="text-xs text-gray-400">
          {list.length} / {MAX_IMAGES}
        </span>
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {list.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 ${
                index === 0
                  ? "border-primary"
                  : "border-transparent hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />

              {index === 0 && (
                <span className="absolute bottom-1 start-1 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-medium">
                  {isRtl ? "رئيسية" : "Main"}
                </span>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(index)}
                    title={isRtl ? "اجعلها الرئيسية" : "Make main"}
                    className="p-1.5 rounded-lg bg-white/90 text-gray-700 hover:bg-white"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  title={isRtl ? "حذف" : "Remove"}
                  className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={`w-full rounded-xl border-2 border-dashed py-6 flex flex-col items-center justify-center gap-2 transition-colors ${
            uploading
              ? "border-gray-200 dark:border-slate-700 cursor-wait"
              : dragging
              ? "border-primary bg-primary/5 cursor-pointer"
              : "border-gray-300 dark:border-slate-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-gray-500">{isRtl ? "جاري الرفع..." : "Uploading..."}</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isRtl ? "اضغط أو اسحب الصور هنا" : "Click or drag images here"}
              </p>
              <p className="text-xs text-gray-400">
                {isRtl
                  ? "الصور بتتضغط تلقائيًا قبل الرفع"
                  : "Images are compressed automatically before upload"}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder={isRtl ? "أو الصق رابط صورة" : "Or paste an image URL"}
          className="input-field flex-1 py-1.5 text-sm"
          dir="ltr"
        />
        <button
          type="button"
          onClick={addUrl}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          {isRtl ? "إضافة" : "Add"}
        </button>
      </div>
    </div>
  );
};

export default MultiImageUploader;
