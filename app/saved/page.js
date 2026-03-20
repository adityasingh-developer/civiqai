"use client";

import { Copy, Download, X } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import LoadingDots from "@/components/LoadingDots";
import MarkdownMessage from "@/components/MarkdownMessage";
import MessageAttachments from "@/components/MessageAttachments";
import CustomTooltip from "@/components/customTooltip";
import {
  buildSavedMessagesFromChats,
  removeSavedMessageFromChats,
} from "@/lib/chatSaved";
import { readUserCache, writeUserCache } from "@/lib/localCache";
import { exportSavedMessagePdf } from "@/lib/pdfExport";

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
  const [removingIds, setRemovingIds] = useState(new Set());
  const [exportingIds, setExportingIds] = useState(new Set());

  useEffect(() => {
    if (status !== "authenticated") {
      setSavedMessages([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedHistory = readUserCache("chat-cache", userEmail);
    const cachedSavedMessages = buildSavedMessagesFromChats(cachedHistory);

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

        const nextHistory = Array.isArray(data?.chats) ? data.chats : [];
        const nextSavedMessages = buildSavedMessagesFromChats(nextHistory);

        writeUserCache("chat-cache", userEmail, nextHistory);
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

  const handleExportPdf = async (message) => {
    setExportingIds((prev) => new Set(prev).add(message.id));

    try {
      await exportSavedMessagePdf(message);
    } catch (error) {
      console.error("PDF export failed", error);
    } finally {
      setExportingIds((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  };

  const handleRemoveSaved = async (message) => {
    const previousHistory = readUserCache("chat-cache", userEmail);
    const nextHistory = removeSavedMessageFromChats(previousHistory, message);

    setRemovingIds((prev) => new Set(prev).add(message.id));
    writeUserCache("chat-cache", userEmail, nextHistory);
    setSavedMessages(buildSavedMessagesFromChats(nextHistory));

    try {
      const res = await fetch("/api/user/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          role: message.role,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove saved message");
      }
    } catch (error) {
      writeUserCache("chat-cache", userEmail, previousHistory);
      setSavedMessages(buildSavedMessagesFromChats(previousHistory));
      console.error("Failed to remove saved message", error);
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
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
                  <div className="flex items-center gap-2">
                    <CustomTooltip content="Export PDF">
                      <button
                        type="button"
                        onClick={() => handleExportPdf(message)}
                        disabled={exportingIds.has(message.id)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-200/80 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-300 disabled:cursor-default disabled:opacity-60 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600"
                      >
                        <Download className="h-4 w-4" />
                        {exportingIds.has(message.id) ? "Exporting" : "PDF"}
                      </button>
                    </CustomTooltip>

                    <CustomTooltip content="Remove">
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(message)}
                        disabled={removingIds.has(message.id)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-200/80 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-300 disabled:cursor-default disabled:opacity-60 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </CustomTooltip>

                    <CustomTooltip content="Copy">
                      <button
                        type="button"
                        onClick={() => handleCopy(message)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-200/80 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === message.id ? "Copied" : ""}
                      </button>
                    </CustomTooltip>
                  </div>
                </div>
                <div className="mt-4">
                  <MessageAttachments images={message.images} />
                  {message.text ? <MarkdownMessage text={message.text} /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
