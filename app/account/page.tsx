"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserInfo = {
  id: string;
  email: string | null;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/account";
      return;
    }

    setUser({
      id: session.user.id,
      email: session.user.email ?? null,
    });

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <a href="/">
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">AGAIN</span>
            </div>

            <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
              YOUR VOICE. THEIR ATTENTION.
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
          >
            ← Home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-2xl">
              👤
            </div>

            <div>
              <div className="text-sm font-bold text-slate-400">
                YOUR ACCOUNT
              </div>

              <h1 className="mt-1 text-2xl font-black">
                {user?.email ?? "Account"}
              </h1>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="/start-demand"
              className="rounded-2xl border border-violet-200 bg-violet-50 p-6 transition hover:border-violet-400"
            >
              <div className="text-3xl">＋</div>

              <h2 className="mt-4 text-xl font-black">
                Start a Demand
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create a new campaign and submit it for review.
              </p>
            </a>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-3xl">♥</div>

              <h2 className="mt-4 text-xl font-black">
                Supported Demands
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your supported campaigns will appear here later.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-3xl">📣</div>

              <h2 className="mt-4 text-xl font-black">
                My Demands
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Campaigns you create will appear here once we connect ownership.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-3xl">⚙️</div>

              <h2 className="mt-4 text-xl font-black">
                Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Profile and notification settings will be added here.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded-xl border border-red-200 bg-red-50 py-4 font-black text-red-700 hover:bg-red-100"
          >
            SIGN OUT
          </button>
        </div>
      </section>
    </main>
  );
}