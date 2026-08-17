import {
  NextRequest,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

import {
  secureApi,
} from "../../../../lib/security/secureApi";

import {
  secureJson,
} from "../../../../lib/security/requestSecurity";

const SESSION_STATUS_RATE_LIMIT =
  60;

const SESSION_STATUS_RATE_WINDOW_MS =
  60_000;

type JwtPayload = {
  iat?: number;
  sub?: string;
};

function decodeJwtPayload(
  token: string
): JwtPayload | null {
  try {
    const parts =
      token.split(".");

    if (
      parts.length !== 3
    ) {
      return null;
    }

    const payload =
      parts[1];

    if (!payload) {
      return null;
    }

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padding =
      "=".repeat(
        (
          4 -
          (
            normalized.length %
            4
          )
        ) %
          4
      );

    const json =
      Buffer.from(
        normalized +
          padding,
        "base64"
      ).toString(
        "utf8"
      );

    const parsed =
      JSON.parse(
        json
      ) as Record<
        string,
        unknown
      >;

    return {
      iat:
        typeof parsed.iat ===
          "number" &&
        Number.isFinite(
          parsed.iat
        )
          ? parsed.iat
          : undefined,

      sub:
        typeof parsed.sub ===
          "string"
          ? parsed.sub
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest
) {
  /*
   * We intentionally keep requireAuth:false here.
   *
   * This endpoint must return detailed session-state
   * reasons such as invalid-session, user-banned and
   * session-revoked. Authentication itself is verified
   * below with Supabase.
   */
  const security =
    await secureApi(
      request,
      {
        scope:
          "account-session-status",

        requireAuth:
          false,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SESSION_STATUS_RATE_LIMIT,

          windowMs:
            SESSION_STATUS_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    clientIp,
  } = security;

  try {
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
      return secureJson(
        {
          valid: false,

          reason:
            "missing-session",

          request_id:
            requestId,
        },
        {
          status: 401,
          requestId,
        }
      );
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return secureJson(
        {
          valid: false,

          reason:
            "missing-session",

          request_id:
            requestId,
        },
        {
          status: 401,
          requestId,
        }
      );
    }

    const {
      data: {
        user,
      },

      error:
        tokenError,
    } =
      await supabaseAdmin
        .auth
        .getUser(
          accessToken
        );

    if (
      tokenError ||
      !user
    ) {
      return secureJson(
        {
          valid: false,

          reason:
            "invalid-session",

          request_id:
            requestId,
        },
        {
          status: 401,
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
          user.id
        );

    if (
      authUserError ||
      !authUserData?.user
    ) {
      if (authUserError) {
        console.error(
          "Session auth user lookup error:",
          authUserError
        );
      }

      return secureJson(
        {
          valid: false,

          reason:
            "user-deleted",

          request_id:
            requestId,
        },
        {
          status: 401,
          requestId,
        }
      );
    }

    const authUser =
      authUserData.user;

    const bannedUntil =
      authUser.banned_until
        ? new Date(
            authUser.banned_until
          ).getTime()
        : null;

    const isBanned =
      bannedUntil !== null &&
      Number.isFinite(
        bannedUntil
      ) &&
      bannedUntil >
        Date.now();

    if (isBanned) {
      return secureJson(
        {
          valid: false,

          reason:
            "user-banned",

          request_id:
            requestId,
        },
        {
          status: 403,
          requestId,
        }
      );
    }

    /*
     * Session status should also reflect an IP ban.
     * If we cannot determine a usable IP we do not
     * invent one here.
     */
    if (
      clientIp &&
      clientIp !== "unknown"
    ) {
      const {
        data:
          bannedIp,

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

      if (bannedIpError) {
        console.error(
          "Session IP ban lookup error:",
          bannedIpError
        );

        return secureJson(
          {
            error:
              "Session could not be checked.",

            request_id:
              requestId,
          },
          {
            status: 503,
            requestId,
          }
        );
      }

      if (bannedIp) {
        return secureJson(
          {
            valid: false,

            reason:
              "ip-banned",

            request_id:
              requestId,
          },
          {
            status: 403,
            requestId,
          }
        );
      }
    }

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

      return secureJson(
        {
          error:
            "Session could not be checked.",

          request_id:
            requestId,
        },
        {
          status: 503,
          requestId,
        }
      );
    }

    if (
      sessionControl
        ?.revoked_before
    ) {
      const payload =
        decodeJwtPayload(
          accessToken
        );

      const issuedAtSeconds =
        payload?.iat;

      const tokenSubject =
        payload?.sub;

      /*
       * The token has already been validated by
       * Supabase. These decoded fields are only used
       * to compare this validated session against the
       * server-side revocation marker.
       *
       * If the token metadata is unexpectedly missing,
       * fail closed rather than allowing an old session.
       */
      if (
        !issuedAtSeconds ||
        !Number.isFinite(
          issuedAtSeconds
        ) ||
        !tokenSubject ||
        tokenSubject !== user.id
      ) {
        return secureJson(
          {
            valid: false,

            reason:
              "session-revoked",

            request_id:
              requestId,
          },
          {
            status: 401,
            requestId,
          }
        );
      }

      const issuedAtMs =
        issuedAtSeconds *
        1000;

      const revokedBeforeMs =
        new Date(
          sessionControl
            .revoked_before
        ).getTime();

      if (
        !Number.isFinite(
          revokedBeforeMs
        )
      ) {
        console.error(
          "Invalid revoked_before value for user:",
          user.id
        );

        return secureJson(
          {
            error:
              "Session could not be checked.",

            request_id:
              requestId,
          },
          {
            status: 503,
            requestId,
          }
        );
      }

      if (
        issuedAtMs <=
        revokedBeforeMs
      ) {
        return secureJson(
          {
            valid: false,

            reason:
              "session-revoked",

            request_id:
              requestId,
          },
          {
            status: 401,
            requestId,
          }
        );
      }
    }

    return secureJson(
      {
        valid: true,

        userId:
          authUser.id,

        request_id:
          requestId,
      },
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Session status error:",
      error
    );

    return secureJson(
      {
        error:
          "Session could not be checked.",

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