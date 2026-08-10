"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  function getNextUrl() {
    if (typeof window === "undefined") {
      return "/";
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (!next || !next.startsWith("/")) {
      return "/";
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

  async function routeLoggedInUser(userId: string) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
    }

    if (!profile?.username) {
      const nextUrl = getNextUrl();

      window.location.href =
        `/complete-profile?next=${encodeURIComponent(nextUrl)}`;

      return;
    }

    window.location.href = getNextUrl();
  }

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await routeLoggedInUser(session.user.id);
      return;
    }

    setCheckingSession(false);
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup") {
      const finalUsername = cleanUsername(username);

      if (finalUsername.length < 3) {
        setMessage(
          "Username must be at least 3 characters."
        );
        return;
      }
    }

    setLoading(true);

    if (mode === "signin") {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error(error);
        setLoading(false);
        setMessage("Email or password is incorrect.");
        return;
      }

      if (data.user) {
        await routeLoggedInUser(data.user.id);
        return;
      }

      setLoading(false);
      return;
    }

    const finalUsername = cleanUsername(username);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(
          getNextUrl()
        )}`,
      },
    });

    if (error) {
      console.error(error);
      setLoading(false);

      if (
        error.message
          .toLowerCase()
          .includes("already")
      ) {
        setMessage(
          "An account with this email may already exist."
        );
      } else {
        setMessage(
          "Account could not be created. Please try again."
        );
      }

      return;
    }

    if (!data.user) {
      setLoading(false);
      setMessage("Account could not be created.");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: data.user.id,
        username: finalUsername,
        display_name: finalUsername,
      });

    if (profileError) {
      console.error(profileError);
      setLoading(false);

      if (profileError.code === "23505") {
        setMessage(
          "This username is already taken."
        );
      } else {
        setMessage(
          "Account was created, but profile could not be created."
        );
      }

      return;
    }

    if (data.session) {
      window.location.href = getNextUrl();
      return;
    }

    setLoading(false);
    setSuccess(true);

    setMessage(
      "Account created. Check your email and confirm your address before signing in."
    );

    setPassword("");
  }

  async function signInWithGoogle() {
    setMessage("");
    setSuccess(false);

    const nextUrl = getNextUrl();

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(
            nextUrl
          )}`,
        },
      });

    if (error) {
      console.error(error);

      setMessage(
        "Google sign in could not be started."
      );
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-md">
        <a
          href="/"
          className="mb-8 inline-block font-bold text-slate-500 hover:text-violet-600"
        >
          ← Back to WeWantAgain
        </a>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
          <div className="text-center">
            <div className="text-3xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              YOUR VOICE. THEIR ATTENTION.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
                setSuccess(false);
              }}
              className={`rounded-lg py-3 text-sm font-black transition ${
                mode === "signin"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              SIGN IN
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
                setSuccess(false);
              }}
              className={`rounded-lg py-3 text-sm font-black transition ${
                mode === "signup"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-7 w-full rounded-xl border border-slate-200 px-4 py-4 font-black transition hover:border-violet-300 hover:bg-violet-50"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-bold text-slate-400">
              OR
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="block">
                <span className="text-sm font-black">
                  Username
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      cleanUsername(e.target.value)
                    )
                  }
                  placeholder="your_username"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  minLength={3}
                  maxLength={24}
                  required
                />

                <p className="mt-2 text-xs text-slate-400">
                  Only letters, numbers and underscores.
                </p>
              </label>
            )}

            <label
              className={
                mode === "signup"
                  ? "mt-5 block"
                  : "block"
              }
            >
              <span className="text-sm font-black">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
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
                placeholder="Minimum 6 characters"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                required
              />
            </label>

            {message && (
              <div
                className={`mt-5 rounded-xl p-4 text-center text-sm font-bold ${
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
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "PLEASE WAIT..."
                : mode === "signin"
                ? "SIGN IN"
                : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}