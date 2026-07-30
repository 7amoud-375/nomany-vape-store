import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Full-screen image viewer for the product gallery.
 *
 * Rendered through a portal so it is never clipped by a parent's overflow, and
 * driveable entirely from the keyboard: arrows move, Escape closes.
 */
const ImageLightbox = ({ images = [], index = 0, onClose, onIndexChange, alt = "" }) => {
  const count = images.length;
  const isOpen = index !== null && index >= 0 && count > 0;

  const go = useCallback(
    (delta) => {
      if (count === 0) return;
      // Wrap around so the arrows never dead-end.
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, go]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          {/* Close sits top-right in both directions on purpose — it is where
              people reach for it regardless of text direction. */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20
                       text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </button>

          {count > 1 && (
            <span className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full
                             bg-white/10 text-white text-sm backdrop-blur-sm" dir="ltr">
              {index + 1} / {count}
            </span>
          )}

          {count > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Previous image"
                className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20
                           text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Next image"
                className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20
                           text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          <motion.img
            key={index}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={images[index]}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg select-none"
            draggable={false}
          />

          {count > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[92vw] overflow-x-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  onClick={() => onIndexChange(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ImageLightbox;
