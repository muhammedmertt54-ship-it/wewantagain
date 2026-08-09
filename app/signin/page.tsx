
"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      window.location.href = getNextUrl();
      return;
    }

    setCheckingSession(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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

    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      setLoading(false);

      if (error) {
        console.error(error);
        setMessage("Email or password is incorrect.");
        return;
      }

      window.location.href = getNextUrl();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(
          getNextUrl()
        )}`,
      },
    });

    setLoading(false);

    if (error) {
      console.error(error);

      if (error.message.toLowerCase().includes("already")) {
        setMessage("An account with this email may already exist.");
      } else {
        setMessage("Account could not be created. Please try again.");
      }

      return;
    }

    if (data.session) {
      window.location.href = getNextUrl();
      return;
    }

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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(
          nextUrl
        )}`,
      },
    });

    if (error) {
      console.error(error);
      setMessage("Google sign in could not be started.");
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
              <span className="text-violet-600">AGAIN</span>
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
            <label className="block">
              <span className="text-sm font-black">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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