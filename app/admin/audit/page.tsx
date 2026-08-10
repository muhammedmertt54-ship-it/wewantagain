"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type AuditLog = {
  id: number;
  admin_user_id: string | null;
  target_user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }

  async function loadLogs() {
    setLoading(true);
    setErrorMessage("");

    const token = await getToken();

    if (!token) {
      window.location.href = "/admin";
      return;
    }

    try {
      const response = await fetch("/api/admin/audit", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/admin";
          return;
        }

        setErrorMessage(
          data?.error ?? "Audit logs could not be loaded."
        );

        return;
      }

      setLogs(
        Array.isArray(data?.logs)
          ? data.logs
          : []
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Audit logs could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  function actionLabel(action: string) {
    const labels: Record<string, string> = {
      "ban-user": "Ban User",
      "unban-user": "Unban User",
      "delete-user": "Delete User",
      "ban-ip": "Ban IP",
      "unban-ip": "Unban IP",
      "force-logout": "Force Logout",
      "make-admin": "Make Admin",
      "remove-admin": "Remove Admin",
    };

    return labels[action] ?? action;
  }

  function actionStyle(action: string) {
    if (
      action === "ban-user" ||
      action === "delete-user" ||
      action === "ban-ip" ||
      action === "remove-admin"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      action === "unban-user" ||
      action === "unban-ip" ||
      action === "make-admin"
    ) {
      return "bg-green-100 text-green-700";
    }

    return "bg-blue-100 text-blue-700";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading audit logs...
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
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN / AUDIT LOGS
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              ← Admin Panel
            </a>

            <a
              href="/admin/users"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              Users
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            🛡 {logs.length} LOGS
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Admin Audit Logs
          </h1>

          <p className="mt-2 text-slate-500">
            Review moderation and account-management actions.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {logs.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              ✓
            </div>

            <h2 className="mt-4 text-2xl font-black">
              No audit logs yet
            </h2>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {logs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${actionStyle(
                          log.action
                        )}`}
                      >
                        {actionLabel(log.action)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        Log #{log.id}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <InfoBox
                        title="Admin User ID"
                        value={log.admin_user_id ?? "Deleted admin"}
                      />

                      <InfoBox
                        title="Target User ID"
                        value={log.target_user_id ?? "No target user"}
                      />
                    </div>

                    {log.details && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Details
                        </div>

                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm text-slate-600">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="text-sm font-bold text-slate-400">
                    {new Date(
                      log.created_at
                    ).toLocaleString()}
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

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div className="mt-2 break-all font-mono text-sm font-bold">
        {value}
      </div>
    </div>
  );
}