"use client";

import { Bookmark, BookmarkCheck, Copy } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

import LoadingDots from "@/components/LoadingDots"
import MessageAttachments from "@/components/MessageAttachments"
import MarkdownMessage from "@/components/MarkdownMessage"
import SearchBar from "@/components/SearchBar"
import { buildChatMessages, formatChatTime, toggleSavedState, writeChatCaches } from "@/lib/chatPage";
import { readUserCache } from "@/lib/localCache";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user);
  const userEmail = session?.user?.email || "";
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [savingIds, setSavingIds] = useState(new Set());
  const endRef = useRef(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setHistory([]);
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    let isMounted = true;
    const cachedHistory = readUserCache("chat-cache", userEmail);

    if (cachedHistory.length) {
      // console.log("using cached chats first", cachedHistory.length);
      setHistory(cachedHistory);
      setMessages(buildChatMessages(cachedHistory));
      setIsLoadingHistory(false);
    } else {
      setIsLoadingHistory(true);
    }

    const loadUserData = async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load chats");
        }

        if (!isMounted) {
          return;
        }

        const nextHistory = Array.isArray(data?.chats) ? data.chats : [];

        writeChatCaches(userEmail, nextHistory);
        setHistory(nextHistory);
        setMessages(buildChatMessages(nextHistory));
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [status, userEmail])

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 0)

    return () => clearTimeout(timer);
  }, [status, messages.length]);

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  const handleToggleSaved = async (message) => {
    if (!message.chatId || message.loading) {
      return;
    }

    const isSaved = Boolean(message.saved);
    // console.log("toggle save clicked", { chatId: message.chatId, role: message.role, isSaved });
    const optimisticCreatedAt = new Date().toISOString();
    const previousHistory = history;
    const optimisticHistory = toggleSavedState( history, message, isSaved, optimisticCreatedAt );

    setSavingIds((prev) => new Set(prev).add(message.id));
    setHistory(optimisticHistory);
    setMessages(buildChatMessages(optimisticHistory));
    writeChatCaches(userEmail, optimisticHistory);

    try {
      const res = await fetch("/api/user/saved", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          role: message.role,
        }),
      })

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update saved message");
      }

      if (!isSaved && data?.savedMessage?.createdAt) {
        const syncedHistory = toggleSavedState(
          optimisticHistory,
          message,
          false,
          data.savedMessage.createdAt
        );
        setHistory(syncedHistory);
        setMessages(buildChatMessages(syncedHistory));
        writeChatCaches(userEmail, syncedHistory);
      }
    } catch (error) {
      setHistory(previousHistory);
      setMessages(buildChatMessages(previousHistory));
      writeChatCaches(userEmail, previousHistory);
      console.error("Save toggle failed", error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      })
    }
  }

  const handleSend = async ({ text = "", images = [] }) => {
    setIsSending(true);
    const userTimestamp = Date.now();
    const userTime = formatChatTime(userTimestamp);
    const safeText = text.slice(0, 4000);
    const displayText =
      safeText || `Sent ${images.length} attachment${images.length === 1 ? "" : "s"}.`;
    const tempChatId = `temp-${Date.now()}`;
    const tempUserId = `u-${tempChatId}`;
    const tempAssistantId = `a-${tempChatId}`;
    // console.log("sending chat", { chars: safeText.length, images: images.length });

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        chatId: tempChatId,
        role: "user",
        text: displayText,
        images: images.map((image) => ({
          cacheKey: image.cacheKey,
          name: image.name,
          mimeType: image.mimeType,
          previewUrl: image.previewUrl || null,
        })),
        time: userTime,
        saved: false,
      },
      {
        id: tempAssistantId,
        chatId: tempChatId,
        role: "assistant",
        text: "",
        time: userTime,
        loading: true,
        saved: false,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: safeText,
          images,
          history: history
            .flatMap((chat) => [
              { role: "user", content: chat.input },
              { role: "assistant", content: chat.answer },
            ])
            .slice(-4),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.error || "Sorry, something went wrong.";
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempAssistantId
              ? { ...message, text: errorMessage, loading: false }
              : message
          )
        );
        return;
      }

      const chat = data.chat;
      const nextHistoryItem = {
        id: chat.id,
        input: chat.input,
        promptImages: Array.isArray(chat.promptImages) ? chat.promptImages : [],
        answer: data.answer,
        userTime: chat.userTime,
        assistantTime: chat.assistantTime,
        savedUser: Boolean(chat.savedUser),
        savedAssistant: Boolean(chat.savedAssistant),
        savedUserAt: chat.savedUserAt,
        savedAssistantAt: chat.savedAssistantAt,
      };

      setHistory((prev) => {
        const nextHistory = [...prev, nextHistoryItem];
        writeChatCaches(userEmail, nextHistory);
        return nextHistory;
      });

      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (message) =>
            message.id !== tempUserId && message.id !== tempAssistantId
        );
        return [...withoutTemp, ...buildChatMessages([nextHistoryItem])];
      });
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempAssistantId
            ? { ...message, text: "Sorry, something went wrong.", loading: false }
            : message
        )
      );
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-44 pt-24 sm:px-6 sm:pt-28">
        <div className="flex flex-col gap-4">
          {isSignedIn ? (
            isLoadingHistory ? (
              <div className="flex justify-center py-10">
                <LoadingDots className="text-stone-800 dark:text-stone-100" />
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
                <div className="text-2xl font-semibold">No chats yet</div>
                <p className="mt-1 text-lg">Start a conversation and save any message you want to keep.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <MessageAttachments images={message.images} />
                  <div className={`group relative max-w-[92%] rounded-2xl text-md leading-relaxed shadow-sm sm:max-w-[70%] w-fit ${message.images?.length
                        ? "px-2 pb-2 pt-2 sm:px-2.5 sm:pb-2.5 sm:pt-2.5"
                        : "px-4 py-3"
                      } ${message.role === "user"
                        ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                        : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                      }`} >
                    {message.loading ? (
                      <LoadingDots className="text-stone-800 dark:text-stone-100" />
                    ) : message.role === "assistant" ? (
                      <MarkdownMessage text={message.text} />
                    ) : message.text ? (
                      <p className={message.images?.length ? "px-1" : ""}>{message.text}</p>
                    ) : null
                    }
                    <div className={`flex items-center gap-2 text-[11px] opacity-70 ${message.images?.length ? "mt-1 px-1" : "mt-2"}`}>
                      <span>{message.time}</span>
                      {message.saved ? <span>Saved</span> : null}
                    </div>
                    {!message.loading && (
                      <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => handleToggleSaved(message)} className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100" aria-label={message.saved ? "Unsave message" : "Save message"} disabled={savingIds.has(message.id)} >
                          {message.saved ? (
                            <BookmarkCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button type="button" onClick={() => handleCopy(message)} className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100" aria-label={copiedId === message.id ? "Copied" : "Copy"} >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-5 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
              <div className="text-2xl font-semibold">Sign in required</div>
              <p className="mt-1 text-lg">Please sign in to start chatting.</p>
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
          )}
          <div ref={endRef} className="scroll-mb-[120px]" />
        </div>
      </section>

      {isSignedIn && (
        <div className="fixed bottom-0 left-1/2 w-full -translate-x-1/2">
          <SearchBar onSend={handleSend} isSending={isSending} />
        </div>
      )}
    </main>
  );
}

