"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Supporter = {
  id: number;
  name: string | null;
  level:
    | "supporter"
    | "backer"
    | "champion"
    | null;
  amount: number;
  currency: string;
  paid_at: string | null;
};

type SupportersResponse = {
  supporters: Supporter[];
  count: number;
};

function getLevelLabel(
  level: Supporter["level"]
) {
  if (level === "champion") {
    return "CHAMPION";
  }

  if (level === "backer") {
    return "BACKER";
  }

  return "SUPPORTER";
}

function getLevelClasses(
  level: Supporter["level"]
) {
  if (level === "champion") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (level === "backer") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function getCardClasses(
  level: Supporter["level"]
) {
  if (level === "champion") {
    return "border-amber-200 bg-gradient-to-br from-white to-amber-50";
  }

  if (level === "backer") {
    return "border-indigo-200 bg-gradient-to-br from-white to-indigo-50";
  }

  return "border-slate-200 bg-white";
}

export default function SupportersPage() {
  const [
    supporters,
    setSupporters,
  ] = useState<Supporter[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSupporters() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            "/api/supporters?limit=100",
            {
              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as
            | SupportersResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data &&
              data.error
              ? data.error
              : "Supporters could not be loaded."
          );
        }

        if (!cancelled) {
          const result =
            data as SupportersResponse;

          setSupporters(
            result.supporters ??
              []
          );
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setErrorMessage(
            "Supporters could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSupporters();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSupporters =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return supporters;
      }

      return supporters.filter(
        (supporter) =>
          (
            supporter.name ??
            ""
          )
            .toLocaleLowerCase()
            .includes(query)
      );
    }, [
      supporters,
      search,
    ]);

  const champions =
    supporters.filter(
      (supporter) =>
        supporter.level ===
        "champion"
    ).length;

  const backers =
    supporters.filter(
      (supporter) =>
        supporter.level ===
        "backer"
    ).length;

  const supporterCount =
    supporters.filter(
      (supporter) =>
        supporter.level ===
          "supporter" ||
        supporter.level ===
          null
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-bold text-slate-500 transition hover:text-violet-600"
          >
            ← Back to WeWantAgain
          </Link>

          <Link
            href="/support"
            className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700"
          >
            Become a Supporter
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 px-6 py-14 text-white sm:px-10">
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
              WeWantAgain Community
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black sm:text-6xl">
              Supporters Wall
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-100">
              A public thank-you to
              verified WeWantAgain
              supporters who choose to
              appear here.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-200">
              Only successfully
              verified supporter
              payments can appear on
              this page.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Supporters
                </div>

                <div className="mt-2 text-3xl font-black">
                  {supporterCount}
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                <div className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  Backers
                </div>

                <div className="mt-2 text-3xl font-black text-indigo-950">
                  {backers}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="text-xs font-black uppercase tracking-wider text-amber-700">
                  Champions
                </div>

                <div className="mt-2 text-3xl font-black text-amber-950">
                  {champions}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  Our supporters
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Public names shown
                  here are chosen by
                  supporters themselves.
                </p>
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
                placeholder="Search supporters"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 sm:max-w-xs"
              />
            </div>

            {loading && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <div className="font-black">
                  Loading supporters...
                </div>
              </div>
            )}

            {!loading &&
              errorMessage && (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
                  {errorMessage}
                </div>
              )}

            {!loading &&
              !errorMessage &&
              supporters.length ===
                0 && (
                <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <div className="text-4xl">
                    ✨
                  </div>

                  <h3 className="mt-4 text-2xl font-black">
                    The wall is waiting
                    for its first
                    verified supporter.
                  </h3>

                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    Pending or test
                    payment attempts do
                    not appear here.
                    Supporters are shown
                    only after a payment
                    provider verifies a
                    successful payment.
                  </p>

                  <Link
                    href="/support"
                    className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700"
                  >
                    View Supporter
                    Program
                  </Link>
                </div>
              )}

            {!loading &&
              !errorMessage &&
              supporters.length >
                0 &&
              filteredSupporters.length ===
                0 && (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                  No supporter matches
                  your search.
                </div>
              )}

            {!loading &&
              !errorMessage &&
              filteredSupporters.length >
                0 && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSupporters.map(
                    (
                      supporter
                    ) => (
                      <article
                        key={
                          supporter.id
                        }
                        className={`rounded-3xl border p-6 shadow-sm ${getCardClasses(
                          supporter.level
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-white">
                            {(
                              supporter.name ??
                              "S"
                            )
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div
                            className={`rounded-full border px-3 py-1 text-[11px] font-black tracking-wider ${getLevelClasses(
                              supporter.level
                            )}`}
                          >
                            {getLevelLabel(
                              supporter.level
                            )}
                          </div>
                        </div>

                        <h3 className="mt-5 break-words text-xl font-black">
                          {supporter.name ??
                            "Supporter"}
                        </h3>

                        <div className="mt-5 border-t border-slate-200/80 pt-4">
                          <div className="text-xs font-bold text-slate-400">
                            Verified supporter
                          </div>

                          {supporter.paid_at && (
                            <div className="mt-1 text-xs text-slate-500">
                              Since{" "}
                              {new Date(
                                supporter.paid_at
                              ).toLocaleDateString(
                                "en-US",
                                {
                                  year:
                                    "numeric",
                                  month:
                                    "short",
                                  day:
                                    "numeric",
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
          </div>
        </section>
      </div>
    </main>
  );
}