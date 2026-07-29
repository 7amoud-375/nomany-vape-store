import { useState, useRef } from "react";
import { Upload, ImageIcon, X, Check } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const ImageUploader = ({ value, onChange, label, language = "ar" }) => {
  const [preview, setPreview] = useState(value || "");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      alert(language === "ar" ? "الصورة كبيرة جداً. الحد الأقصى 2 ميجا" : "Image too large. Max 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearImage = () => {
    setPreview("");
    onChange("");
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label || (language === "ar" ? "الصورة" : "Image")}
      </label>

      {preview ? (
        <div className="relative">
          <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-green-500 text-white text-xs flex items-center gap-1">
            <Check className="w-3 h-3" />
            {language === "ar" ? "تم الرفع" : "Uploaded"}
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-full h-48 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 dark:border-slate-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "ar" ? "اضغط أو اسحب صورة هنا" : "Click or drag image here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {language === "ar" ? "PNG, JPG, WEBP - حتى 2 ميجا" : "PNG, JPG, WEBP - up to 2MB"}
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        className="hidden"
      />

      {/* URL Input as fallback */}
      {!preview && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{language === "ar" ? "أو رابط:" : "Or URL:"}</span>
          <input
            type="text"
            value={value && value.startsWith("http") ? value : ""}
            onChange={(e) => {
              setPreview(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="https://..."
            className="input-field flex-1 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;