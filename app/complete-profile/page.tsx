"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CompleteProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkProfile();
  }, []);

  function getNextUrl() {
    if (typeof window === "undefined") {
      return "/account";
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (!next || !next.startsWith("/")) {
      return "/account";
    }

    return next;
  }

  function cleanUsername(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
  }

  async function checkProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      const nextUrl = getNextUrl();

      window.location.href =
        `/signin?next=${encodeURIComponent(
          `/complete-profile?next=${encodeURIComponent(nextUrl)}`
        )}`;

      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
    }

    if (profile?.username) {
      window.location.href = getNextUrl();
      return;
    }

    const googleName =
      typeof session.user.user_metadata?.full_name === "string"
        ? session.user.user_metadata.full_name
        : "";

    const googleUsername =
      typeof session.user.user_metadata?.preferred_username === "string"
        ? session.user.user_metadata.preferred_username
        : "";

    if (googleName) {
      setDisplayName(googleName);
    }

    if (googleUsername) {
      setUsername(cleanUsername(googleUsername));
    }

    setLoading(false);
  }

  async function handleSubmit(
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
        "Please enter your display name."
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href =
        `/signin?next=${encodeURIComponent(
          `/complete-profile?next=${encodeURIComponent(
            getNextUrl()
          )}`
        )}`;

      return;
    }

    setSaving(true);

    const {
      data: existingUsername,
      error: checkError,
    } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", finalUsername)
      .neq("user_id", session.user.id)
      .maybeSingle();

    if (checkError) {
      console.error(checkError);

      setSaving(false);
      setMessage(
        "Username could not be checked."
      );

      return;
    }

    if (existingUsername) {
      setSaving(false);
      setMessage(
        "This username is already taken."
      );

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

    if (error) {
      console.error(error);

      setSaving(false);

      if (error.code === "23505") {
        setMessage(
          "This username is already taken."
        );
      } else {
        setMessage(
          "Profile could not be saved."
        );
      }

      return;
    }

    setSuccess(true);
    setMessage(
      "Profile completed successfully."
    );

    setTimeout(() => {
      window.location.href = getNextUrl();
    }, 700);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Checking profile...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-lg">
        <a
          href="/"
          className="mb-8 inline-block font-bold text-slate-500 hover:text-violet-600"
        >
          ← Back to WeWantAgain
        </a>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="text-3xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="mt-2 text-sm font-bold text-slate-400">
              COMPLETE YOUR PROFILE
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Choose your username
            </h1>

            <p className="mt-3 text-slate-500">
              This will be your public WeWantAgain identity.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8"
          >
            <label className="block">
              <span className="text-sm font-black">
                Username
              </span>

              <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-violet-500">
                <span className="font-bold text-slate-400">
                  @
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      cleanUsername(
                        event.target.value
                      )
                    )
                  }
                  placeholder="your_username"
                  minLength={3}
                  maxLength={24}
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
                  setDisplayName(
                    event.target.value
                  )
                }
                placeholder="Your name"
                maxLength={50}
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
              className="mt-7 w-full rounded-xl bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "SAVING..."
                : "COMPLETE PROFILE"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}