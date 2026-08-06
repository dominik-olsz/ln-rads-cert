export type CourseDiscountFields = {
  price?: number | null;
  discount_price?: number | null;
  discount_valid_until?: string | null;
};

export type EffectivePrice = {
  base: number;
  effective: number;
  saleActive: boolean;
  validUntil: string | null;
};

/** Regular price and (if a sale is active) the discounted price, in euros. */
export function getEffectivePrice(course: CourseDiscountFields): EffectivePrice {
  const base = Number(course.price ?? 0);
  const dp = course.discount_price;
  const validUntil = course.discount_valid_until ?? null;

  let saleActive =
    dp !== null && dp !== undefined && Number.isFinite(Number(dp)) && Number(dp) >= 0 && Number(dp) < base;

  if (saleActive && validUntil) {
    const until = new Date(validUntil).getTime();
    if (Number.isFinite(until) && until < Date.now()) saleActive = false;
  }

  return {
    base,
    effective: saleActive ? Number(dp) : base,
    saleActive,
    validUntil: saleActive ? validUntil : null,
  };
}

export function formatEuro(amount: number) {
  return Number.isInteger(amount) ? `€${amount}` : `€${amount.toFixed(2)}`;
}

export function formatEuroCents(cents: number) {
  return formatEuro(cents / 100);
}

export function countdownParts(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
