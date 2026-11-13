import { useState, useRef } from "react";
import { Upload, X, Check, Loader2 } from "lucide-react";
import { uploadProductImage } from "../../services/storageService";
import toast from "react-hot-toast";

/**
 * Single-image picker for categories and brand logos.
 *
 * Uploads to our own server and stores only the resulting URL. It used to call
 * FileReader.readAsDataURL and hand the base64 string straight to onChange —
 * so a 2 MB logo became a ~2.7 MB string inside a MySQL TEXT column, and every
 * visitor downloaded all of it on the categories request. Same contract as
 * MultiImageUploader now: the value is always a URL.
 */
const ImageUploader = ({ value, onChange, label, language = "ar" }) => {
  const isRtl = language === "ar";
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error(isRtl ? "الملف ده مش صورة" : "That file is not an image");
      return;
    }

    setUploading(true);
    try {
      onChange(await uploadProductImage(file));
      toast.success(isRtl ? "تم رفع الصورة" : "Image uploaded");
    } catch (error) {
      toast.error(error.message || (isRtl ? "فشل رفع الصورة" : "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label || (isRtl ? "الصورة" : "Image")}
      </label>

      {value ? (
        <div className="relative">
          <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={isRtl ? "حذف الصورة" : "Remove image"}
            className="absolute top-2 end-2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 start-2 px-2 py-1 rounded-lg bg-green-500 text-white text-xs flex items-center gap-1">
            <Check className="w-3 h-3" />
            {isRtl ? "تم الرفع" : "Uploaded"}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
            uploading
              ? "border-gray-200 dark:border-slate-700 cursor-wait"
              : isDragging
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
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isRtl ? "اضغط أو اسحب صورة هنا" : "Click or drag an image here"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isRtl
                    ? "الصورة بتتضغط تلقائيًا قبل الرفع"
                    : "Images are compressed automatically before upload"}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;
