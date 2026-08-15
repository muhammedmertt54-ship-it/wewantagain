"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

type SupporterLevel =
  | "supporter"
  | "backer"
  | "champion"
  | null;

type SupportPayment = {
  id: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  supporter_level: SupporterLevel;
  provider: string | null;
  reference: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
};

type ApiResponse = {
  payments: SupportPayment[];
  count: number;
};

function formatMoney(
  amount: number,
  currency: string
) {
  if (currency === "TRY") {
    return `₺${amount.toLocaleString(
      "tr-TR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return `${amount.toLocaleString()} ${currency}`;
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function getStatusLabel(
  status: PaymentStatus
) {
  if (status === "paid") {
    return "PAID";
  }

  if (status === "pending") {
    return "PENDING";
  }

  if (status === "failed") {
    return "FAILED";
  }

  if (status === "cancelled") {
    return "CANCELLED";
  }

  return "REFUNDED";
}

function getStatusClasses(
  status: PaymentStatus
) {
  if (status === "paid") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "refunded") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getTierLabel(
  tier: SupporterLevel
) {
  if (tier === "champion") {
    return "CHAMPION";
  }

  if (tier === "backer") {
    return "BACKER";
  }

  if (tier === "supporter") {
    return "SUPPORTER";
  }

  return "NO TIER";
}

function getTierClasses(
  tier: SupporterLevel
) {
  if (tier === "champion") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (tier === "backer") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (tier === "supporter") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

export default function SupportHistoryPage() {
  const [
    payments,
    setPayments,
  ] = useState<
    SupportPayment[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    "all" | PaymentStatus
  >("all");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href =
          "/signin?next=/support-history";

        return;
      }

      const response =
        await fetch(
          "/api/account/support-payments",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Support payment history could not be loaded."
        );
      }

      const result =
        data as ApiResponse;

      setPayments(
        result.payments ??
          []
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Support payment history could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments =
    useMemo(() => {
      if (
        selectedStatus ===
        "all"
      ) {
        return payments;
      }

      return payments.filter(
        (payment) =>
          payment.status ===
          selectedStatus
      );
    }, [
      payments,
      selectedStatus,
    ]);

  const summary =
    useMemo(() => {
      const paidPayments =
        payments.filter(
          (payment) =>
            payment.status ===
            "paid"
        );

      const totalPaid =
        paidPayments.reduce(
          (
            sum,
            payment
          ) =>
            sum +
            payment.amount,
          0
        );

      return {
        total:
          payments.length,

        paid:
          paidPayments.length,

        pending:
          payments.filter(
            (payment) =>
              payment.status ===
              "pending"
          ).length,

        totalPaid,
      };
    }, [payments]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/account"
              className="text-sm font-bold text-slate-500 transition hover:text-violet-600"
            >
              ← Back to Account
            </Link>

            <h1 className="mt-3 text-4xl font-black">
              Support History
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View your WeWantAgain
              supporter payment
              history.
            </p>
          </div>

          <Link
            href="/support"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700"
          >
            Supporter Program
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              Total records
            </div>

            <div className="mt-2 text-3xl font-black">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-green-700">
              Paid
            </div>

            <div className="mt-2 text-3xl font-black text-green-950">
              {summary.paid}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-amber-700">
              Pending
            </div>

            <div className="mt-2 text-3xl font-black text-amber-950">
              {summary.pending}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-violet-700">
              Total paid
            </div>

            <div className="mt-2 text-3xl font-black text-violet-950">
              {formatMoney(
                summary.totalPaid,
                "TRY"
              )}
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap gap-2">
            {[
              "all",
              "pending",
              "paid",
              "failed",
              "cancelled",
              "refunded",
            ].map(
              (status) => (
                <button
                  key={
                    status
                  }
                  type="button"
                  onClick={() =>
                    setSelectedStatus(
                      status as
                        | "all"
                        | PaymentStatus
                    )
                  }
                  className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                    selectedStatus ===
                    status
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              )
            )}
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center font-black">
              Loading support
              history...
            </div>
          )}

          {!loading &&
            errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            )}

          {!loading &&
            !errorMessage &&
            filteredPayments.length ===
              0 && (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-4xl">
                  💜
                </div>

                <h2 className="mt-4 text-2xl font-black">
                  No support payments
                  here.
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  No payments match
                  the selected status.
                </p>
              </div>
            )}

          {!loading &&
            !errorMessage &&
            filteredPayments.length >
              0 && (
              <div className="mt-6 space-y-4">
                {filteredPayments.map(
                  (
                    payment
                  ) => (
                    <article
                      key={
                        payment.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black">
                              Payment #
                              {
                                payment.id
                              }
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black tracking-wider ${getStatusClasses(
                                payment.status
                              )}`}
                            >
                              {getStatusLabel(
                                payment.status
                              )}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black tracking-wider ${getTierClasses(
                                payment.supporter_level
                              )}`}
                            >
                              {getTierLabel(
                                payment.supporter_level
                              )}
                            </span>
                          </div>

                          <div className="mt-3 text-3xl font-black">
                            {formatMoney(
                              payment.amount,
                              payment.currency
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Provider
                          </div>

                          <div className="mt-2 font-black">
                            {payment.provider ??
                              "Not connected"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Created
                          </div>

                          <div className="mt-2 text-sm font-bold">
                            {formatDate(
                              payment.created_at
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Paid at
                          </div>

                          <div className="mt-2 text-sm font-bold">
                            {formatDate(
                              payment.paid_at
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Reference
                          </div>

                          <div className="mt-2 break-all font-mono text-xs font-bold">
                            {payment.reference ??
                              "—"}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
        </section>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500">
          Supporter benefits are only
          activated after successful
          payment verification. Pending
          payment attempts do not grant
          supporter status.
        </div>
      </div>
    </main>
  );
}