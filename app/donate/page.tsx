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
      "Profile supporter badge and supporter status.",
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
      "A stronger supporter identity with extra visual recognition.",
    perks: [
      "Everything in Supporter",
      "Special profile styling",
      "Backer badge",
      "Early access to selected features",
    ],
  },
  {
    name: "Champion",
    badge: "CHAMPION",
    description:
      "Our highest supporter level with premium community recognition.",
    perks: [
      "Everything in Backer",
      "Champion profile badge",
      "Premium supporter frame",
      "Priority access to preview features",
    ],
  },
];

type CreatedDonation = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  public_supporter: boolean;
  supporter_name: string | null;
  created_at: string;
};

export default function DonatePage() {
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
    createdDonation,
    setCreatedDonation,
  ] =
    useState<CreatedDonation | null>(
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
    setCreatedDonation(null);
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
    setCreatedDonation(null);

    if (
      !Number.isFinite(amount) ||
      amount < 1
    ) {
      setErrorMessage(
        "Please enter a valid donation amount."
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
          "/api/donations/create",
          {
            method: "POST",
            headers,

            body:
              JSON.stringify({
                amount,

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
            "Donation could not be created."
        );

        return;
      }

      setCreatedDonation(
        data.donation
      );

      setMessage(
        "Donation record created successfully. Secure checkout will be connected next."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Donation could not be created."
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
              Support WeWantAgain
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black sm:text-5xl">
              Help build the next
              chapter of WeWantAgain.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-100">
              Your support helps with
              infrastructure,
              development and platform
              operating costs.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-violet-600">
                Supporter benefits
              </div>

              <h2 className="mt-2 text-3xl font-black">
                More than just a
                thank you.
              </h2>

              <p className="mt-3 max-w-2xl text-slate-500">
                Supporters receive
                permanent recognition
                and cosmetic community
                benefits without
                affecting campaign
                voting power.
              </p>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {supporterTiers.map(
                (tier) => (
                  <article
                    key={tier.name}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
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

            <div className="mt-12 border-t border-slate-200 pt-10">
              <h2 className="text-2xl font-black">
                Choose your support
                amount
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Select a preset amount
                or enter your own.
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
                    setCreatedDonation(
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
                Optional note
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
                    You can choose a
                    public supporter
                    name. Your payment
                    details will never
                    be displayed.
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
                    Donation amount
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Secure checkout
                    will open next.
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

            {createdDonation && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="font-black text-green-800">
                  Donation initialized
                </div>

                <div className="mt-3 grid gap-2 text-sm text-green-800">
                  <div>
                    Donation ID:{" "}
                    <strong>
                      {
                        createdDonation.id
                      }
                    </strong>
                  </div>

                  <div className="break-all">
                    Reference:{" "}
                    <strong>
                      {
                        createdDonation.reference
                      }
                    </strong>
                  </div>

                  <div>
                    Status:{" "}
                    <strong>
                      {
                        createdDonation.status
                      }
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={creating}
              onClick={
                handleContinue
              }
              className="mt-6 w-full rounded-2xl bg-violet-600 px-6 py-5 text-lg font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "CREATING..."
                : "Continue to secure payment"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              Card information will be
              handled by the selected
              payment provider and will
              not be stored by
              WeWantAgain.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}