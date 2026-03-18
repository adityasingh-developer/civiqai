import { Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";

import Navbar from "@/components/Navbar";
import SessionWrapper from "@/components/SessionWrapper";

import "./globals.css";
import "@/app/external.module.css";

const font = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: "CiviqAI",
  description: "Ask CiviqAI to summarize policies, PDFs, and images in seconds.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <SessionWrapper>
        <body className={`${font.variable} font-sans antialiased`}>
          <ThemeProvider attribute="class" enableSystem defaultTheme="dark">
            <main className="min-h-screen bg-stone-300 text-stone-900 duration-300 dark:bg-stone-900 dark:text-stone-200">
              <Navbar />
              {children}
            </main>
          </ThemeProvider>
        </body>
      </SessionWrapper>
    </html>
  );
}
