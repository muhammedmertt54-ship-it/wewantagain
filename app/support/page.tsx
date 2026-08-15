"use client";

import {
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const presetAmounts = [
  25,
  50,
  100,
  250,
];

const supporterTiers = [
  {
    name: "Supporter",
    badge: "SUPPORTER",
    description:
      "Show your support for WeWantAgain with permanent profile recognition.",
    perks: [
      "Supporter profile badge",
      "Supporters Wall eligibility",
      "Support history on your account",
    ],
  },
  {
    name: "Backer",
    badge: "BACKER",
    description:
      "Stand out with additional cosmetic supporter benefits.",
    perks: [
      "Everything in Supporter",
      "Special profile styling",
      "Backer profile badge",
      "Selected feature previews",
    ],
  },
  {
    name: "Champion",
    badge: "CHAMPION",
    description:
      "The highest supporter tier with premium community recognition.",
    perks: [
      "Everything in Backer",
      "Champion profile badge",
      "Premium supporter frame",
      "Priority preview access",
    ],
  },
];

type CreatedSupportPayment = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  public_supporter: boolean;
  supporter_name: string | null;
  created_at: string;
};

export default function SupportPage() {
  const [
    selectedAmount,
    setSelectedAmount,
  ] = useState<number>(50);

  const [
    customAmount,
    setCustomAmount,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    publicSupporter,
    setPublicSupporter,
  ] = useState(true);

  const [
    supporterName,
    setSupporterName,
  ] = useState("");

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [
    acceptedRefund,
    setAcceptedRefund,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    createdPayment,
    setCreatedPayment,
  ] =
    useState<CreatedSupportPayment | null>(
      null
    );

  const amount =
    useMemo(() => {
      const custom =
        Number(customAmount);

      if (
        customAmount.trim() &&
        Number.isFinite(custom) &&
        custom > 0
      ) {
        return custom;
      }

      return selectedAmount;
    }, [
      customAmount,
      selectedAmount,
    ]);

  function handlePreset(
    value: number
  ) {
    setSelectedAmount(value);
    setCustomAmount("");
    setMessage("");
    setErrorMessage("");
    setCreatedPayment(null);
  }

  async function getAccessToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.access_token ??
      null
    );
  }

  async function handleContinue() {
    setMessage("");
    setErrorMessage("");
    setCreatedPayment(null);

    if (
      !Number.isFinite(amount) ||
      amount < 1
    ) {
      setErrorMessage(
        "Please enter a valid support amount."
      );

      return;
    }

    if (
      !acceptedTerms ||
      !acceptedRefund
    ) {
      setErrorMessage(
        "Please accept the Terms of Service and Refund Policy before continuing."
      );

      return;
    }

    setCreating(true);

    try {
      const token =
        await getAccessToken();

      const headers: Record<
        string,
        string
      > = {
        "Content-Type":
          "application/json",
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          "/api/support-payments/create",
          {
            method: "POST",
            headers,

            body:
              JSON.stringify({
                amount,

terms_accepted:
  acceptedTerms,

refund_policy_accepted:
  acceptedRefund,


                note:
                  note.trim(),

                public_supporter:
                  publicSupporter,

                supporter_name:
                  publicSupporter
                    ? supporterName.trim()
                    : "",
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.error ??
            "Support payment could not be initialized."
        );

        return;
      }

      setCreatedPayment(
        data.payment
      );

      setMessage(
        "Your supporter checkout has been initialized. Secure payment will be connected next."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Support payment could not be initialized."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="inline-flex text-sm font-bold text-slate-500 hover:text-violet-600"
        >
          ← Back to website
        </a>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-6 py-12 text-white sm:px-10">
            <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest">
              WeWantAgain Supporters
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black sm:text-5xl">
              Become a WeWantAgain
              Supporter.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-100">
              Support the development
              and operation of
              WeWantAgain while
              receiving digital
              supporter benefits on
              your account.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-violet-600">
                Supporter benefits
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Your support comes
                with account benefits.
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                Supporter benefits are
                cosmetic and community
                focused. They do not
                increase campaign
                voting or support
                power.
              </p>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {supporterTiers.map(
                (tier) => (
                  <article
                    key={tier.name}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black tracking-wide text-violet-700">
                      {tier.badge}
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                      {tier.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {
                        tier.description
                      }
                    </p>

                    <div className="mt-5 space-y-3">
                      {tier.perks.map(
                        (perk) => (
                          <div
                            key={perk}
                            className="flex gap-3 text-sm font-bold text-slate-700"
                          >
                            <span className="text-green-600">
                              ✓
                            </span>

                            <span>
                              {perk}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>

            <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="font-black text-amber-900">
                Important
              </div>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                This is a supporter
                program with digital
                account benefits. It
                does not provide
                additional campaign
                influence, votes or
                guaranteed outcomes.
              </p>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-10">
              <h2 className="text-2xl font-black">
                Choose your support
                amount
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Select an amount or
                enter a custom amount.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {presetAmounts.map(
                (value) => {
                  const active =
                    !customAmount &&
                    selectedAmount ===
                      value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        handlePreset(
                          value
                        )
                      }
                      className={`rounded-2xl border px-4 py-5 text-lg font-black transition ${
                        active
                          ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-200"
                          : "border-slate-200 bg-white hover:border-violet-300"
                      }`}
                    >
                      ₺{value}
                    </button>
                  );
                }
              )}
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-black">
                Custom amount
              </span>

              <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-violet-500">
                <div className="flex items-center bg-slate-50 px-4 font-black text-slate-500">
                  ₺
                </div>

                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  value={
                    customAmount
                  }
                  onChange={(
                    event
                  ) => {
                    setCustomAmount(
                      event.target
                        .value
                    );

                    setMessage("");
                    setErrorMessage("");
                    setCreatedPayment(
                      null
                    );
                  }}
                  placeholder="Enter amount"
                  className="w-full px-4 py-4 outline-none"
                />
              </div>
            </label>

            <label className="mt-6 block">
              <span className="text-sm font-black">
                Optional supporter
                message
              </span>

              <textarea
                maxLength={300}
                value={note}
                onChange={(
                  event
                ) =>
                  setNote(
                    event.target
                      .value
                  )
                }
                placeholder="Write a short message..."
                className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    publicSupporter
                  }
                  onChange={(
                    event
                  ) =>
                    setPublicSupporter(
                      event.target
                        .checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />

                <div>
                  <div className="font-black">
                    Show me on the
                    Supporters Wall
                  </div>

                  <div className="mt-1 text-sm leading-6 text-slate-500">
                    Your chosen public
                    supporter name can
                    be displayed.
                    Payment information
                    will not be shown.
                  </div>
                </div>
              </label>

              {publicSupporter && (
                <label className="mt-5 block">
                  <span className="text-sm font-black">
                    Public supporter
                    name
                  </span>

                  <input
                    type="text"
                    maxLength={60}
                    value={
                      supporterName
                    }
                    onChange={(
                      event
                    ) =>
                      setSupporterName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Your name or username"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  />
                </label>
              )}
            </div>

            <div className="mt-8 rounded-2xl bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-400">
                    Support amount
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Secure checkout
                    opens after
                    confirmation.
                  </div>
                </div>

                <span className="text-3xl font-black">
                  ₺
                  {Number(
                    amount || 0
                  ).toLocaleString(
                    "tr-TR"
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    acceptedTerms
                  }
                  onChange={(
                    event
                  ) =>
                    setAcceptedTerms(
                      event.target
                        .checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />

                <span className="text-sm leading-6 text-slate-700">
                  I have read and accept the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-violet-600 hover:text-violet-800"
                  >
                    Terms of Service
                  </a>
                  .
                </span>
              </label>

              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    acceptedRefund
                  }
                  onChange={(
                    event
                  ) =>
                    setAcceptedRefund(
                      event.target
                        .checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />

                <span className="text-sm leading-6 text-slate-700">
                  I have read the{" "}
                  <a
                    href="/refund"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-violet-600 hover:text-violet-800"
                  >
                    Refund & Cancellation Policy
                  </a>{" "}
                  and understand the applicable
                  cancellation and refund terms.
                </span>
              </label>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Continuing only creates a
                supporter payment request.
                Supporter benefits are not
                activated until the payment
                provider verifies successful
                payment.
              </p>
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">
                {message}
              </div>
            )}

            {createdPayment && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="font-black text-green-800">
                  Support checkout
                  initialized
                </div>

                <div className="mt-3 grid gap-2 text-sm text-green-800">
                  <div>
                    Payment ID:{" "}
                    <strong>
                      {
                        createdPayment.id
                      }
                    </strong>
                  </div>

                  <div className="break-all">
                    Reference:{" "}
                    <strong>
                      {
                        createdPayment.reference
                      }
                    </strong>
                  </div>

                  <div>
                    Status:{" "}
                    <strong>
                      {
                        createdPayment.status
                      }
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={
                creating ||
                !acceptedTerms ||
                !acceptedRefund
              }
              onClick={
                handleContinue
              }
              className="mt-6 w-full rounded-2xl bg-violet-600 px-6 py-5 text-lg font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "PREPARING..."
                : "Continue to secure checkout"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              Card details will be
              handled by the selected
              payment provider and
              will not be stored by
              WeWantAgain.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}