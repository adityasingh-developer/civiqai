"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Send from "@/assets/send.svg";
import CustomTooltip from "@/components/customTooltip";
import { clearPendingImageRefs } from "@/lib/browserImageCache";

import AttachmentPreviewList from "./AttachmentPreviewList";
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, PROMPT_SESSION_KEY } from "./constants";
import SearchInput from "./SearchInput";
import { useSearchBarAttachments } from "./useSearchBarAttachments";
import { useSearchBarInput } from "./useSearchBarInput";

function hasDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

export default function SearchBar({ onSend, isSending = false }) {
  const router = useRouter();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const initialPrompt =
    typeof window !== "undefined"
      ? sessionStorage.getItem(PROMPT_SESSION_KEY) || ""
      : "";
  const { prompt, inputRef, normalizeText, insertTextAtCursor, clearPrompt } = useSearchBarInput(initialPrompt);
  const { images, uploadError, onPickImages, onPickDocuments, onDropFiles, removeImage, clearAttachments, buildImagePayload, persistPendingImages, imageKey } = useSearchBarAttachments();
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const dragResetRef = useRef(null);

  useEffect(() => {
    if (onSend) {
      sessionStorage.removeItem(PROMPT_SESSION_KEY);
      clearPendingImageRefs();
    }
  }, [onSend]);

  useEffect(() => {
    const clearDragState = () => {
      window.clearTimeout(dragResetRef.current);
      setIsDragActive(false);
      setIsOverDropZone(false);
    };

    const handleWindowDragOver = (event) => {
      if (!hasDraggedFiles(event)) {
        return;
      }

      event.preventDefault();
      const rect = dropZoneRef.current?.getBoundingClientRect();
      const isInsideDropZone =
        rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      setIsDragActive(true);
      window.clearTimeout(dragResetRef.current);
      setIsOverDropZone(Boolean(isInsideDropZone));
      dragResetRef.current = window.setTimeout(clearDragState, 120);
    };

    const handleWindowDrop = (event) => {
      if (hasDraggedFiles(event)) {
        event.preventDefault();
      }

      clearDragState();
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("blur", clearDragState);

    return () => {
      window.clearTimeout(dragResetRef.current);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("blur", clearDragState);
    };
  }, []);

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
    persistPendingImages(imagePayload);
    router.push("/chat");
  };

  const handleDrop = (event) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    window.clearTimeout(dragResetRef.current);
    setIsDragActive(false);
    setIsOverDropZone(false);

    const files = Array.from(event.dataTransfer.files || []);

    if (files.length > 0) {
      onDropFiles(files);
    }
  };

  const canSend = prompt.trim().length > 0 || images.length > 0;

  return (
    <div className="relative flex w-full flex-col gap-3">
      <AttachmentPreviewList images={images} onRemove={removeImage} imageKey={imageKey}/>

      <div className="w-full bg-stone-300 px-3 pb-1 pt-0.5 dark:bg-stone-900">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div ref={dropZoneRef} className={`relative flex h-auto min-h-28 max-h-70 w-full flex-col gap-2 overflow-visible rounded-4xl bg-[#bdb9b7] pb-2 pt-3.5 transition dark:bg-[#272320] sm:min-h-30 ${
              isDragActive
                ? "ring-2 ring-stone-800/40 dark:ring-stone-100/40"
                : ""
            }`} onDragOver={(event) => hasDraggedFiles(event) && event.preventDefault()} onDrop={handleDrop} >
            {isDragActive ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-4xl border-2 border-dashed border-stone-800/45 bg-stone-100/70 text-center text-sm font-medium text-stone-800 backdrop-blur-[1px] dark:border-stone-100/45 dark:bg-stone-900/70 dark:text-stone-100">
                <div className="px-6">
                  <p>Drop attachment here</p>
                  {isOverDropZone ? (
                    <p className="mt-1 text-xs font-normal opacity-80">
                      8 MB total limit. PNG, JPG, PDF, TXT, Word, and Excel files only
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <SearchInput prompt={prompt} inputRef={inputRef} normalizeText={normalizeText} insertTextAtCursor={insertTextAtCursor} onSend={sendToAi} />

            <div className="mt-auto flex items-center justify-between gap-3 px-4 sm:h-10 sm:px-5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md" >
                  Image
                </button>
                <button type="button" onClick={() => documentInputRef.current?.click()} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent bg-white/60 px-4 py-1 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200 sm:px-5 sm:py-1.25 sm:text-md" >
                  Document
                </button>
              </div>

              <div className="shrink-0">
                <CustomTooltip content={!canSend ? "Add text or an image first" : "Ctrl + Enter"}>
                  <span className="inline-flex">
                    <button type="button" disabled={!canSend || isSending} onClick={sendToAi} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-stone-900 duration-250 hover:-rotate-27 hover:text-stone-700 dark:text-stone-100 dark:hover:text-stone-400 disabled:pointer-events-none disabled:cursor-default disabled:opacity-60 disabled:hover:rotate-0 disabled:hover:text-stone-900 dark:disabled:hover:text-stone-100" >
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
            <a href="https://itsaditya.vercel.app" target="_blank" rel="noreferrer" className="font-medium text-stone-800 underline underline-offset-4 transition hover:text-stone-600 dark:text-stone-200 dark:hover:text-stone-300">
              Aditya Singh
            </a>
          </p>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple className="hidden" onChange={onPickImages} />
      <input ref={documentInputRef} type="file" accept={DOCUMENT_ACCEPT} multiple className="hidden" onChange={onPickDocuments} />
    </div>
  );
}
