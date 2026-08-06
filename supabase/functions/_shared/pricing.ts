/**
 * Shared, server-side discount pricing.
 *
 * Stacking order:
 *   regular price -> course sale price (if active) -> user discount % -> code discount %
 *
 * All amounts are in cents. The client never sets a price.
 */

export type DiscountCodeRow = {
  id: string;
  code: string;
  percent: number;
  expires_at: string | null;
  is_active: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
};

export type PricingBreakdown = {
  currency: "eur";
  /** Regular list price in cents */
  baseCents: number;
  /** Price after an active course sale, in cents */
  saleCents: number;
  saleActive: boolean;
  saleValidUntil: string | null;
  userPercent: number;
  codePercent: number;
  codeId: string | null;
  code: string | null;
  /** Amount actually charged, in cents */
  finalCents: number;
  discountSummary: string | null;
  isFree: boolean;
};

const STRIPE_MIN_CENTS = 50;

export function isSaleActive(discountPrice: unknown, validUntil: unknown, basePrice: number) {
  if (discountPrice === null || discountPrice === undefined || discountPrice === "") return false;
  const dp = Number(discountPrice);
  if (!Number.isFinite(dp) || dp < 0) return false;
  if (dp >= basePrice) return false;
  if (validUntil) {
    const until = new Date(String(validUntil)).getTime();
    if (Number.isFinite(until) && until < Date.now()) return false;
  }
  return true;
}

function pct(cents: number, percent: number) {
  if (!percent) return cents;
  return Math.round(cents * (100 - percent) / 100);
}

export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  return code.length ? code.slice(0, 40) : null;
}

/** Looks a code up and validates it. Returns null when it cannot be used. */
export async function lookupDiscountCode(admin: any, rawCode: unknown) {
  const code = normalizeCode(rawCode);
  if (!code) return { code: null, row: null as DiscountCodeRow | null, error: null as string | null };

  const { data } = await admin
    .from("discount_codes")
    .select("id, code, percent, expires_at, is_active, redeemed_by, redeemed_at")
    .eq("code", code)
    .maybeSingle();

  if (!data) return { code, row: null, error: "This discount code does not exist." };
  if (!data.is_active) return { code, row: null, error: "This discount code is no longer active." };
  if (data.redeemed_at || data.redeemed_by) {
    return { code, row: null, error: "This discount code has already been used." };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { code, row: null, error: "This discount code has expired." };
  }
  return { code, row: data as DiscountCodeRow, error: null };
}

export async function getUserDiscountPercent(admin: any, userId: string): Promise<number> {
  const { data } = await admin
    .from("profiles")
    .select("discount_percent")
    .eq("id", userId)
    .maybeSingle();
  const raw = Number(data?.discount_percent ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.min(100, Math.round(raw)) : 0;
}

/**
 * Computes the final price for a purchase.
 * `basePriceEuros` is the regular price, `salePriceEuros`/`saleValidUntil` the optional course sale.
 */
export function computePricing(opts: {
  basePriceEuros: number;
  salePriceEuros?: number | null;
  saleValidUntil?: string | null;
  userPercent?: number;
  codePercent?: number;
  codeId?: string | null;
  code?: string | null;
}): PricingBreakdown {
  const baseCents = Math.round(Number(opts.basePriceEuros || 0) * 100);
  const saleApplies = isSaleActive(opts.salePriceEuros, opts.saleValidUntil, Number(opts.basePriceEuros || 0));
  const saleCents = saleApplies ? Math.round(Number(opts.salePriceEuros) * 100) : baseCents;

  const userPercent = Math.min(100, Math.max(0, Math.round(opts.userPercent ?? 0)));
  const codePercent = Math.min(100, Math.max(0, Math.round(opts.codePercent ?? 0)));

  let cents = pct(saleCents, userPercent);
  cents = pct(cents, codePercent);
  if (cents < 0) cents = 0;

  const isFree = cents === 0;
  const finalCents = isFree ? 0 : Math.max(cents, STRIPE_MIN_CENTS);

  const parts: string[] = [];
  if (saleApplies) parts.push(`sale price €${Number(opts.salePriceEuros).toFixed(2)}`);
  if (userPercent) parts.push(`account discount ${userPercent}%`);
  if (codePercent) parts.push(`code ${opts.code} −${codePercent}%`);

  return {
    currency: "eur",
    baseCents,
    saleCents,
    saleActive: saleApplies,
    saleValidUntil: saleApplies ? (opts.saleValidUntil ?? null) : null,
    userPercent,
    codePercent,
    codeId: codePercent ? (opts.codeId ?? null) : null,
    code: codePercent ? (opts.code ?? null) : null,
    finalCents,
    discountSummary: parts.length ? parts.join(", ") : null,
    isFree,
  };
}
