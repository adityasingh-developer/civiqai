"use client";

import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/assets/logo.svg";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

const Navbar = ({ userImageUrl = "", userName = "User" }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const displayName = session?.user?.name || session?.user?.email || userName;
  const imageUrl = session?.user?.image || userImageUrl;
  const initial = displayName?.slice(0, 1)?.toUpperCase() || "U";
  return (
    <nav className="fixed inset-x-0 top-0 z-100000">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        <span className="h-1.25 dark:h-0.75 duration-300 bg-stone-800 dark:bg-stone-400 rounded-bl-[100%_20%]" />
        <div className="relative w-[min(620px,70vw)] duration-300 h-13 bg-stone-800 dark:bg-stone-400 rounded-b-4xl before:duration-300 after:duration-300 before:content-[''] before:absolute before:top-0 dark:before:-top-px before:-left-7.75 before:w-8 before:h-8 before:z-10 dark:before:[background-image:radial-gradient(circle_at_0%_100%,_transparent_32px,_#a6a09b_32px)] before:[background-image:radial-gradient(circle_at_0%_100%,_transparent_32px,_#292524_32px)] after:content-[''] after:absolute after:top-0 dark:after:-top-px after:-right-7.75 after:w-8 after:h-8 dark:after:[background-image:radial-gradient(circle_at_100%_100%,_transparent_32px,_#a6a09b_32px)] after:[background-image:radial-gradient(circle_at_100%_100%,_transparent_32px,_#292524_32px)] dark:text-[#1e1a17] text-white">
          <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-6">
            <div className="justify-self-start" />
            <div className="justify-self-center">
              {pathname === '/chat' ? <h1 className="text-xl font-bold">User Chat</h1> :  <Logo className="h-10 w-10" />}
            </div>
            <div className="justify-self-end">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                {session?.user ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20 text-md font-semibold text-white dark:bg-stone-950/30 dark:text-stone-100 cursor-pointer">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${displayName} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn()}
                    className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-md font-medium text-white shadow-sm duration-200 cursor-pointer hover:bg-stone-700 dark:bg-stone-950/30 dark:text-stone-100"
                  >
                    {status === "loading" ? "Loading..." : "Sign in"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <span className="h-1.25 dark:h-0.75 duration-300 bg-stone-800 dark:bg-stone-400 rounded-br-[100%_20%]" />
      </div>
    </nav>
  );
};

export default Navbar;
