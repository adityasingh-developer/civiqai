"use client";

import Logo from "@/assets/logo.svg"
import CustomTooltip from "@/components/customTooltip"
import LoadingDots from "@/components/LoadingDots"
import ThemeToggle from "@/components/ThemeToggle"
import { readUserCache, writeUserCache } from "@/lib/localCache"
import { Trash2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"

const Navbar = ({ userImageUrl = "", userName = "User" }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const email = session?.user?.email || "";
  const [hasHistory, setHasHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayName = session?.user?.name || email || userName;
  const imageUrl = session?.user?.image || userImageUrl;
  const initial = displayName?.slice(0, 1)?.toUpperCase() || "U";
  const pageTitle = pathname === "/chat" ? "User Chat" : pathname === "/saved" ? "Saved Messages" : "";

  useEffect(() => {
    const sync = () => setHasHistory(!!(email && readUserCache("chat-cache", email).length));
    sync();
    window.addEventListener("user-cache-updated", sync);
    return () => window.removeEventListener("user-cache-updated", sync);
  }, [email]);

  const handleDeleteHistory = async () => {
    if (!email) return;

    try {
      const res = await fetch("/api/user/history", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete history");
      writeUserCache("chat-cache", email, []);
      setConfirmOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete history", error);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-100000">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start">
          <span className="h-1.25 rounded-bl-[100%_20%] bg-stone-800 shadow-[0_0_10px_0.4rem_#D6d3d1] duration-300 dark:h-0.75 dark:bg-stone-400 dark:shadow-[0_0_10px_0.4rem_#1c1917]" />
          <div className="relative h-12 w-[min(620px,92vw)] rounded-b-4xl bg-stone-800 text-white shadow-[0_0_10px_0.4rem_#D6d3d1] duration-300 before:absolute before:-left-7.75 before:top-0 before:z-10 before:h-8 before:w-8 before:bg-[radial-gradient(circle_at_0%_100%,_transparent_32px,_#292524_32px)] before:content-[''] before:duration-300 dark:bg-stone-400 dark:text-[#1e1a17] dark:shadow-[0_0_10px_0.4rem_#1c1917] dark:before:-top-px dark:before:bg-[radial-gradient(circle_at_0%_100%,_transparent_32px,_#a6a09b_32px)] after:absolute after:-right-7.75 after:top-0 after:h-8 after:w-8 after:bg-[radial-gradient(circle_at_100%_100%,_transparent_32px,_#292524_32px)] after:content-[''] after:duration-300 dark:after:-top-px dark:after:bg-[radial-gradient(circle_at_100%_100%,_transparent_32px,_#a6a09b_32px)] sm:h-13 sm:w-[min(620px,70vw)]">
            <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6">
              <div className="justify-self-start">{pageTitle ? <h1 className="text-sm font-bold sm:text-xl">{pageTitle}</h1> : ""}</div>
              <div className="justify-self-center"><Link href="/"><Logo className="h-8 w-8 sm:h-10 sm:w-10" /></Link></div>
              <div className="justify-self-end">
                <div className="flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />
                  {session?.user ? (
                    <div className="relative">
                      <input id="profile-menu-toggle" type="checkbox" className="peer sr-only" />
                      <label htmlFor="profile-menu-toggle" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/20 font-semibold text-white sm:h-10 sm:w-10" aria-label="Toggle profile menu">
                        {imageUrl ? <img src={imageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" /> : initial}
                      </label>
                      <div className="pointer-events-none absolute right-0 top-full mt-2 min-w-[14rem] -translate-y-1.5 rounded-2xl bg-stone-100 p-4 text-stone-800 opacity-0 shadow-2xl transition-[opacity,transform] duration-300 ease-out peer-checked:pointer-events-auto peer-checked:translate-y-0 peer-checked:opacity-100 dark:bg-stone-800 dark:text-stone-100 sm:min-w-[18rem]">
                        <div className="flex items-center justify-between gap-3">
                          <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100 sm:text-xl">{displayName}</h1>
                          <label htmlFor="profile-menu-toggle" className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-stone-200/80 text-sm font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600 sm:text-md" aria-label="Close profile menu">x</label>
                        </div>
                        <ul className="mt-3 flex flex-col gap-2 text-base text-stone-800 dark:text-stone-100 sm:text-lg">
                          <li className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-stone-200 dark:hover:bg-stone-700">
                            <Link href="/chat" className="flex-1">History</Link>
                            {hasHistory ? <CustomTooltip content="Delete history"><button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex cursor-pointer items-center justify-center rounded-full p-1 text-stone-600 transition hover:bg-stone-300 dark:text-stone-200 dark:hover:bg-stone-600" aria-label="Delete history"><Trash2 className="h-4 w-4" /></button></CustomTooltip> : null}
                          </li>
                          <li><Link href="/saved" className="block rounded-lg px-3 py-2 hover:bg-stone-200 dark:hover:bg-stone-700">Saved messages</Link></li>
                          <li><button type="button" onClick={() => signOut()} className="w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-stone-200/70 dark:hover:bg-stone-700">Sign out</button></li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => signIn()} className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/20 px-3 text-sm font-medium text-white shadow-sm duration-200 hover:bg-stone-700 dark:bg-stone-950/30 dark:text-stone-100 sm:px-4 sm:text-md ${isLoading ? "pb-4 pt-2 sm:pb-5" : "py-1"}`}>{isLoading ? <LoadingDots /> : "Sign in"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <span className="h-1.25 rounded-br-[100%_20%] bg-stone-800 shadow-[0_0_10px_0.4rem_#D6d3d1] duration-300 dark:h-0.75 dark:bg-stone-400 dark:shadow-[0_0_10px_0.4rem_#1c1917]" />
        </div>
      </nav>
      {confirmOpen ? (
        <div className="fixed inset-0 z-[100001] grid place-items-center bg-stone-950/35 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-stone-100 p-4 text-stone-900 shadow-2xl dark:bg-stone-800 dark:text-stone-100">
            <h2 className="text-xl font-semibold">Delete history?</h2>
            <p className="mt-1 text-md">This will also delete saved messages.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="cursor-pointer rounded-full bg-stone-200 px-4 py-1.5 text-sm dark:bg-stone-700">Cancel</button>
              <button type="button" onClick={handleDeleteHistory} className="cursor-pointer rounded-full bg-red-600 px-4 py-1.5 text-sm text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Navbar;
