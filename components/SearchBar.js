"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import Send from "@/assets/send.svg";
import CustomTooltip from "@/components/customTooltip";

const PROMPT_SESSION_KEY = "civiqai_prompt";
const IMAGES_SESSION_KEY = "civiqai_images";

function readStoredImages() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(IMAGES_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((image) => image?.data && image?.mimeType)
      .map((image, index) => ({
        id: image.id || `stored-${index}`,
        file: null,
        name: image.name || `image-${index + 1}`,
        type: image.mimeType,
        data: image.data,
        url: `data:${image.mimeType};base64,${image.data}`,
        isObjectUrl: false,
      }));
  } catch (error) {
    console.error("Failed to read stored images", error);
    return [];
  }
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

export default function SearchBar({ onSend, isSending = false }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem(PROMPT_SESSION_KEY) || ""
      : ""
  );
  const [docs, setDocs] = useState([]);
  const [images, setImages] = useState(() => readStoredImages());
  const docInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const inputRef = useRef(null);

  const fileKey = (file) =>
    `${file.name}__${file.type}__${file.size}__${file.lastModified}`;

  const imageKey = (image, index) =>
    image.file ? fileKey(image.file) : image.id || `${image.name}-${index}`;

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

  const onPickDocs = (event) => {
    const files = Array.from(event.target.files || []);
    const pdfs = files.filter((file) => file.type === "application/pdf");
    const existing = new Set(docs.map(fileKey));
    const unique = pdfs.filter((file) => !existing.has(fileKey(file)));

    setDocs((prev) => [...prev, ...unique]);
    event.target.value = "";
  };

  const onPickImages = (event) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter((file) =>
      ["image/png", "image/jpeg"].includes(file.type)
    );
    const existing = new Set(
      images.map((image, index) => imageKey(image, index))
    );
    const nextImages = validImages
      .filter((file) => !existing.has(fileKey(file)))
      .map((file) => ({
        id: fileKey(file),
        file,
        name: file.name,
        type: file.type,
        data: null,
        url: URL.createObjectURL(file),
        isObjectUrl: true,
      }));

    setImages((prev) => [...prev, ...nextImages]);
    event.target.value = "";
  };

  const removeDoc = (index) => {
    setDocs((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const image = prev[index];

      if (image?.isObjectUrl) {
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
    images.forEach((image) => {
      if (image.isObjectUrl) {
        URL.revokeObjectURL(image.url);
      }
    });

    setDocs([]);
    setImages([]);
  };

  const buildImagePayload = async () => {
    const payload = await Promise.all(
      images.map(async (image, index) => {
        if (image.data) {
          return {
            id: image.id || `stored-${index}`,
            name: image.name || `image-${index + 1}`,
            mimeType: image.type,
            data: image.data,
          };
        }

        if (!image.file) {
          return null;
        }

        return {
          id: image.id || fileKey(image.file),
          name: image.file.name,
          mimeType: image.file.type,
          data: await fileToBase64(image.file),
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
    sessionStorage.setItem(IMAGES_SESSION_KEY, JSON.stringify(imagePayload));
    router.push("/chat");
  };

  useEffect(() => {
    if (prompt && inputRef.current && inputRef.current.textContent !== prompt) {
      inputRef.current.textContent = prompt;
    }

    sessionStorage.removeItem(PROMPT_SESSION_KEY);
    sessionStorage.removeItem(IMAGES_SESSION_KEY);
  }, [prompt]);

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.isObjectUrl) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, [images]);

  const canSend = prompt.trim().length > 0 || images.length > 0;

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 px-1 sm:px-0">
      {(docs.length > 0 || images.length > 0) && (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {docs.map((file, index) => (
            <span
              key={`doc-${fileKey(file)}`}
              className="group relative flex h-18 w-18 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#ccc8c5] p-2 text-stone-700 dark:bg-[#272320] dark:text-stone-200 sm:h-22 sm:w-22"
            >
              <span className="h-1 w-[95%] animate-pulse rounded-xs bg-stone-600 [animation-duration:1s]" />
              <span className="h-1 w-[95%] animate-pulse rounded-xs bg-stone-600 [animation-duration:1s]" />
              <span className="h-1 w-[95%] animate-pulse rounded-xs bg-stone-600 [animation-duration:1s]" />
              <span className="h-1 w-[95%] animate-pulse rounded-xs bg-stone-600 [animation-duration:1s]" />
              <span className="h-1 w-[95%] animate-pulse rounded-xs bg-stone-600 [animation-duration:1s]" />
              <button
                type="button"
                onClick={() => removeDoc(index)}
                className="absolute right-1 top-1 cursor-pointer rounded-full bg-stone-900 p-px opacity-0 duration-200 group-hover:opacity-100"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </span>
          ))}

          {images.map((image, index) => (
            <span
              key={`img-${imageKey(image, index)}`}
              className="group relative flex h-18 w-18 items-center justify-center gap-2 rounded-2xl bg-[#ccc8c5] text-xs text-stone-700 dark:bg-[#272320] dark:text-stone-200 sm:h-22 sm:w-22"
            >
              <img
                src={image.url}
                alt={image.name}
                className="h-12 w-12 rounded-md object-cover sm:h-15 sm:w-15"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 cursor-pointer rounded-full bg-stone-900 p-px opacity-0 duration-200 group-hover:opacity-100"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex h-auto min-h-28 max-h-70 w-full flex-col gap-2 overflow-visible rounded-4xl bg-[#ccc8c5] pb-2 pt-3.5 shadow-[0_0_5px_0.2rem_#D6d3d1] dark:bg-[#272320] dark:shadow-[0_0_5px_0.2rem_#1c1917] sm:min-h-30">
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

        <div className="mt-auto flex flex-col gap-3 px-4 sm:h-10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md"
            >
              Document
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md"
            >
              Image
            </button>
          </div>

          <div className="self-end sm:self-auto">
            <CustomTooltip
              content={
                !canSend ? "Add text or an image first" : "Ask"
              }
            >
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
      </div>

      <input
        ref={docInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={onPickDocs}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={onPickImages}
      />
    </div>
  );
}
