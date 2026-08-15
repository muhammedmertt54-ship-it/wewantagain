import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

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
      Number.isFinite(
        contentLength
      ) &&
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
          data: {
            user,
          },
        } =
          await supabaseAdmin.auth.getUser(
            accessToken
          );

        if (user?.id) {
          userId = user.id;
        }
      }
    }

    const providerReference =
      randomUUID();

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

          provider: null,

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
            "supporter",

          updated_at:
            new Date().toISOString(),
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
          id: data.id,
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
          created_at:
            data.created_at,
        },
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