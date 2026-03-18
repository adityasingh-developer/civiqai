"use client";

import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
      <section className="relative flex h-[65dvh] flex-col items-center justify-around">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold sm:text-5xl">
            Ask CiviqAi to Simplify
          </h1>
          <p className="text-lg">
            Paste a policy, upload a document, or drop an image to summarize in
            plain language.
          </p>
        </div>
      </section>

      <div className="fixed bottom-6 left-1/2 w-full -translate-x-1/2 px-6">
        <SearchBar />
      </div>
    </main>
  );
}
