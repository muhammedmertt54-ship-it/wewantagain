"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

type SupportPayment = {
  id: number;
  user_id: string | null;
  amount: number;
  currency: string;
  note: string | null;
  status: PaymentStatus;
  provider: string | null;
  provider_payment_id: string | null;
  provider_reference: string | null;
  public_supporter: boolean;
  supporter_name: string | null;
  supporter_level:
    | "supporter"
    | "backer"
    | "champion"
    | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
  terms_accepted_at: string | null;
  refund_policy_accepted_at: string | null;
  terms_version: string | null;
  refund_policy_version: string | null;
};

type ApiResponse = {
  payments: SupportPayment[];
  count: number;
  current_admin_role:
    | "owner"
    | "admin";
};

const statusOptions: {
  value: "all" | PaymentStatus;
  label: string;
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];

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

function getLevelClasses(
  level: SupportPayment["supporter_level"]
) {
  if (level === "champion") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (level === "backer") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (level === "supporter") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

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

export default function AdminSupportPaymentsPage() {
  const [
    payments,
    setPayments,
  ] = useState<
    SupportPayment[]
  >([]);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    "all" | PaymentStatus
  >("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    currentRole,
    setCurrentRole,
  ] = useState<
    "owner" | "admin" | null
  >(null);

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

  async function loadPayments(
    showRefresh = false
  ) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setErrorMessage(
          "Admin session not found."
        );

        return;
      }

      const params =
        new URLSearchParams();

      params.set(
        "limit",
        "250"
      );

      if (
        selectedStatus !==
        "all"
      ) {
        params.set(
          "status",
          selectedStatus
        );
      }

      const response =
        await fetch(
          `/api/admin/support-payments?${params.toString()}`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
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
            "Support payments could not be loaded."
        );
      }

      const result =
        data as ApiResponse;

      setPayments(
        result.payments ??
          []
      );

      setCurrentRole(
        result.current_admin_role
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Support payments could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [selectedStatus]);

  const filteredPayments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return payments;
      }

      return payments.filter(
        (payment) => {
          const fields = [
            String(
              payment.id
            ),

            payment.user_id ??
              "",

            payment.provider_reference ??
              "",

            payment.provider_payment_id ??
              "",

            payment.supporter_name ??
              "",

            payment.note ??
              "",

            payment.status,
          ];

          return fields.some(
            (field) =>
              field
                .toLowerCase()
                .includes(
                  query
                )
          );
        }
      );
    }, [
      payments,
      search,
    ]);

  const summary =
    useMemo(() => {
      const total =
        payments.length;

      const pending =
        payments.filter(
          (payment) =>
            payment.status ===
            "pending"
        ).length;

      const paid =
        payments.filter(
          (payment) =>
            payment.status ===
            "paid"
        ).length;

      const paidTotal =
        payments
          .filter(
            (payment) =>
              payment.status ===
              "paid"
          )
          .reduce(
            (
              sum,
              payment
            ) =>
              sum +
              payment.amount,
            0
          );

      return {
        total,
        pending,
        paid,
        paidTotal,
      };
    }, [payments]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-bold text-slate-500 transition hover:text-violet-600"
            >
              ← Back to Admin
            </Link>

            <h1 className="mt-3 text-4xl font-black">
              Support Payments
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View supporter payment
              records and provider
              verification status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentRole && (
              <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-violet-700">
                {currentRole}
              </div>
            )}

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                loadPayments(
                  true
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              Loaded records
            </div>

            <div className="mt-2 text-3xl font-black">
              {summary.total}
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

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-green-700">
              Paid
            </div>

            <div className="mt-2 text-3xl font-black text-green-950">
              {summary.paid}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-violet-700">
              Verified revenue
            </div>

            <div className="mt-2 text-3xl font-black text-violet-950">
              {formatMoney(
                summary.paidTotal,
                "TRY"
              )}
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(
                (option) => {
                  const active =
                    selectedStatus ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setSelectedStatus(
                          option.value
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                        active
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                      }`}
                    >
                      {
                        option.label
                      }
                    </button>
                  );
                }
              )}
            </div>

            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search ID, reference, user..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 lg:max-w-sm"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Payment status cannot be
            manually changed here.
            A payment may only become
            <strong>
              {" "}paid{" "}
            </strong>
            after a verified payment
            provider callback.
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center font-black">
              Loading support
              payments...
            </div>
          )}

          {!loading &&
            !errorMessage &&
            filteredPayments.length ===
              0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-xl font-black">
                  No payments found
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  No records match
                  the current filter.
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
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black">
                              Payment #
                              {
                                payment.id
                              }
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getStatusClasses(
                                payment.status
                              )}`}
                            >
                              {
                                payment.status
                              }
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getLevelClasses(
                                payment.supporter_level
                              )}`}
                            >
                              {payment.supporter_level ??
                                "no tier"}
                            </span>
                          </div>

                          <div className="mt-3 text-3xl font-black">
                            {formatMoney(
                              payment.amount,
                              payment.currency
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Created
                              </div>

                              <div className="mt-1 font-bold">
                                {formatDate(
                                  payment.created_at
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Paid at
                              </div>

                              <div className="mt-1 font-bold">
                                {formatDate(
                                  payment.paid_at
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Provider
                              </div>

                              <div className="mt-1 font-bold">
                                {payment.provider ??
                                  "Not connected"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white xl:min-w-56">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Public supporter
                          </div>

                          <div className="mt-2 text-lg font-black">
                            {payment.public_supporter
                              ? payment.supporter_name ||
                                "Enabled"
                              : "Hidden"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            User ID
                          </div>

                          <div className="mt-2 break-all text-sm font-bold">
                            {payment.user_id ??
                              "Guest / no linked user"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Internal reference
                          </div>

                          <div className="mt-2 break-all text-sm font-bold">
                            {payment.provider_reference ??
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Provider payment ID
                          </div>

                          <div className="mt-2 break-all text-sm font-bold">
                            {payment.provider_payment_id ??
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Updated
                          </div>

                          <div className="mt-2 text-sm font-bold">
                            {formatDate(
                              payment.updated_at
                            )}
                          </div>
                        </div>
                      </div>

                      {payment.note && (
                        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Supporter message
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {
                              payment.note
                            }
                          </p>
                        </div>
                      )}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-green-700">
                            Terms acceptance
                          </div>

                          <div className="mt-2 text-sm font-bold text-green-950">
                            {formatDate(
                              payment.terms_accepted_at
                            )}
                          </div>

                          <div className="mt-1 text-xs text-green-800">
                            Version:{" "}
                            {payment.terms_version ??
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wider text-green-700">
                            Refund policy acceptance
                          </div>

                          <div className="mt-2 text-sm font-bold text-green-950">
                            {formatDate(
                              payment.refund_policy_accepted_at
                            )}
                          </div>

                          <div className="mt-1 text-xs text-green-800">
                            Version:{" "}
                            {payment.refund_policy_version ??
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
      </div>
    </main>
  );
}