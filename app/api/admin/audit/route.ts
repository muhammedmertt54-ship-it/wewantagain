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
  secureJson,
} from "../../../../lib/security/requestSecurity";

const ADMIN_AUDIT_READ_RATE_LIMIT =
  60;

const ADMIN_AUDIT_RATE_WINDOW_MS =
  60_000;

const ADMIN_AUDIT_LIMIT =
  500;

export async function GET(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-audit-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            ADMIN_AUDIT_READ_RATE_LIMIT,

          windowMs:
            ADMIN_AUDIT_RATE_WINDOW_MS,
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
      data:
        logs,
      error,
    } =
      await supabaseAdmin
        .from(
          "admin_audit_logs"
        )
        .select(
          "id, admin_user_id, target_user_id, action, details, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          ADMIN_AUDIT_LIMIT
        );

    if (error) {
      console.error(
        "Audit logs error:",
        error
      );

      return secureJson(
        {
          error:
            "Audit logs could not be loaded.",

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
        logs:
          logs ?? [],

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Admin audit API error:",
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