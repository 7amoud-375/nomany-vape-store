import { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

/**
 * Full-screen image viewer for the product gallery.
 *
 * Rendered through a portal so it is never clipped by a parent's overflow.
 * Every way of moving between images — arrows, keyboard, thumbnails, and a
 * drag/swipe — runs through the same `go()` call, so they all produce the same
 * directional slide rather than the arrows fading while a swipe slides.
 */

/**
 * How far, or how fast, a drag has to be before it counts as a swipe.
 * Velocity is included so a quick flick works without crossing the distance.
 */
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 450;

const slide = {
  enter: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

const ImageLightbox = ({ images = [], index = 0, onClose, onIndexChange, alt = "" }) => {
  const count = images.length;
  const isOpen = index !== null && index >= 0 && count > 0;

  // +1 moves forward, -1 back. Drives which side the incoming image comes from.
  const [direction, setDirection] = useState(1);
  const [failed, setFailed] = useState({});
  const dialogRef = useRef(null);
  const restoreFocusTo = useRef(null);

  const go = useCallback(
    (delta) => {
      if (count < 2) return;
      setDirection(delta > 0 ? 1 : -1);
      // Wrap around so the arrows never dead-end.
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange]
  );

  const jumpTo = useCallback(
    (next) => {
      if (next === index) return;
      setDirection(next > index ? 1 : -1);
      onIndexChange(next);
    },
    [index, onIndexChange]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    // Remember what had focus so it can be given back on close.
    restoreFocusTo.current = document.activeElement;
    dialogRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);

      // Focus trap: the dialog holds a handful of controls, so cycling within
      // it is enough — Tab must not reach the page underneath.
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll("button");
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [isOpen, onClose, go]);

  if (typeof document === "undefined") return null;

  if (!isOpen) return null;

  /*
   * The backdrop renders conditionally rather than through AnimatePresence.
   *
   * With an exit animation, closing raced the parent re-render and the node was
   * left behind at opacity 0 — invisible, but still `fixed inset-0` with
   * pointer-events auto, so it swallowed every click on the page afterwards.
   * The inner AnimatePresence stays: it is keyed by index and drives the slide
   * between images, which is a different lifecycle entirely.
   */
  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm outline-none
                 motion-safe:animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Product image"}
    >
          {/* Close sits top-right in both directions on purpose — it is where
              people reach for it regardless of text direction. */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full
                       bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {count > 1 && (
            <span
              className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1
                         text-sm tabular-nums text-white backdrop-blur-sm"
              dir="ltr"
              aria-live="polite"
            >
              {index + 1} / {count}
            </span>
          )}

          {count > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Previous image"
                className="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full
                           bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Next image"
                className="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full
                           bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* The stage is a fixed, overflow-hidden box so the outgoing image
              slides out of frame instead of widening the page. */}
          <div
            className="relative flex h-[78vh] w-[92vw] items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={index}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: "spring", stiffness: 300, damping: 32 }, opacity: { duration: 0.18 } }}
                drag={count > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(event, info) => {
                  const { offset, velocity } = info;
                  if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) go(1);
                  else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) go(-1);
                }}
                className="absolute flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
              >
                {failed[index] ? (
                  // A dead URL should read as a missing image, not a broken
                  // icon on a black field with no explanation.
                  <div className="flex flex-col items-center gap-3 text-white/70">
                    <ImageOff className="h-10 w-10" />
                    <p className="text-sm">This image could not be loaded</p>
                  </div>
                ) : (
                  <img
                    src={images[index]}
                    alt={alt}
                    onError={() => setFailed((prev) => ({ ...prev, [index]: true }))}
                    className="max-h-full max-w-full select-none rounded-lg object-contain"
                    draggable={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {count > 1 && (
            <div
              className="absolute bottom-4 left-1/2 z-20 flex max-w-[92vw] -translate-x-1/2 gap-2 overflow-x-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  onClick={() => jumpTo(i)}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
        </div>
      )}
    </div>,
    document.body
  );
};

export default ImageLightbox;
