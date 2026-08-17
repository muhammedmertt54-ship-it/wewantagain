import {
  NextRequest,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../../lib/supabaseAdmin";

import {
  secureAdminApi,
} from "../../../../../lib/security/secureAdminApi";

import {
  secureJson,
} from "../../../../../lib/security/requestSecurity";

type AdminRole =
  | "owner"
  | "admin"
  | "moderator";

const ADMIN_USER_DETAIL_RATE_LIMIT = 60;
const ADMIN_USER_DETAIL_RATE_WINDOW_MS = 60_000;

function isAdminRole(
  value: unknown
): value is AdminRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "moderator"
  );
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-user-detail-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            ADMIN_USER_DETAIL_RATE_LIMIT,

          windowMs:
            ADMIN_USER_DETAIL_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user:
      currentUser,
    admin:
      currentAdmin,
  } = security;

  try {
    const {
      id,
    } =
      await context.params;

    const userId =
      typeof id === "string"
        ? id.trim()
        : "";

    if (!userId) {
      return secureJson(
        {
          error:
            "User ID is required.",

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
        targetAdminRow,

      error:
        targetAdminError,
    } =
      await supabaseAdmin
        .from("admins")
        .select(
          "user_id, role"
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (targetAdminError) {
      console.error(
        "Target admin role check error:",
        targetAdminError
      );

      return secureJson(
        {
          error:
            "User role could not be checked.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    const targetAdminRole =
      isAdminRole(
        targetAdminRow?.role
      )
        ? targetAdminRow.role
        : null;

    if (
      currentAdmin.role === "admin" &&
      (
        targetAdminRole === "owner" ||
        targetAdminRole === "admin"
      )
    ) {
      return secureJson(
        {
          error:
            "Owner access required to view this staff account.",

          request_id:
            requestId,
        },
        {
          status: 403,
          requestId,
        }
      );
    }

    const {
      data:
        authUserData,

      error:
        authUserError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .getUserById(
          userId
        );

    if (
      authUserError ||
      !authUserData?.user
    ) {
      if (authUserError) {
        console.error(
          "Admin user detail auth lookup error:",
          authUserError
        );
      }

      return secureJson(
        {
          error:
            "User could not be found.",

          request_id:
            requestId,
        },
        {
          status: 404,
          requestId,
        }
      );
    }

    const authUser =
      authUserData.user;

    const [
      profileResult,
      ipsResult,
      bansResult,
      campaignsResult,
      supportsResult,
      auditResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "username, display_name"
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle(),

        supabaseAdmin
          .from("user_ips")
          .select(
            "id, ip_address, first_seen_at, last_seen_at"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "last_seen_at",
            {
              ascending:
                false,
            }
          ),

        supabaseAdmin
          .from("ip_bans")
          .select(
            "ip_address"
          ),

        supabaseAdmin
          .from("campaigns")
          .select(
            "id, slug, title, subtitle, category, status, created_at, image_url, image_removed"
          )
          .eq(
            "created_by",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),

        supabaseAdmin
          .from("supports")
          .select(
            "campaign_slug, verified, email, country"
          )
          .eq(
            "user_id",
            userId
          ),

        supabaseAdmin
          .from(
            "admin_audit_logs"
          )
          .select(
            "id, admin_user_id, action, details, created_at"
          )
          .eq(
            "target_user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(200),
      ]);

    if (profileResult.error) {
      console.error(
        "Profile error:",
        profileResult.error
      );
    }

    if (ipsResult.error) {
      console.error(
        "User IPs error:",
        ipsResult.error
      );
    }

    if (bansResult.error) {
      console.error(
        "IP bans error:",
        bansResult.error
      );
    }

    if (campaignsResult.error) {
      console.error(
        "Campaigns error:",
        campaignsResult.error
      );
    }

    if (supportsResult.error) {
      console.error(
        "Supports error:",
        supportsResult.error
      );
    }

    if (auditResult.error) {
      console.error(
        "Audit error:",
        auditResult.error
      );
    }

    if (
      ipsResult.error ||
      bansResult.error
    ) {
      return secureJson(
        {
          error:
            "Sensitive user security data could not be loaded.",

          request_id:
            requestId,
        },
        {
          status: 503,
          requestId,
        }
      );
    }

    const bannedIpSet =
      new Set(
        (
          bansResult.data ??
          []
        )
          .map(
            (row) =>
              row.ip_address
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              value.length > 0
          )
      );

    const ips =
      (
        ipsResult.data ??
        []
      ).map(
        (ip) => ({
          id:
            ip.id,

          ip_address:
            ip.ip_address,

          first_seen_at:
            ip.first_seen_at,

          last_seen_at:
            ip.last_seen_at,

          banned:
            bannedIpSet.has(
              ip.ip_address
            ),
        })
      );

    const profile =
      profileResult.data;

    const user = {
      id:
        authUser.id,

      email:
        authUser.email ??
        null,

      username:
        profile?.username ??
        null,

      display_name:
        profile?.display_name ??
        null,

      is_admin:
        targetAdminRole !==
        null,

      admin_role:
        targetAdminRole,

      created_at:
        authUser.created_at,

      last_sign_in_at:
        authUser.last_sign_in_at ??
        null,

      email_confirmed_at:
        authUser.email_confirmed_at ??
        null,

      banned_until:
        authUser.banned_until ??
        null,

      ips,

      campaigns:
        campaignsResult.data ??
        [],

      supports:
        supportsResult.data ??
        [],

      audit_logs:
        auditResult.data ??
        [],
    };

    return secureJson(
      {
        user,

        current_admin_role:
          currentAdmin.role,

        current_admin_user_id:
          currentUser.id,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Admin user details API error:",
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