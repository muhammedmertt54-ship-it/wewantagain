import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../supabaseAdmin";

import {
  createRequestId,
  getClientIp,
  logSecurityEvent,
  secureJson,
} from "./requestSecurity";

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type SessionSecurityResult =
  | {
      ok: true;
      user: AuthenticatedUser;
      requestId: string;
      clientIp: string;
    }
  | {
      ok: false;
      response: NextResponse;
      requestId: string;
      clientIp: string;
    };

function unauthorizedResponse(
  requestId: string
) {
  return secureJson(
    {
      error:
        "Authentication required.",
      request_id:
        requestId,
    },
    {
      status: 401,
      requestId,
    }
  );
}

function forbiddenResponse(
  message: string,
  requestId: string
) {
  return secureJson(
    {
      error: message,
      request_id:
        requestId,
    },
    {
      status: 403,
      requestId,
    }
  );
}

function decodeJwtIssuedAt(
  token: string
): number | null {
  try {
    const parts =
      token.split(".");

    if (
      parts.length !== 3
    ) {
      return null;
    }

    const payloadPart =
      parts[1];

    if (!payloadPart) {
      return null;
    }

    const normalized =
      payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddingLength =
      (
        4 -
        (normalized.length %
          4)
      ) % 4;

    const padded =
      normalized +
      "=".repeat(
        paddingLength
      );

    const payloadText =
      Buffer.from(
        padded,
        "base64"
      ).toString(
        "utf8"
      );

    const payload =
      JSON.parse(
        payloadText
      ) as Record<
        string,
        unknown
      >;

    const issuedAt =
      payload.iat;

    if (
      typeof issuedAt !==
        "number" ||
      !Number.isFinite(
        issuedAt
      )
    ) {
      return null;
    }

    return issuedAt *
      1000;
  } catch {
    return null;
  }
}

export async function requireSecureUser(
  request: NextRequest
): Promise<SessionSecurityResult> {
  const requestId =
    createRequestId();

  const clientIp =
    getClientIp(
      request
    );

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    logSecurityEvent(
      "auth_missing",
      request,
      {
        request_id:
          requestId,
      }
    );

    return {
      ok: false,

      response:
        unauthorizedResponse(
          requestId
        ),

      requestId,
      clientIp,
    };
  }

  const accessToken =
    authorization
      .slice(7)
      .trim();

  if (!accessToken) {
    logSecurityEvent(
      "auth_empty_token",
      request,
      {
        request_id:
          requestId,
      }
    );

    return {
      ok: false,

      response:
        unauthorizedResponse(
          requestId
        ),

      requestId,
      clientIp,
    };
  }

  /*
   * Supabase validates the token
   * server-side here.
   */
  const {
    data: {
      user,
    },
    error:
      authError,
  } =
    await supabaseAdmin
      .auth
      .getUser(
        accessToken
      );

  if (
    authError ||
    !user
  ) {
    logSecurityEvent(
      "auth_invalid_token",
      request,
      {
        request_id:
          requestId,
      }
    );

    return {
      ok: false,

      response:
        unauthorizedResponse(
          requestId
        ),

      requestId,
      clientIp,
    };
  }

  /*
   * Fetch server-side auth state.
   * This lets us check Supabase bans.
   */
  const {
    data:
      adminUserData,

    error:
      adminUserError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .getUserById(
        user.id
      );

  if (
    adminUserError ||
    !adminUserData?.user
  ) {
    console.error(
      "Secure auth user lookup error:",
      adminUserError
    );

    return {
      ok: false,

      response:
        secureJson(
          {
            error:
              "Session validation failed.",

            request_id:
              requestId,
          },
          {
            status: 503,
            requestId,
          }
        ),

      requestId,
      clientIp,
    };
  }

  const authUser =
    adminUserData.user;

  /*
   * USER BAN
   */
  const bannedUntilRaw =
    authUser.banned_until ??
    null;

  let bannedUntil:
    | number
    | null =
    null;

  if (bannedUntilRaw) {
    const parsed =
      new Date(
        bannedUntilRaw
      ).getTime();

    if (
      Number.isFinite(
        parsed
      )
    ) {
      bannedUntil =
        parsed;
    }
  }

  if (
    bannedUntil !== null &&
    bannedUntil >
      Date.now()
  ) {
    logSecurityEvent(
      "banned_user_request",
      request,
      {
        request_id:
          requestId,

        user_id:
          user.id,
      }
    );

    return {
      ok: false,

      response:
        forbiddenResponse(
          "This account is currently restricted.",
          requestId
        ),

      requestId,
      clientIp,
    };
  }

  /*
   * IP BAN
   */
  if (
    clientIp !==
    "unknown"
  ) {
    const {
      data:
        bannedIpRow,

      error:
        bannedIpError,
    } =
      await supabaseAdmin
        .from(
          "ip_bans"
        )
        .select(
          "ip_address"
        )
        .eq(
          "ip_address",
          clientIp
        )
        .maybeSingle();

    /*
     * Fail closed if the security
     * database cannot be checked.
     */
    if (
      bannedIpError
    ) {
      console.error(
        "IP ban check error:",
        bannedIpError
      );

      return {
        ok: false,

        response:
          secureJson(
            {
              error:
                "Security validation failed.",

              request_id:
                requestId,
            },
            {
              status: 503,
              requestId,
            }
          ),

        requestId,
        clientIp,
      };
    }

    if (bannedIpRow) {
      logSecurityEvent(
        "banned_ip_request",
        request,
        {
          request_id:
            requestId,

          user_id:
            user.id,

          ip:
            clientIp,
        }
      );

      return {
        ok: false,

        response:
          forbiddenResponse(
            "Access from this network is restricted.",
            requestId
          ),

        requestId,
        clientIp,
      };
    }
  }

  /*
   * FORCE LOGOUT / SESSION REVOCATION
   *
   * IMPORTANT:
   * The real database field is
   * revoked_before.
   */
  const {
    data:
      sessionControl,

    error:
      sessionControlError,
  } =
    await supabaseAdmin
      .from(
        "user_session_controls"
      )
      .select(
        "revoked_before"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    sessionControlError
  ) {
    console.error(
      "Session control lookup error:",
      sessionControlError
    );

    return {
      ok: false,

      response:
        secureJson(
          {
            error:
              "Session validation failed.",

            request_id:
              requestId,
          },
          {
            status: 503,
            requestId,
          }
        ),

      requestId,
      clientIp,
    };
  }

  const revokedBefore =
    sessionControl
      ?.revoked_before
      ? new Date(
          sessionControl
            .revoked_before
        ).getTime()
      : null;

  if (
    revokedBefore !== null &&
    Number.isFinite(
      revokedBefore
    )
  ) {
    /*
     * The access token was already
     * validated by Supabase above,
     * therefore its iat can now be used
     * to determine when this validated
     * session was issued.
     */
    const tokenIssuedAt =
      decodeJwtIssuedAt(
        accessToken
      );

    /*
     * If a revocation exists but the
     * session creation time cannot be
     * established, fail closed.
     */
    if (
      tokenIssuedAt ===
      null
    ) {
      logSecurityEvent(
        "session_iat_missing",
        request,
        {
          request_id:
            requestId,

          user_id:
            user.id,
        }
      );

      return {
        ok: false,

        response:
          unauthorizedResponse(
            requestId
          ),

        requestId,
        clientIp,
      };
    }

    /*
     * Any token created before or at
     * the revocation marker is dead.
     */
    if (
      tokenIssuedAt <=
      revokedBefore
    ) {
      logSecurityEvent(
        "revoked_session_blocked",
        request,
        {
          request_id:
            requestId,

          user_id:
            user.id,
        }
      );

      return {
        ok: false,

        response:
          unauthorizedResponse(
            requestId
          ),

        requestId,
        clientIp,
      };
    }
  }

  return {
    ok: true,

    user: {
      id:
        user.id,

      email:
        user.email ??
        null,
    },

    requestId,
    clientIp,
  };
}