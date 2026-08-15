import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(request.url);

    const rawLimit =
      Number(
        url.searchParams.get(
          "limit"
        ) ?? "50"
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
            : 50,
          1
        ),
        100
      );

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
            supporter_name,
            supporter_level,
            amount,
            currency,
            paid_at
          `
        )
        .eq(
          "status",
          "paid"
        )
        .eq(
          "public_supporter",
          true
        )
        .not(
          "supporter_name",
          "is",
          null
        )
        .order(
          "paid_at",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        )
        .limit(limit);

    if (error) {
      console.error(
        "Supporters API error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Supporters could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    const supporters =
      (data ?? []).map(
        (item) => ({
          id:
            item.id,

          name:
            item.supporter_name,

          level:
            item.supporter_level,

          amount:
            Number(
              item.amount
            ),

          currency:
            item.currency,

          paid_at:
            item.paid_at,
        })
      );

    return NextResponse.json(
      {
        supporters,
        count:
          supporters.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Supporters route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Supporters could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}