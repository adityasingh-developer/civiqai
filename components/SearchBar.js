"use client";

import Send from "@/assets/send.svg";
import { useEffect, useRef, useState } from "react";
import CustomTooltip from "@/components/customTooltip";

const SearchBar = () => {
    const [prompt, setPrompt] = useState("");
    const [docs, setDocs] = useState([]);
    const [images, setImages] = useState([]);
    const docInputRef = useRef(null);
    const imageInputRef = useRef(null);

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
        if (!selection || selection.rangeCount === 0) return;
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
        const next = [...docs, ...pdfs].slice(0, 2);
        setDocs(next);
        event.target.value = "";
    };

    const onPickImages = (event) => {
        const files = Array.from(event.target.files || []);
        const imgs = files.filter((file) =>
            ["image/png", "image/jpeg"].includes(file.type),
        );
        const withUrls = imgs.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));
        setImages((prev) => [...prev, ...withUrls]);
        event.target.value = "";
    };

    useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.url));
        };
    }, [images]);

    return (
        <div className="absolute -bottom-75 flex flex-col gap-3 w-[40%]">
            {(docs.length > 0 || images.length > 0) && (
                <div className="left-2 flex flex-wrap gap-3">
                    {docs.map((file) => (
                        <CustomTooltip content={file.name} key={`doc-${file.name}`}>
                            <span className=" bg-[#ccc8c5] w-22 h-22 rounded-2xl text-sm overflow-hidden p-1 flex flex-col justify-between text-stone-700 dark:bg-[#272320] dark:text-stone-200">

                            </span>
                        </CustomTooltip>
                    ))}
                    {images.map((img) => (
                        <CustomTooltip content={img.file.name} key={`img-${img.file.name}`}>
                            <span  className="flex items-center h-22 w-22 gap-2 rounded-2xl bg-[#ccc8c5] justify-center text-xs text-stone-700 dark:bg-[#272320] dark:text-stone-200">
                                <img
                                    src={img.url}
                                    alt={img.file.name}
                                    className="h-15 w-15"
                                />
                            </span>
                        </CustomTooltip>
                    ))}
                </div>
            )}
            <div className="min-h-30 max-h-60 h-auto overflow-visible dark:bg-[#272320] bg-[#ccc8c5] rounded-4xl w-full pb-2 pt-3.5 flex flex-col">
                <div className="relative px-5">
                    {prompt.length === 0 && (
                        <span className="pointer-events-none absolute left-5.25 top-4 -translate-y-1/2 text-lg text-stone-800 dark:text-stone-400">
                            Ask CiviqAI....
                        </span>
                    )}
                    <div className="grid">
                        <p aria-hidden="true" className="col-start-1 row-start-1 min-h-10 max-h-40 w-full overflow-hidden whitespace-pre-wrap break-words text-transparent pointer-events-none select-none m-0 p-0">
                            {prompt || ""}
                        </p>
                        <p contentEditable suppressContentEditableWarning role="textbox" aria-label="Ask CiviqAI" className="ask-input col-start-1 row-start-1 min-h-10 max-h-35 w-full overflow-hidden bg-transparent text-lg outline-none hover:overflow-y-auto whitespace-pre-wrap break-words m-0 p-0" onInput={(event) => normalizeText(event.currentTarget)}
                            onPaste={(event) => {
                                event.preventDefault();
                                const text = event.clipboardData.getData("text/plain");
                                insertTextAtCursor(text);
                                normalizeText(event.currentTarget);
                            }} />
                    </div>
                </div>
                <div className="mt-auto h-10 px-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => docInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border-transparent cursor-pointer border bg-white/60 px-5 py-1.25 text-md font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200">
                            Document
                        </button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border-transparent cursor-pointer border bg-white/60 px-5 py-1.25 text-md font-medium text-stone-700 shadow-sm transition hover:border-stone-400/80 dark:bg-stone-950/40 dark:text-stone-200">
                            Image
                        </button>
                    </div>
                    <div>
                        <CustomTooltip content={prompt.trim().length === 0 ? "Give the scheme or document, first" : "Ask"}>
                            <span className="inline-flex">
                                <button
                                    disabled={prompt.trim().length === 0}
                                    className="inline-flex h-8 w-8 items-center justify-center dark:hover:text-stone-400 hover:-rotate-27 hover:text-stone-700 duration-250 cursor-pointer text-stone-900 dark:text-stone-100 disabled:cursor-default disabled:opacity-60 disabled:hover:rotate-0 dark:disabled:hover:text-stone-100 disabled:hover:text-stone-900 disabled:pointer-events-none"
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
    )
}

export default SearchBar
