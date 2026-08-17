import {
  NextRequest,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

import {
  secureAdminApi,
} from "../../../../lib/security/secureAdminApi";

import {
  parseJsonBody,
  secureJson,
} from "../../../../lib/security/requestSecurity";

type CopyrightStatus =
  | "reviewing"
  | "resolved"
  | "rejected";

type CopyrightPatchBody = {
  id?: unknown;
  status?: unknown;
};

const MAX_BODY_BYTES =
  8_000;

const COPYRIGHT_READ_RATE_LIMIT =
  60;

const COPYRIGHT_WRITE_RATE_LIMIT =
  20;

const COPYRIGHT_RATE_WINDOW_MS =
  60_000;

function isCopyrightStatus(
  value: unknown
): value is CopyrightStatus {
  return (
    value === "reviewing" ||
    value === "resolved" ||
    value === "rejected"
  );
}

function parseId(
  value: unknown
) {
  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return null;
  }

  return id;
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
  } =
    await supabaseAdmin
      .from(
        "admin_audit_logs"
      )
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
      "Copyright audit log error:",
      error
    );
  }
}

export async function GET(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-copyright-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            COPYRIGHT_READ_RATE_LIMIT,

          windowMs:
            COPYRIGHT_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    admin,
  } = security;

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .select(
          "id, full_name, email, campaign_url, work_description, disputed_content, relationship, accuracy_confirmed, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (error) {
      console.error(
        "Copyright reports load error:",
        error
      );

      return secureJson(
        {
          error:
            "Copyright reports could not be loaded.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    return secureJson(
      {
        reports:
          data ?? [],

        current_admin_role:
          admin.role,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Copyright reports GET error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",

        request_id:
          requestId,
      },
      {
        status: 500,
        requestId,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-copyright-write",

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
            COPYRIGHT_WRITE_RATE_LIMIT,

          windowMs:
            COPYRIGHT_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
    admin,
  } = security;

  try {
    const parsed =
      await parseJsonBody<CopyrightPatchBody>(
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

    const status =
      body?.status;

    if (!id) {
      return secureJson(
        {
          error:
            "Invalid report ID.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    if (
      !isCopyrightStatus(
        status
      )
    ) {
      return secureJson(
        {
          error:
            "Invalid copyright report status.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    const {
      data:
        existing,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .select(
          "id, full_name, email, campaign_url, status"
        )
        .eq(
          "id",
          id
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        "Copyright report lookup error:",
        existingError
      );

      return secureJson(
        {
          error:
            "Copyright report could not be checked.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    if (!existing) {
      return secureJson(
        {
          error:
            "Copyright report not found.",

          request_id:
            requestId,
        },
        {
          status: 404,
          requestId,
        }
      );
    }

    const previousStatus =
      existing.status;

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "copyright_reports"
        )
        .update({
          status,
        })
        .eq(
          "id",
          id
        )
        .select(
          "id, full_name, email, campaign_url, work_description, disputed_content, relationship, accuracy_confirmed, status, created_at"
        )
        .single();

    if (error) {
      console.error(
        "Copyright report update error:",
        error
      );

      return secureJson(
        {
          error:
            "Report status could not be updated.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    await writeAuditLog({
      adminUserId:
        user.id,

      action:
        "copyright-report-status-updated",

      details: {
        report_id:
          id,

        report_email:
          existing.email,

        campaign_url:
          existing.campaign_url,

        previous_status:
          previousStatus,

        new_status:
          status,

        admin_role:
          admin.role,
      },
    });

    return secureJson(
      {
        success: true,

        report:
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
      "Copyright reports PATCH error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",

        request_id:
          requestId,
      },
      {
        status: 500,
        requestId,
      }
    );
  }
}