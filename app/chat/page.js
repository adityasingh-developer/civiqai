"use client";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import LoadingDots from "@/components/LoadingDots";
import MarkdownMessage from "@/components/MarkdownMessage";
import { readUserCache, writeUserCache } from "@/lib/localCache";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Copy } from "lucide-react";

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const savedKey = (chatId, role) => `${chatId}:${role}`;

const buildMessages = (history, savedLookup) => {
  const list = [];

  history.forEach((item, index) => {
    const userTimestamp = item.userTime ?? item.time ?? Date.now();
    const assistantTimestamp =
      item.assistantTime ?? item.time ?? userTimestamp;
    const chatId = item.id || `chat-${index}`;

    list.push({
      id: `u-${chatId}`,
      chatId,
      role: "user",
      text: item.input,
      time: formatTime(userTimestamp),
      saved: savedLookup.has(savedKey(chatId, "user")),
    });

    list.push({
      id: `a-${chatId}`,
      chatId,
      role: "assistant",
      text: item.answer,
      time: formatTime(assistantTimestamp),
      saved: savedLookup.has(savedKey(chatId, "assistant")),
    });
  });

  return list;
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user);
  const userEmail = session?.user?.email || "";
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [savedLookup, setSavedLookup] = useState(new Set());
  const [savedMessages, setSavedMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [savingIds, setSavingIds] = useState(new Set());
  const endRef = useRef(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setHistory([]);
      setMessages([]);
      setSavedLookup(new Set());
      setSavedMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    let isMounted = true;
    const cachedHistory = readUserCache("chat-cache", userEmail);
    const cachedSavedMessages = readUserCache("saved-cache", userEmail);

    if (cachedHistory.length || cachedSavedMessages.length) {
      const cachedSavedLookup = new Set(
        cachedSavedMessages.map((item) => savedKey(item.chatId, item.role))
      );
      setHistory(cachedHistory);
      setSavedMessages(cachedSavedMessages);
      setSavedLookup(cachedSavedLookup);
      setMessages(buildMessages(cachedHistory, cachedSavedLookup));
      setIsLoadingHistory(false);
    } else {
      setIsLoadingHistory(true);
    }

    const loadUserData = async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load chats");
        }

        if (!isMounted) return;

        const nextHistory = Array.isArray(data?.chats) ? data.chats : [];
        const nextSavedMessages = Array.isArray(data?.savedMessages)
          ? data.savedMessages
          : [];
        const nextSaved = new Set(
          nextSavedMessages.map((item) => savedKey(item.chatId, item.role))
        );

        writeUserCache("chat-cache", userEmail, nextHistory);
        writeUserCache("saved-cache", userEmail, nextSavedMessages);
        setHistory(nextHistory);
        setSavedMessages(nextSavedMessages);
        setSavedLookup(nextSaved);
        setMessages(buildMessages(nextHistory, nextSaved));
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
  }, [status, userEmail]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 0);
    return () => clearTimeout(timer);
  }, [status, messages.length]);

  const handleCopy = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.text || "");
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleToggleSaved = async (msg) => {
    if (!msg.chatId || msg.loading) return;

    const key = savedKey(msg.chatId, msg.role);
    const isSaved = savedLookup.has(key);

    setSavingIds((prev) => new Set(prev).add(msg.id));

    try {
      const res = await fetch("/api/user/saved", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: msg.chatId,
          role: msg.role,
          text: msg.text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update saved message");
      }

      const nextSavedMessages = isSaved
        ? savedMessages.filter(
            (item) =>
              !(
                String(item.chatId) === String(msg.chatId) &&
                item.role === msg.role
              )
          )
        : [
            ...savedMessages,
            {
              id: data?.savedMessage?.id || `${msg.chatId}:${msg.role}`,
              chatId: msg.chatId,
              role: msg.role,
              text: msg.text,
              createdAt:
                data?.savedMessage?.createdAt || new Date().toISOString(),
            },
          ];

      setSavedMessages(nextSavedMessages);
      writeUserCache("saved-cache", userEmail, nextSavedMessages);

      setSavedLookup((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });

      setMessages((prev) =>
        prev.map((item) =>
          item.id === msg.id ? { ...item, saved: !isSaved } : item
        )
      );
    } catch (error) {
      console.error("Save toggle failed", error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  const handleSend = async (text) => {
    setIsSending(true);
    const userTimestamp = Date.now();
    const userTime = formatTime(userTimestamp);
    const safeText = text.slice(0, 4000);
    const tempChatId = `temp-${Date.now()}`;
    const tempUserId = `u-${tempChatId}`;
    const tempAssistantId = `a-${tempChatId}`;

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        chatId: tempChatId,
        role: "user",
        text: safeText,
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
          history: messages
            .filter((msg) => !msg.loading)
            .map((msg) => ({ role: msg.role, content: msg.text }))
            .slice(-12),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.error || "Sorry, something went wrong.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantId
              ? { ...msg, text: errorMessage, loading: false }
              : msg
          )
        );
        return;
      }

      const chat = data.chat;
      const nextHistoryItem = {
        id: chat.id,
        input: chat.input,
        answer: data.answer,
        userTime: chat.userTime,
        assistantTime: chat.assistantTime,
      };

      setHistory((prev) => {
        const nextHistory = [...prev, nextHistoryItem];
        writeUserCache("chat-cache", userEmail, nextHistory);
        return nextHistory;
      });
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (msg) => msg.id !== tempUserId && msg.id !== tempAssistantId
        );
        return [...withoutTemp, ...buildMessages([nextHistoryItem], savedLookup)];
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? { ...msg, text: "Sorry, something went wrong.", loading: false }
            : msg
        )
      );
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 transition-colors duration-300 dark:bg-stone-900 dark:text-stone-200">
      <Navbar />

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
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group relative max-w-[92%] rounded-2xl px-4 py-3 text-md leading-relaxed shadow-sm sm:max-w-[70%] ${
                      msg.role === "user"
                        ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                        : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {msg.loading ? (
                      <LoadingDots className="text-stone-800 dark:text-stone-100" />
                    ) : msg.role === "assistant" ? (
                      <MarkdownMessage text={msg.text} />
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[11px] opacity-70">
                      <span>{msg.time}</span>
                      {msg.saved ? <span>Saved</span> : null}
                    </div>
                    {!msg.loading && (
                      <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleToggleSaved(msg)}
                          className="inline-flex items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100 cursor-pointer"
                          aria-label={msg.saved ? "Unsave message" : "Save message"}
                          disabled={savingIds.has(msg.id)}
                        >
                          {msg.saved ? (
                            <BookmarkCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg)}
                          className="inline-flex items-center justify-center rounded-full bg-stone-200/70 p-1.5 text-stone-700 transition dark:bg-stone-700/90 dark:text-stone-100 cursor-pointer"
                          aria-label={copiedId === msg.id ? "Copied" : "Copy"}
                        >
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
        <div className="fixed bottom-4 left-1/2 w-full -translate-x-1/2 px-4 sm:bottom-6 sm:px-6">
          <SearchBar onSend={handleSend} isSending={isSending} />
        </div>
      )}
    </main>
  );
}
