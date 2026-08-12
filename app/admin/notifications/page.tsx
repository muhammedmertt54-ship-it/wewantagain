"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type NotificationType =
  | "info"
  | "warning"
  | "maintenance"
  | "success"
  | "urgent";

type SiteNotification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_active: boolean;
  dismissible: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationForm = {
  type: NotificationType;
  title: string;
  message: string;
  is_active: boolean;
  dismissible: boolean;
  starts_at: string;
  ends_at: string;
};

const EMPTY_FORM: NotificationForm = {
  type: "info",
  title: "",
  message: "",
  is_active: true,
  dismissible: true,
  starts_at: "",
  ends_at: "",
};

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "info",
    label: "Info",
    icon: "ℹ️",
    description: "General information",
  },
  {
    value: "warning",
    label: "Warning",
    icon: "⚠️",
    description: "Important warning",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    icon: "🛠️",
    description: "Maintenance notice",
  },
  {
    value: "success",
    label: "Success",
    icon: "✅",
    description: "Completed or successful event",
  },
  {
    value: "urgent",
    label: "Urgent",
    icon: "🚨",
    description: "Critical announcement",
  },
];

const TEMPLATES: {
  name: string;
  icon: string;
  type: NotificationType;
  title: string;
  message: string;
  dismissible: boolean;
}[] = [
  {
    name: "1 Hour Before",
    icon: "🕐",
    type: "maintenance",
    title: "Scheduled Maintenance in 1 Hour",
    message:
      "WeWantAgain will enter scheduled maintenance in approximately 1 hour. Some features may become temporarily unavailable.",
    dismissible: true,
  },
  {
    name: "30 Minutes Before",
    icon: "⏰",
    type: "warning",
    title: "Maintenance Starts in 30 Minutes",
    message:
      "Scheduled maintenance will begin in approximately 30 minutes. Please complete any unfinished actions before maintenance begins.",
    dismissible: true,
  },
  {
    name: "Maintenance Started",
    icon: "🛠️",
    type: "maintenance",
    title: "Maintenance Has Started",
    message:
      "WeWantAgain is currently undergoing scheduled maintenance. We are working to bring the website back online as soon as possible.",
    dismissible: false,
  },
  {
    name: "Maintenance Completed",
    icon: "✅",
    type: "success",
    title: "Maintenance Completed",
    message:
      "Scheduled maintenance has been completed successfully. WeWantAgain is fully available again.",
    dismissible: true,
  },
  {
    name: "New Feature",
    icon: "✨",
    type: "info",
    title: "New Feature Available",
    message:
      "A new feature has been added to WeWantAgain. Explore the website to see what is new.",
    dismissible: true,
  },
  {
    name: "Temporary Issue",
    icon: "⚠️",
    type: "warning",
    title: "Temporary System Issue",
    message:
      "We are currently experiencing a temporary system issue. Some features may not work as expected while we investigate.",
    dismissible: true,
  },
  {
    name: "Submissions Closed",
    icon: "🔒",
    type: "warning",
    title: "Submissions Temporarily Closed",
    message:
      "New campaign submissions are temporarily unavailable. Existing campaigns remain accessible.",
    dismissible: true,
  },
  {
    name: "Urgent Notice",
    icon: "🚨",
    type: "urgent",
    title: "Important Notice",
    message:
      "WeWantAgain has an important announcement. Please review this message carefully.",
    dismissible: false,
  },
];

function formatDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get(
    "hour"
  )}:${get("minute")}`;
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "No limit";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNotificationStatus(notification: SiteNotification) {
  if (!notification.is_active) {
    return {
      label: "INACTIVE",
      className:
        "border border-zinc-700 bg-zinc-800 text-zinc-300",
    };
  }

  const now = Date.now();

  const start = notification.starts_at
    ? new Date(notification.starts_at).getTime()
    : null;

  const end = notification.ends_at
    ? new Date(notification.ends_at).getTime()
    : null;

  if (start !== null && Number.isFinite(start) && now < start) {
    return {
      label: "SCHEDULED",
      className:
        "border border-blue-500/30 bg-blue-500/10 text-blue-300",
    };
  }

  if (end !== null && Number.isFinite(end) && now >= end) {
    return {
      label: "EXPIRED",
      className:
        "border border-zinc-700 bg-zinc-900 text-zinc-500",
    };
  }

  return {
    label: "LIVE",
    className:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

function getTypeStyles(type: NotificationType) {
  switch (type) {
    case "warning":
      return {
        wrapper:
          "border-amber-500/30 bg-amber-500/10",
        badge:
          "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: "⚠️",
      };

    case "maintenance":
      return {
        wrapper:
          "border-blue-500/30 bg-blue-500/10",
        badge:
          "bg-blue-500/15 text-blue-300 border-blue-500/30",
        icon: "🛠️",
      };

    case "success":
      return {
        wrapper:
          "border-emerald-500/30 bg-emerald-500/10",
        badge:
          "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        icon: "✅",
      };

    case "urgent":
      return {
        wrapper:
          "border-red-500/40 bg-red-500/10",
        badge:
          "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "🚨",
      };

    default:
      return {
        wrapper:
          "border-violet-500/30 bg-violet-500/10",
        badge:
          "bg-violet-500/15 text-violet-300 border-violet-500/30",
        icon: "ℹ️",
      };
  }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<
    SiteNotification[]
  >([]);

  const [form, setForm] =
    useState<NotificationForm>(EMPTY_FORM);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const getAccessToken =
    useCallback(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found. Please sign in again."
        );
      }

      return session.access_token;
    }, []);

  const loadNotifications =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          await getAccessToken();

        const response =
          await fetch(
            "/api/admin/notifications",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Notifications could not be loaded."
          );
        }

        setNotifications(
          data?.notifications ?? []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Notifications could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }, [getAccessToken]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const useTemplate = (
    template: (typeof TEMPLATES)[number]
  ) => {
    setEditingId(null);

    setForm({
      type: template.type,
      title: template.title,
      message: template.message,
      is_active: true,
      dismissible:
        template.dismissible,
      starts_at: "",
      ends_at: "",
    });

    setSuccess(
      `"${template.name}" template loaded.`
    );

    setTimeout(() => {
      document
        .getElementById(
          "notification-editor"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  const editNotification = (
    notification: SiteNotification
  ) => {
    setEditingId(notification.id);

    setForm({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_active:
        notification.is_active,
      dismissible:
        notification.dismissible,
      starts_at:
        formatDateForInput(
          notification.starts_at
        ),
      ends_at:
        formatDateForInput(
          notification.ends_at
        ),
    });

    setError("");
    setSuccess("");

    setTimeout(() => {
      document
        .getElementById(
          "notification-editor"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  const saveNotification =
    async () => {
      try {
        setSaving(true);
        setError("");
        setSuccess("");

        if (!form.title.trim()) {
          setError(
            "Notification title is required."
          );
          return;
        }

        if (!form.message.trim()) {
          setError(
            "Notification message is required."
          );
          return;
        }

        if (
          form.starts_at &&
          form.ends_at
        ) {
          const start =
            new Date(
              `${form.starts_at}:00+03:00`
            ).getTime();

          const end =
            new Date(
              `${form.ends_at}:00+03:00`
            ).getTime();

          if (end <= start) {
            setError(
              "End time must be after start time."
            );
            return;
          }
        }

        const token =
          await getAccessToken();

        const method =
          editingId === null
            ? "POST"
            : "PATCH";

        const payload =
          editingId === null
            ? {
                ...form,
              }
            : {
                id: editingId,
                ...form,
              };

        const response =
          await fetch(
            "/api/admin/notifications",
            {
              method,
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(
                payload
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Notification could not be saved."
          );
        }

        setSuccess(
          editingId === null
            ? "Notification published successfully."
            : "Notification updated successfully."
        );

        setForm(EMPTY_FORM);
        setEditingId(null);

        await loadNotifications();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Notification could not be saved."
        );
      } finally {
        setSaving(false);
      }
    };

  const toggleNotification =
    async (
      notification: SiteNotification
    ) => {
      try {
        setError("");
        setSuccess("");

        const token =
          await getAccessToken();

        const response =
          await fetch(
            "/api/admin/notifications",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                id: notification.id,
                is_active:
                  !notification.is_active,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Notification status could not be changed."
          );
        }

        setSuccess(
          notification.is_active
            ? "Notification disabled."
            : "Notification activated."
        );

        await loadNotifications();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Notification status could not be changed."
        );
      }
    };

  const deleteNotification =
    async (
      notification: SiteNotification
    ) => {
      const confirmed =
        window.confirm(
          `Delete "${notification.title}"?\n\nThis action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setSuccess("");

        const token =
          await getAccessToken();

        const response =
          await fetch(
            `/api/admin/notifications?id=${notification.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Notification could not be deleted."
          );
        }

        if (
          editingId ===
          notification.id
        ) {
          resetForm();
        }

        setSuccess(
          "Notification deleted."
        );

        await loadNotifications();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Notification could not be deleted."
        );
      }
    };

  const stats =
    useMemo(() => {
      const now = Date.now();

      let live = 0;
      let scheduled = 0;
      let inactive = 0;
      let expired = 0;

      notifications.forEach(
        (notification) => {
          if (
            !notification.is_active
          ) {
            inactive += 1;
            return;
          }

          const start =
            notification.starts_at
              ? new Date(
                  notification.starts_at
                ).getTime()
              : null;

          const end =
            notification.ends_at
              ? new Date(
                  notification.ends_at
                ).getTime()
              : null;

          if (
            start !== null &&
            Number.isFinite(start) &&
            now < start
          ) {
            scheduled += 1;
            return;
          }

          if (
            end !== null &&
            Number.isFinite(end) &&
            now >= end
          ) {
            expired += 1;
            return;
          }

          live += 1;
        }
      );

      return {
        total:
          notifications.length,
        live,
        scheduled,
        inactive,
        expired,
      };
    }, [notifications]);

  const previewStyles =
    getTypeStyles(form.type);

  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              WeWantAgain Admin
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Global Notifications
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Publish announcements,
              maintenance warnings and
              urgent messages across
              WeWantAgain.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              ← Admin
            </Link>

            <Link
              href="/"
              target="_blank"
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              Open Website ↗
            </Link>

            <button
              type="button"
              onClick={
                loadNotifications
              }
              className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
          />

          <StatCard
            label="Live"
            value={stats.live}
          />

          <StatCard
            label="Scheduled"
            value={
              stats.scheduled
            }
          />

          <StatCard
            label="Inactive"
            value={
              stats.inactive
            }
          />

          <StatCard
            label="Expired"
            value={
              stats.expired
            }
          />
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-200">
            🚨 {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-200">
            ✅ {success}
          </div>
        )}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              Quick Templates
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Load a ready message,
              edit it if needed and
              publish.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map(
              (template) => (
                <button
                  key={
                    template.name
                  }
                  type="button"
                  onClick={() =>
                    useTemplate(
                      template
                    )
                  }
                  className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-500/40 hover:bg-zinc-900"
                >
                  <div className="mb-3 text-2xl">
                    {
                      template.icon
                    }
                  </div>

                  <div className="font-bold text-zinc-100">
                    {
                      template.name
                    }
                  </div>

                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {
                      template.title
                    }
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        <section
          id="notification-editor"
          className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"
        >
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ===
                  null
                    ? "Create Notification"
                    : `Edit Notification #${editingId}`}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Messages can appear
                  immediately or at a
                  scheduled time.
                </p>
              </div>

              {editingId !==
                null && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
                >
                  Cancel Editing
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-semibold text-zinc-300">
                  Notification Type
                </label>

                <div className="grid gap-2 sm:grid-cols-5">
                  {NOTIFICATION_TYPES.map(
                    (item) => {
                      const active =
                        form.type ===
                        item.value;

                      return (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() =>
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,
                                type: item.value,
                              })
                            )
                          }
                          className={`rounded-2xl border p-3 text-left transition ${
                            active
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                          }`}
                        >
                          <div className="text-xl">
                            {
                              item.icon
                            }
                          </div>

                          <div className="mt-2 text-sm font-bold">
                            {
                              item.label
                            }
                          </div>

                          <div className="mt-1 text-[11px] leading-4 text-zinc-500">
                            {
                              item.description
                            }
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Title
                </label>

                <input
                  value={
                    form.title
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  maxLength={150}
                  placeholder="Important announcement"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                />

                <div className="mt-1 text-right text-xs text-zinc-600">
                  {
                    form.title
                      .length
                  }
                  /150
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Message
                </label>

                <textarea
                  value={
                    form.message
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        message:
                          event.target
                            .value,
                      })
                    )
                  }
                  maxLength={1000}
                  rows={6}
                  placeholder="Write the message shown to visitors..."
                  className="w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
                />

                <div className="mt-1 text-right text-xs text-zinc-600">
                  {
                    form.message
                      .length
                  }
                  /1000
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DateInput
                  label="Starts At"
                  value={
                    form.starts_at
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        starts_at:
                          value,
                      })
                    )
                  }
                  hint="Leave empty to start immediately."
                />

                <DateInput
                  label="Ends At"
                  value={
                    form.ends_at
                  }
                  onChange={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        ends_at:
                          value,
                      })
                    )
                  }
                  hint="Leave empty for no automatic end."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  title="Notification Active"
                  description="Allow this notification to appear on the website."
                  checked={
                    form.is_active
                  }
                  onChange={(
                    checked
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        is_active:
                          checked,
                      })
                    )
                  }
                />

                <ToggleCard
                  title="Dismissible"
                  description="Allow visitors to close the notification."
                  checked={
                    form.dismissible
                  }
                  onChange={(
                    checked
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        dismissible:
                          checked,
                      })
                    )
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    saveNotification
                  }
                  className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId ===
                      null
                    ? "📢 Publish Notification"
                    : "💾 Save Changes"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    resetForm
                  }
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-3 font-bold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Live Preview
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Example of how the
                message can appear.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-5 ${previewStyles.wrapper}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  {
                    previewStyles.icon
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-white">
                      {form.title ||
                        "Notification title"}
                    </strong>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${previewStyles.badge}`}
                    >
                      {
                        form.type
                      }
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {form.message ||
                      "Your notification message will appear here."}
                  </p>
                </div>

                {form.dismissible && (
                  <span className="text-zinc-500">
                    ×
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
              <PreviewRow
                label="Status"
                value={
                  form.is_active
                    ? "Active"
                    : "Inactive"
                }
              />

              <PreviewRow
                label="Start"
                value={
                  form.starts_at ||
                  "Immediately"
                }
              />

              <PreviewRow
                label="End"
                value={
                  form.ends_at ||
                  "No automatic end"
                }
              />

              <PreviewRow
                label="Closable"
                value={
                  form.dismissible
                    ? "Yes"
                    : "No"
                }
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                All Notifications
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Manage previously
                created announcements.
              </p>
            </div>

            <div className="text-sm text-zinc-500">
              {
                notifications.length
              }{" "}
              notification
              {notifications.length ===
              1
                ? ""
                : "s"}
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-500">
              Loading
              notifications...
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
              <div className="text-4xl">
                📭
              </div>

              <h3 className="mt-4 font-bold">
                No notifications yet
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Create your first
                global announcement
                above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map(
                (notification) => {
                  const styles =
                    getTypeStyles(
                      notification.type
                    );

                  const status =
                    getNotificationStatus(
                      notification
                    );

                  return (
                    <article
                      key={
                        notification.id
                      }
                      className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${styles.badge}`}
                            >
                              {
                                styles.icon
                              }{" "}
                              {
                                notification.type
                              }
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>

                            <span className="text-xs text-zinc-600">
                              #
                              {
                                notification.id
                              }
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-bold text-zinc-100">
                            {
                              notification.title
                            }
                          </h3>

                          <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                            {
                              notification.message
                            }
                          </p>

                          <div className="mt-5 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <span className="text-zinc-600">
                                Starts:
                              </span>{" "}
                              {notification.starts_at
                                ? formatDisplayDate(
                                    notification.starts_at
                                  )
                                : "Immediately"}
                            </div>

                            <div>
                              <span className="text-zinc-600">
                                Ends:
                              </span>{" "}
                              {notification.ends_at
                                ? formatDisplayDate(
                                    notification.ends_at
                                  )
                                : "No limit"}
                            </div>

                            <div>
                              <span className="text-zinc-600">
                                Dismissible:
                              </span>{" "}
                              {notification.dismissible
                                ? "Yes"
                                : "No"}
                            </div>

                            <div>
                              <span className="text-zinc-600">
                                Created:
                              </span>{" "}
                              {formatDisplayDate(
                                notification.created_at
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              editNotification(
                                notification
                              )
                            }
                            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800"
                          >
                            ✏️ EDIT
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleNotification(
                                notification
                              )
                            }
                            className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                              notification.is_active
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {notification.is_active
                              ? "⏸ DISABLE"
                              : "▶ ACTIVATE"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteNotification(
                                notification
                              )
                            }
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                          >
                            🗑 DELETE
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-zinc-100">
        {value}
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-300">
        {label}
      </label>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-sm text-white outline-none transition focus:border-violet-500"
      />

      <p className="mt-2 text-xs text-zinc-600">
        {hint}
      </p>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-violet-500/40 bg-violet-500/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div>
        <div className="text-sm font-bold text-zinc-100">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-zinc-500">
          {description}
        </div>
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked
            ? "bg-violet-500"
            : "bg-zinc-700"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </div>
    </button>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-zinc-600">
        {label}
      </span>

      <span className="text-right font-medium text-zinc-300">
        {value}
      </span>
    </div>
  );
}