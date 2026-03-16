"use client";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";

const dummyMessages = [
  {
    id: 1,
    role: "user",
    text: "Summarize this policy in plain language and highlight the main deadline.",
    time: "2:11 PM",
  },
  {
    id: 2,
    role: "assistant",
    text: "This policy says landlords must provide 30 days notice before raising rent. The main deadline is April 30, 2026 for filing appeals.",
    time: "2:12 PM",
  },
  {
    id: 3,
    role: "user",
    text: "Can you also list who is exempt?",
    time: "2:12 PM",
  },
  {
    id: 4,
    role: "assistant",
    text: "Exemptions include owner-occupied duplexes, newly built units (within 15 years), and temporary housing leases under 6 months.",
    time: "2:13 PM",
  },
];

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-stone-300 text-stone-900 dark:bg-stone-900 dark:text-stone-200 transition-colors duration-300">
      <Navbar />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-44 pt-28">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold sm:text-3xl">CiviqAI Chat</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Dummy conversation preview. Upload a doc or image to get a simplified explanation.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {dummyMessages.map((msg) => (
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
          ))}
        </div>

        <div className="rounded-2xl border border-stone-200/70 bg-white/70 p-4 text-sm text-stone-700 shadow-sm backdrop-blur dark:border-stone-700/70 dark:bg-stone-900/60 dark:text-stone-200">
          <div className="font-semibold">Quick summary</div>
          <p className="mt-1">
            Rent notices require 30 days. Appeals are due April 30, 2026. Exemptions apply to owner-occupied duplexes, new builds, and short-term leases.
          </p>
        </div>
      </section>

      <div className="fixed bottom-6 left-1/2 w-full -translate-x-1/2 px-6">
        <SearchBar />
      </div>
    </main>
  );
}
