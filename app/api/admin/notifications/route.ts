import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const NOTIFICATION_TYPES = [
  "info",
  "warning",
  "maintenance",
  "success",
  "urgent",
] as const;

type NotificationType =
  (typeof NOTIFICATION_TYPES)[number];

async function requireAdmin(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      error: NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const accessToken =
    authorization.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(
    accessToken
  );

  if (
    userError ||
    !user
  ) {
    return {
      error: NextResponse.json(
        {
          error: "Invalid session",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: adminRow,
    error: adminError,
  } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    adminError ||
    !adminRow
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Admin access required",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    user,
    accessToken,
  };
}

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
   * Böyle bir değer timezone içermez.
   * WeWantAgain şu anda Türkiye
   * saatini kullanıyor: UTC+3.
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
 * Admin panelindeki bütün
 * bildirimleri getirir.
 */
export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      "error" in auth
    ) {
      return auth.error;
    }

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

      return NextResponse.json(
        {
          error:
            "Notifications could not be loaded.",

          details:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      notifications:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "Notifications GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * POST
 *
 * Yeni global bildirim oluşturur.
 */
export async function POST(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const body =
      await request.json();

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
      return NextResponse.json(
        {
          error:
            "Notification title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Notification message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const dateError =
      validateDates(
        startsAt,
        endsAt
      );

    if (dateError) {
      return NextResponse.json(
        {
          error:
            dateError,
        },
        {
          status: 400,
        }
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
          auth.user.id,

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

      return NextResponse.json(
        {
          error:
            "Notification could not be created.",

          details:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    await writeAuditLog({
      adminUserId:
        auth.user.id,

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

    return NextResponse.json(
      {
        success: true,

        notification:
          data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Notifications POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * PATCH
 *
 * Var olan bildirimi düzenler.
 *
 * Aktif/pasif yapmak da
 * bunun üzerinden yapılır.
 */
export async function PATCH(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    const body =
      await request.json();

    const id =
      parseId(
        body?.id
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Invalid notification ID.",
        },
        {
          status: 400,
        }
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

      return NextResponse.json(
        {
          error:
            "Notification could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Notification not found.",
        },
        {
          status: 404,
        }
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
      return NextResponse.json(
        {
          error:
            "Notification title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nextMessage) {
      return NextResponse.json(
        {
          error:
            "Notification message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const dateError =
      validateDates(
        nextStartsAt,
        nextEndsAt
      );

    if (dateError) {
      return NextResponse.json(
        {
          error:
            dateError,
        },
        {
          status: 400,
        }
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

      return NextResponse.json(
        {
          error:
            "Notification could not be updated.",

          details:
            error.message,
        },
        {
          status: 500,
        }
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
        auth.user.id,

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

    return NextResponse.json({
      success: true,

      notification:
        data,
    });
  } catch (error) {
    console.error(
      "Notifications PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * DELETE
 *
 * Bildirimi tamamen siler.
 *
 * Şunların ikisini de kabul eder:
 *
 * DELETE /api/admin/notifications?id=12
 *
 * veya body:
 * { "id": 12 }
 */
export async function DELETE(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      "error" in auth
    ) {
      return auth.error;
    }

    let id =
      parseId(
        request.nextUrl
          .searchParams
          .get("id")
      );

    if (!id) {
      try {
        const body =
          await request.json();

        id =
          parseId(
            body?.id
          );
      } catch {
        // Body boş olabilir.
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Invalid notification ID.",
        },
        {
          status: 400,
        }
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

      return NextResponse.json(
        {
          error:
            "Notification could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Notification not found.",
        },
        {
          status: 404,
        }
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

      return NextResponse.json(
        {
          error:
            "Notification could not be deleted.",

          details:
            deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    await writeAuditLog({
      adminUserId:
        auth.user.id,

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

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Notifications DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}