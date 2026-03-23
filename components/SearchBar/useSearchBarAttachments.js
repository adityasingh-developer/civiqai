import { useEffect, useState } from "react";

import { cacheImageFile, clearPendingImageRefs, getCachedImageBlob, getCachedImageData, readPendingImageRefs, writePendingImageRefs } from "@/lib/browserImageCache";

import { DOCUMENT_TYPES, IMAGE_TYPES, MAX_TOTAL_UPLOAD_BYTES, isAllowedAttachment } from "./constants";

function revokeImageUrls(images) {
  images.forEach((image) => {
    if (image.isObjectUrl && image.url) {
      URL.revokeObjectURL(image.url);
    }
  });
}

async function buildPendingImages() {
  const pendingImages = readPendingImageRefs();

  if (!pendingImages.length) {
    return [];
  }

  return Promise.all(
    pendingImages.map(async (image, index) => {
      const blob = await getCachedImageBlob(image.cacheKey);
      const imageUrl = blob ? URL.createObjectURL(blob) : null;

      return {
        id: image.cacheKey || `pending-${index}`,
        file: null,
        cacheKey: image.cacheKey,
        name: image.name || `image-${index + 1}`,
        type: image.mimeType,
        size: image.size || blob?.size || 0,
        url: imageUrl,
        isObjectUrl: Boolean(imageUrl),
      };
    })
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, data = ""] = result.split(",");

      resolve(data);
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildUploadError(unsupportedCount, rejectedCount) {
  const messages = [];

  if (unsupportedCount > 0) {
    messages.push(
      `${unsupportedCount} unsupported file${
        unsupportedCount === 1 ? "" : "s"
      } ignored.`
    );
  }

  if (rejectedCount > 0) {
    messages.push(
      `Total upload limit is 3 MB per message. ${rejectedCount} file${
        rejectedCount === 1 ? "" : "s"
      } not added.`
    );
  }

  return messages.join(" ");
}

export function useSearchBarAttachments() {
  const [images, setImages] = useState([]);
  const [uploadError, setUploadError] = useState("");

  const fileKey = (file) =>
    `${file.name}__${file.type}__${file.size}__${file.lastModified}`;

  const imageKey = (image, index) =>
    image.file
      ? fileKey(image.file)
      : image.cacheKey || image.id || `${image.name}-${index}`;

  const getImageSize = (image) => image.file?.size || image.size || 0;

  const getTotalUploadBytes = (items) =>
    items.reduce((total, item) => total + getImageSize(item), 0);

  const appendFilesWithinLimit = (files) => {
    const existing = new Set(
      images.map((image, index) => imageKey(image, index))
    );
    const nextImages = [];
    let totalBytes = getTotalUploadBytes(images);
    let rejectedCount = 0;
    let unsupportedCount = 0;

    files.forEach((file) => {
      if (!isAllowedAttachment(file)) {
        unsupportedCount += 1;
        return;
      }

      const nextKey = fileKey(file);

      if (existing.has(nextKey)) {
        return;
      }

      if (totalBytes + file.size > MAX_TOTAL_UPLOAD_BYTES) {
        rejectedCount += 1;
        return;
      }

      existing.add(nextKey);
      totalBytes += file.size;
      nextImages.push({
        id: nextKey,
        file,
        cacheKey: null,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        isObjectUrl: true,
      });
    });

    setUploadError(buildUploadError(unsupportedCount, rejectedCount));

    if (nextImages.length > 0) {
      setImages((prev) => [...prev, ...nextImages]);
    }
  };

  const onPickImages = (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      IMAGE_TYPES.includes(file.type)
    );

    appendFilesWithinLimit(files);
    event.target.value = "";
  };

  const onPickDocuments = (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      DOCUMENT_TYPES.includes(file.type)
    );

    appendFilesWithinLimit(files);
    event.target.value = "";
  };

  const onDropFiles = (files) => {
    appendFilesWithinLimit(files);
  };

  const removeImage = (index) => {
    setUploadError("");
    setImages((prev) => {
      const image = prev[index];

      if (image?.isObjectUrl && image.url) {
        URL.revokeObjectURL(image.url);
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const clearAttachments = () => {
    revokeImageUrls(images);
    clearPendingImageRefs();
    setImages([]);
    setUploadError("");
  };

  const buildImagePayload = async () => {
    const payload = await Promise.all(
      images.map(async (image, index) => {
        if (image.file) {
          const cachedImage = await cacheImageFile(
            image.file,
            image.cacheKey || image.id || fileKey(image.file)
          );

          return {
            cacheKey: cachedImage.cacheKey,
            name: cachedImage.name,
            mimeType: cachedImage.mimeType,
            size: image.file.size,
            data: await fileToBase64(image.file),
            previewUrl: image.url || null,
          };
        }

        if (!image.cacheKey) {
          return null;
        }

        const data = await getCachedImageData(image.cacheKey);

        if (!data) {
          return null;
        }

        return {
          cacheKey: image.cacheKey,
          name: image.name || `image-${index + 1}`,
          mimeType: image.type,
          size: image.size || 0,
          data,
          previewUrl: image.url || null,
        };
      })
    );

    return payload.filter(Boolean);
  };

  const persistPendingImages = (imagePayload) => {
    writePendingImageRefs(
      imagePayload.map((image) => ({
        cacheKey: image.cacheKey,
        name: image.name,
        mimeType: image.mimeType,
        size: image.size || 0,
      }))
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadPendingImages = async () => {
      const pendingImages = await buildPendingImages();

      if (isMounted && pendingImages.length) {
        setImages((currentImages) => {
          revokeImageUrls(currentImages);
          return pendingImages;
        });
      }
    };

    void loadPendingImages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeImageUrls(images);
    };
  }, [images]);

  return { images, uploadError, onPickImages, onPickDocuments, onDropFiles, removeImage, clearAttachments, buildImagePayload, persistPendingImages, imageKey };
}
