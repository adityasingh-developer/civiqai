"use client";

import { isValidElement } from "react"
import { Streamdown } from "streamdown"

export default function MarkdownMessage({ text }) {
  const renderParagraph = (props) => {
    const children = props.children;
    const items = Array.isArray(children) ? children : [children];

    if (
      items.length === 1 &&
      isValidElement(items[0]) &&
      items[0].type === "strong"
    ) {
      return (
        <h2 className="mb-2 border-b border-stone-300 pb-2 text-xl font-semibold tracking-tight text-stone-900 dark:border-stone-600 dark:text-stone-50">
          {items[0]}
        </h2>
      );
    }

    return <p {...props} className="my-1.5 text-md" />;
  };

  return (
    <div className="max-w-none text-md leading-relaxed text-stone-800 dark:text-stone-100">
      <Streamdown
        className="max-w-none text-md leading-relaxed text-stone-800 dark:text-stone-100"
        components={{
          h1: (props) => (
            <h1 {...props} className="mb-2 border-b border-stone-300 pb-2 text-2xl font-semibold tracking-tight text-stone-900 dark:border-stone-600 dark:text-stone-50" />
          ),
          h2: (props) => (
            <h2 {...props} className="mb-2 border-b border-stone-300 pb-2 text-xl font-semibold tracking-tight text-stone-900 dark:border-stone-600 dark:text-stone-50" />
          ),
          h3: (props) => (
            <h3 {...props} className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50" />
          ),
          p: renderParagraph,
          ul: (props) => (
            <ul {...props} className="my-2 list-disc space-y-1 pl-5 text-md" />
          ),
          ol: (props) => (
            <ol {...props} className="my-2 list-decimal space-y-1 pl-5 text-md" />
          ),
          li: (props) => <li {...props} className="text-md" />,
          strong: (props) => (
            <strong {...props} className="font-semibold text-stone-900 dark:text-stone-50" />
          ),
          em: (props) => (
            <em {...props} className="italic text-stone-700 dark:text-stone-200" />
          ),
          code: (props) => (
            <code {...props} className="rounded bg-stone-200/70 px-1 py-0.5 font-mono text-[13px] text-stone-900 dark:bg-stone-700/60 dark:text-stone-100" />
          ),
          blockquote: (props) => (
            <blockquote {...props} className="my-2 border-l-2 border-stone-300 pl-3 text-md text-stone-700 dark:border-stone-600 dark:text-stone-200" />
          ),
        }}
      >
        {text}
      </Streamdown>
    </div>
  );
}
