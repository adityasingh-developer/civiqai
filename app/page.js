"use client";

import SearchBar from "@/components/SearchBar";
import { SessionContext } from "next-auth/react";

export default function Home() {

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 dark:bg-stone-900 dark:text-stone-200 transition-colors duration-300">
      <section className="h-[65dvh] flex items-center relative flex-col justify-around">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl sm:text-5xl font-bold">Ask CiviqAi to Simplify</h1>
          <p className="text-lg">Paste a policy, upload a document, or drop an image to summarize in
          plain language.</p>
        </div>
      </section>
      <div className="fixed bottom-6 left-1/2 w-full -translate-x-1/2 px-6">
        <SearchBar />
      </div>
    </main>
  );
}
