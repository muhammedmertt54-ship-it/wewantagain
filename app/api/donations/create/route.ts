import {
  NextRequest,
  NextResponse,
} from "next/server";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
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

async function getOptionalUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization.slice(7);

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

export async function POST(
  request: NextRequest
) {
  try {
    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? 0
      );

    if (
      contentLength >
      20_000
    ) {
      return NextResponse.json(
        {
          error:
            "Request is too large.",
        },
        {
          status: 413,
        }
      );
    }

    const body =
      await request.json();

    const amount =
      Number(
        body?.amount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <
        MIN_AMOUNT ||
      amount >
        MAX_AMOUNT
    ) {
      return NextResponse.json(
        {
          error:
            `Donation amount must be between ₺${MIN_AMOUNT} and ₺${MAX_AMOUNT}.`,
        },
        {
          status: 400,
        }
      );
    }

    const normalizedAmount =
      Math.round(
        amount * 100
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

    const user =
      await getOptionalUser(
        request
      );

    const providerReference =
      randomUUID();

    const {
      data: donation,
      error,
    } =
      await supabaseAdmin
        .from(
          "donations"
        )
        .insert({
          user_id:
            user?.id ??
            null,

          amount:
            normalizedAmount,

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
            "supporter",

          updated_at:
            new Date()
              .toISOString(),
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

    if (error) {
      console.error(
        "Donation create error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Donation could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        donation: {
          id:
            donation.id,

          amount:
            donation.amount,

          currency:
            donation.currency,

          status:
            donation.status,

          reference:
            donation.provider_reference,

          public_supporter:
            donation.public_supporter,

          supporter_name:
            donation.supporter_name,

          created_at:
            donation.created_at,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Donation create API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}