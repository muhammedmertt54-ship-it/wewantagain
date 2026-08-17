import { NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  secureAdminApi,
} from "../../../../lib/security/secureAdminApi";
import {
  parseJsonBody,
  secureJson,
} from "../../../../lib/security/requestSecurity";

const NOTIFICATION_TYPES = [
  "info",
  "warning",
  "maintenance",
  "success",
  "urgent",
] as const;

type NotificationType =
  (typeof NOTIFICATION_TYPES)[number];

const MAX_BODY_BYTES =
  16_000;

const NOTIFICATION_READ_RATE_LIMIT =
  60;

const NOTIFICATION_WRITE_RATE_LIMIT =
  30;

const NOTIFICATION_RATE_WINDOW_MS =
  60_000;

type NotificationBody = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  message?: unknown;
  is_active?: unknown;
  dismissible?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
};

async function writeAuditLog({
  adminUserId,
  action,
  details,
}: {
  adminUserId: string;
  action: string;
  details?: Record<
    string,
    unknown
  >;
}) {
  const {
    error,
  } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({
      admin_user_id:
        adminUserId,

      target_user_id:
        null,

      action,

      details:
        details ?? null,
    });

  if (error) {
    console.error(
      "Notification audit log error:",
      error
    );
  }
}

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maxLength
    );
}

function cleanType(
  value: unknown
): NotificationType {
  if (
    typeof value === "string" &&
    NOTIFICATION_TYPES.includes(
      value as NotificationType
    )
  ) {
    return value as NotificationType;
  }

  return "info";
}

function cleanDateTime(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  /*
   * datetime-local input:
   * 2026-08-13T20:30
   *
   * BÃƒÂ¶yle bir deÃ„Å¸er timezone iÃƒÂ§ermez.
   * WeWantAgain Ã…Å¸u anda TÃƒÂ¼rkiye
   * saatini kullanÃ„Â±yor: UTC+3.
   */
  const hasTimezone =
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(
      trimmed
    );

  const normalized =
    hasTimezone
      ? trimmed
      : `${trimmed}:00+03:00`;

  const parsed =
    new Date(
      normalized
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

function parseId(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(
      number
    ) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function validateDates(
  startsAt: string | null,
  endsAt: string | null
) {
  if (
    !startsAt ||
    !endsAt
  ) {
    return null;
  }

  const startTime =
    new Date(
      startsAt
    ).getTime();

  const endTime =
    new Date(
      endsAt
    ).getTime();

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime)
  ) {
    return (
      "Invalid notification date."
    );
  }

  if (
    endTime <= startTime
  ) {
    return (
      "Notification end time must be after the start time."
    );
  }

  return null;
}

/*
 * GET
 *
 * Admin panelindeki bÃƒÂ¼tÃƒÂ¼n
 * bildirimleri getirir.
 */
export async function GET(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-notifications-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            NOTIFICATION_READ_RATE_LIMIT,

          windowMs:
            NOTIFICATION_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
  } = security;

  try {

    const {
      data,
      error,
    } = await supabaseAdmin
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
        created_by,
        created_at,
        updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Notification list error:",
        error
      );

      return secureJson(
        {
          error:
            "Notifications could not be loaded.",
        },
        { status: 500, requestId }
      );
    }

    return secureJson(
      {
        notifications:
          data ?? [],

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Notifications GET error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}

/*
 * POST
 *
 * Yeni global bildirim oluÃ…Å¸turur.
 */
export async function POST(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-notifications-write",

        allowedRoles: [
          "owner",
          "admin",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            NOTIFICATION_WRITE_RATE_LIMIT,

          windowMs:
            NOTIFICATION_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
  } = security;

  try {
    const parsed =
      await parseJsonBody<NotificationBody>(
        request,
        {
          maxBytes:
            MAX_BODY_BYTES,
        }
      );

    if (!parsed.ok) {
      return secureJson(
        {
          error:
            parsed.error,

          request_id:
            requestId,
        },
        {
          status:
            parsed.status,

          requestId,
        }
      );
    }

    const body =
      parsed.body;

    const type =
      cleanType(
        body?.type
      );

    const title =
      cleanText(
        body?.title,
        150
      );

    const message =
      cleanText(
        body?.message,
        1000
      );

    const isActive =
      body?.is_active !==
      false;

    const dismissible =
      body?.dismissible !==
      false;

    const startsAt =
      cleanDateTime(
        body?.starts_at
      );

    const endsAt =
      cleanDateTime(
        body?.ends_at
      );

    if (!title) {
      return secureJson(
        {
          error:
            "Notification title is required.",
        },
        { status: 400, requestId }
      );
    }

    if (!message) {
      return secureJson(
        {
          error:
            "Notification message is required.",
        },
        { status: 400, requestId }
      );
    }

    const dateError =
      validateDates(
        startsAt,
        endsAt
      );

    if (dateError) {
      return secureJson(
        {
          error:
            dateError,
        },
        { status: 400, requestId }
      );
    }

    const now =
      new Date()
        .toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "site_notifications"
      )
      .insert({
        type,

        title,

        message,

        is_active:
          isActive,

        dismissible,

        starts_at:
          startsAt,

        ends_at:
          endsAt,

        created_by:
          user.id,

        created_at:
          now,

        updated_at:
          now,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Notification create error:",
        error
      );

      return secureJson(
        {
          error:
            "Notification could not be created.",
        },
        { status: 500, requestId }
      );
    }

    await writeAuditLog({
      adminUserId:
        user.id,

      action:
        "notification-created",

      details: {
        notification_id:
          data.id,

        type:
          data.type,

        title:
          data.title,

        is_active:
          data.is_active,

        dismissible:
          data.dismissible,

        starts_at:
          data.starts_at,

        ends_at:
          data.ends_at,
      },
    });

    return secureJson(
      {
        success: true,

        notification:
          data,
      },
      { status: 201, requestId }
    );
  } catch (error) {
    console.error(
      "Notifications POST error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}

/*
 * PATCH
 *
 * Var olan bildirimi dÃƒÂ¼zenler.
 *
 * Aktif/pasif yapmak da
 * bunun ÃƒÂ¼zerinden yapÃ„Â±lÃ„Â±r.
 */
export async function PATCH(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-notifications-write",

        allowedRoles: [
          "owner",
          "admin",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            NOTIFICATION_WRITE_RATE_LIMIT,

          windowMs:
            NOTIFICATION_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
  } = security;

  try {
    const parsed =
      await parseJsonBody<NotificationBody>(
        request,
        {
          maxBytes:
            MAX_BODY_BYTES,
        }
      );

    if (!parsed.ok) {
      return secureJson(
        {
          error:
            parsed.error,

          request_id:
            requestId,
        },
        {
          status:
            parsed.status,

          requestId,
        }
      );
    }

    const body =
      parsed.body;

    const id =
      parseId(
        body?.id
      );

    if (!id) {
      return secureJson(
        {
          error:
            "Invalid notification ID.",
        },
        { status: 400, requestId }
      );
    }

    const {
      data: existing,
      error:
        existingError,
    } = await supabaseAdmin
      .from(
        "site_notifications"
      )
      .select("*")
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Notification lookup error:",
        existingError
      );

      return secureJson(
        {
          error:
            "Notification could not be checked.",
        },
        { status: 500, requestId }
      );
    }

    if (!existing) {
      return secureJson(
        {
          error:
            "Notification not found.",
        },
        { status: 404, requestId }
      );
    }

    const nextType =
      body?.type ===
      undefined
        ? existing.type
        : cleanType(
            body.type
          );

    const nextTitle =
      body?.title ===
      undefined
        ? existing.title
        : cleanText(
            body.title,
            150
          );

    const nextMessage =
      body?.message ===
      undefined
        ? existing.message
        : cleanText(
            body.message,
            1000
          );

    const nextActive =
      body?.is_active ===
      undefined
        ? existing.is_active
        : body.is_active ===
          true;

    const nextDismissible =
      body?.dismissible ===
      undefined
        ? existing.dismissible
        : body.dismissible ===
          true;

    const nextStartsAt =
      body?.starts_at ===
      undefined
        ? existing.starts_at
        : cleanDateTime(
            body.starts_at
          );

    const nextEndsAt =
      body?.ends_at ===
      undefined
        ? existing.ends_at
        : cleanDateTime(
            body.ends_at
          );

    if (!nextTitle) {
      return secureJson(
        {
          error:
            "Notification title is required.",
        },
        { status: 400, requestId }
      );
    }

    if (!nextMessage) {
      return secureJson(
        {
          error:
            "Notification message is required.",
        },
        { status: 400, requestId }
      );
    }

    const dateError =
      validateDates(
        nextStartsAt,
        nextEndsAt
      );

    if (dateError) {
      return secureJson(
        {
          error:
            dateError,
        },
        { status: 400, requestId }
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "site_notifications"
      )
      .update({
        type:
          nextType,

        title:
          nextTitle,

        message:
          nextMessage,

        is_active:
          nextActive,

        dismissible:
          nextDismissible,

        starts_at:
          nextStartsAt,

        ends_at:
          nextEndsAt,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      )
      .select()
      .single();

    if (error) {
      console.error(
        "Notification update error:",
        error
      );

      return secureJson(
        {
          error:
            "Notification could not be updated.",
        },
        { status: 500, requestId }
      );
    }

    let action =
      "notification-updated";

    if (
      existing.is_active !==
      data.is_active
    ) {
      action =
        data.is_active
          ? "notification-activated"
          : "notification-deactivated";
    }

    await writeAuditLog({
      adminUserId:
        user.id,

      action,

      details: {
        notification_id:
          data.id,

        type:
          data.type,

        title:
          data.title,

        is_active:
          data.is_active,

        dismissible:
          data.dismissible,

        starts_at:
          data.starts_at,

        ends_at:
          data.ends_at,
      },
    });

    return secureJson(
      {
        success: true,

        notification:
          data,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Notifications PATCH error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}

/*
 * DELETE
 *
 * Bildirimi tamamen siler.
 *
 * Ã…ÂunlarÃ„Â±n ikisini de kabul eder:
 *
 * DELETE /api/admin/notifications?id=12
 *
 * veya body:
 * { "id": 12 }
 */
export async function DELETE(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-notifications-write",

        allowedRoles: [
          "owner",
          "admin",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            NOTIFICATION_WRITE_RATE_LIMIT,

          windowMs:
            NOTIFICATION_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
  } = security;

  try {

    let id =
      parseId(
        request.nextUrl
          .searchParams
          .get("id")
      );

    if (!id) {
      const contentLength =
        Number(
          request.headers.get(
            "content-length"
          ) ?? "0"
        );

      if (
        Number.isFinite(
          contentLength
        ) &&
        contentLength > 0
      ) {
        const parsed =
          await parseJsonBody<NotificationBody>(
            request,
            {
              maxBytes:
                MAX_BODY_BYTES,
            }
          );

        if (!parsed.ok) {
          return secureJson(
            {
              error:
                parsed.error,

              request_id:
                requestId,
            },
            {
              status:
                parsed.status,

              requestId,
            }
          );
        }

        id =
          parseId(
            parsed.body?.id
          );
      }
    }

    if (!id) {
      return secureJson(
        {
          error:
            "Invalid notification ID.",
        },
        { status: 400, requestId }
      );
    }

    const {
      data: existing,
      error:
        existingError,
    } = await supabaseAdmin
      .from(
        "site_notifications"
      )
      .select(
        `
        id,
        type,
        title,
        is_active
        `
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Notification delete lookup error:",
        existingError
      );

      return secureJson(
        {
          error:
            "Notification could not be checked.",
        },
        { status: 500, requestId }
      );
    }

    if (!existing) {
      return secureJson(
        {
          error:
            "Notification not found.",
        },
        { status: 404, requestId }
      );
    }

    const {
      error:
        deleteError,
    } = await supabaseAdmin
      .from(
        "site_notifications"
      )
      .delete()
      .eq(
        "id",
        id
      );

    if (deleteError) {
      console.error(
        "Notification delete error:",
        deleteError
      );

      return secureJson(
        {
          error:
            "Notification could not be deleted.",
        },
        { status: 500, requestId }
      );
    }

    await writeAuditLog({
      adminUserId:
        user.id,

      action:
        "notification-deleted",

      details: {
        notification_id:
          existing.id,

        type:
          existing.type,

        title:
          existing.title,

        was_active:
          existing.is_active,
      },
    });

    return secureJson(
      {
        success: true,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Notifications DELETE error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}