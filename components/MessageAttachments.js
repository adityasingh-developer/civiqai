"use client";

import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { getCachedImageBlob } from "@/lib/browserImageCache";

function ImageAttachmentCard({ image }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const loadImage = async () => {
      const blob = await getCachedImageBlob(image.cacheKey);

      if (!blob || !isMounted) {
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image.cacheKey]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={image.name}
        className="h-18 w-18 rounded-xl object-cover sm:h-22 sm:w-22"
      />
    );
  }

  return (
    <div className="flex min-h-14 min-w-28 items-center gap-2 rounded-xl bg-stone-200/80 px-3 py-2 text-xs text-stone-700 dark:bg-stone-700/70 dark:text-stone-100">
      <ImageIcon className="h-4 w-4 shrink-0" />
      <span className="max-w-36 truncate">{image.name}</span>
    </div>
  );
}

export default function MessageAttachments({ images = [] }) {
  if (!images.length) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {images.map((image) => (
        <ImageAttachmentCard
          key={image.cacheKey || `${image.name}-${image.mimeType}`}
          image={image}
        />
      ))}
    </div>
  );
}
