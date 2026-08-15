import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdminRole,
} from "../../../../lib/admin/requireAdminRole";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdminRole(
      request,
      [
        "owner",
        "admin",
      ]
    );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url =
      new URL(request.url);

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
        .limit(limit);

    if (
      status &&
      [
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ].includes(status)
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

      return NextResponse.json(
        {
          error:
            "Support payments could not be loaded.",
        },
        {
          status: 500,
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

    return NextResponse.json(
      {
        payments,
        count:
          payments.length,
        current_admin_role:
          auth.admin.role,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Admin support payments route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Support payments could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}