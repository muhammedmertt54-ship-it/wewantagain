"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type UserIp = {
  id: number;
  ip_address: string;
  first_seen_at: string;
  last_seen_at: string;
  banned: boolean;
};

type Campaign = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
  created_at: string;
  image_url: string | null;
  image_removed: boolean;
};

type Support = {
  campaign_slug: string;
  verified: boolean;
  email: string | null;
  country: string | null;
};

type AuditLog = {
  id: number;
  admin_user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type UserDetails = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;

  is_admin: boolean;

  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;

  ips: UserIp[];
  campaigns: Campaign[];
  supports: Support[];
  audit_logs: AuditLog[];
};

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();

  const userId = params?.id;

  const [loading, setLoading] = useState(true);

  const [user, setUser] =
    useState<UserDetails | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  async function getToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.access_token ??
      null
    );
  }

  async function loadUser() {
    setLoading(true);
    setErrorMessage("");

    const token =
      await getToken();

    if (!token) {
      window.location.href =
        "/admin";

      return;
    }

    try {
      const response =
        await fetch(
          `/api/admin/users/${encodeURIComponent(
            userId
          )}`,
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
        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          window.location.href =
            "/admin";

          return;
        }

        setErrorMessage(
          data?.error ??
            "User details could not be loaded."
        );

        return;
      }

      setUser(
        data.user as UserDetails
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "User details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  function isUserBanned() {
    if (
      !user?.banned_until
    ) {
      return false;
    }

    const time =
      new Date(
        user.banned_until
      ).getTime();

    return (
      Number.isFinite(time) &&
      time > Date.now()
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading user details...
        </div>
      </main>
    );
  }

  if (
    errorMessage ||
    !user
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <a
            href="/admin/users"
            className="font-black text-violet-600"
          >
            ← Back to users
          </a>

          <div className="mt-8 rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black">
              User could not be loaded
            </h1>

            <p className="mt-3 text-red-600">
              {errorMessage}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const banned =
    isUserBanned();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-black">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN / USER DETAILS
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/users"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black hover:border-violet-300"
            >
              ← Users
            </a>

            <a
              href="/admin"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black hover:border-violet-300"
            >
              Admin Panel
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        {/* USER HEADER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {user.is_admin && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    ADMIN
                  </span>
                )}

                {banned ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                    BANNED
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                    ACTIVE
                  </span>
                )}

                {user.email_confirmed_at ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                    EMAIL VERIFIED
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                    EMAIL UNVERIFIED
                  </span>
                )}
              </div>

              <h1 className="mt-4 break-all text-4xl font-black">
                {user.display_name ||
                  user.username ||
                  user.email ||
                  "User"}
              </h1>

              {user.username && (
                <div className="mt-2 text-lg font-black text-violet-600">
                  @{user.username}
                </div>
              )}

              <div className="mt-2 break-all text-slate-500">
                {user.email ??
                  "No email"}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  user.id
                )
              }
              className="rounded-xl border border-slate-200 px-5 py-3 font-black hover:border-violet-300 hover:text-violet-600"
            >
              COPY USER ID
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox
              title="User ID"
              value={user.id}
              mono
            />

            <InfoBox
              title="Created"
              value={formatDate(
                user.created_at
              )}
            />

            <InfoBox
              title="Last Sign In"
              value={
                user.last_sign_in_at
                  ? formatDate(
                      user.last_sign_in_at
                    )
                  : "Never"
              }
            />

            <InfoBox
              title="Ban Until"
              value={
                user.banned_until
                  ? formatDate(
                      user.banned_until
                    )
                  : "Not banned"
              }
            />
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox
            title="Campaigns"
            value={
              user.campaigns.length
            }
          />

          <StatBox
            title="Supports"
            value={
              user.supports.length
            }
          />

          <StatBox
            title="IP Addresses"
            value={
              user.ips.length
            }
          />

          <StatBox
            title="Admin Actions"
            value={
              user.audit_logs.length
            }
          />
        </div>

        {/* IP HISTORY */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            🌐 IP History
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Recorded addresses used while this account was signed in.
          </p>

          {user.ips.length ===
          0 ? (
            <EmptyText text="No IP history recorded." />
          ) : (
            <div className="mt-6 space-y-3">
              {user.ips.map(
                (ip) => (
                  <div
                    key={ip.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="rounded-lg bg-white px-3 py-2 font-black">
                            {
                              ip.ip_address
                            }
                          </code>

                          {ip.banned && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                              BANNED
                            </span>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          First seen:{" "}
                          {formatDate(
                            ip.first_seen_at
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Last seen:{" "}
                          {formatDate(
                            ip.last_seen_at
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* CAMPAIGNS */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            📣 User Campaigns
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Campaigns submitted by this account.
          </p>

          {user.campaigns.length ===
          0 ? (
            <EmptyText text="This user has not submitted any campaigns." />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {user.campaigns.map(
                (campaign) => (
                  <a
                    key={
                      campaign.id
                    }
                    href={`/campaign/${campaign.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-2xl border border-slate-200 transition hover:border-violet-300 hover:shadow-lg"
                  >
                    <div className="aspect-[16/8] overflow-hidden bg-slate-100">
                      {campaign.image_url &&
                      !campaign.image_removed ? (
                        <img
                          src={
                            campaign.image_url
                          }
                          alt={
                            campaign.subtitle
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 to-violet-800 p-5 text-center font-black text-white">
                          {
                            campaign.subtitle
                          }
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                          {
                            campaign.category
                          }
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${campaignStatusStyle(
                            campaign.status
                          )}`}
                        >
                          {
                            campaign.status
                          }
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-black">
                        {
                          campaign.title
                        }
                      </h3>

                      <p className="mt-1 font-bold text-violet-600">
                        {
                          campaign.subtitle
                        }
                      </p>

                      <div className="mt-4 text-xs text-slate-400">
                        {formatDate(
                          campaign.created_at
                        )}
                      </div>
                    </div>
                  </a>
                )
              )}
            </div>
          )}
        </section>

        {/* SUPPORT HISTORY */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            ♥ Support History
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Campaign support records linked to this account.
          </p>

          {user.supports.length ===
          0 ? (
            <EmptyText text="This user has no linked support records." />
          ) : (
            <div className="mt-6 space-y-3">
              {user.supports.map(
                (
                  support,
                  index
                ) => (
                  <a
                    key={`${support.campaign_slug}-${index}`}
                    href={`/campaign/${support.campaign_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-violet-300 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-black">
                        {
                          support.campaign_slug
                        }
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {support.email ??
                          "No email"}
                        {support.country
                          ? ` • ${support.country}`
                          : ""}
                      </div>
                    </div>

                    {support.verified ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        VERIFIED
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                        UNVERIFIED
                      </span>
                    )}
                  </a>
                )
              )}
            </div>
          )}
        </section>

        {/* AUDIT */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                🛡 Admin History
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Administrative actions targeting this account.
              </p>
            </div>

            <a
              href="/admin/audit"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black hover:border-violet-300"
            >
              View All Logs
            </a>
          </div>

          {user.audit_logs.length ===
          0 ? (
            <EmptyText text="No admin actions recorded for this user." />
          ) : (
            <div className="mt-6 space-y-3">
              {user.audit_logs.map(
                (log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                          {
                            log.action
                          }
                        </span>

                        <div className="mt-3 text-xs text-slate-500">
                          Admin:{" "}
                          {log.admin_user_id ??
                            "Deleted admin"}
                        </div>

                        {log.details && (
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                            {JSON.stringify(
                              log.details,
                              null,
                              2
                            )}
                          </pre>
                        )}
                      </div>

                      <div className="text-xs font-bold text-slate-400">
                        {formatDate(
                          log.created_at
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function InfoBox({
  title,
  value,
  mono = false,
}: {
  title: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div
        className={`mt-2 break-all text-sm font-black ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatBox({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>
    </div>
  );
}

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
      {text}
    </div>
  );
}

function campaignStatusStyle(
  status: string
) {
  if (status === "active") {
    return "bg-green-100 text-green-700";
  }

  if (
    status === "rejected"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function formatDate(
  value: string
) {
  try {
    return new Date(
      value
    ).toLocaleString();
  } catch {
    return value;
  }
}