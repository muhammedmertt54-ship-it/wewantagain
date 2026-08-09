"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserInfo = {
  id: string;
  email: string | null;
};

type Profile = {
  username: string | null;
  display_name: string | null;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

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

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
    }

    if (profileRow) {
      setProfile(profileRow);
    }

    const { data: adminRow, error: adminError } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (adminError) {
      console.error(adminError);
    }

    setIsAdmin(!!adminRow);

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    window.location.href = "/";
  }

  async function copyUserId() {
    if (!user?.id) {
      return;
    }

    await navigator.clipboard.writeText(user.id);
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
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
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold transition hover:border-violet-300"
          >
            ← Home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-3xl">
              👤
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-400">
                YOUR ACCOUNT
              </div>

              <h1 className="mt-1 text-3xl font-black">
                {profile?.display_name ||
                  profile?.username ||
                  "Account"}
              </h1>

              {profile?.username && (
                <div className="mt-1 font-bold text-violet-600">
                  @{profile.username}
                </div>
              )}

              <div className="mt-2 break-all text-sm text-slate-500">
                {user?.email}
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-700">
                ADMIN
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              USER ID
            </div>

            <div className="mt-2 break-all font-mono text-sm font-bold">
              {user?.id}
            </div>

            <button
              type="button"
              onClick={copyUserId}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black hover:border-violet-300 hover:text-violet-600"
            >
              Copy User ID
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="/start-demand"
              className="rounded-2xl border border-violet-200 bg-violet-50 p-6 transition hover:border-violet-400 hover:bg-violet-100"
            >
              <div className="text-3xl">
                ＋
              </div>

              <h2 className="mt-4 text-xl font-black">
                Start a Demand
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create a new campaign and submit it for review.
              </p>
            </a>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-3xl">
                ♥
              </div>

              <h2 className="mt-4 text-xl font-black">
                Supported Demands
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your supported campaigns will appear here later.
              </p>

              <div className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
                Coming soon
              </div>
            </div>

            <a
              href="/my-demands"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="text-3xl">
                📣
              </div>

              <h2 className="mt-4 text-xl font-black">
                My Demands
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                View your submitted campaigns and track their review status.
              </p>
            </a>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-3xl">
                ⚙️
              </div>

              <h2 className="mt-4 text-xl font-black">
                Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Username and account settings will be available here.
              </p>

              <div className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
                Coming soon
              </div>
            </div>

            {isAdmin && (
              <a
                href="/admin"
                className="rounded-2xl border border-red-200 bg-red-50 p-6 transition hover:border-red-400 hover:bg-red-100 sm:col-span-2"
              >
                <div className="text-3xl">
                  🛡️
                </div>

                <h2 className="mt-4 text-xl font-black text-red-700">
                  Admin Panel
                </h2>

                <p className="mt-2 text-sm leading-6 text-red-600">
                  Review campaigns and manage WeWantAgain users.
                </p>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 w-full rounded-xl border border-red-200 bg-red-50 py-4 font-black text-red-700 transition hover:bg-red-100"
          >
            SIGN OUT
          </button>
        </div>
      </section>
    </main>
  );
}