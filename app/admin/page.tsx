"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Campaign = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  target: string;
  description: string;
  goal: number;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const { data: adminRow, error: adminError } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    await loadPendingCampaigns();

    setLoading(false);
  }

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error(error);
      setMessage("Email or password is incorrect.");
      setLoginLoading(false);
      return;
    }

    setLoginLoading(false);

    await checkSession();
  }

  async function loadPendingCampaigns() {
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, subtitle, category, target, description, goal, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Pending campaigns could not be loaded.");
      return;
    }

    setCampaigns((data ?? []) as Campaign[]);
  }

  async function updateCampaign(
    id: number,
    newStatus: "active" | "rejected"
  ) {
    setMessage("");

    const { error } = await supabase
      .from("campaigns")
      .update({
        status: newStatus,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMessage("Campaign could not be updated.");
      return;
    }

    setCampaigns((current) =>
      current.filter((campaign) => campaign.id !== id)
    );

    if (newStatus === "active") {
      setMessage("Campaign approved.");
    } else {
      setMessage("Campaign rejected.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setIsLoggedIn(false);
    setIsAdmin(false);
    setCampaigns([]);
    setEmail("");
    setPassword("");
    setMessage("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-lg font-black text-violet-600">
          Loading admin panel...
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-md">
          <a
            href="/"
            className="mb-8 inline-block font-bold text-slate-500 hover:text-violet-600"
          >
            ← Back to website
          </a>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="text-3xl font-black">
                WEWANT
                <span className="text-violet-600">
                  AGAIN
                </span>
              </div>

              <div className="mt-2 text-sm font-bold text-slate-400">
                ADMIN PANEL
              </div>
            </div>

            <form
              onSubmit={handleLogin}
              className="mt-8"
            >
              <label className="block">
                <span className="text-sm font-black">
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  placeholder="admin@example.com"
                  required
                />
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-black">
                  Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  placeholder="••••••••"
                  required
                />
              </label>

              {message && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm font-bold text-red-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="mt-6 w-full rounded-xl bg-violet-600 py-4 font-black text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {loginLoading
                  ? "SIGNING IN..."
                  : "SIGN IN"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="text-4xl">⛔</div>

          <h1 className="mt-4 text-2xl font-black">
            Access denied
          </h1>

          <p className="mt-3 text-slate-500">
            This account does not have admin permission.
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <div className="text-2xl font-black">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN PANEL
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/users"
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-700"
            >
              👥 Manage Users
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              Website
            </a>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-red-300 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8">
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            {campaigns.length} pending
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Pending demands
          </h1>

          <p className="mt-2 text-slate-500">
            Review submitted campaigns before publishing them.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl bg-violet-50 p-4 font-bold text-violet-700">
            {message}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              ✓
            </div>

            <h2 className="mt-4 text-2xl font-black">
              No pending campaigns
            </h2>

            <p className="mt-2 text-slate-500">
              Everything has been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                      {campaign.category}
                    </div>

                    <h2 className="text-2xl font-black">
                      {campaign.title}
                    </h2>

                    <p className="mt-1 text-lg font-bold text-violet-600">
                      {campaign.subtitle}
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Target
                        </div>

                        <div className="mt-1 font-black">
                          {campaign.target}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Goal
                        </div>

                        <div className="mt-1 font-black">
                          {Number(
                            campaign.goal
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="text-xs font-bold uppercase text-slate-400">
                        Description
                      </div>

                      <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                        {campaign.description}
                      </p>
                    </div>

                    <div className="mt-5 text-xs text-slate-400">
                      Slug: {campaign.slug}
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-52 lg:grid-cols-1">
                    <button
                      onClick={() =>
                        updateCampaign(
                          campaign.id,
                          "active"
                        )
                      }
                      className="rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700"
                    >
                      ✓ APPROVE
                    </button>

                    <button
                      onClick={() =>
                        updateCampaign(
                          campaign.id,
                          "rejected"
                        )
                      }
                      className="rounded-xl bg-red-50 px-5 py-4 font-black text-red-700 hover:bg-red-100"
                    >
                      ✕ REJECT
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}