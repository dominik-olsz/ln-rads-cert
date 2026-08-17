import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export type BillingProfile = {
  buyer_type?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  vat_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  stripe_customer_id?: string | null;
};

export function vatTaxType(country?: string | null): string | null {
  const c = (country ?? "").toUpperCase();
  const eu = ["AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK"];
  if (eu.includes(c)) return "eu_vat";
  if (c === "GB") return "gb_vat";
  if (c === "CH") return "ch_vat";
  if (c === "NO") return "no_vat";
  return null;
}

/**
 * Pushes the saved invoice details from `profiles` onto the buyer's Stripe
 * Customer (name, address and VAT ID), creating the Customer on first use and
 * storing its id on the profile. This is the website -> Stripe direction of the
 * billing sync; the webhook handles Stripe -> website.
 */
export async function syncStripeCustomer(
  stripe: Stripe,
  admin: any,
  args: { userId: string; email?: string | null; profile: BillingProfile | null },
): Promise<string | undefined> {
  const { userId, email, profile } = args;
  if (!email) return undefined;

  try {
    // The buyer type is chosen at Stripe Checkout on every purchase, so the
    // Customer is only pre-filled with the neutral details (name + address).
    // A VAT ID is deliberately never pushed here: a Customer that already
    // carries a tax ID makes Checkout open in "business" mode with a mandatory
    // VAT number, and one without it opens in "private" mode — either way the
    // buyer loses the choice.
    const hasAddress = Boolean(
      profile?.address_line1 && profile?.postal_code && profile?.city && profile?.country,
    );
    const address = hasAddress
      ? {
          line1: profile!.address_line1 as string,
          line2: (profile!.address_line2 as string) || undefined,
          postal_code: profile!.postal_code as string,
          city: profile!.city as string,
          country: (profile!.country as string).toUpperCase(),
        }
      : undefined;
    const name = profile?.full_name || email;

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (customerId) {
      try {
        await stripe.customers.update(customerId, { name, address });
      } catch (e) {
        console.error("Stored customer unusable, creating a new one:", e);
        customerId = undefined;
      }
    }
    if (!customerId) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data[0]?.id;
      if (customerId) {
        await stripe.customers.update(customerId, { name, address });
      } else {
        const created = await stripe.customers.create({ email, name, address });
        customerId = created.id;
      }
    }
    if (customerId && customerId !== profile?.stripe_customer_id) {
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    // Clear any tax ID left on the Customer (from an earlier purchase or the
    // old billing form) so Checkout always asks the buyer to pick private or
    // business again instead of silently locking one of the two.
    try {
      const taxIds = await stripe.customers.listTaxIds(customerId!, { limit: 20 });
      for (const t of taxIds.data) {
        await stripe.customers.deleteTaxId(customerId!, t.id).catch(() => {});
      }
    } catch (e) {
      console.error("Tax ID reset failed:", e);
    }

    return customerId;
  } catch (e) {
    console.error("Customer prefill failed:", e);
    return undefined;
  }
}

/**
 * Adaptive Pricing cannot offer a local currency when the Stripe Customer
 * already has a fixed `currency` (Stripe pins it after the first successful
 * payment). Checkout then always presents the pinned currency, which is why a
 * returning EUR buyer never sees PLN. Detecting that lets create-checkout fall
 * back to `customer_email`, so Stripe is free to convert.
 */
export async function stripeCustomerContext(
  stripe: Stripe,
  customerId?: string | null,
): Promise<{ currency: string | null; country: string | null }> {
  if (!customerId) return { currency: null, country: null };
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as any).deleted) return { currency: null, country: null };
    const active = customer as Stripe.Customer;
    return {
      currency: active.currency ?? null,
      country: active.address?.country?.toUpperCase() ?? null,
    };
  } catch (e) {
    console.error("Could not read Stripe customer context:", (e as Error).message);
    return { currency: null, country: null };
  }
}
