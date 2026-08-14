"use client";

import {
  useEffect,
  useState,
} from "react";

import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

type SiteSettings = {
  support_enabled?: boolean;
};

export default function SupportButton() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [country, setCountry] =
    useState("Türkiye");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [
    checkingSupportStatus,
    setCheckingSupportStatus,
  ] = useState(true);

  const [
    supportEnabled,
    setSupportEnabled,
  ] = useState(true);

  const [
    supportStatusMessage,
    setSupportStatusMessage,
  ] = useState("");

  useEffect(() => {
    checkSupportStatus();
  }, []);

  async function checkSupportStatus() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("site_settings")
        .select("settings")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Support settings load error:",
          error
        );

        setSupportEnabled(false);

        setSupportStatusMessage(
          "Support is temporarily unavailable."
        );

        return;
      }

      const settings =
        data?.settings &&
        typeof data.settings === "object"
          ? (data.settings as SiteSettings)
          : {};

      const enabled =
        settings.support_enabled !== false;

      setSupportEnabled(enabled);

      if (!enabled) {
        setSupportStatusMessage(
          "Supporting campaigns is currently disabled by WeWantAgain."
        );
      } else {
        setSupportStatusMessage("");
      }
    } catch (error) {
      console.error(
        "Support settings error:",
        error
      );

      setSupportEnabled(false);

      setSupportStatusMessage(
        "Support is temporarily unavailable."
      );
    } finally {
      setCheckingSupportStatus(false);
    }
  }

  async function handleSupport() {
    setMessage("");

    if (!supportEnabled) {
      setMessage(
        supportStatusMessage ||
          "Supporting campaigns is currently disabled."
      );
      return;
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !cleanEmail.includes("@")
    ) {
      setMessage(
        "Please enter a valid email."
      );
      return;
    }

    if (!agreed) {
      setMessage(
        "Please accept the Terms and Privacy Policy."
      );
      return;
    }

    const campaignSlug =
      pathname
        .split("/")
        .filter(Boolean)
        .pop();

    if (!campaignSlug) {
      setMessage(
        "Campaign could not be found."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const headers:
        Record<string, string> = {
          "Content-Type":
            "application/json",
        };

      if (
        session?.access_token
      ) {
        headers.Authorization =
          `Bearer ${session.access_token}`;
      }

      /*
       * Support kaydı artık doğrudan
       * browser -> Supabase şeklinde
       * oluşturulmuyor.
       *
       * Önce server API'ye gidiyor.
       */
      const response =
        await fetch(
          "/api/supports/create",
          {
            method: "POST",
            headers,
            body:
              JSON.stringify({
                email:
                  cleanEmail,

                country,

                campaignSlug,
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        if (
          data?.code ===
          "SUPPORT_DISABLED"
        ) {
          setSupportEnabled(
            false
          );

          setSupportStatusMessage(
            data?.error ||
              "Supporting campaigns is currently disabled."
          );
        }

        setMessage(
          data?.error ||
            "Something went wrong. Please try again."
        );

        return;
      }

      /*
       * Support kaydı server tarafından
       * kabul edildikten sonra mevcut
       * email verification akışına devam.
       */
      const {
        error:
          emailError,
      } =
        await supabase.auth.signInWithOtp({
          email:
            cleanEmail,

          options: {
            emailRedirectTo:
              `${window.location.origin}/verify?campaign=${encodeURIComponent(
                campaignSlug
              )}`,
          },
        });

      if (emailError) {
        console.error(
          "Verification email error:",
          emailError
        );

        setMessage(
          "Verification email could not be sent."
        );

        return;
      }

      setMessage(
        "Verification email sent! Check your inbox."
      );
    } catch (error) {
      console.error(
        "Support request error:",
        error
      );

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function openSupportModal() {
    setMessage("");

    if (
      checkingSupportStatus
    ) {
      return;
    }

    if (!supportEnabled) {
      setMessage(
        supportStatusMessage ||
          "Supporting campaigns is currently disabled."
      );

      setOpen(true);
      return;
    }

    setOpen(true);
  }

  return (
    <>
      <button
        onClick={openSupportModal}
        disabled={
          checkingSupportStatus
        }
        className="mt-6 w-full rounded-2xl bg-violet-600 py-5 text-xl font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checkingSupportStatus
          ? "CHECKING SUPPORT..."
          : supportEnabled
            ? "♥ SUPPORT"
            : "SUPPORT PAUSED"}
      </button>

      {!checkingSupportStatus &&
        !supportEnabled && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800">
            {supportStatusMessage ||
              "Supporting campaigns is currently disabled."}
          </div>
        )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {supportEnabled
                    ? "Support this demand"
                    : "Support paused"}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {supportEnabled
                    ? "Verify your email to make your support count."
                    : supportStatusMessage ||
                      "Supporting campaigns is currently disabled."}
                </p>
              </div>

              <button
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-lg px-3 py-1 text-xl text-slate-400"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {sessionNotice()}

            {supportEnabled ? (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="you@example.com"
                  className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-4 text-slate-950 outline-none focus:border-violet-500"
                />

                <select
                  value={country}
                  onChange={(e) =>
                    setCountry(
                      e.target.value
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-4 text-slate-950 outline-none"
                >
                  <option>
                    Türkiye
                  </option>

                  <option>
                    United States
                  </option>

                  <option>
                    United Kingdom
                  </option>

                  <option>
                    Germany
                  </option>

                  <option>
                    France
                  </option>

                  <option>
                    Brazil
                  </option>

                  <option>
                    Spain
                  </option>

                  <option>
                    Italy
                  </option>

                  <option>
                    Canada
                  </option>

                  <option>
                    Australia
                  </option>

                  <option>
                    Other
                  </option>
                </select>

                <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) =>
                      setAgreed(
                        e.target.checked
                      )
                    }
                    className="mt-1"
                  />

                  <span>
                    I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>

                <button
                  onClick={
                    handleSupport
                  }
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-violet-600 py-4 font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "SENDING..."
                    : "CONTINUE"}
                </button>
              </>
            ) : (
              <a
                href="/"
                className="mt-6 block w-full rounded-xl bg-violet-600 py-4 text-center font-black text-white hover:bg-violet-700"
              >
                BACK TO WEBSITE
              </a>
            )}

            {message && (
              <div className="mt-4 rounded-xl bg-violet-50 p-3 text-center text-sm font-semibold text-violet-700">
                {message}
              </div>
            )}

            {supportEnabled && (
              <p className="mt-4 text-center text-xs text-slate-400">
                Your support counts only after email verification.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function sessionNotice() {
  return null;
}