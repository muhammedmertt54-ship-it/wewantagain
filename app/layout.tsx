import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import Link from "next/link";

import "./globals.css";

import SessionGuard from "./SessionGuard";

const geistSans = Geist({
  variable:
    "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",
    subsets: ["latin"],
  });

export const metadata: Metadata = {
  title: "WeWantAgain",
  description:
    "Your Voice. Their Attention.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white">
        <SessionGuard />

        <div className="flex-1">
          {children}
        </div>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div>
                <Link
                  href="/"
                  className="text-xl font-black tracking-tight text-slate-950"
                >
                  WeWantAgain
                </Link>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Your Voice. Their Attention.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm font-bold sm:grid-cols-3">
                <Link
                  href="/about"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  About
                </Link>

                <Link
                  href="/support"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Supporter Program
                </Link>

                <Link
                  href="/supporters"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Supporters Wall
                </Link>

                <Link
                  href="/terms"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Terms
                </Link>

                <Link
                  href="/privacy"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Privacy
                </Link>

                <Link
                  href="/refund"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Refund Policy
                </Link>

                <Link
                  href="/contact"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Contact
                </Link>

                <Link
                  href="/copyright"
                  className="text-slate-500 transition hover:text-violet-600"
                >
                  Copyright
                </Link>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 text-xs leading-5 text-slate-400">
              © {new Date().getFullYear()} WeWantAgain.
              All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}