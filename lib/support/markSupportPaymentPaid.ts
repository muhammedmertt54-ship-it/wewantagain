import "server-only";

import {
  supabaseAdmin,
} from "../supabaseAdmin";

import {
  getSupporterTier,
  type SupporterTier,
} from "./supporterTier";

type MarkSupportPaymentPaidInput = {
  paymentId: number;
  provider: string;
  providerPaymentId: string;
};

type MarkSupportPaymentPaidResult = {
  paymentId: number;
  userId: string | null;
  amount: number;
  tier: SupporterTier;
  alreadyPaid: boolean;
};

const tierPriority: Record<
  SupporterTier,
  number
> = {
  supporter: 1,
  backer: 2,
  champion: 3,
};

function getHigherTier(
  current:
    | SupporterTier
    | null,
  incoming: SupporterTier
): SupporterTier {
  if (!current) {
    return incoming;
  }

  return tierPriority[incoming] >
    tierPriority[current]
    ? incoming
    : current;
}

export async function markSupportPaymentPaid(
  input: MarkSupportPaymentPaidInput
): Promise<MarkSupportPaymentPaidResult> {
  const paymentId =
    Number(input.paymentId);

  if (
    !Number.isInteger(
      paymentId
    ) ||
    paymentId <= 0
  ) {
    throw new Error(
      "Invalid payment ID."
    );
  }

  const provider =
    input.provider
      .trim()
      .slice(0, 100);

  const providerPaymentId =
    input.providerPaymentId
      .trim()
      .slice(0, 250);

  if (!provider) {
    throw new Error(
      "Payment provider is required."
    );
  }

  if (!providerPaymentId) {
    throw new Error(
      "Provider payment ID is required."
    );
  }

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
          user_id,
          amount,
          status,
          supporter_level,
          provider,
          provider_payment_id,
          paid_at
        `
      )
      .eq(
        "id",
        paymentId
      )
      .maybeSingle();

  if (paymentError) {
    console.error(
      "Support payment lookup error:",
      paymentError
    );

    throw new Error(
      "Support payment could not be loaded."
    );
  }

  if (!payment) {
    throw new Error(
      "Support payment not found."
    );
  }

  const amount =
    Number(
      payment.amount
    );

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Stored payment amount is invalid."
    );
  }

  const calculatedTier =
    getSupporterTier(
      amount
    );

  if (
    payment.status ===
    "paid"
  ) {
    return {
      paymentId:
        payment.id,

      userId:
        payment.user_id,

      amount,

      tier:
        (payment.supporter_level as
          | SupporterTier
          | null) ??
        calculatedTier,

      alreadyPaid:
        true,
    };
  }

  if (
    payment.status ===
      "refunded" ||
    payment.status ===
      "cancelled"
  ) {
    throw new Error(
      `Payment cannot be marked paid from status: ${payment.status}.`
    );
  }

  const paidAt =
    new Date().toISOString();

  const {
    data: updatedPayment,
    error: updateError,
  } =
    await supabaseAdmin
      .from(
        "support_payments"
      )
      .update({
        status:
          "paid",

        provider,

        provider_payment_id:
          providerPaymentId,

        supporter_level:
          calculatedTier,

        paid_at:
          paidAt,

        updated_at:
          paidAt,
      })
      .eq(
        "id",
        payment.id
      )
      .neq(
        "status",
        "paid"
      )
      .select(
        `
          id,
          user_id,
          amount,
          supporter_level
        `
      )
      .maybeSingle();

  if (!updatedPayment) {
    const {
      data:
        currentPayment,
      error:
        currentPaymentError,
    } =
      await supabaseAdmin
        .from(
          "support_payments"
        )
        .select(
          `
            id,
            user_id,
            amount,
            status,
            supporter_level
          `
        )
        .eq(
          "id",
          payment.id
        )
        .maybeSingle();

    if (
      currentPaymentError
    ) {
      console.error(
        "Payment recheck error:",
        currentPaymentError
      );

      throw new Error(
        "Payment confirmation could not be completed."
      );
    }

    if (
      currentPayment?.status ===
      "paid"
    ) {
      return {
        paymentId:
          currentPayment.id,

        userId:
          currentPayment.user_id,

        amount:
          Number(
            currentPayment.amount
          ),

        tier:
          (currentPayment.supporter_level as
            | SupporterTier
            | null) ??
          calculatedTier,

        alreadyPaid:
          true,
      };
    }

    if (updateError) {
      console.error(
        "Support payment update error:",
        updateError
      );
    }

    throw new Error(
      "Payment confirmation could not be completed."
    );
  }

  if (updateError) {
    console.error(
      "Support payment update error:",
      updateError
    );

    throw new Error(
      "Payment confirmation could not be completed."
    );
  }

  if (
    !payment.user_id
  ) {
    return {
      paymentId:
        payment.id,

      userId:
        null,

      amount,

      tier:
        calculatedTier,

      alreadyPaid:
        false,
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        `
          supporter,
          supporter_level
        `
      )
      .eq(
        "user_id",
        payment.user_id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Supporter profile lookup error:",
      profileError
    );

    throw new Error(
      "Payment was confirmed but supporter profile could not be loaded."
    );
  }

  const existingTier =
    profile?.supporter_level ===
      "supporter" ||
    profile?.supporter_level ===
      "backer" ||
    profile?.supporter_level ===
      "champion"
      ? profile.supporter_level
      : null;

  const finalTier =
    getHigherTier(
      existingTier,
      calculatedTier
    );

  const {
    data:
      updatedProfiles,
    error:
      profileUpdateError,
  } =
    await supabaseAdmin
      .from("profiles")
      .update({
        supporter: true,

        supporter_level:
          finalTier,
      })
      .eq(
        "user_id",
        payment.user_id
      )
      .select(
        "user_id"
      );

  if (
    profileUpdateError
  ) {
    console.error(
      "Supporter profile update error:",
      profileUpdateError
    );

    throw new Error(
      "Payment was confirmed but supporter profile could not be updated."
    );
  }

  if (
    !updatedProfiles ||
    updatedProfiles.length ===
      0
  ) {
    throw new Error(
      "Payment was confirmed but the linked user profile was not found."
    );
  }

  return {
    paymentId:
      payment.id,

    userId:
      payment.user_id,

    amount,

    tier:
      finalTier,

    alreadyPaid:
      false,
  };
}