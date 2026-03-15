import React from "react";

const CustomTooltip = ({ content, children, className = "" }) => {
  if (!content) return <>{children}</>;

  return (
    <span className={`relative inline-flex items-center group ${className}`}>
      {children}
      <span className="pointer-events-none absolute bottom-1/2 left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md border border-stone-200/70 bg-stone-50 px-2 py-1 text-xs text-stone-700 shadow-lg opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 dark:border-stone-700/70 dark:bg-stone-900 dark:text-stone-200 z-50">
        {content}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-6 border-transparent border-t-stone-50 dark:border-t-stone-900" />
      </span>
    </span>
  );
};

export default CustomTooltip;
