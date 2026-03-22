"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      type="button"
      className="flex h-11 w-11 cursor-pointer items-center justify-center duration-250"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Sun className="absolute h-7 w-7 rotate-0 scale-100 duration-500 dark:rotate-90 dark:scale-0" fill="#fff" stroke="#fff" />
      <Moon className="absolute h-8 w-8 -rotate-90 scale-0 duration-500 dark:rotate-0 dark:scale-100" fill="#fff" stroke="" />
    </button>
  );
}
