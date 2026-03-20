export default function SearchInput({
  prompt,
  inputRef,
  normalizeText,
  insertTextAtCursor,
  onSend,
}) {
  return (
    <div className="relative px-4 sm:px-5">
      {prompt.length === 0 && (
        <span className="pointer-events-none absolute left-4.5 top-4 -translate-y-1/2 text-base text-stone-800 dark:text-stone-400 sm:left-5.25 sm:text-lg">
          Ask CiviqAI....
        </span>
      )}

      <div className="grid">
        <p aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 m-0 min-h-10 max-h-50 w-full select-none overflow-hidden whitespace-pre-wrap break-words p-0 text-base text-transparent sm:text-lg">
          {prompt || ""}
        </p>
        <p ref={inputRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="Ask CiviqAI" className="ask-input col-start-1 row-start-1 m-0 min-h-10 max-h-45 w-full overflow-hidden whitespace-pre-wrap break-words bg-transparent p-0 text-base outline-none hover:overflow-y-auto sm:text-lg" onInput={(event) => normalizeText(event.currentTarget)} 
        onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            insertTextAtCursor(text);
            normalizeText(event.currentTarget);
          }} 
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === "Enter") {
              event.preventDefault();
              void onSend();
            }
          }}
        />
      </div>
    </div>
  );
}
