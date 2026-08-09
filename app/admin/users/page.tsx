"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  isAdmin: boolean;
  providers: string[];
  metadata: Record<string, unknown>;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState("");

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      window.location.href = "/admin";
      return null;
    }

    return session.access_token;
  }

  async function loadUsers() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const token = await getAccessToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/admin";
        return;
      }

      if (response.status === 403) {
        setErrorMessage("Bu hesap admin yetkisine sahip değil.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data?.error ?? "Kullanıcılar yüklenemedi."
        );
        setLoading(false);
        return;
      }

      setUsers(data.users ?? []);
      setCurrentAdminId(data.currentAdminId ?? "");
    } catch (error) {
      console.error(error);
      setErrorMessage("Kullanıcılar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function manageUser(
    user: AdminUser,
    action: "ban" | "unban" | "delete"
  ) {
    setMessage("");
    setErrorMessage("");

    if (user.id === currentAdminId) {
      setErrorMessage("Kendi admin hesabını yönetemezsin.");
      return;
    }

    if (user.isAdmin) {
      setErrorMessage("Admin hesapları bu ekrandan yönetilemez.");
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `${user.email ?? user.id} hesabını kalıcı olarak silmek istiyor musun?`
      );

      if (!confirmed) {
        return;
      }
    }

    if (action === "ban") {
      const confirmed = window.confirm(
        `${user.email ?? user.id} hesabını engellemek istiyor musun?`
      );

      if (!confirmed) {
        return;
      }
    }

    const token = await getAccessToken();

    if (!token) {
      return;
    }

    setActionLoading(`${user.id}:${action}`);

    try {
      const response = await fetch(
        "/api/admin/users/manage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.error ?? "İşlem gerçekleştirilemedi."
        );
        return;
      }

      if (action === "delete") {
        setUsers((current) =>
          current.filter((item) => item.id !== user.id)
        );

        setMessage("Kullanıcı hesabı silindi.");
        return;
      }

      setMessage(
        action === "ban"
          ? "Kullanıcı engellendi."
          : "Kullanıcının engeli kaldırıldı."
      );

      await loadUsers();
    } catch (error) {
      console.error(error);
      setErrorMessage("İşlem sırasında hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  }

  function isUserBanned(user: AdminUser) {
    if (!user.bannedUntil) {
      return false;
    }

    const bannedUntil = new Date(user.bannedUntil).getTime();

    return Number.isFinite(bannedUntil) &&
      bannedUntil > Date.now();
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const email = user.email?.toLowerCase() ?? "";
      const id = user.id.toLowerCase();

      return email.includes(query) || id.includes(query);
    });
  }, [users, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Kullanıcılar yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <a href="/">
              <div className="text-2xl font-black">
                WEWANT
                <span className="text-violet-600">
                  AGAIN
                </span>
              </div>
            </a>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN / USERS
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/admin"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              ← Admin Panel
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
              👥 {users.length} USERS
            </div>

            <h1 className="mt-4 text-4xl font-black">
              User Management
            </h1>

            <p className="mt-2 text-slate-500">
              Kullanıcı hesaplarını görüntüle, engelle veya sil.
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-black hover:border-violet-300"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mt-8">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Email veya User ID ara..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 outline-none focus:border-violet-500"
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

        <div className="mt-8 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Kullanıcı bulunamadı.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const banned = isUserBanned(user);

              return (
                <article
                  key={user.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {user.isAdmin && (
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

                        {user.emailConfirmedAt ? (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                            VERIFIED
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                            EMAIL NOT VERIFIED
                          </span>
                        )}
                      </div>

                      <h2 className="mt-4 break-all text-xl font-black">
                        {user.email ?? "No email"}
                      </h2>

                      <div className="mt-3 break-all rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-500">
                        {user.id}
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-bold text-slate-400">
                            CREATED
                          </div>

                          <div className="mt-1 font-bold">
                            {new Date(
                              user.createdAt
                            ).toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-bold text-slate-400">
                            LAST SIGN IN
                          </div>

                          <div className="mt-1 font-bold">
                            {user.lastSignInAt
                              ? new Date(
                                  user.lastSignInAt
                                ).toLocaleString()
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-bold text-slate-400">
                            PROVIDER
                          </div>

                          <div className="mt-1 font-bold">
                            {user.providers.length > 0
                              ? user.providers.join(", ")
                              : "email"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-60 xl:grid-cols-1">
                      {!user.isAdmin &&
                        user.id !== currentAdminId && (
                          <>
                            {banned ? (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !== null
                                }
                                onClick={() =>
                                  manageUser(
                                    user,
                                    "unban"
                                  )
                                }
                                className="rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionLoading ===
                                `${user.id}:unban`
                                  ? "WAIT..."
                                  : "UNBAN"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !== null
                                }
                                onClick={() =>
                                  manageUser(
                                    user,
                                    "ban"
                                  )
                                }
                                className="rounded-xl bg-amber-500 px-5 py-4 font-black text-white hover:bg-amber-600 disabled:opacity-50"
                              >
                                {actionLoading ===
                                `${user.id}:ban`
                                  ? "WAIT..."
                                  : "BAN USER"}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={
                                actionLoading !== null
                              }
                              onClick={() =>
                                manageUser(
                                  user,
                                  "delete"
                                )
                              }
                              className="rounded-xl bg-red-50 px-5 py-4 font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {actionLoading ===
                              `${user.id}:delete`
                                ? "DELETING..."
                                : "DELETE ACCOUNT"}
                            </button>
                          </>
                        )}

                      {user.id === currentAdminId && (
                        <div className="rounded-xl bg-violet-50 p-4 text-center text-sm font-black text-violet-700">
                          YOUR ADMIN ACCOUNT
                        </div>
                      )}

                      {user.isAdmin &&
                        user.id !== currentAdminId && (
                          <div className="rounded-xl bg-violet-50 p-4 text-center text-sm font-black text-violet-700">
                            PROTECTED ADMIN
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}