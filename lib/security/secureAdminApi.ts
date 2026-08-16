import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AdminRole,
  requireAdminRole,
} from "../admin/requireAdminRole";

import {
  secureApi,
} from "./secureApi";

import {
  secureJson,
} from "./requestSecurity";

type SecureAdminApiOptions = {
  scope: string;

  allowedRoles?: AdminRole[];

  rateLimit?: {
    limit: number;
    windowMs: number;
  };

  requireSameOrigin?: boolean;

  blockSuspiciousHeaders?: boolean;
};

type SecureAdminApiSuccess = {
  ok: true;

  requestId: string;

  clientIp: string;

  user: {
    id: string;
    email: string | null;
  };

  admin: {
    userId: string;
    role: AdminRole;
  };
};

type SecureAdminApiFailure = {
  ok: false;

  response: NextResponse;
};

export type SecureAdminApiResult =
  | SecureAdminApiSuccess
  | SecureAdminApiFailure;

export async function secureAdminApi(
  request: NextRequest,
  options: SecureAdminApiOptions
): Promise<SecureAdminApiResult> {
  /*
   * FIRST LAYER:
   *
   * Shared security:
   * - authentication
   * - banned account
   * - banned IP
   * - session controls
   * - suspicious headers
   * - same-origin
   * - rate limit
   */
  const baseSecurity =
    await secureApi(
      request,
      {
        scope:
          options.scope,

        requireAuth:
          true,

        requireSameOrigin:
          options.requireSameOrigin ??
          false,

        blockSuspiciousHeaders:
          options.blockSuspiciousHeaders ??
          true,

        rateLimit:
          options.rateLimit,
      }
    );

  if (!baseSecurity.ok) {
    return {
      ok: false,
      response:
        baseSecurity.response,
    };
  }

  /*
   * secureApi(requireAuth: true)
   * should always provide a user.
   *
   * Fail closed if it ever doesn't.
   */
  if (!baseSecurity.user) {
    return {
      ok: false,

      response:
        secureJson(
          {
            error:
              "Admin authentication failed.",

            request_id:
              baseSecurity.requestId,
          },
          {
            status: 401,

            requestId:
              baseSecurity.requestId,
          }
        ),
    };
  }

  /*
   * SECOND LAYER:
   *
   * Existing admin role system.
   *
   * This remains the source of truth
   * for Owner / Admin / Moderator
   * permissions.
   */
  const adminAuth =
    await requireAdminRole(
      request,
      options.allowedRoles ?? [
        "owner",
        "admin",
        "moderator",
      ]
    );

  if (!adminAuth.ok) {
    return {
      ok: false,
      response:
        adminAuth.response,
    };
  }

  /*
   * EXTRA CONSISTENCY CHECK
   *
   * Both security layers authenticated
   * the request independently.
   *
   * They must resolve to the same user.
   */
  if (
    adminAuth.user.id !==
    baseSecurity.user.id
  ) {
    console.error(
      "Admin security user mismatch:",
      {
        base_user_id:
          baseSecurity.user.id,

        admin_user_id:
          adminAuth.user.id,

        request_id:
          baseSecurity.requestId,
      }
    );

    return {
      ok: false,

      response:
        secureJson(
          {
            error:
              "Admin authorization failed.",

            request_id:
              baseSecurity.requestId,
          },
          {
            status: 403,

            requestId:
              baseSecurity.requestId,
          }
        ),
    };
  }

  return {
    ok: true,

    requestId:
      baseSecurity.requestId,

    clientIp:
      baseSecurity.clientIp,

    user: {
      id:
        adminAuth.user.id,

      email:
        adminAuth.user.email,
    },

    admin: {
      userId:
        adminAuth.admin.userId,

      role:
        adminAuth.admin.role,
    },
  };
}