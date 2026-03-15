"use client";

import Navbar from "@/components/Navbar";
import "@/app/external.module.css";
import SearchBar from "@/components/SearchBar";

export default function Home() {

  return (
    <main className="min-h-screen bg-stone-300 dark:text-stone-200 text-stone-900 dark:bg-stone-900 duration-300">
      <Navbar />
      <section className="h-[65dvh] flex items-center relative flex-col justify-around">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl sm:text-5xl font-bold">Ask CiviqAi to Simplify</h1>
          <p className="text-lg">Paste a policy, upload a document, or drop an image to summarize in
          plain language.</p>
        </div>
        <SearchBar />
      </section>
    </main>
  );
}
