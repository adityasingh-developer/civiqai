import { useEffect, useRef, useState } from "react";

export function useSearchBarInput(initialPrompt = "") {
  const [prompt, setPrompt] = useState(initialPrompt);
  const inputRef = useRef(null);

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

  const clearPrompt = () => {
    setPrompt("");

    if (inputRef.current) {
      inputRef.current.textContent = "";
    }
  };

  useEffect(() => {
    if (prompt && inputRef.current && inputRef.current.textContent !== prompt) {
      inputRef.current.textContent = prompt;
    }
  }, [prompt]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const focusInput = () => {
      input.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    const timeout = window.setTimeout(focusInput, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return {
    prompt,
    inputRef,
    normalizeText,
    insertTextAtCursor,
    clearPrompt,
  };
}
