"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type AdminRole = "owner" | "admin" | "moderator";

type UserIp = {
  id: number;
  ip_address: string;
  first_seen_at: string;
  last_seen_at: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  admin_role: AdminRole | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed_at: string | null;
  ips: UserIp[];
};

type UserAction =
  | "ban-user"
  | "unban-user"
  | "delete-user"
  | "ban-ip"
  | "unban-ip"
  | "force-logout"
  | "make-admin"
  | "remove-admin"
  | "set-admin-role";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [bannedIps, setBannedIps] =
    useState<Set<string>>(new Set());

  const [currentAdminRole, setCurrentAdminRole] =
    useState<AdminRole | null>(null);

  const [currentAdminUserId, setCurrentAdminUserId] =
    useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const searchable = [
        user.email ?? "",
        user.username ?? "",
        user.display_name ?? "",
        user.id,
        user.admin_role ?? "",
        ...user.ips.map((ip) => ip.ip_address),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [users, search]);

  const isOwner = currentAdminRole === "owner";

  async function getSessionToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }

  async function loadUsers() {
    setLoading(true);
    setErrorMessage("");

    const token = await getSessionToken();

    if (!token) {
      window.location.href = "/admin";
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

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          window.location.href = "/admin";
          return;
        }

        setErrorMessage(
          data?.error ?? "Users could not be loaded."
        );
        return;
      }

      setUsers(
        Array.isArray(data?.users) ? data.users : []
      );

      const role =
        data?.current_admin_role === "owner" ||
        data?.current_admin_role === "admin" ||
        data?.current_admin_role === "moderator"
          ? data.current_admin_role
          : null;

      setCurrentAdminRole(role);

      setCurrentAdminUserId(
        typeof data?.current_admin_user_id === "string"
          ? data.current_admin_user_id
          : null
      );

      const serverBannedIps =
        Array.isArray(data?.banned_ips)
          ? data.banned_ips.filter(
              (ip: unknown): ip is string =>
                typeof ip === "string" &&
                ip.length > 0
            )
          : [];

      setBannedIps(new Set(serverBannedIps));
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Users could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  function isUserBanned(
    bannedUntil: string | null
  ) {
    if (!bannedUntil) {
      return false;
    }

    const time =
      new Date(bannedUntil).getTime();

    return (
      Number.isFinite(time) &&
      time > Date.now()
    );
  }

  function canPerformUserAction(
    user: AdminUser,
    action:
      | "ban"
      | "force-logout"
      | "delete"
  ) {
    if (!currentAdminRole) {
      return false;
    }

    if (
      user.id === currentAdminUserId
    ) {
      return false;
    }

    if (user.admin_role === "owner") {
      return false;
    }

    if (currentAdminRole === "owner") {
      return true;
    }

    if (currentAdminRole === "admin") {
      if (
        user.admin_role === "admin"
      ) {
        return false;
      }

      if (action === "delete") {
        return false;
      }

      return true;
    }

    if (action === "delete") {
      return false;
    }

    return user.admin_role === null;
  }

  function canManageIp(user: AdminUser) {
    if (
      currentAdminRole === "owner"
    ) {
      return true;
    }

    if (
      currentAdminRole === "admin"
    ) {
      return (
        user.admin_role !== "owner" &&
        user.admin_role !== "admin"
      );
    }

    return false;
  }

  async function manageUser(
    action: UserAction,
    options: {
      userId?: string;
      ipAddress?: string;
      label?: string;
      reason?: string;
      role?: "admin" | "moderator";
    }
  ) {
    setMessage("");
    setErrorMessage("");

    const token =
      await getSessionToken();

    if (!token) {
      setErrorMessage(
        "Admin session expired."
      );
      return;
    }

    let finalReason =
      options.reason ?? "";

    if (action === "ban-user") {
      const confirmed =
        window.confirm(
          `Ban ${
            options.label ??
            "this user"
          }?`
        );

      if (!confirmed) {
        return;
      }

      const entered =
        window.prompt(
          "Ban reason (optional):",
          ""
        );

      if (entered === null) {
        return;
      }

      finalReason =
        entered.trim();
    }

    if (action === "ban-ip") {
      const confirmed =
        window.confirm(
          `Ban IP address ${options.ipAddress}?`
        );

      if (!confirmed) {
        return;
      }

      const entered =
        window.prompt(
          "IP ban reason (optional):",
          ""
        );

      if (entered === null) {
        return;
      }

      finalReason =
        entered.trim();
    }

    if (action === "delete-user") {
      const confirmed =
        window.confirm(
          `Permanently delete ${
            options.label ??
            "this user"
          }?\n\nThis cannot be undone.`
        );

      if (!confirmed) {
        return;
      }
    }

    if (action === "force-logout") {
      const confirmed =
        window.confirm(
          `Force logout ${
            options.label ??
            "this user"
          } from all sessions?`
        );

      if (!confirmed) {
        return;
      }
    }

    if (action === "make-admin") {
      const confirmed =
        window.confirm(
          `Give ADMIN role to ${
            options.label ??
            "this user"
          }?`
        );

      if (!confirmed) {
        return;
      }
    }

    if (action === "set-admin-role") {
      const roleText =
        options.role === "moderator"
          ? "MODERATOR"
          : "ADMIN";

      const confirmed =
        window.confirm(
          `Change ${
            options.label ??
            "this user"
          } to ${roleText}?`
        );

      if (!confirmed) {
        return;
      }
    }

    if (action === "remove-admin") {
      const confirmed =
        window.confirm(
          `Remove staff permission from ${
            options.label ??
            "this user"
          }?`
        );

      if (!confirmed) {
        return;
      }
    }

    if (action === "unban-ip") {
      const confirmed =
        window.confirm(
          `Remove IP ban for ${options.ipAddress}?`
        );

      if (!confirmed) {
        return;
      }
    }

    const actionKey =
      action === "ban-ip" ||
      action === "unban-ip"
        ? `${action}:${options.ipAddress}`
        : action === "set-admin-role"
        ? `${action}:${options.userId}:${options.role}`
        : `${action}:${options.userId}`;

    setActionLoading(actionKey);

    try {
      const response = await fetch(
        "/api/admin/users/manage",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            userId:
              options.userId ?? null,
            ipAddress:
              options.ipAddress ?? null,
            reason:
              finalReason || null,
            role:
              options.role ?? null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.details
            ? `${
                data?.error ??
                "Action failed."
              } ${data.details}`
            : data?.error ??
                "Action could not be completed."
        );

        return;
      }

      if (action === "delete-user") {
        setUsers((current) =>
          current.filter(
            (user) =>
              user.id !== options.userId
          )
        );

        setMessage(
          "User deleted successfully."
        );

        return;
      }

      if (action === "ban-ip") {
        if (options.ipAddress) {
          setBannedIps((current) => {
            const next =
              new Set(current);

            next.add(
              options.ipAddress!
            );

            return next;
          });
        }

        setMessage(
          `IP ${options.ipAddress} banned.`
        );

        return;
      }

      if (action === "unban-ip") {
        if (options.ipAddress) {
          setBannedIps((current) => {
            const next =
              new Set(current);

            next.delete(
              options.ipAddress!
            );

            return next;
          });
        }

        setMessage(
          `IP ${options.ipAddress} unbanned.`
        );

        return;
      }

      if (action === "force-logout") {
        setMessage(
          "User sessions ended."
        );

        return;
      }

      await loadUsers();

      if (action === "ban-user") {
        setMessage(
          "User account banned."
        );
      }

      if (action === "unban-user") {
        setMessage(
          "User account unbanned."
        );
      }

      if (action === "make-admin") {
        setMessage(
          "Admin role granted."
        );
      }

      if (action === "set-admin-role") {
        setMessage(
          `Staff role changed to ${options.role?.toUpperCase()}.`
        );
      }

      if (action === "remove-admin") {
        setMessage(
          "Staff permission removed."
        );
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Action could not be completed."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading users...
        </div>
      </main>
    );
  }

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

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xs font-bold tracking-widest text-slate-400">
                ADMIN / USERS
              </div>

              {currentAdminRole && (
                <RoleBadge
                  role={currentAdminRole}
                  prefix="YOU:"
                />
              )}
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
              href="/admin/audit"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
            >
              Audit Logs
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:border-violet-300"
            >
              Website
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
              {users.length} USERS
            </div>

            <h1 className="mt-4 text-4xl font-black">
              User management
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Manage accounts, staff roles,
              sessions and IP restrictions.
              Server-side role checks remain
              authoritative even when a button
              is hidden here.
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            <label className="text-xs font-black uppercase tracking-wide text-slate-400">
              Search users
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Email, username, role, user ID or IP..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
            />
          </div>
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

        <div className="mt-8 text-sm font-bold text-slate-500">
          Showing {filteredUsers.length} of{" "}
          {users.length} users
        </div>

        {filteredUsers.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              🔎
            </div>

            <h2 className="mt-4 text-2xl font-black">
              No users found
            </h2>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {filteredUsers.map((user) => {
              const banned =
                isUserBanned(
                  user.banned_until
                );

              const label =
                user.email ??
                user.username ??
                user.id;

              const canBan =
                canPerformUserAction(
                  user,
                  "ban"
                );

              const canForceLogout =
                canPerformUserAction(
                  user,
                  "force-logout"
                );

              const canDelete =
                canPerformUserAction(
                  user,
                  "delete"
                );

              const isSelf =
                user.id ===
                currentAdminUserId;

              return (
                <article
                  key={user.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {user.admin_role && (
                          <RoleBadge
                            role={
                              user.admin_role
                            }
                          />
                        )}

                        {isSelf && (
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            YOU
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

                      <h2 className="mt-4 break-all text-2xl font-black">
                        {user.display_name ||
                          user.username ||
                          user.email ||
                          "User"}
                      </h2>

                      {user.username && (
                        <div className="mt-1 font-bold text-violet-600">
                          @{user.username}
                        </div>
                      )}

                      <div className="mt-2 break-all text-sm text-slate-500">
                        {user.email ??
                          "No email"}
                      </div>

                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <InfoBox
                          title="User ID"
                          value={user.id}
                          mono
                        />

                        <InfoBox
                          title="Staff role"
                          value={
                            user.admin_role
                              ? user.admin_role.toUpperCase()
                              : "USER"
                          }
                        />

                        <InfoBox
                          title="Created"
                          value={formatDate(
                            user.created_at
                          )}
                        />

                        <InfoBox
                          title="Last sign in"
                          value={
                            user.last_sign_in_at
                              ? formatDate(
                                  user.last_sign_in_at
                                )
                              : "Never"
                          }
                        />

                        <InfoBox
                          title="IP addresses"
                          value={String(
                            user.ips.length
                          )}
                        />
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-black">
                              IP history
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Recorded addresses used by
                              this account.
                            </p>
                          </div>

                          <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                            {user.ips.length} recorded
                          </div>
                        </div>

                        {user.ips.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                            No IP address has been
                            recorded yet.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {user.ips.map((ip) => {
                              const ipIsBanned =
                                bannedIps.has(
                                  ip.ip_address
                                );

                              const canIp =
                                canManageIp(
                                  user
                                );

                              return (
                                <div
                                  key={ip.id}
                                  className="rounded-xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <code className="break-all rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">
                                          {
                                            ip.ip_address
                                          }
                                        </code>

                                        {ipIsBanned && (
                                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                                            IP BANNED
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                                        <div>
                                          First seen:{" "}
                                          {formatDate(
                                            ip.first_seen_at
                                          )}
                                        </div>

                                        <div>
                                          Last seen:{" "}
                                          {formatDate(
                                            ip.last_seen_at
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {canIp &&
                                      (!ipIsBanned ? (
                                        <button
                                          type="button"
                                          disabled={
                                            actionLoading !==
                                            null
                                          }
                                          onClick={() =>
                                            manageUser(
                                              "ban-ip",
                                              {
                                                userId:
                                                  user.id,
                                                ipAddress:
                                                  ip.ip_address,
                                              }
                                            )
                                          }
                                          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                                        >
                                          {actionLoading ===
                                          `ban-ip:${ip.ip_address}`
                                            ? "BANNING..."
                                            : "BAN IP"}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={
                                            actionLoading !==
                                            null
                                          }
                                          onClick={() =>
                                            manageUser(
                                              "unban-ip",
                                              {
                                                userId:
                                                  user.id,
                                                ipAddress:
                                                  ip.ip_address,
                                              }
                                            )
                                          }
                                          className="rounded-xl bg-green-50 px-4 py-3 text-sm font-black text-green-700 hover:bg-green-100 disabled:opacity-50"
                                        >
                                          {actionLoading ===
                                          `unban-ip:${ip.ip_address}`
                                            ? "REMOVING..."
                                            : "UNBAN IP"}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-72 xl:grid-cols-1">
                      <a
                        href={`/admin/users/${user.id}`}
                        className="rounded-xl bg-slate-950 px-5 py-4 text-center font-black text-white hover:bg-violet-700"
                      >
                        VIEW DETAILS
                      </a>

                      {canBan &&
                        (banned ? (
                          <button
                            type="button"
                            disabled={
                              actionLoading !== null
                            }
                            onClick={() =>
                              manageUser(
                                "unban-user",
                                {
                                  userId:
                                    user.id,
                                  label,
                                }
                              )
                            }
                            className="rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading ===
                            `unban-user:${user.id}`
                              ? "WAIT..."
                              : "UNBAN USER"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              actionLoading !== null
                            }
                            onClick={() =>
                              manageUser(
                                "ban-user",
                                {
                                  userId:
                                    user.id,
                                  label,
                                }
                              )
                            }
                            className="rounded-xl bg-amber-50 px-5 py-4 font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            {actionLoading ===
                            `ban-user:${user.id}`
                              ? "WAIT..."
                              : "BAN USER"}
                          </button>
                        ))}

                      {canForceLogout && (
                        <button
                          type="button"
                          disabled={
                            actionLoading !== null
                          }
                          onClick={() =>
                            manageUser(
                              "force-logout",
                              {
                                userId: user.id,
                                label,
                              }
                            )
                          }
                          className="rounded-xl bg-blue-50 px-5 py-4 font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {actionLoading ===
                          `force-logout:${user.id}`
                            ? "WAIT..."
                            : "FORCE LOGOUT"}
                        </button>
                      )}

                      {isOwner &&
                        !isSelf &&
                        user.admin_role !==
                          "owner" && (
                          <>
                            {user.admin_role !==
                              "moderator" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  null
                                }
                                onClick={() =>
                                  manageUser(
                                    "set-admin-role",
                                    {
                                      userId:
                                        user.id,
                                      label,
                                      role:
                                        "moderator",
                                    }
                                  )
                                }
                                className="rounded-xl bg-cyan-50 px-5 py-4 font-black text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
                              >
                                {actionLoading ===
                                `set-admin-role:${user.id}:moderator`
                                  ? "WAIT..."
                                  : "MAKE MODERATOR"}
                              </button>
                            )}

                            {user.admin_role !==
                              "admin" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  null
                                }
                                onClick={() =>
                                  manageUser(
                                    user.admin_role
                                      ? "set-admin-role"
                                      : "make-admin",
                                    {
                                      userId:
                                        user.id,
                                      label,
                                      role:
                                        "admin",
                                    }
                                  )
                                }
                                className="rounded-xl bg-violet-600 px-5 py-4 font-black text-white hover:bg-violet-700 disabled:opacity-50"
                              >
                                {actionLoading ===
                                  `make-admin:${user.id}` ||
                                actionLoading ===
                                  `set-admin-role:${user.id}:admin`
                                  ? "WAIT..."
                                  : "MAKE ADMIN"}
                              </button>
                            )}

                            {user.admin_role && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  null
                                }
                                onClick={() =>
                                  manageUser(
                                    "remove-admin",
                                    {
                                      userId:
                                        user.id,
                                      label,
                                    }
                                  )
                                }
                                className="rounded-xl bg-violet-50 px-5 py-4 font-black text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                              >
                                {actionLoading ===
                                `remove-admin:${user.id}`
                                  ? "WAIT..."
                                  : "REMOVE STAFF"}
                              </button>
                            )}
                          </>
                        )}

                      {canDelete && (
                        <button
                          type="button"
                          disabled={
                            actionLoading !== null
                          }
                          onClick={() =>
                            manageUser(
                              "delete-user",
                              {
                                userId:
                                  user.id,
                                label,
                              }
                            )
                          }
                          className="rounded-xl bg-red-600 px-5 py-4 font-black text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading ===
                          `delete-user:${user.id}`
                            ? "DELETING..."
                            : "DELETE USER"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            user.id
                          )
                        }
                        className="rounded-xl border border-slate-200 px-5 py-4 font-black hover:border-violet-300 hover:text-violet-600"
                      >
                        COPY USER ID
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function RoleBadge({
  role,
  prefix = "",
}: {
  role: AdminRole;
  prefix?: string;
}) {
  const className =
    role === "owner"
      ? "bg-fuchsia-100 text-fuchsia-700"
      : role === "admin"
      ? "bg-violet-100 text-violet-700"
      : "bg-cyan-100 text-cyan-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {prefix ? `${prefix} ` : ""}
      {role.toUpperCase()}
    </span>
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
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div
        className={`mt-2 break-all text-sm font-bold ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}