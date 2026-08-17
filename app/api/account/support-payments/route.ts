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

const ACCOUNT_SUPPORT_PAYMENTS_RATE_LIMIT =
  60;

const ACCOUNT_SUPPORT_PAYMENTS_RATE_WINDOW_MS =
  60_000;

const ACCOUNT_SUPPORT_PAYMENTS_LIMIT =
  100;

export async function GET(
  request: NextRequest
) {
  const security =
    await secureApi(
      request,
      {
        scope:
          "account-support-payments-read",

        requireAuth:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            ACCOUNT_SUPPORT_PAYMENTS_RATE_LIMIT,

          windowMs:
            ACCOUNT_SUPPORT_PAYMENTS_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
  } = security;

  /*
   * secureApi is configured with requireAuth:true.
   * This explicit guard keeps the route type-safe
   * in case the shared helper return type still
   * allows user to be nullable.
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
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "support_payments"
        )
        .select(
          `
            id,
            amount,
            currency,
            status,
            supporter_level,
            provider,
            provider_reference,
            created_at,
            paid_at,
            updated_at
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          ACCOUNT_SUPPORT_PAYMENTS_LIMIT
        );

    if (error) {
      console.error(
        "Account support payments fetch error:",
        error
      );

      return secureJson(
        {
          error:
            "Support payment history could not be loaded.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    const payments =
      (data ?? []).map(
        (payment) => ({
          id:
            payment.id,

          amount:
            Number(
              payment.amount
            ),

          currency:
            payment.currency,

          status:
            payment.status,

          supporter_level:
            payment.supporter_level,

          provider:
            payment.provider,

          reference:
            payment.provider_reference,

          created_at:
            payment.created_at,

          paid_at:
            payment.paid_at,

          updated_at:
            payment.updated_at,
        })
      );

    return secureJson(
      {
        payments,

        count:
          payments.length,

        request_id:
          requestId,
      },
      {
        status: 200,
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Account support payments route error:",
      error
    );

    return secureJson(
      {
        error:
          "Support payment history could not be loaded.",

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