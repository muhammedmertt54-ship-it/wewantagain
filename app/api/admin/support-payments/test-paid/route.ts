import { randomUUID } from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdminRole,
} from "../../../../../lib/admin/requireAdminRole";

import {
  supabaseAdmin,
} from "../../../../../lib/supabaseAdmin";

import {
  markSupportPaymentPaid,
} from "../../../../../lib/support/markSupportPaymentPaid";

export async function POST(
  request: NextRequest
) {
  const auth =
    await requireAdminRole(
      request,
      ["owner"]
    );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    const paymentId =
      Number(
        body?.paymentId
      );

    const confirmation =
      typeof body?.confirmation ===
      "string"
        ? body.confirmation
        : "";

    if (
      !Number.isInteger(
        paymentId
      ) ||
      paymentId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Additional protection against
     * accidentally calling this
     * temporary test endpoint.
     */
    if (
      confirmation !==
      "CONFIRM_TEST_PAYMENT"
    ) {
      return NextResponse.json(
        {
          error:
            "Test confirmation value is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only allow an existing PENDING
     * payment with no real provider
     * attached.
     */
    const {
      data: payment,
      error: paymentError,
    } =
      await supabaseAdmin
        .from(
          "support_payments"
        )
        .select(
          `
            id,
            status,
            provider,
            provider_payment_id,
            amount,
            user_id
          `
        )
        .eq(
          "id",
          paymentId
        )
        .maybeSingle();

    if (paymentError) {
      console.error(
        "Test payment lookup error:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Payment could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Payment not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      payment.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Only a pending payment can be used for this test.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      payment.provider ||
      payment.provider_payment_id
    ) {
      return NextResponse.json(
        {
          error:
            "This payment already contains provider information and cannot be used for the manual test.",
        },
        {
          status: 409,
        }
      );
    }

    const testProviderPaymentId =
      `test_${randomUUID()}`;

    const result =
      await markSupportPaymentPaid({
        paymentId,

        provider:
          "manual-test",

        providerPaymentId:
          testProviderPaymentId,
      });

    return NextResponse.json(
      {
        success: true,

        test: true,

        payment: {
          id:
            result.paymentId,

          user_id:
            result.userId,

          amount:
            result.amount,

          supporter_level:
            result.tier,

          already_paid:
            result.alreadyPaid,

          provider:
            "manual-test",

          provider_payment_id:
            testProviderPaymentId,
        },

        warning:
          "This payment was marked paid using the temporary Owner-only test endpoint.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Test paid endpoint error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Test payment confirmation failed.",
      },
      {
        status: 500,
      }
    );
  }
}