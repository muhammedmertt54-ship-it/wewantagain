"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
      setChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setLoggedIn(!!session?.user);
    setChecking(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="/" className="block">
          <div className="text-2xl font-black tracking-tight">
            WEWANT
            <span className="text-violet-600">AGAIN</span>
          </div>

          <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
            YOUR VOICE. THEIR ATTENTION.
          </div>
        </a>

        {/* DESKTOP MENU */}
        <nav className="hidden items-center gap-7 font-semibold lg:flex">
          <a
            href="/#trending"
            className="transition hover:text-violet-600"
          >
            🔥 Trending
          </a>

          <a
            href="/#most-wanted"
            className="transition hover:text-violet-600"
          >
            🏆 Most Wanted
          </a>

          <a
            href="/#categories"
            className="transition hover:text-violet-600"
          >
            Categories
          </a>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {!checking &&
            (loggedIn ? (
              <a
                href="/account"
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold transition hover:border-violet-300 hover:text-violet-600"
              >
                👤 Account
              </a>
            ) : (
              <a
                href="/signin"
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold transition hover:border-violet-300 hover:text-violet-600"
              >
                Sign In
              </a>
            ))}

          <a
            href={loggedIn ? "/start-demand" : "/signin?next=/start-demand"}
            className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
          >
            + Start a Demand
          </a>
        </div>

        {/* MOBILE HAMBURGER */}
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-2xl sm:hidden"
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 shadow-lg sm:hidden">
          <div className="space-y-2">
            <a
              href="/"
              className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
            >
              🏠 Home
            </a>

            <a
              href="/#trending"
              className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
            >
              🔥 Trending
            </a>

            <a
              href="/#most-wanted"
              className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
            >
              🏆 Most Wanted
            </a>

            <a
              href="/#categories"
              className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
            >
              📂 Categories
            </a>

            <div className="my-3 h-px bg-slate-200" />

            {!checking &&
              (loggedIn ? (
                <a
                  href="/account"
                  className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
                >
                  👤 Account
                </a>
              ) : (
                <a
                  href="/signin"
                  className="block rounded-xl px-4 py-3 font-bold hover:bg-violet-50"
                >
                  🔐 Sign In
                </a>
              ))}

            <a
              href={loggedIn ? "/start-demand" : "/signin?next=/start-demand"}
              className="mt-3 block rounded-xl bg-violet-600 px-4 py-4 text-center font-black text-white"
            >
              + START A DEMAND
            </a>
          </div>
        </div>
      )}
    </header>
  );
}