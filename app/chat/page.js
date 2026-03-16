"use client";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { signIn, useSession } from "next-auth/react";

const dummyMessages = [
  {
    id: 1,
    role: "user",
    text: "Summarize this policy in plain language and highlight the main deadline.",
    time: "2:11 PM",
  }
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 dark:bg-stone-900 dark:text-stone-200 transition-colors duration-300">
      <Navbar />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-44 pt-28">

        <div className="flex flex-col gap-4">
          {isSignedIn ? (
            dummyMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
                    msg.role === "user"
                      ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                      : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className="mt-2 text-[11px] opacity-70">{msg.time}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
              <div className="font-semibold text-2xl">Sign in required</div>
              <p className="mt-1 text-lg">Please sign in to start chatting.</p>
              <button
                type="button"
                onClick={() => signIn()}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-1.5 text-lg font-medium text-stone-50 shadow-sm duration-200 hover:bg-stone-800 dark:hover:bg-stone-700 hover:dark:text-white dark:bg-stone-100 dark:text-stone-900 cursor-pointer"
              >
                {status === "loading" ? "Loading..." : "Sign in"}
              </button>
            </div>
          )}
        </div>
      </section>

      {isSignedIn && (
        <div className="fixed bottom-6 left-1/2 w-full -translate-x-1/2 px-6">
          <SearchBar />
        </div>
      )}
    </main>
  );
}
