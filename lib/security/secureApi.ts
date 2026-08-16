import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  checkRateLimit,
  createRateLimitKey,
  createRequestId,
  hasSuspiciousHeaders,
  logSecurityEvent,
  rateLimitResponse,
  secureJson,
  validateSameOrigin,
} from "./requestSecurity";

import {
  requireSecureUser,
} from "./authSecurity";

type SecureApiOptions = {
  scope: string;

  requireAuth?: boolean;

  rateLimit?: {
    limit: number;
    windowMs: number;
  };

  requireSameOrigin?: boolean;

  blockSuspiciousHeaders?: boolean;
};

type SecureApiSuccess = {
  ok: true;

  requestId: string;

  clientIp: string;

  user:
    | {
        id: string;
        email: string | null;
      }
    | null;
};

type SecureApiFailure = {
  ok: false;

  response: NextResponse;
};

export type SecureApiResult =
  | SecureApiSuccess
  | SecureApiFailure;

export async function secureApi(
  request: NextRequest,
  options: SecureApiOptions
): Promise<SecureApiResult> {
  const requestId =
    createRequestId();

  const requireAuth =
    options.requireAuth ??
    false;

  const requireSameOrigin =
    options.requireSameOrigin ??
    false;

  const blockSuspiciousHeaders =
    options.blockSuspiciousHeaders ??
    true;

  /*
   * SUSPICIOUS HEADER PROTECTION
   */
  if (
    blockSuspiciousHeaders &&
    hasSuspiciousHeaders(
      request
    )
  ) {
    logSecurityEvent(
      "suspicious_headers_blocked",
      request,
      {
        request_id:
          requestId,
        scope:
          options.scope,
      }
    );

    return {
      ok: false,

      response:
        secureJson(
          {
            error:
              "Request rejected.",
            request_id:
              requestId,
          },
          {
            status:
              400,
            requestId,
          }
        ),
    };
  }

  /*
   * SAME ORIGIN PROTECTION
   *
   * Useful for authenticated write
   * operations coming from the website.
   */
  if (
    requireSameOrigin
  ) {
    const originCheck =
      validateSameOrigin(
        request
      );

    if (
      !originCheck.ok
    ) {
      logSecurityEvent(
        "cross_origin_request_blocked",
        request,
        {
          request_id:
            requestId,
          scope:
            options.scope,
        }
      );

      return {
        ok: false,

        response:
          secureJson(
            {
              error:
                originCheck.error,
              request_id:
                requestId,
            },
            {
              status:
                originCheck.status,
              requestId,
            }
          ),
      };
    }
  }

  /*
   * AUTHENTICATION +
   * BAN / IP / SESSION SECURITY
   */
  let user:
    | {
        id: string;
        email: string | null;
      }
    | null =
    null;

  let clientIp =
    "unknown";

  if (
    requireAuth
  ) {
    const auth =
      await requireSecureUser(
        request
      );

    if (!auth.ok) {
      return {
        ok: false,
        response:
          auth.response,
      };
    }

    user =
      auth.user;

    clientIp =
      auth.clientIp;
  }

  /*
   * RATE LIMIT
   */
  if (
    options.rateLimit
  ) {
    const rateLimitKey =
      createRateLimitKey(
        request,
        options.scope,
        user?.id ??
          null
      );

    const rateLimit =
      checkRateLimit({
        key:
          rateLimitKey,

        limit:
          options
            .rateLimit
            .limit,

        windowMs:
          options
            .rateLimit
            .windowMs,
      });

    if (
      !rateLimit.allowed
    ) {
      logSecurityEvent(
        "rate_limit_exceeded",
        request,
        {
          request_id:
            requestId,

          scope:
            options.scope,

          user_id:
            user?.id ??
            null,

          retry_after_seconds:
            rateLimit.retryAfterSeconds,
        }
      );

      return {
        ok: false,

        response:
          rateLimitResponse(
            rateLimit.retryAfterSeconds,
            requestId
          ),
      };
    }
  }

  return {
    ok: true,

    requestId,

    clientIp,

    user,
  };
}