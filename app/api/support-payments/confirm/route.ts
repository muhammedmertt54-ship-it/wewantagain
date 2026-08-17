import {
  NextRequest,
} from "next/server";

import {
  secureApi,
} from "../../../../lib/security/secureApi";

import {
  secureJson,
} from "../../../../lib/security/requestSecurity";

/*
 * IMPORTANT:
 *
 * This endpoint must NEVER trust payment
 * success information sent by the browser.
 *
 * A payment may only be confirmed after
 * verifying the selected payment provider's
 * signed webhook/callback.
 *
 * Provider integration has not been
 * configured yet, so confirmation is
 * intentionally disabled.
 */

const CONFIRM_RATE_LIMIT =
  10;

const CONFIRM_RATE_WINDOW_MS =
  60_000;

export async function POST(
  request: NextRequest
) {
  const security =
    await secureApi(
      request,
      {
        scope:
          "support-payment-confirm-disabled",

        requireAuth:
          false,

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            CONFIRM_RATE_LIMIT,

          windowMs:
            CONFIRM_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
  } = security;

  return secureJson(
    {
      error:
        "Payment confirmation is not configured yet.",

      code:
        "PAYMENT_CONFIRMATION_DISABLED",

      request_id:
        requestId,
    },
    {
      status: 503,
      requestId,
    }
  );
}