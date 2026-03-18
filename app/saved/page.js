"use client";

import Navbar from "@/components/Navbar";
import LoadingDots from "@/components/LoadingDots";
import { readUserCache, writeUserCache } from "@/lib/localCache";
import { signIn, useSession } from "next-auth/react";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

const formatSavedTime = (timestamp) =>
  new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function SavedPage() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user);
  const userEmail = session?.user?.email || "";
  const [savedMessages, setSavedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setSavedMessages([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedSavedMessages = readUserCache("saved-cache", userEmail);

    if (cachedSavedMessages.length) {
      setSavedMessages(cachedSavedMessages);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const loadSavedMessages = async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load saved messages");
        }

        if (!isMounted) return;

        const nextSavedMessages = Array.isArray(data?.savedMessages)
          ? data.savedMessages
          : [];

        nextSavedMessages.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        writeUserCache("saved-cache", userEmail, nextSavedMessages);
        setSavedMessages(nextSavedMessages);
      } catch (error) {
        console.error("Failed to load saved messages", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSavedMessages();

    return () => {
      isMounted = false;
    };
  }, [status, userEmail]);

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
      <Navbar />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-14 pt-24 sm:px-6 sm:pt-28">
        {!isSignedIn ? (
          <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
            <div className="text-2xl font-semibold">Sign in required</div>
            <p className="mt-1 text-lg">Please sign in to view saved messages.</p>
            <button
              type="button"
              onClick={() => signIn()}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-900 px-4 py-1.5 text-lg font-medium text-stone-50 shadow-sm duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-700 hover:dark:text-white"
            >
              {status === "loading" ? (
                <LoadingDots className="text-stone-900 dark:text-stone-100" />
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingDots className="text-stone-800 dark:text-stone-100" />
          </div>
        ) : savedMessages.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
            <div className="text-2xl font-semibold">No saved messages yet</div>
            <p className="mt-1 text-lg">
              Save any chat bubble from the chat page and it will show up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {savedMessages.map((message) => (
              <article
                key={message.id}
                className="rounded-2xl border border-stone-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      {message.role === "assistant" ? "Assistant" : "You"}
                    </div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Saved {formatSavedTime(message.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(message)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-200/80 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedId === message.id ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-stone-800 dark:text-stone-100">
                  {message.text}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
