import {
  NextRequest,
  NextResponse,
} from "next/server";

/*
 * IMPORTANT:
 *
 * This endpoint must NEVER trust payment
 * success information sent by the browser.
 *
 * A payment may only be confirmed after
 * verifying the selected payment provider's
 * signed webhook/callback.
 *
 * Provider integration has not been
 * configured yet, so confirmation is
 * intentionally disabled.
 */

export async function POST(
  _request: NextRequest
) {
  return NextResponse.json(
    {
      error:
        "Payment confirmation is not configured yet.",
    },
    {
      status: 503,
    }
  );
}