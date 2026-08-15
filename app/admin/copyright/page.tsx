"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type CopyrightReport = {
  id: number;
  full_name: string;
  email: string;
  campaign_url: string;
  work_description: string;
  disputed_content: string;
  relationship: string;
  accuracy_confirmed: boolean;
  status: string;
  created_at: string;
};

export default function AdminCopyrightPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<CopyrightReport[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

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

  async function loadReports() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const token =
      await getAccessToken();

    if (!token) {
      window.location.href =
        "/admin";

      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/copyright",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          window.location.href =
            "/admin";

          return;
        }

        setErrorMessage(
          data?.error ??
            "Copyright reports could not be loaded."
        );

        setLoading(false);

        return;
      }

      setReports(
        (data?.reports ??
          []) as CopyrightReport[]
      );

      setLoading(false);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Copyright reports could not be loaded."
      );

      setLoading(false);
    }
  }

  async function updateStatus(
    id: number,
    status:
      | "reviewing"
      | "resolved"
      | "rejected"
  ) {
    setMessage("");
    setErrorMessage("");

    const token =
      await getAccessToken();

    if (!token) {
      window.location.href =
        "/admin";

      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/copyright",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                id,
                status,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          window.location.href =
            "/admin";

          return;
        }

        setErrorMessage(
          data?.error ??
            "Report status could not be updated."
        );

        return;
      }

      setReports(
        (current) =>
          current.map(
            (report) =>
              report.id === id
                ? {
                    ...report,
                    status,
                  }
                : report
          )
      );

      setMessage(
        "Report status updated."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Report status could not be updated."
      );
    }
  }

  function statusStyle(status: string) {
    if (status === "resolved") {
      return "bg-green-100 text-green-700";
    }

    if (status === "rejected") {
      return "bg-red-100 text-red-700";
    }

    if (status === "reviewing") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading copyright reports...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <div className="text-2xl font-black">
              WEWANT
              <span className="text-violet-600">AGAIN</span>
            </div>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN / COPYRIGHT
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              â† Admin Panel
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              Website
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            Â© {reports.length} REPORTS
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Copyright Reports
          </h1>

          <p className="mt-2 text-slate-500">
            Review copyright and takedown complaints submitted by rights holders.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 font-bold text-green-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">âœ“</div>

            <h2 className="mt-4 text-2xl font-black">
              No copyright reports
            </h2>

            <p className="mt-2 text-slate-500">
              There are currently no submitted takedown requests.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusStyle(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        Report #{report.id}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black">
                      {report.full_name}
                    </h2>

                    <p className="mt-1 break-all font-semibold text-violet-600">
                      {report.email}
                    </p>

                    <div className="mt-6 grid gap-4">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Campaign URL
                        </div>

                        <a
                          href={report.campaign_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all font-bold text-violet-600 hover:underline"
                        >
                          {report.campaign_url}
                        </a>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Protected work
                        </div>

                        <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                          {report.work_description}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Disputed content
                        </div>

                        <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                          {report.disputed_content}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Relationship to rights holder
                        </div>

                        <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                          {report.relationship}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 text-xs text-slate-400">
                      Submitted:{" "}
                      {new Date(report.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-56 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(report.id, "reviewing")
                      }
                      className="rounded-xl bg-blue-50 px-5 py-4 font-black text-blue-700 hover:bg-blue-100"
                    >
                      MARK REVIEWING
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(report.id, "resolved")
                      }
                      className="rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700"
                    >
                      RESOLVE
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(report.id, "rejected")
                      }
                      className="rounded-xl bg-red-50 px-5 py-4 font-black text-red-700 hover:bg-red-100"
                    >
                      REJECT REPORT
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}