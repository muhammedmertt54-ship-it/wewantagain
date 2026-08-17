import {
  NextRequest,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../lib/supabaseAdmin";

import {
  secureApi,
} from "../../../lib/security/secureApi";

import {
  secureJson,
} from "../../../lib/security/requestSecurity";

const SUPPORTERS_READ_RATE_LIMIT =
  120;

const SUPPORTERS_RATE_WINDOW_MS =
  60_000;

const DEFAULT_LIMIT =
  50;

const MAX_LIMIT =
  100;

export async function GET(
  request: NextRequest
) {
  const security =
    await secureApi(
      request,
      {
        scope:
          "public-supporters-read",

        requireAuth:
          false,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            SUPPORTERS_READ_RATE_LIMIT,

          windowMs:
            SUPPORTERS_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
  } = security;

  try {
    const url =
      new URL(
        request.url
      );

    const rawLimit =
      Number(
        url.searchParams.get(
          "limit"
        ) ??
          String(
            DEFAULT_LIMIT
          )
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
            : DEFAULT_LIMIT,
          1
        ),
        MAX_LIMIT
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
        .limit(
          limit
        );

    if (error) {
      console.error(
        "Supporters API error:",
        error
      );

      return secureJson(
        {
          error:
            "Supporters could not be loaded.",

          request_id:
            requestId,
        },
        {
          status: 500,
          requestId,
        }
      );
    }

    const supporters =
      (data ?? [])
        .map(
          (item) => ({
            id:
              item.id,

            name:
              typeof item.supporter_name ===
                "string"
                ? item.supporter_name
                    .trim()
                    .slice(
                      0,
                      100
                    )
                : null,

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
        )
        .filter(
          (
            item
          ): item is {
            id: typeof item.id;
            name: string;
            level: typeof item.level;
            amount: number;
            currency: typeof item.currency;
            paid_at: typeof item.paid_at;
          } =>
            typeof item.name ===
              "string" &&
            item.name.length >
              0
        );

    return secureJson(
      {
        supporters,

        count:
          supporters.length,

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
      "Supporters route error:",
      error
    );

    return secureJson(
      {
        error:
          "Supporters could not be loaded.",

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