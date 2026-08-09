
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SupportButton() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSupport() {
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Please enter a valid email.");
      return;
    }

    if (!agreed) {
      setMessage("Please accept the Terms and Privacy Policy.");
      return;
    }

    const campaignSlug = pathname.split("/").filter(Boolean).pop();

    if (!campaignSlug) {
      setMessage("Campaign could not be found.");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase
      .from("supports")
      .insert({
        email: cleanEmail,
        country,
        campaign_slug: campaignSlug,
        verified: false,
      });

    if (insertError && insertError.code !== "23505") {
      console.error(insertError);
      setLoading(false);
      setMessage("Something went wrong. Please try again.");
      return;
    }

    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/verify?campaign=${encodeURIComponent(
          campaignSlug
        )}`,
      },
    });

    setLoading(false);

    if (emailError) {
      console.error(emailError);
      setMessage("Verification email could not be sent.");
      return;
    }

    setMessage("Verification email sent! Check your inbox.");
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="mt-6 w-full rounded-2xl bg-violet-600 py-5 text-xl font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
      >
        ♥ SUPPORT
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Support this demand
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Verify your email to make your support count.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1 text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-4 text-slate-950 outline-none focus:border-violet-500"
            />

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-4 text-slate-950 outline-none"
            >
              <option>Türkiye</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Germany</option>
              <option>France</option>
              <option>Brazil</option>
              <option>Spain</option>
              <option>Italy</option>
              <option>Canada</option>
              <option>Australia</option>
              <option>Other</option>
            </select>

            <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />

              <span>
                I agree to the Terms of Service and Privacy Policy.
              </span>
            </label>

            <button
              onClick={handleSupport}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-violet-600 py-4 font-black text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "SENDING..." : "CONTINUE"}
            </button>

            {message && (
              <div className="mt-4 rounded-xl bg-violet-50 p-3 text-center text-sm font-semibold text-violet-700">
                {message}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              Your support counts only after email verification.
            </p>
          </div>
        </div>
      )}
    </>
  );
}