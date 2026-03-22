"use client";

import { Bookmark, BookmarkCheck, Copy } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import { useEffect, useState } from "react"

import LoadingDots from "@/components/LoadingDots"
import MarkdownMessage from "@/components/MarkdownMessage"
import MessageAttachments from "@/components/MessageAttachments"
import SearchBar from "@/components/SearchBar"
import { buildChatMessages, formatChatTime, toggleSavedState, writeChatCaches } from "@/lib/chatPage";
import { readUserCache } from "@/lib/localCache";

function parseStreamLines(buffer, onEvent) {
  const lines = buffer.split("\n");
  const pending = lines.pop() || "";

  lines.forEach((line) => {
    if (!line.trim()) {
      return;
    }

    onEvent(JSON.parse(line));
  });

  return pending;
}

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
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoadingHistory]);

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
    const optimisticCreatedAt = new Date().toISOString();
    const previousHistory = history;
    const optimisticHistory = toggleSavedState(history, message, isSaved, optimisticCreatedAt);

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
    let streamedAnswer = "";
    let finalChat = null;

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Sorry, something went wrong.");
      }

      if (!res.body) {
        throw new Error("Streaming response not available.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pendingText = "";
      let flushTimer = null;

      const updateAssistant = (text, loading) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempAssistantId
              ? { ...message, text, loading }
              : message
          )
        );
      };

      const flushPending = () => {
        streamedAnswer += pendingText.slice(0, 3);
        pendingText = pendingText.slice(3);
        updateAssistant(streamedAnswer, false);
        flushTimer = pendingText ? window.setTimeout(flushPending, 16) : null;
      };

      const queueChunk = (text) => {
        pendingText += text;
        if (!flushTimer) {
          flushPending();
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = parseStreamLines(buffer, (event) => {
          if (event.type === "chunk") {
            queueChunk(event.text || "");
            return;
          }

          if (event.type === "done") {
            streamedAnswer = event.answer || streamedAnswer;
            finalChat = event.chat;
            return;
          }

          if (event.type === "error") {
            throw new Error(event.error || "Sorry, something went wrong.");
          }
        });
      }

      while (flushTimer || pendingText) {
        await new Promise((resolve) => setTimeout(resolve, 16));
      }

      buffer += decoder.decode();
      parseStreamLines(buffer, (event) => {
        if (event.type === "done") {
          streamedAnswer = event.answer || streamedAnswer;
          finalChat = event.chat;
          return;
        }

        if (event.type === "error") {
          throw new Error(event.error || "Sorry, something went wrong.");
        }
      });

      if (!finalChat) {
        throw new Error("Incomplete streaming response.");
      }

      updateAssistant(streamedAnswer, false);

      const nextHistoryItem = {
        id: finalChat.id,
        input: finalChat.input,
        promptImages: Array.isArray(finalChat.promptImages) ? finalChat.promptImages : [],
        answer: streamedAnswer,
        userTime: finalChat.userTime,
        assistantTime: finalChat.assistantTime,
        savedUser: Boolean(finalChat.savedUser),
        savedAssistant: Boolean(finalChat.savedAssistant),
        savedUserAt: finalChat.savedUserAt,
        savedAssistantAt: finalChat.savedAssistantAt,
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
            ? {
                ...message,
                text: streamedAnswer || error.message || "Sorry, something went wrong.",
                loading: false,
              }
            : message
        )
      );
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-8 pt-24 sm:px-6 sm:pt-28">
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
                <div className={`group relative max-w-[92%] w-fit rounded-2xl text-md leading-relaxed shadow-sm sm:max-w-[70%] ${message.images?.length
                  ? "px-2 pb-2 pt-2 sm:px-2.5 sm:pb-2.5 sm:pt-2.5"
                  : "px-4 py-3"
                  } ${message.role === "user"
                    ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                  }`}>
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
                      <button type="button" onClick={() => handleToggleSaved(message)} className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100" aria-label={message.saved ? "Unsave message" : "Save message"} disabled={savingIds.has(message.id)}>
                        {message.saved ? (
                          <BookmarkCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button type="button" onClick={() => handleCopy(message)} className="inline-flex cursor-pointer items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100" aria-label={copiedId === message.id ? "Copied" : "Copy"}>
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
      </section>

      {isSignedIn && (
        <div className="sticky bottom-0 z-10">
          <SearchBar onSend={handleSend} isSending={isSending} />
        </div>
      )}
    </main>
  );
}
