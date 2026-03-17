"use client";

const LoadingDots = ({ size = "h-2.5 w-2.5", className = "" }) => {
  return (
    <span className={`inline-flex items-end gap-1.5 ${className}`}>
      <span className="sr-only">Loading...</span>
      <span
        className={`inline-block rounded-full bg-white/90 dark:bg-stone-100/90 ${size}`}
        style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.1s" }}
      />
      <span
        className={`inline-block rounded-full bg-white/90 dark:bg-stone-100/90 ${size}`}
        style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.2s" }}
      />
      <span
        className={`inline-block rounded-full bg-white/90 dark:bg-stone-100/90 ${size}`}
        style={{ animation: "loadingBounce 0.9s ease-in-out infinite", animationDelay: "0.3s" }}
      />
    </span>
  );
};

export default LoadingDots;
