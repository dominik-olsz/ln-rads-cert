/**
 * PLN pricing derived from an admin-set COMMERCIAL rate.
 *
 * IMPORTANT: `eur_pln_commercial_rate` is a pricing rate only. It must never be
 * used for invoice figures or VAT conversion — those always come from FakturaXL
 * (NBP accounting rate).
 *
 * Course prices stay authoritative in EUR; the PLN amount is derived at
 * checkout from the current rate, so a rate change takes effect immediately.
 */

export type RoundingMode = "nearest_1" | "nearest_10" | "ends_99";

export type CommercialFxRate = {
  id: string | null;
  rate: number;
  roundingMode: RoundingMode;
  effectiveFrom: string | null;
};

const STRIPE_MIN_PLN_CENTS = 200; // Stripe minimum charge for PLN (2.00 PLN)

export function roundPlnCents(rawCents: number, mode: RoundingMode): number {
  const raw = Math.max(0, rawCents);
  switch (mode) {
    case "nearest_1":
      return Math.round(raw / 100) * 100;
    case "nearest_10":
      return Math.round(raw / 1000) * 1000;
    case "ends_99":
    default: {
      const whole = Math.max(1, Math.round(raw / 100));
      return whole * 100 - 1;
    }
  }
}

/** Net EUR cents -> net PLN cents at the given commercial rate. */
export function eurCentsToPlnCents(eurCents: number, fx: CommercialFxRate): number {
  const raw = eurCents * fx.rate;
  const rounded = roundPlnCents(raw, fx.roundingMode);
  return Math.max(rounded, STRIPE_MIN_PLN_CENTS);
}

/** Latest admin-set commercial rate, or null when none has been set yet. */
export async function getCommercialFxRate(admin: any): Promise<CommercialFxRate | null> {
  const { data, error } = await admin
    .from("pricing_fx_rates")
    .select("id, eur_pln_commercial_rate, rounding_mode, effective_from")
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const rate = Number(data.eur_pln_commercial_rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  return {
    id: data.id,
    rate,
    roundingMode: (data.rounding_mode as RoundingMode) ?? "ends_99",
    effectiveFrom: data.effective_from ?? null,
  };
}
