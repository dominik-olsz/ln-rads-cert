import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * PLN prices are derived from an admin-set COMMERCIAL EUR/PLN rate.
 * It is a pricing rate only — invoices and VAT always use FakturaXL's NBP rate.
 */
export type RoundingMode = "nearest_1" | "nearest_10" | "ends_99";

export const ROUNDING_OPTIONS: { value: RoundingMode; label: string }[] = [
  { value: "nearest_1", label: "Nearest 1 PLN (e.g. 259.00 zł)" },
  { value: "nearest_10", label: "Nearest 10 PLN (e.g. 260.00 zł)" },
  { value: "ends_99", label: ".99 endings (e.g. 258.99 zł)" },
];

export type CommercialFxRate = {
  id?: string | null;
  rate: number;
  roundingMode: RoundingMode;
  effectiveFrom: string | null;
};

const STRIPE_MIN_PLN_CENTS = 200;

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
export function eurCentsToPlnCents(eurCents: number, rate: number, mode: RoundingMode): number {
  return Math.max(roundPlnCents(eurCents * rate, mode), STRIPE_MIN_PLN_CENTS);
}

export function formatPlnCents(cents: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(cents / 100);
}

export function formatPln(amount: number) {
  return formatPlnCents(Math.round(amount * 100));
}

/** Current commercial rate, readable by everyone (used to show PLN prices). */
export function useCommercialFxRate() {
  const [fx, setFx] = useState<CommercialFxRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pricing_fx_rates")
        .select("id, eur_pln_commercial_rate, rounding_mode, effective_from")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const rate = Number(data?.eur_pln_commercial_rate);
      setFx(
        data && Number.isFinite(rate) && rate > 0
          ? {
              id: data.id,
              rate,
              roundingMode: (data.rounding_mode as RoundingMode) ?? "ends_99",
              effectiveFrom: data.effective_from ?? null,
            }
          : null,
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { fx, loading };
}
