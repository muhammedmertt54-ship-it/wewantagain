import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

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
      <body className="min-h-full">
        <SessionGuard />

        {children}
      </body>
    </html>
  );
}