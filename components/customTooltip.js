export default function CustomTooltip({ content, children, className = "" }) {
  if (!content) {
    return children;
  }

  return (
    <span className={`group relative inline-flex items-center ${className}`}>
      {children}
      <span className="pointer-events-none absolute bottom-1/2 left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-stone-200/70 bg-stone-50 px-2 py-1 text-xs text-stone-700 opacity-0 shadow-lg transition group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 dark:border-stone-700/70 dark:bg-stone-900 dark:text-stone-200">
        {content}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-6 border-transparent border-t-stone-50 dark:border-t-stone-900" />
      </span>
    </span>
  );
}
