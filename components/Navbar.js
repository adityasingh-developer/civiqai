"use client";

import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import Logo from "@/assets/logo.svg";
import LoadingDots from "@/components/LoadingDots";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

const Navbar = ({ userImageUrl = "", userName = "User" }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const displayName = session?.user?.name || session?.user?.email || userName;
  const imageUrl = session?.user?.image || userImageUrl;
  const initial = displayName?.slice(0, 1)?.toUpperCase() || "U";
  return (
    <nav className="fixed inset-x-0 top-0 z-100000">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        <span className="h-1.25 dark:h-0.75 duration-300 bg-stone-800 dark:bg-stone-400 rounded-bl-[100%_20%] shadow-[0_0_10px_0.4rem_#D6d3d1] dark:shadow-[0_0_10px_0.4rem_#1c1917]" />
        <div className="relative w-[min(620px,92vw)] duration-300 h-12 bg-stone-800 dark:bg-stone-400 rounded-b-4xl before:duration-300 after:duration-300 before:content-[''] before:absolute before:top-0 dark:before:-top-px before:-left-7.75 before:w-8 before:h-8 before:z-10 dark:before:[background-image:radial-gradient(circle_at_0%_100%,_transparent_32px,_#a6a09b_32px)] before:[background-image:radial-gradient(circle_at_0%_100%,_transparent_32px,_#292524_32px)] after:content-[''] after:absolute after:top-0 dark:after:-top-px after:-right-7.75 after:w-8 after:h-8 dark:after:[background-image:radial-gradient(circle_at_100%_100%,_transparent_32px,_#a6a09b_32px)] after:[background-image:radial-gradient(circle_at_100%_100%,_transparent_32px,_#292524_32px)] dark:text-[#1e1a17] text-white shadow-[0_0_10px_0.4rem_#D6d3d1] dark:shadow-[0_0_10px_0.4rem_#1c1917] sm:h-13 sm:w-[min(620px,70vw)]">
          <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6">
            <div className="justify-self-start" >
              {pathname === '/chat' ? <h1 className="text-sm font-bold sm:text-xl">User Chat</h1> : ""}</div>
            <div className="justify-self-center">
              <Link href={"/"}>
                <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
              </Link>
            </div>
            <div className="justify-self-end">
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                {session?.user ? (
                  <div className="relative">
                    <input
                      id="profile-menu-toggle"
                      type="checkbox"
                      className="peer sr-only"
                    />
                    <label
                      htmlFor="profile-menu-toggle"
                      className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/20 text-white font-semibold cursor-pointer sm:h-10 sm:w-10"
                      aria-label="Toggle profile menu"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${displayName} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </label>
                    <div className="absolute right-0 top-full mt-2 min-w-[14rem] rounded-2xl bg-stone-100 p-4 text-stone-800 shadow-2xl opacity-0 -translate-y-1.5 pointer-events-none transition-[opacity,transform] duration-300 ease-out peer-checked:opacity-100 peer-checked:translate-y-0 peer-checked:pointer-events-auto dark:bg-stone-800 dark:text-stone-100 sm:min-w-[18rem]">
                      <div className="flex items-center justify-between gap-3">
                        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100 sm:text-xl">
                          {displayName}
                        </h1>
                        <label
                          htmlFor="profile-menu-toggle"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-200/80 text-sm font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600 cursor-pointer sm:text-md"
                          aria-label="Close profile menu"
                        >
                          ×
                        </label>
                      </div>
                      <ul className="mt-3 flex flex-col gap-2 text-base text-stone-800 dark:text-stone-100 sm:text-lg">
                        <li>
                          <Link
                            href="/chat"
                            className="block rounded-lg px-3 py-2 hover:bg-stone-200 dark:hover:bg-stone-700"
                          >
                            History
                          </Link>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full rounded-lg px-3 py-2 text-left cursor-pointer hover:bg-stone-200/70 dark:hover:bg-stone-700"
                          >
                            Sign out
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn()}
                    className={`inline-flex items-center gap-2 rounded-full bg-white/20 px-3 text-sm font-medium text-white shadow-sm duration-200 cursor-pointer hover:bg-stone-700 dark:bg-stone-950/30 dark:text-stone-100 sm:px-4 sm:text-md ${isLoading ? "pb-4 pt-2 sm:pb-5" : "py-1"}`}
                  >
                    {isLoading ? (
                      <LoadingDots />
                    ) : (
                      "Sign in"
                    )}
                   </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <span className="h-1.25 dark:h-0.75 duration-300 bg-stone-800 dark:bg-stone-400 rounded-br-[100%_20%] shadow-[0_0_10px_0.4rem_#D6d3d1] dark:shadow-[0_0_10px_0.4rem_#1c1917]" />
      </div>
    </nav>
  );
};

export default Navbar;
