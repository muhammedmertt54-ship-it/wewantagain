"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function StartDemandPage() {
  const [checkingSession, setCheckingSession] = useState(true);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("TV & Series");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("1000000");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/start-demand";
      return;
    }

    setCheckingSession(false);
  }

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/start-demand";
      return;
    }

    if (
      !title.trim() ||
      !subtitle.trim() ||
      !target.trim() ||
      !description.trim()
    ) {
      setMessage("Please fill in all required fields.");
      return;
    }

    const numericGoal = Number(goal);

    if (!Number.isFinite(numericGoal) || numericGoal < 1) {
      setMessage("Please enter a valid supporter goal.");
      return;
    }

    const slugBase = makeSlug(`${subtitle}-${title}`);

    if (!slugBase) {
      setMessage("Could not create a valid campaign URL.");
      return;
    }

    setLoading(true);

    try {
      const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from("campaigns").insert({
        slug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        category,
        target: target.trim(),
        description: description.trim(),
        goal: numericGoal,
        status: "pending",
        created_by: session.user.id,
      });

      if (error) {
        console.error(error);

        if (error.code === "23505") {
          setMessage("A similar campaign already exists.");
        } else {
          setMessage("Something went wrong. Please try again.");
        }

        return;
      }

      setSuccess(true);
      setMessage(
        "Your demand was submitted successfully. It will appear after review."
      );

      setTitle("");
      setSubtitle("");
      setCategory("TV & Series");
      setTarget("");
      setDescription("");
      setGoal("1000000");
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Checking account...
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

          <div className="flex gap-3">
            <a
              href="/account"
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
            >
              Account
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
            >
              ← Home
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            + START A DEMAND
          </div>

          <h1 className="text-4xl font-black sm:text-5xl">
            What do you want again?
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Submit a show, movie or game you want to see return. Your demand
            will be reviewed before it becomes public.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"
        >
          <label className="block">
            <span className="text-sm font-black">
              Demand title *
            </span>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: We Want Season 7"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Show, movie or game name *
            </span>

            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Example: Example Series"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Category *
            </span>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
            >
              <option value="TV & Series">TV & Series</option>
              <option value="Movies">Movies</option>
              <option value="Games">Games</option>
            </select>
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Target company *
            </span>

            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Example: Netflix, HBO, Rockstar Games..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Why should it come back? *
            </span>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why people want this show, movie or game to return..."
              className="mt-2 min-h-40 w-full resize-y rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={1000}
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Supporter goal *
            </span>

            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              min="1"
              max="100000000"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
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
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-violet-600 py-4 text-lg font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "SUBMITTING..." : "SUBMIT DEMAND"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Submitted campaigns are reviewed before becoming public.
          </p>
        </form>
      </section>
    </main>
  );
}