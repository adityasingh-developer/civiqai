"use client";

import { FileText, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { getCachedImageBlob } from "@/lib/browserImageCache";

function ImageAttachmentCard({ image }) {
  const isImage = image?.mimeType?.startsWith("image/");
  const [cachedImageUrl, setCachedImageUrl] = useState(null);

  useEffect(() => {
    if (!isImage || image.previewUrl) {
      return undefined;
    }

    let isMounted = true;
    let objectUrl = null;

    const loadImage = async () => {
      const blob = await getCachedImageBlob(image.cacheKey);

      if (!blob || !isMounted) {
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setCachedImageUrl(objectUrl);
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image.cacheKey, image.previewUrl, isImage]);

  const imageUrl = isImage ? image.previewUrl || cachedImageUrl : null;

  if (isImage && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={image.name}
        className="block h-32 w-32 rounded-lg object-cover sm:h-36 sm:w-36"
      />
    );
  }

  return (
    <div className="flex w-fit max-w-[13rem] items-center gap-2 rounded-lg bg-stone-200/80 px-3 py-2 text-xs text-stone-700 dark:bg-stone-700/70 dark:text-stone-100">
      {isImage ? (
        <ImageIcon className="h-4 w-4 shrink-0" />
      ) : (
        <FileText className="h-4 w-4 shrink-0" />
      )}
      <span className="max-w-[10rem] truncate">{image.name}</span>
    </div>
  );
}

export default function MessageAttachments({ images = [] }) {
  if (!images.length) {
    return null;
  }

  return (
    <div className="mb-1.5 inline-flex w-fit max-w-full max-[500px]:justify-end flex-wrap gap-1.5">
      {images.map((image) => (
        <ImageAttachmentCard
          key={image.cacheKey || `${image.name}-${image.mimeType}`}
          image={image}
        />
      ))}
    </div>
  );
}
