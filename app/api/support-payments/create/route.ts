import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

const TERMS_VERSION = "2026-08-15";
const REFUND_POLICY_VERSION = "2026-08-15";

const PENDING_REUSE_MINUTES = 10;

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

export async function POST(
  request: NextRequest
) {
  try {
    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? "0"
      );

    if (
      Number.isFinite(contentLength) &&
      contentLength > 20000
    ) {
      return NextResponse.json(
        {
          error:
            "Request body is too large.",
        },
        {
          status: 413,
        }
      );
    }

    const body =
      await request.json();

    const termsAccepted =
      body?.terms_accepted === true;

    const refundAccepted =
      body?.refund_policy_accepted ===
      true;

    if (!termsAccepted) {
      return NextResponse.json(
        {
          error:
            "Terms of Service must be accepted before continuing.",
        },
        {
          status: 400,
        }
      );
    }

    if (!refundAccepted) {
      return NextResponse.json(
        {
          error:
            "Refund & Cancellation Policy must be accepted before continuing.",
        },
        {
          status: 400,
        }
      );
    }

    const rawAmount =
      Number(body?.amount);

    if (
      !Number.isFinite(rawAmount) ||
      rawAmount < MIN_AMOUNT ||
      rawAmount > MAX_AMOUNT
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid support amount.",
        },
        {
          status: 400,
        }
      );
    }

    const amount =
      Math.round(
        rawAmount * 100
      ) / 100;

    const note =
      cleanText(
        body?.note,
        300
      );

    const publicSupporter =
      body?.public_supporter ===
      true;

    const supporterName =
      publicSupporter
        ? cleanText(
            body?.supporter_name,
            60
          )
        : "";

    let userId:
      | string
      | null = null;

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      authorization?.startsWith(
        "Bearer "
      )
    ) {
      const accessToken =
        authorization
          .slice(7)
          .trim();

      if (accessToken) {
        const {
          data: { user },
        } =
          await supabaseAdmin.auth.getUser(
            accessToken
          );

        if (user?.id) {
          userId = user.id;
        }
      }
    }

    const cutoff =
      new Date(
        Date.now() -
          PENDING_REUSE_MINUTES *
            60 *
            1000
      ).toISOString();

    if (userId) {
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
      }

      if (
        existingPayment
      ) {
        return NextResponse.json(
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

            reused: true,
          },
          {
            status: 200,
          }
        );
      }
    }

    const providerReference =
      randomUUID();

    const acceptedAt =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "support_payments"
        )
        .insert({
          user_id: userId,

          amount,

          currency: "TRY",

          note:
            note || null,

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

      return NextResponse.json(
        {
          error:
            "Support payment could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
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

        reused: false,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Support payment create error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Support payment could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}