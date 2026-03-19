const IMAGE_CACHE_NAME = "civiqai-images";
const PENDING_IMAGES_KEY = "civiqai_pending_images";

function createCacheRequest(cacheKey) {
  return new Request(`/__civiqai_cached_image__/${encodeURIComponent(cacheKey)}`);
}

function createCacheKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, data = ""] = result.split(",");
      resolve(data);
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function openImageCache() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return null;
  }

  return caches.open(IMAGE_CACHE_NAME);
}

export async function cacheImageFile(file, cacheKey = createCacheKey()) {
  const cache = await openImageCache();

  if (!cache) {
    return {
      cacheKey,
      name: file.name,
      mimeType: file.type,
    };
  }

  await cache.put(
    createCacheRequest(cacheKey),
    new Response(file, {
      headers: {
        "Content-Type": file.type,
      },
    })
  );

  return {
    cacheKey,
    name: file.name,
    mimeType: file.type,
  };
}

export async function getCachedImageBlob(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  const cache = await openImageCache();
  if (!cache) {
    return null;
  }

  const response = await cache.match(createCacheRequest(cacheKey));
  if (!response) {
    return null;
  }

  return response.blob();
}

export async function getCachedImageData(cacheKey) {
  const blob = await getCachedImageBlob(cacheKey);
  if (!blob) {
    return null;
  }

  return blobToBase64(blob);
}

export function readPendingImageRefs() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(PENDING_IMAGES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read pending image refs", error);
    return [];
  }
}

export function writePendingImageRefs(images) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(PENDING_IMAGES_KEY, JSON.stringify(images));
  } catch (error) {
    console.error("Failed to write pending image refs", error);
  }
}

export function clearPendingImageRefs() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PENDING_IMAGES_KEY);
}
