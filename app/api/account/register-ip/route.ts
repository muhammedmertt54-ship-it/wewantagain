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

const REGISTER_IP_RATE_LIMIT =
  30;

const REGISTER_IP_RATE_WINDOW_MS =
  60_000;

export async function POST(
  request: NextRequest
) {
  const security =
    await secureApi(
      request,
      {
        scope:
          "account-register-ip",

        requireAuth:
          true,

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            REGISTER_IP_RATE_LIMIT,

          windowMs:
            REGISTER_IP_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    clientIp,
    user,
  } = security;

  /*
   * secureApi is configured with requireAuth:true,
   * but its shared TypeScript return type still allows
   * user to be null. Keep this explicit guard so the
   * route is both runtime-safe and type-safe.
   */
  if (!user) {
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

  try {
    if (
      !clientIp ||
      clientIp === "unknown"
    ) {
      return secureJson(
        {
          error:
            "IP address could not be detected.",

          request_id:
            requestId,
        },
        {
          status: 400,
          requestId,
        }
      );
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        existing,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          "user_ips"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "ip_address",
          clientIp
        )
        .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        "IP lookup error:",
        existingError
      );

      return secureJson(
        {
          error:
            "IP information could not be checked.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    if (existing) {
      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            "user_ips"
          )
          .update({
            last_seen_at:
              now,
          })
          .eq(
            "id",
            existing.id
          );

      if (
        updateError
      ) {
        console.error(
          "IP update error:",
          updateError
        );

        return secureJson(
          {
            error:
              "IP information could not be updated.",

            request_id:
              requestId,
          },
          {
            status: 500,
            requestId,
          }
        );
      }
    } else {
      const {
        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            "user_ips"
          )
          .insert({
            user_id:
              user.id,

            ip_address:
              clientIp,

            first_seen_at:
              now,

            last_seen_at:
              now,
          });

      if (
        insertError
      ) {
        console.error(
          "IP insert error:",
          insertError
        );

        return secureJson(
          {
            error:
              "IP information could not be saved.",

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
      "Register IP API error:",
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