"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

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
  created_at: string;
  updated_at: string;
};

const TYPE_PRIORITY: Record<
  NotificationType,
  number
> = {
  urgent: 1,
  maintenance: 2,
  warning: 3,
  info: 4,
  success: 5,
};

function getNotificationStyle(
  type: NotificationType
) {
  switch (type) {
    case "urgent":
      return {
        icon: "🚨",
        label: "URGENT",
        wrapper:
          "border-red-500/40 bg-red-500/10",
        badge:
          "border-red-500/30 bg-red-500/15 text-red-300",
        title:
          "text-red-100",
        message:
          "text-red-100/80",
        button:
          "text-red-300 hover:bg-red-500/15 hover:text-red-100",
      };

    case "maintenance":
      return {
        icon: "🛠️",
        label: "MAINTENANCE",
        wrapper:
          "border-blue-500/40 bg-blue-500/10",
        badge:
          "border-blue-500/30 bg-blue-500/15 text-blue-300",
        title:
          "text-blue-100",
        message:
          "text-blue-100/80",
        button:
          "text-blue-300 hover:bg-blue-500/15 hover:text-blue-100",
      };

    case "warning":
      return {
        icon: "⚠️",
        label: "WARNING",
        wrapper:
          "border-amber-500/40 bg-amber-500/10",
        badge:
          "border-amber-500/30 bg-amber-500/15 text-amber-300",
        title:
          "text-amber-100",
        message:
          "text-amber-100/80",
        button:
          "text-amber-300 hover:bg-amber-500/15 hover:text-amber-100",
      };

    case "success":
      return {
        icon: "✅",
        label: "SUCCESS",
        wrapper:
          "border-emerald-500/40 bg-emerald-500/10",
        badge:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        title:
          "text-emerald-100",
        message:
          "text-emerald-100/80",
        button:
          "text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-100",
      };

    default:
      return {
        icon: "ℹ️",
        label: "INFO",
        wrapper:
          "border-violet-500/40 bg-violet-500/10",
        badge:
          "border-violet-500/30 bg-violet-500/15 text-violet-300",
        title:
          "text-violet-100",
        message:
          "text-violet-100/80",
        button:
          "text-violet-300 hover:bg-violet-500/15 hover:text-violet-100",
      };
  }
}

function getDismissKey(
  notification: SiteNotification
) {
  const version =
    notification.updated_at ||
    notification.created_at;

  return `wewantagain_notification_dismissed_${notification.id}_${version}`;
}

function isDismissed(
  notification: SiteNotification
) {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        getDismissKey(notification)
      ) === "1"
    );
  } catch {
    return false;
  }
}

function saveDismissed(
  notification: SiteNotification
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      getDismissKey(notification),
      "1"
    );
  } catch {
    // localStorage kapalıysa
    // bildirimi sadece mevcut sayfada gizleriz.
  }
}

export default function GlobalNotifications() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    SiteNotification[]
  >([]);

  const [
    dismissedIds,
    setDismissedIds,
  ] = useState<number[]>(
    []
  );

  const [loaded, setLoaded] =
    useState(false);

  const loadNotifications =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from(
            "site_notifications"
          )
          .select(
            `
            id,
            type,
            title,
            message,
            is_active,
            dismissible,
            starts_at,
            ends_at,
            created_at,
            updated_at
            `
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(10);

        if (error) {
          console.error(
            "Global notifications load error:",
            error
          );

          return;
        }

        const rows =
          (data ??
            []) as SiteNotification[];

        const localDismissed =
          rows
            .filter(
              (
                notification
              ) =>
                notification.dismissible &&
                isDismissed(
                  notification
                )
            )
            .map(
              (
                notification
              ) =>
                notification.id
            );

        setNotifications(
          rows
        );

        setDismissedIds(
          localDismissed
        );
      } catch (error) {
        console.error(
          "Global notifications unexpected error:",
          error
        );
      } finally {
        setLoaded(true);
      }
    }, []);

  useEffect(() => {
    loadNotifications();

    const interval =
      window.setInterval(
        () => {
          loadNotifications();
        },
        30_000
      );

    const handleFocus =
      () => {
        loadNotifications();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadNotifications();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadNotifications]);

  const visibleNotifications =
    useMemo(() => {
      return notifications
        .filter(
          (
            notification
          ) =>
            notification.is_active &&
            !dismissedIds.includes(
              notification.id
            )
        )
        .sort(
          (a, b) => {
            const priorityDifference =
              TYPE_PRIORITY[
                a.type
              ] -
              TYPE_PRIORITY[
                b.type
              ];

            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference;
            }

            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            );
          }
        );
    }, [
      notifications,
      dismissedIds,
    ]);

  const dismissNotification =
    (
      notification: SiteNotification
    ) => {
      if (
        !notification.dismissible
      ) {
        return;
      }

      saveDismissed(
        notification
      );

      setDismissedIds(
        (previous) => {
          if (
            previous.includes(
              notification.id
            )
          ) {
            return previous;
          }

          return [
            ...previous,
            notification.id,
          ];
        }
      );
    };

  if (
    !loaded ||
    visibleNotifications.length ===
      0
  ) {
    return null;
  }

  return (
    <section
      aria-label="Website notifications"
      className="relative z-40 border-b border-zinc-800/80 bg-[#08080c]"
    >
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6 lg:px-8">
        {visibleNotifications.map(
          (
            notification
          ) => {
            const styles =
              getNotificationStyle(
                notification.type
              );

            return (
              <div
                key={
                  notification.id
                }
                className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-sm backdrop-blur-sm sm:px-5 ${styles.wrapper}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 shrink-0 text-lg"
                    aria-hidden="true"
                  >
                    {
                      styles.icon
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.12em] ${styles.badge}`}
                      >
                        {
                          styles.label
                        }
                      </span>

                      <h2
                        className={`text-sm font-extrabold leading-5 ${styles.title}`}
                      >
                        {
                          notification.title
                        }
                      </h2>
                    </div>

                    <p
                      className={`mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 ${styles.message}`}
                    >
                      {
                        notification.message
                      }
                    </p>
                  </div>

                  {notification.dismissible && (
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      title="Dismiss"
                      onClick={() =>
                        dismissNotification(
                          notification
                        )
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-medium transition ${styles.button}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}