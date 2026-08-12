"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CampaignStatus =
  | "pending"
  | "active"
  | "rejected";

type FilterStatus =
  | "all"
  | CampaignStatus;

type Campaign = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  target: string;
  description: string;
  goal: number;
  status: CampaignStatus;
  created_at: string;
  image_url: string | null;
  image_path: string | null;
  image_removed: boolean;
};

export default function AdminPage() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<string | null>(
    null
  );

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [
    campaigns,
    setCampaigns,
  ] = useState<Campaign[]>([]);

  const [filter, setFilter] =
    useState<FilterStatus>(
      "pending"
    );

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  const filteredCampaigns =
    useMemo(() => {
      if (filter === "all") {
        return campaigns;
      }

      return campaigns.filter(
        (campaign) =>
          campaign.status ===
          filter
      );
    }, [campaigns, filter]);

  const counts =
    useMemo(() => {
      return {
        all: campaigns.length,

        pending:
          campaigns.filter(
            (campaign) =>
              campaign.status ===
              "pending"
          ).length,

        active:
          campaigns.filter(
            (campaign) =>
              campaign.status ===
              "active"
          ).length,

        rejected:
          campaigns.filter(
            (campaign) =>
              campaign.status ===
              "rejected"
          ).length,
      };
    }, [campaigns]);

  async function checkSession() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.user) {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setLoading(false);

      return;
    }

    setIsLoggedIn(true);

    const {
      data: adminRow,
      error: adminError,
    } = await supabase
      .from("admins")
      .select("user_id")
      .eq(
        "user_id",
        session.user.id
      )
      .maybeSingle();

    if (
      adminError ||
      !adminRow
    ) {
      setIsAdmin(false);
      setLoading(false);

      return;
    }

    setIsAdmin(true);

    await loadCampaigns();

    setLoading(false);
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");
    setLoginLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email:
            email
              .trim()
              .toLowerCase(),

          password,
        }
      );

    if (error) {
      console.error(error);

      setErrorMessage(
        "Email or password is incorrect."
      );

      setLoginLoading(false);

      return;
    }

    setLoginLoading(false);

    await checkSession();
  }

  async function loadCampaigns() {
    const {
      data,
      error,
    } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, subtitle, category, target, description, goal, status, created_at, image_url, image_path, image_removed"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setErrorMessage(
        "Campaigns could not be loaded."
      );

      return;
    }

    setCampaigns(
      (data ?? []) as Campaign[]
    );
  }

  async function updateCampaignStatus(
    campaign: Campaign,
    newStatus: CampaignStatus
  ) {
    setMessage("");
    setErrorMessage("");

    const label =
      newStatus === "active"
        ? "approve"
        : newStatus ===
            "rejected"
        ? "reject"
        : "move back to pending";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${label} "${campaign.title}"?`
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      `${campaign.id}:status:${newStatus}`
    );

    const { error } =
      await supabase
        .from("campaigns")
        .update({
          status: newStatus,
        })
        .eq(
          "id",
          campaign.id
        );

    setActionLoading(null);

    if (error) {
      console.error(error);

      setErrorMessage(
        "Campaign status could not be updated."
      );

      return;
    }

    setCampaigns(
      (current) =>
        current.map((item) =>
          item.id ===
          campaign.id
            ? {
                ...item,
                status:
                  newStatus,
              }
            : item
        )
    );

    if (
      newStatus === "active"
    ) {
      setMessage(
        "Campaign approved."
      );
    } else if (
      newStatus === "rejected"
    ) {
      setMessage(
        "Campaign rejected."
      );
    } else {
      setMessage(
        "Campaign moved back to pending."
      );
    }
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

  async function manageCampaign(
    campaign: Campaign,
    action:
      | "remove-image"
      | "delete"
  ) {
    setMessage("");
    setErrorMessage("");

    if (
      action ===
      "remove-image"
    ) {
      const confirmed =
        window.confirm(
          `Remove the image from "${campaign.title}"?`
        );

      if (!confirmed) {
        return;
      }
    }

    if (
      action === "delete"
    ) {
      const confirmed =
        window.confirm(
          `Permanently delete "${campaign.title}"?\n\nThis will also delete its support records and stored image.`
        );

      if (!confirmed) {
        return;
      }
    }

    const token =
      await getAccessToken();

    if (!token) {
      setErrorMessage(
        "Admin session expired. Please sign in again."
      );

      return;
    }

    setActionLoading(
      `${campaign.id}:${action}`
    );

    try {
      const response =
        await fetch(
          "/api/admin/campaigns/manage",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                {
                  campaignId:
                    campaign.id,

                  action,
                }
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        setErrorMessage(
          data?.error ??
            "Campaign action failed."
        );

        return;
      }

      if (
        action ===
        "delete"
      ) {
        setCampaigns(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                campaign.id
            )
        );

        setMessage(
          "Campaign permanently deleted."
        );

        return;
      }

      setCampaigns(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              campaign.id
                ? {
                    ...item,

                    image_url:
                      null,

                    image_path:
                      null,

                    image_removed:
                      true,
                  }
                : item
          )
      );

      setMessage(
        "Campaign image removed."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Campaign action failed."
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setIsLoggedIn(false);
    setIsAdmin(false);

    setCampaigns([]);

    setEmail("");
    setPassword("");

    setMessage("");
    setErrorMessage("");
  }

  function statusStyle(
    status: CampaignStatus
  ) {
    if (
      status === "active"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      status === "rejected"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  function statusText(
    status: CampaignStatus
  ) {
    if (
      status === "active"
    ) {
      return "APPROVED";
    }

    if (
      status === "rejected"
    ) {
      return "REJECTED";
    }

    return "PENDING";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-lg font-black text-violet-600">
          Loading admin
          panel...
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-md">
          <a
            href="/"
            className="mb-8 inline-block font-bold text-slate-500 hover:text-violet-600"
          >
            ← Back to website
          </a>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="text-3xl font-black">
                WEWANT
                <span className="text-violet-600">
                  AGAIN
                </span>
              </div>

              <div className="mt-2 text-sm font-bold text-slate-400">
                ADMIN PANEL
              </div>
            </div>

            <form
              onSubmit={
                handleLogin
              }
              className="mt-8"
            >
              <label className="block">
                <span className="text-sm font-black">
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  placeholder="admin@example.com"
                  required
                />
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-black">
                  Password
                </span>

                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
                  placeholder="••••••••"
                  required
                />
              </label>

              {errorMessage && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm font-bold text-red-700">
                  {
                    errorMessage
                  }
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loginLoading
                }
                className="mt-6 w-full rounded-xl bg-violet-600 py-4 font-black text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {loginLoading
                  ? "SIGNING IN..."
                  : "SIGN IN"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="text-4xl">
            ⛔
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Access denied
          </h1>

          <p className="mt-3 text-slate-500">
            This account does
            not have admin
            permission.
          </p>

          <button
            onClick={
              handleLogout
            }
            className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"
          >
            Sign out
          </button>
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
              ADMIN PANEL
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/users"
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-700"
            >
              👥 Manage Users
            </a>

            <a
              href="/admin/copyright"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100"
            >
              © Copyright Reports
            </a>

            <a
              href="/admin/audit"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
            >
              🛡 Audit Logs
            </a>

            <a
              href="/admin/site"
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700 hover:bg-green-100"
            >
              ⚙ Site Management
            </a>

            <a
              href="/admin/notifications"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 hover:bg-violet-100"
            >
              🔔 Notifications
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              Website
            </a>

            <button
              onClick={
                handleLogout
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-red-300 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            {counts.all} TOTAL
            CAMPAIGNS
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Campaign management
          </h1>

          <p className="mt-2 text-slate-500">
            Review, approve,
            reject, restore or
            delete submitted
            campaigns.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <FilterButton
            active={
              filter ===
              "pending"
            }
            onClick={() =>
              setFilter(
                "pending"
              )
            }
            label="Pending"
            count={
              counts.pending
            }
          />

          <FilterButton
            active={
              filter ===
              "active"
            }
            onClick={() =>
              setFilter(
                "active"
              )
            }
            label="Active"
            count={
              counts.active
            }
          />

          <FilterButton
            active={
              filter ===
              "rejected"
            }
            onClick={() =>
              setFilter(
                "rejected"
              )
            }
            label="Rejected"
            count={
              counts.rejected
            }
          />

          <FilterButton
            active={
              filter ===
              "all"
            }
            onClick={() =>
              setFilter("all")
            }
            label="All"
            count={
              counts.all
            }
          />
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

        {filteredCampaigns.length ===
        0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              ✓
            </div>

            <h2 className="mt-4 text-2xl font-black">
              No campaigns here
            </h2>

            <p className="mt-2 text-slate-500">
              There are
              currently no
              campaigns matching
              this filter.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {filteredCampaigns.map(
              (campaign) => (
                <article
                  key={
                    campaign.id
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="grid gap-6 lg:grid-cols-[240px_1fr_220px]">
                    <div className="overflow-hidden rounded-2xl bg-slate-100">
                      {campaign.image_url &&
                      !campaign.image_removed ? (
                        <img
                          src={
                            campaign.image_url
                          }
                          alt={
                            campaign.subtitle
                          }
                          className="aspect-[16/10] h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[16/10] h-full items-center justify-center bg-gradient-to-br from-slate-900 to-violet-800 p-5 text-center font-black text-white">
                          Image unavailable
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                          {
                            campaign.category
                          }
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(
                            campaign.status
                          )}`}
                        >
                          {statusText(
                            campaign.status
                          )}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black">
                        {
                          campaign.title
                        }
                      </h2>

                      <p className="mt-1 text-lg font-bold text-violet-600">
                        {
                          campaign.subtitle
                        }
                      </p>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="text-xs font-bold uppercase text-slate-400">
                            Target
                          </div>

                          <div className="mt-1 font-black">
                            {
                              campaign.target
                            }
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="text-xs font-bold uppercase text-slate-400">
                            Goal
                          </div>

                          <div className="mt-1 font-black">
                            {Number(
                              campaign.goal
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs font-bold uppercase text-slate-400">
                          Description
                        </div>

                        <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                          {
                            campaign.description
                          }
                        </p>
                      </div>

                      <div className="mt-5 text-xs text-slate-400">
                        Submitted:{" "}
                        {new Date(
                          campaign.created_at
                        ).toLocaleString()}
                      </div>

                      <div className="mt-2 break-all text-xs text-slate-400">
                        Slug:{" "}
                        {campaign.slug}
                      </div>

                      {campaign.status ===
                        "active" && (
                        <a
                          href={`/campaign/${campaign.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-block font-black text-violet-600 hover:underline"
                        >
                          View live
                          campaign →
                        </a>
                      )}
                    </div>

                    <div className="grid h-fit gap-3">
                      {campaign.status !==
                        "active" && (
                        <button
                          type="button"
                          disabled={
                            actionLoading !==
                            null
                          }
                          onClick={() =>
                            updateCampaignStatus(
                              campaign,
                              "active"
                            )
                          }
                          className="rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading ===
                          `${campaign.id}:status:active`
                            ? "WAIT..."
                            : "✓ APPROVE"}
                        </button>
                      )}

                      {campaign.status !==
                        "rejected" && (
                        <button
                          type="button"
                          disabled={
                            actionLoading !==
                            null
                          }
                          onClick={() =>
                            updateCampaignStatus(
                              campaign,
                              "rejected"
                            )
                          }
                          className="rounded-xl bg-red-50 px-5 py-4 font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading ===
                          `${campaign.id}:status:rejected`
                            ? "WAIT..."
                            : "✕ REJECT"}
                        </button>
                      )}

                      {campaign.status !==
                        "pending" && (
                        <button
                          type="button"
                          disabled={
                            actionLoading !==
                            null
                          }
                          onClick={() =>
                            updateCampaignStatus(
                              campaign,
                              "pending"
                            )
                          }
                          className="rounded-xl bg-blue-50 px-5 py-4 font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {actionLoading ===
                          `${campaign.id}:status:pending`
                            ? "WAIT..."
                            : "↩ MOVE TO PENDING"}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={
                          actionLoading !==
                            null ||
                          campaign.image_removed
                        }
                        onClick={() =>
                          manageCampaign(
                            campaign,
                            "remove-image"
                          )
                        }
                        className="rounded-xl bg-amber-50 px-5 py-4 font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {actionLoading ===
                        `${campaign.id}:remove-image`
                          ? "REMOVING..."
                          : campaign.image_removed
                          ? "IMAGE REMOVED"
                          : "🖼 REMOVE IMAGE"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionLoading !==
                          null
                        }
                        onClick={() =>
                          manageCampaign(
                            campaign,
                            "delete"
                          )
                        }
                        className="rounded-xl bg-slate-950 px-5 py-4 font-black text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading ===
                        `${campaign.id}:delete`
                          ? "DELETING..."
                          : "🗑 DELETE CAMPAIGN"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-200"
          : "border-slate-200 bg-white hover:border-violet-300"
      }`}
    >
      <div
        className={`text-xs font-black uppercase tracking-wide ${
          active
            ? "text-white/70"
            : "text-slate-400"
        }`}
      >
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {count}
      </div>
    </button>
  );
}