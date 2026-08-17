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

const SUPPORT_PAYMENTS_READ_RATE_LIMIT =
  60;

const SUPPORT_PAYMENTS_RATE_WINDOW_MS =
  60_000;

const ALLOWED_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;

type PaymentStatus =
  (typeof ALLOWED_STATUSES)[number];

function isPaymentStatus(
  value: string
): value is PaymentStatus {
  return (
    ALLOWED_STATUSES as readonly string[]
  ).includes(value);
}

export async function GET(
  request: NextRequest
) {
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-support-payments-read",

        allowedRoles: [
          "owner",
          "admin",
        ],

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SUPPORT_PAYMENTS_READ_RATE_LIMIT,

          windowMs:
            SUPPORT_PAYMENTS_RATE_WINDOW_MS,
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
    const url =
      new URL(
        request.url
      );

    const status =
      url.searchParams.get(
        "status"
      );

    const rawLimit =
      Number(
        url.searchParams.get(
          "limit"
        ) ?? "100"
      );

    const limit =
      Math.min(
        Math.max(
          Number.isFinite(
            rawLimit
          )
            ? Math.floor(
                rawLimit
              )
            : 100,
          1
        ),
        250
      );

    let query =
      supabaseAdmin
        .from(
          "support_payments"
        )
        .select(
          `
            id,
            user_id,
            amount,
            currency,
            note,
            status,
            provider,
            provider_payment_id,
            provider_reference,
            public_supporter,
            supporter_name,
            supporter_level,
            created_at,
            paid_at,
            updated_at,
            terms_accepted_at,
            refund_policy_accepted_at,
            terms_version,
            refund_policy_version
          `
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          limit
        );

    if (
      status &&
      isPaymentStatus(
        status
      )
    ) {
      query =
        query.eq(
          "status",
          status
        );
    }

    const {
      data,
      error,
    } =
      await query;

    if (error) {
      console.error(
        "Admin support payments fetch error:",
        error
      );

      return secureJson(
        {
          error:
            "Support payments could not be loaded.",

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
        (item) => ({
          id:
            item.id,

          user_id:
            item.user_id,

          amount:
            Number(
              item.amount
            ),

          currency:
            item.currency,

          note:
            item.note,

          status:
            item.status,

          provider:
            item.provider,

          provider_payment_id:
            item.provider_payment_id,

          provider_reference:
            item.provider_reference,

          public_supporter:
            item.public_supporter,

          supporter_name:
            item.supporter_name,

          supporter_level:
            item.supporter_level,

          created_at:
            item.created_at,

          paid_at:
            item.paid_at,

          updated_at:
            item.updated_at,

          terms_accepted_at:
            item.terms_accepted_at,

          refund_policy_accepted_at:
            item.refund_policy_accepted_at,

          terms_version:
            item.terms_version,

          refund_policy_version:
            item.refund_policy_version,
        })
      );

    return secureJson(
      {
        payments,

        count:
          payments.length,

        current_admin_role:
          admin.role,

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
      "Admin support payments route error:",
      error
    );

    return secureJson(
      {
        error:
          "Support payments could not be loaded.",

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