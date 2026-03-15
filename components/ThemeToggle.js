"use client";
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    return (
        <button className="w-11 h-11 flex items-center justify-center cursor-pointer duration-250" onClick={() => {setTheme(theme === "light" ? "dark" : "light")}}>
            <Sun fill="#fff" stroke="#fff" className="absolute h-7 w-7 rotate-0 duration-500 scale-100 dark:scale-0 dark:rotate-90" />
            <Moon fill="#1c1917" stroke="#1c1917" className="absolute h-8 w-8 -rotate-90 duration-500 scale-0 dark:scale-100 dark:rotate-0" />
        </button>
    )
}

export default ThemeToggle
