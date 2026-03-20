import { FileText, X } from "lucide-react";

export default function AttachmentPreviewList({ images, onRemove, imageKey }) {
  if (!images.length) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-1.5 px-1 sm:gap-2 sm:px-0">
      {images.map((image, index) => (
        <span
          key={`img-${imageKey(image, index)}`}
          className="group relative flex h-16.5 w-16.5 items-center justify-center rounded-2xl bg-[#ccc8c5] text-xs text-stone-700 dark:bg-[#35302c] dark:text-stone-200 sm:h-20.5 sm:w-20.5"
        >
          {image.type?.startsWith("image/") && image.url ? (
            <img
              src={image.url}
              alt={image.name}
              className="h-14 w-14 rounded-xl object-cover sm:h-18 sm:w-18"
            />
          ) : (
            <span className="flex max-w-16 flex-col items-center gap-1 text-center">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="w-full truncate">{image.name}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute right-1 top-1 cursor-pointer rounded-full bg-stone-900 p-px opacity-0 duration-200 group-hover:opacity-100"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </span>
      ))}
    </div>
  );
}
