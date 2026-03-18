"use client";

export default function Footer() {
  return (
    <footer className="px-4 pb-4 pt-8 text-center text-sm text-stone-600 dark:text-stone-400">
      <p>
        All rights reserved | Made by{" "}
        <a
          href="https://itsaditya.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-stone-800 underline underline-offset-4 transition hover:text-stone-600 dark:text-stone-200 dark:hover:text-stone-300"
        >
          Aditya Singh
        </a>
      </p>
    </footer>
  );
}
