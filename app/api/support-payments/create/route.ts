import { randomUUID } from "crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

import {
  parseJsonBody,
  secureJson,
} from "../../../../lib/security/requestSecurity";

import {
  secureApi,
} from "../../../../lib/security/secureApi";

const PAYMENT_PROVIDER_ENABLED =
  false;

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

const TERMS_VERSION =
  "2026-08-15";

const REFUND_POLICY_VERSION =
  "2026-08-15";

const PENDING_REUSE_MINUTES =
  10;

const MAX_BODY_BYTES =
  20_000;

type SupportPaymentBody = {
  amount?: unknown;
  terms_accepted?: unknown;
  refund_policy_accepted?: unknown;
  note?: unknown;
  public_supporter?: unknown;
  supporter_name?: unknown;
};

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maxLength
    );
}

export async function POST(
  request: NextRequest
) {
  const security =
    await secureApi(
      request,
      {
        scope:
          "support-payment-create",

        requireAuth:
          true,

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit: 5,
          windowMs:
            60_000,
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
   * PAYMENT SYSTEM MASTER LOCK
   *
   * Even authenticated users cannot
   * create a pending payment while
   * the provider is disabled.
   */
  if (
    !PAYMENT_PROVIDER_ENABLED
  ) {
    return secureJson(
      {
        error:
          "Payment provider is currently unavailable. Please wait until supporter payments are activated.",

        code:
          "PAYMENTS_DISABLED",

        request_id:
          requestId,
      },
      {
        status: 503,
        requestId,
      }
    );
  }

  /*
   * secureApi(requireAuth: true)
   * guarantees a user, but we still
   * fail closed if that assumption
   * ever changes.
   */
  if (!user?.id) {
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

  const userId =
    user.id;

  /*
   * SAFE JSON PARSING +
   * BODY SIZE PROTECTION
   */
  const parsed =
    await parseJsonBody<SupportPaymentBody>(
      request,
      {
        maxBytes:
          MAX_BODY_BYTES,
      }
    );

  if (!parsed.ok) {
    return secureJson(
      {
        error:
          parsed.error,

        request_id:
          requestId,
      },
      {
        status:
          parsed.status,

        requestId,
      }
    );
  }

  const body =
    parsed.body;

  /*
   * CONSENT VALIDATION
   */
  const termsAccepted =
    body.terms_accepted ===
    true;

  const refundAccepted =
    body
      .refund_policy_accepted ===
    true;

  if (
    !termsAccepted
  ) {
    return secureJson(
      {
        error:
          "Terms of Service must be accepted before continuing.",

        request_id:
          requestId,
      },
      {
        status: 400,
        requestId,
      }
    );
  }

  if (
    !refundAccepted
  ) {
    return secureJson(
      {
        error:
          "Refund & Cancellation Policy must be accepted before continuing.",

        request_id:
          requestId,
      },
      {
        status: 400,
        requestId,
      }
    );
  }

  /*
   * AMOUNT VALIDATION
   */
  const rawAmount =
    Number(
      body.amount
    );

  if (
    !Number.isFinite(
      rawAmount
    ) ||
    rawAmount <
      MIN_AMOUNT ||
    rawAmount >
      MAX_AMOUNT
  ) {
    return secureJson(
      {
        error:
          "Invalid support amount.",

        request_id:
          requestId,
      },
      {
        status: 400,
        requestId,
      }
    );
  }

  const amount =
    Math.round(
      rawAmount *
        100
    ) / 100;

  /*
   * TEXT NORMALIZATION
   */
  const note =
    cleanText(
      body.note,
      300
    );

  const publicSupporter =
    body
      .public_supporter ===
    true;

  const supporterName =
    publicSupporter
      ? cleanText(
          body
            .supporter_name,
          60
        )
      : "";

  if (
    publicSupporter &&
    !supporterName
  ) {
    return secureJson(
      {
        error:
          "A public supporter name is required.",

        request_id:
          requestId,
      },
      {
        status: 400,
        requestId,
      }
    );
  }

  /*
   * DUPLICATE PENDING
   * PAYMENT PROTECTION
   */
  const cutoff =
    new Date(
      Date.now() -
        PENDING_REUSE_MINUTES *
          60 *
          1000
    ).toISOString();

  const {
    data:
      existingPayment,
    error:
      existingPaymentError,
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
          provider_reference,
          public_supporter,
          supporter_name,
          terms_accepted_at,
          refund_policy_accepted_at,
          terms_version,
          refund_policy_version,
          created_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "pending"
      )
      .eq(
        "amount",
        amount
      )
      .gte(
        "created_at",
        cutoff
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (
    existingPaymentError
  ) {
    console.error(
      "Pending payment lookup error:",
      existingPaymentError
    );

    return secureJson(
      {
        error:
          "Support payment could not be prepared.",

        request_id:
          requestId,
      },
      {
        status: 500,
        requestId,
      }
    );
  }

  if (
    existingPayment
  ) {
    return secureJson(
      {
        payment: {
          id:
            existingPayment.id,

          amount:
            Number(
              existingPayment.amount
            ),

          currency:
            existingPayment.currency,

          status:
            existingPayment.status,

          reference:
            existingPayment.provider_reference,

          public_supporter:
            existingPayment.public_supporter,

          supporter_name:
            existingPayment.supporter_name,

          terms_accepted_at:
            existingPayment.terms_accepted_at,

          refund_policy_accepted_at:
            existingPayment.refund_policy_accepted_at,

          terms_version:
            existingPayment.terms_version,

          refund_policy_version:
            existingPayment.refund_policy_version,

          created_at:
            existingPayment.created_at,
        },

        reused:
          true,

        request_id:
          requestId,
      },
      {
        status: 200,
        requestId,
      }
    );
  }

  /*
   * CREATE UNIQUE PROVIDER
   * REFERENCE SERVER-SIDE
   */
  const providerReference =
    randomUUID();

  const acceptedAt =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "support_payments"
      )
      .insert({
        user_id:
          userId,

        amount,

        currency:
          "TRY",

        note:
          note ||
          null,

        status:
          "pending",

        provider:
          null,

        provider_payment_id:
          null,

        provider_reference:
          providerReference,

        public_supporter:
          publicSupporter,

        supporter_name:
          supporterName ||
          null,

        supporter_level:
          null,

        terms_accepted_at:
          acceptedAt,

        refund_policy_accepted_at:
          acceptedAt,

        terms_version:
          TERMS_VERSION,

        refund_policy_version:
          REFUND_POLICY_VERSION,

        updated_at:
          acceptedAt,
      })
      .select(
        `
          id,
          amount,
          currency,
          status,
          provider_reference,
          public_supporter,
          supporter_name,
          terms_accepted_at,
          refund_policy_accepted_at,
          terms_version,
          refund_policy_version,
          created_at
        `
      )
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "Support payment insert error:",
      error
    );

    return secureJson(
      {
        error:
          "Support payment could not be created.",

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
      payment: {
        id:
          data.id,

        amount:
          Number(
            data.amount
          ),

        currency:
          data.currency,

        status:
          data.status,

        reference:
          data.provider_reference,

        public_supporter:
          data.public_supporter,

        supporter_name:
          data.supporter_name,

        terms_accepted_at:
          data.terms_accepted_at,

        refund_policy_accepted_at:
          data.refund_policy_accepted_at,

        terms_version:
          data.terms_version,

        refund_policy_version:
          data.refund_policy_version,

        created_at:
          data.created_at,
      },

      reused:
        false,

      request_id:
        requestId,
    },
    {
      status: 201,
      requestId,
    }
  );
}