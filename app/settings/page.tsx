"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  username: string | null;
  display_name: string | null;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  function cleanUsername(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
  }

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/settings";
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setMessage("Profile could not be loaded.");
      setLoading(false);
      return;
    }

    const profile = data as Profile | null;

    if (profile) {
      setUsername(profile.username ?? "");
      setDisplayName(profile.display_name ?? "");
    }

    setLoading(false);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const finalUsername = cleanUsername(username);
    const finalDisplayName = displayName.trim();

    if (finalUsername.length < 3) {
      setMessage(
        "Username must be at least 3 characters."
      );
      return;
    }

    if (finalDisplayName.length < 2) {
      setMessage(
        "Display name must be at least 2 characters."
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/settings";
      return;
    }

    setSaving(true);

    const { data: existingUsername, error: checkError } =
      await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", finalUsername)
        .neq("user_id", session.user.id)
        .maybeSingle();

    if (checkError) {
      console.error(checkError);
      setSaving(false);
      setMessage("Username could not be checked.");
      return;
    }

    if (existingUsername) {
      setSaving(false);
      setMessage("This username is already taken.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: session.user.id,
          username: finalUsername,
          display_name: finalDisplayName,
        },
        {
          onConflict: "user_id",
        }
      );

    setSaving(false);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setMessage("This username is already taken.");
      } else {
        setMessage("Profile could not be updated.");
      }

      return;
    }

    setUsername(finalUsername);
    setDisplayName(finalDisplayName);

    setSuccess(true);
    setMessage("Settings saved successfully.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
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
            href="/account"
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
          >
            ← Account
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
              ⚙️ SETTINGS
            </div>

            <h1 className="mt-4 text-4xl font-black">
              Profile settings
            </h1>

            <p className="mt-2 text-slate-500">
              Change how your WeWantAgain profile appears.
            </p>
          </div>

          <form
            onSubmit={handleSave}
            className="mt-8"
          >
            <label className="block">
              <span className="text-sm font-black">
                Username
              </span>

              <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-violet-500">
                <span className="font-bold text-slate-400">
                  @
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      cleanUsername(event.target.value)
                    )
                  }
                  minLength={3}
                  maxLength={24}
                  placeholder="your_username"
                  className="w-full px-2 py-4 outline-none"
                  required
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                3–24 characters. Letters, numbers and underscores only.
              </p>
            </label>

            <label className="mt-6 block">
              <span className="text-sm font-black">
                Display name
              </span>

              <input
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                maxLength={50}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                required
              />
            </label>

            {message && (
              <div
                className={`mt-6 rounded-xl p-4 text-center text-sm font-bold ${
                  success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-7 w-full rounded-xl bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}