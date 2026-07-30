import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "../firebase";

/**
 * Product images live in Firebase Storage; the catalogue stores only their URLs.
 *
 * The previous uploader base64-encoded each file straight into the product
 * object, which all lands in the single `store/products` document. That
 * document is capped at 1 MiB by Firestore and is already ~230 KB of text, so
 * one 2 MB photo (≈2.7 MB once base64-encoded) would push the whole catalogue
 * over the limit and every subsequent save would fail. A download URL is ~100
 * bytes.
 */

const storage = getStorage(app);

/** Hard ceiling on what we accept before compression. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.82;

/**
 * Downscale and re-encode in the browser so a 6 MB phone photo becomes a
 * ~150 KB upload. Keeps PNGs with transparency as PNG.
 */
const compress = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      const keepAlpha = file.type === "image/png" || file.type === "image/webp";

      if (!keepAlpha) {
        // JPEG has no alpha; without this, transparent areas render black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image"))),
        keepAlpha ? "image/webp" : "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a readable image"));
    };

    img.src = url;
  });

/** Upload one image and return its public URL. */
export const uploadProductImage = async (file) => {
  if (!file) throw new Error("No file given");
  if (!file.type?.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is larger than 10 MB");

  const blob = await compress(file);
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const fileRef = ref(storage, `products/${name}`);
  await uploadBytes(fileRef, blob, { contentType: blob.type, cacheControl: "public,max-age=31536000" });

  return getDownloadURL(fileRef);
};

/**
 * Best-effort removal of an image we uploaded. Failing to delete is not worth
 * blocking the admin over — an orphaned file costs a fraction of a cent.
 */
export const deleteProductImage = async (url) => {
  if (!url || !url.includes("firebasestorage")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn("Could not delete the stored image:", error.message);
  }
};
