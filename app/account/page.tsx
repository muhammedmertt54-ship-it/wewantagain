"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type SupporterLevel =
  | "supporter"
  | "backer"
  | "champion";

type UserInfo = {
  id: string;
  email: string | null;
};

type Profile = {
  username: string | null;
  display_name: string | null;
  supporter: boolean;
  supporter_level: SupporterLevel | null;
};

function getSupporterLabel(
  level: SupporterLevel | null
) {
  if (level === "champion") {
    return "CHAMPION";
  }

  if (level === "backer") {
    return "BACKER";
  }

  return "SUPPORTER";
}

function getSupporterBadgeClasses(
  level: SupporterLevel | null
) {
  if (level === "champion") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (level === "backer") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function getSupporterCardClasses(
  level: SupporterLevel | null
) {
  if (level === "champion") {
    return "border-amber-300 bg-gradient-to-br from-amber-50 to-white";
  }

  if (level === "backer") {
    return "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white";
  }

  return "border-violet-200 bg-gradient-to-br from-violet-50 to-white";
}

export default function AccountPage() {
  const [loading, setLoading] =
    useState(true);

  const [user, setUser] =
    useState<UserInfo | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [isAdmin, setIsAdmin] =
    useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href =
        "/signin?next=/account";

      return;
    }

    setUser({
      id: session.user.id,
      email:
        session.user.email ??
        null,
    });

    const {
      data: profileRow,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            username,
            display_name,
            supporter,
            supporter_level
          `
        )
        .eq(
          "user_id",
          session.user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        profileError
      );
    }

    if (profileRow) {
      setProfile(
        profileRow as Profile
      );
    }

    const {
      data: adminRow,
      error: adminError,
    } =
      await supabase
        .from("admins")
        .select("user_id")
        .eq(
          "user_id",
          session.user.id
        )
        .maybeSingle();

    if (adminError) {
      console.error(
        adminError
      );
    }

    setIsAdmin(
      !!adminRow
    );

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    window.location.href =
      "/";
  }

  async function copyUserId() {
    if (!user?.id) {
      return;
    }

    await navigator.clipboard.writeText(
      user.id
    );
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
              <span className="text-violet-600">
                AGAIN
              </span>
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

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black">
                  {profile?.display_name ||
                    profile?.username ||
                    "Account"}
                </h1>

                {profile?.supporter && (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black tracking-wider ${getSupporterBadgeClasses(
                      profile.supporter_level
                    )}`}
                  >
                    {getSupporterLabel(
                      profile.supporter_level
                    )}
                  </span>
                )}
              </div>

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

          {profile?.supporter && (
            <section
              className={`mt-8 rounded-3xl border p-6 ${getSupporterCardClasses(
                profile.supporter_level
              )}`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    WEWANTAGAIN SUPPORTER
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {getSupporterLabel(
                      profile.supporter_level
                    )}
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Your account has verified
                    supporter status. Your
                    supporter benefits are
                    linked to this profile.
                  </p>
                </div>

                <div
                  className={`inline-flex rounded-full border px-5 py-3 text-sm font-black tracking-wider ${getSupporterBadgeClasses(
                    profile.supporter_level
                  )}`}
                >
                  {profile.supporter_level ===
                  "champion"
                    ? "🏆 CHAMPION"
                    : profile.supporter_level ===
                      "backer"
                    ? "⭐ BACKER"
                    : "💜 SUPPORTER"}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/supporters"
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  View Supporters Wall
                </a>

                <a
                  href="/support"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:text-violet-600"
                >
                  Supporter Program
                </a>
              </div>
            </section>
          )}

          {!profile?.supporter && (
            <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50 p-6">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                SUPPORTER PROGRAM
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Become a WeWantAgain
                Supporter
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Supporters can receive
                profile recognition,
                supporter badges and
                community benefits.
              </p>

              <a
                href="/support"
                className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700"
              >
                View Supporter Program
              </a>
            </section>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              USER ID
            </div>

            <div className="mt-2 break-all font-mono text-sm font-bold">
              {user?.id}
            </div>

            <button
              type="button"
              onClick={
                copyUserId
              }
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

            <a
              href="/supported-demands"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="text-3xl">
                ♥
              </div>

              <h2 className="mt-4 text-xl font-black">
                Supported Demands
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                View the campaigns you have supported and verified.
              </p>
            </a>

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

            <a
              href="/settings"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="text-3xl">
                ⚙️
              </div>

              <h2 className="mt-4 text-xl font-black">
                Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Change your username and display name.
              </p>
            </a>

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
            onClick={
              handleLogout
            }
            className="mt-8 w-full rounded-xl border border-red-200 bg-red-50 py-4 font-black text-red-700 transition hover:bg-red-100"
          >
            SIGN OUT
          </button>
        </div>
      </section>
    </main>
  );
}