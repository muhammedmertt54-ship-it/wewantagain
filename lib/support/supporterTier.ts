export type SupporterTier =
  | "supporter"
  | "backer"
  | "champion";

export function getSupporterTier(
  amount: number
): SupporterTier {
  if (!Number.isFinite(amount)) {
    throw new Error(
      "Invalid supporter amount."
    );
  }

  if (amount >= 250) {
    return "champion";
  }

  if (amount >= 100) {
    return "backer";
  }

  return "supporter";
}

export function getSupporterTierLabel(
  tier: SupporterTier
) {
  if (tier === "champion") {
    return "Champion";
  }

  if (tier === "backer") {
    return "Backer";
  }

  return "Supporter";
}