import { getToken } from "./apiClient";

/**
 * Product image uploads to our own server.
 *
 * Images are downscaled and re-encoded in the browser first, so a 6 MB phone
 * photo uploads as roughly 150 KB.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION = 1400;
const QUALITY = 0.82;
const UPLOAD_TIMEOUT_MS = 45_000;

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
        // JPEG has no alpha channel; without this, transparency renders black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image"))),
        keepAlpha ? "image/webp" : "image/jpeg",
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a readable image"));
    };

    img.src = url;
  });

export const uploadProductImage = async (file) => {
  if (!file) throw new Error("No file given");
  if (!file.type?.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is larger than 12 MB");

  const token = getToken();
  if (!token) throw new Error("Your session expired — sign in again");

  const blob = await compress(file);
  const extension = blob.type === "image/webp" ? ".webp" : ".jpg";

  const form = new FormData();
  form.append("image", blob, file.name.replace(/\.[^.]+$/, "") + extension);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/upload.php`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      throw new Error(data.error || `Upload failed (${response.status})`);
    }
    return data.url;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Upload timed out — check your connection and try again");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

/** Files are kept on disk when removed from a product — another record may use the same URL. */
export const deleteProductImage = async () => {};
