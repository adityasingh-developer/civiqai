"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";

import Send from "@/assets/send.svg";
import CustomTooltip from "@/components/customTooltip";
import {
  cacheImageFile,
  clearPendingImageRefs,
  getCachedImageBlob,
  getCachedImageData,
  readPendingImageRefs,
  writePendingImageRefs,
} from "@/lib/browserImageCache";

const PROMPT_SESSION_KEY = "civiqai_prompt";
const IMAGE_TYPES = ["image/png", "image/jpeg"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_TOTAL_UPLOAD_BYTES = 8 * 1024 * 1024;

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

  const images = await Promise.all(
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

  return images;
}

export default function SearchBar({ onSend, isSending = false }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem(PROMPT_SESSION_KEY) || ""
      : ""
  );
  const [images, setImages] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const inputRef = useRef(null);

  const fileKey = (file) =>
    `${file.name}__${file.type}__${file.size}__${file.lastModified}`;

  const imageKey = (image, index) =>
    image.file ? fileKey(image.file) : image.cacheKey || image.id || `${image.name}-${index}`;

  const getImageSize = (image) => image.file?.size || image.size || 0;

  const getTotalUploadBytes = (items) =>
    items.reduce((total, item) => total + getImageSize(item), 0);

  const normalizeText = (element) => {
    const raw = element.textContent ?? "";
    const normalized = raw.replace(/\u00a0/g, " ");

    if (normalized !== raw) {
      element.textContent = normalized;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    setPrompt(normalized);
  };

  const insertTextAtCursor = (text) => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const appendFilesWithinLimit = (files) => {
    const existing = new Set(
      images.map((image, index) => imageKey(image, index))
    );
    const nextImages = [];
    let totalBytes = getTotalUploadBytes(images);
    let rejectedCount = 0;

    files.forEach((file) => {
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

    setUploadError(
      rejectedCount > 0
        ? `Total upload limit is 8 MB per message. ${rejectedCount} file${rejectedCount === 1 ? "" : "s"} not added.`
        : ""
    );

    if (nextImages.length > 0) {
      setImages((prev) => [...prev, ...nextImages]);
    }
  };

  const onPickImages = (event) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter((file) => IMAGE_TYPES.includes(file.type));
    appendFilesWithinLimit(validImages);
    event.target.value = "";
  };

  const onPickDocuments = (event) => {
    const files = Array.from(event.target.files || []);
    const validDocuments = files.filter((file) =>
      DOCUMENT_TYPES.includes(file.type)
    );
    appendFilesWithinLimit(validDocuments);
    event.target.value = "";
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

  const clearPrompt = () => {
    setPrompt("");

    if (inputRef.current) {
      inputRef.current.textContent = "";
    }
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

  const sendToAi = async () => {
    const text = prompt.trim();
    const imagePayload = await buildImagePayload();

    if ((!text && imagePayload.length === 0) || isSending) {
      return;
    }

    if (onSend) {
      await onSend({ text, images: imagePayload });
      clearPrompt();
      clearAttachments();
      return;
    }

    sessionStorage.setItem(PROMPT_SESSION_KEY, text);
    writePendingImageRefs(
      imagePayload.map((image) => ({
        cacheKey: image.cacheKey,
        name: image.name,
        mimeType: image.mimeType,
        size: image.size || 0,
      }))
    );
    router.push("/chat");
  };

  useEffect(() => {
    if (prompt && inputRef.current && inputRef.current.textContent !== prompt) {
      inputRef.current.textContent = prompt;
    }
  }, [prompt]);

  useEffect(() => {
    let isMounted = true;

    const loadPendingImages = async () => {
      const pendingImages = await buildPendingImages();
      sessionStorage.removeItem(PROMPT_SESSION_KEY);
      clearPendingImageRefs();

      if (isMounted && pendingImages.length) {
        setImages((currentImages) => {
          revokeImageUrls(currentImages);
          return pendingImages;
        });
      }
    };

    loadPendingImages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeImageUrls(images);
    };
  }, [images]);

  const canSend = prompt.trim().length > 0 || images.length > 0;

  return (
    <div className="relative flex w-full flex-col gap-3">
      {images.length > 0 && (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-1.5 px-1 sm:gap-2 sm:px-0">
          {images.map((image, index) => (
            <span
              key={`img-${imageKey(image, index)}`}
              className="group relative flex h-16.5 w-16.5 items-center justify-center rounded-2xl bg-[#ccc8c5] text-xs text-stone-700 dark:bg-[#35302c] dark:text-stone-200 sm:h-20.5 sm:w-20.5"
            >
              {image.type?.startsWith("image/") && image.url ? (
                <img src={image.url} alt={image.name} className="h-14 w-14 rounded-xl object-cover sm:h-18 sm:w-18"
                />
              ) : (
                <span className="flex max-w-16 flex-col items-center gap-1 text-center">
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="w-full truncate">{image.name}</span>
                </span>
              )}
              <button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 cursor-pointer rounded-full bg-stone-900 p-px opacity-0 duration-200 group-hover:opacity-100"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="w-full bg-stone-300 px-3 pb-1 pt-0.5 dark:bg-stone-900">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="flex h-auto min-h-28 max-h-70 w-full flex-col gap-2 overflow-visible rounded-4xl bg-[#bdb9b7] pb-2 pt-3.5 dark:bg-[#272320] sm:min-h-30">
          <div className="relative px-4 sm:px-5">
            {prompt.length === 0 && (
              <span className="pointer-events-none absolute left-4.5 top-4 -translate-y-1/2 text-base text-stone-800 dark:text-stone-400 sm:left-5.25 sm:text-lg">
                Ask CiviqAI....
              </span>
            )}

            <div className="grid">
              <p
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 m-0 min-h-10 max-h-50 w-full select-none overflow-hidden whitespace-pre-wrap break-words p-0 text-base text-transparent sm:text-lg"
              >
                {prompt || ""}
              </p>
              <p
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Ask CiviqAI"
                className="ask-input col-start-1 row-start-1 m-0 min-h-10 max-h-45 w-full overflow-hidden whitespace-pre-wrap break-words bg-transparent p-0 text-base outline-none hover:overflow-y-auto sm:text-lg"
                onInput={(event) => normalizeText(event.currentTarget)}
                onPaste={(event) => {
                  event.preventDefault();
                  const text = event.clipboardData.getData("text/plain");
                  insertTextAtCursor(text);
                  normalizeText(event.currentTarget);
                }}
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 px-4 sm:h-10 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md"
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md"
              >
                Document
              </button>
            </div>

            <div className="shrink-0">
              <CustomTooltip content={!canSend ? "Add text or an image first" : "Ask"}>
                <span className="inline-flex">
                  <button
                    type="button"
                    disabled={!canSend || isSending}
                    onClick={sendToAi}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-stone-900 duration-250 hover:-rotate-27 hover:text-stone-700 dark:text-stone-100 dark:hover:text-stone-400 disabled:pointer-events-none disabled:cursor-default disabled:opacity-60 disabled:hover:rotate-0 disabled:hover:text-stone-900 dark:disabled:hover:text-stone-100"
                  >
                    <Send className="h-6.5 w-6.5" />
                  </button>
                </span>
              </CustomTooltip>
            </div>
          </div>
          {uploadError ? (
            <div className="px-4 sm:px-5">
              <p className="text-xs text-red-700 dark:text-red-400">
                {uploadError}
              </p>
            </div>
          ) : null}
          </div>

          <p className="mt-1 text-center text-sm text-stone-600 dark:text-stone-400">
            All rights reserved | Made by{" "}
            <a
              href="https://itsaditya.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-stone-800 underline underline-offset-4 transition hover:text-stone-600 dark:text-stone-200 dark:hover:text-stone-300"
            >
              Aditya Singh
            </a>
          </p>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={onPickImages}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept="application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.txt,.doc,.docx,.xls,.xlsx"
        multiple
        className="hidden"
        onChange={onPickDocuments}
      />
    </div>
  );
}
