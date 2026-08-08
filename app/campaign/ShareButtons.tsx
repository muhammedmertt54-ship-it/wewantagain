"use client";

import { useState } from "react";

export default function ShareButtons() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function sharePage() {
    const shareData = {
      title: "WeWantAgain",
      text: "Support this demand on WeWantAgain",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User closed the share menu.
      }
    } else {
      await copyLink();
    }
  }

  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button
        onClick={copyLink}
        className="rounded-xl border border-slate-200 p-4 font-bold hover:border-violet-400 hover:text-violet-600"
      >
        {copied ? "✓ Copied!" : "Copy Link"}
      </button>

      <button
        onClick={sharePage}
        className="rounded-xl border border-slate-200 p-4 font-bold hover:border-violet-400 hover:text-violet-600"
      >
        Share
      </button>
    </div>
  );
}