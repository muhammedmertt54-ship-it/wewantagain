import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

export async function GET(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

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
        .limit(100);

    if (error) {
      console.error(
        "Account support payments fetch error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Support payment history could not be loaded.",
        },
        {
          status: 500,
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

    return NextResponse.json(
      {
        payments,
        count:
          payments.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Account support payments route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Support payment history could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}