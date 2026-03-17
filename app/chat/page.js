"use client";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import LoadingDots from "@/components/LoadingDots";
import MarkdownMessage from "@/components/MarkdownMessage";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const HISTORY_KEY = "civiqai_history";

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const buildMessages = (history) => {
  const list = [];
  history.forEach((item, index) => {
    const userTimestamp = item.userTime ?? item.time ?? Date.now();
    const assistantTimestamp =
      item.assistantTime ?? item.time ?? userTimestamp;
    list.push({
      id: `u-${index}`,
      role: "user",
      text: item.input,
      time: formatTime(userTimestamp),
    });
    list.push({
      id: `a-${index}`,
      role: "assistant",
      text: item.answer,
      time: formatTime(assistantTimestamp),
    });
  });
  return list;
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const base = Date.now();
        let didNormalize = false;
        const normalized = parsed.map((item, index) => {
          const userTime =
            item.userTime ?? item.time ?? base + index * 1000;
          const assistantTime =
            item.assistantTime ?? item.time ?? userTime + 500;
          if (item.userTime == null || item.assistantTime == null) {
            didNormalize = true;
          }
          return {
            ...item,
            userTime,
            assistantTime,
          };
        });
        if (didNormalize) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
        }
        setHistory(normalized);
        setMessages(buildMessages(normalized));
      }
    } catch (err) {
      console.error("Failed to read history", err);
    }
  }, []);

  const handleSend = async (text) => {
    setIsSending(true);
    const userTimestamp = Date.now();
    const time = formatTime(userTimestamp);
    const safeText = text.slice(0, 4000);
    const userMsg = { id: `u-${Date.now()}`, role: "user", text: safeText, time };
    const botId = `a-${Date.now() + 1}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: botId, role: "assistant", text: "", time, loading: true },
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: safeText,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log(errorText);
        const message = errorText || "Sorry, something went wrong.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId ? { ...msg, text: message, loading: false } : msg,
          ),
        );
        return;
      }

      const answer = await res.text();
      const finalAnswer =
        answer.trim().length > 0 ? answer : "Sorry, something went wrong.";
      const assistantTimestamp = Date.now();
      const assistantTime = formatTime(assistantTimestamp);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botId
            ? { ...msg, text: finalAnswer, loading: false, time: assistantTime }
            : msg,
        ),
      );

      setHistory((prev) => {
        const next = [
          ...prev,
          {
            input: text,
            answer: finalAnswer,
            userTime: userTimestamp,
            assistantTime: assistantTimestamp,
          },
        ];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botId
            ? { ...msg, text: "Sorry, something went wrong.", loading: false }
            : msg,
        ),
      );
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 dark:bg-stone-900 dark:text-stone-200 transition-colors duration-300">
      <Navbar />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-44 pt-28">

        <div className="flex flex-col gap-4">
          {isSignedIn ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-md leading-relaxed shadow-sm sm:max-w-[70%] ${
                    msg.role === "user"
                      ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                      : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                  }`}
                >
                  {msg.loading ? (
                    <LoadingDots className="text-stone-800 dark:text-stone-100" />
                  ) : (
                    msg.role === "assistant" ? (
                      <MarkdownMessage text={msg.text} />
                    ) : (
                      <p>{msg.text}</p>
                    )
                  )}
                  <div className="text-[11px] opacity-70">{msg.time}</div>
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
                {status === "loading" ? (
                  <LoadingDots className="text-stone-900 dark:text-stone-100" />
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {isSignedIn && (
        <div className="fixed bottom-6 left-1/2 w-full -translate-x-1/2 px-6">
          <SearchBar onSend={handleSend} isSending={isSending} />
        </div>
      )}
    </main>
  );
}
