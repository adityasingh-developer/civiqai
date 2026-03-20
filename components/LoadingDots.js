"use client";

export default function LoadingDots({ size = "h-2.5 w-2.5", className = "" }) {
  const dotClassName = `inline-block rounded-full bg-white/90 dark:bg-stone-100/90 ${size}`;

  return (
    <span className={`inline-flex items-end gap-1.5 ${className}`}>
      <span className="sr-only">Loading...</span>
      <span className={dotClassName} style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.1s" }} />
      <span className={dotClassName} style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.2s" }} />
      <span className={dotClassName} style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.3s" }} />
    </span>
  );
}
