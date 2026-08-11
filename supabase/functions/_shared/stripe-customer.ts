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
    // The buyer type chosen on the website decides whether a VAT number is
    // attached at all — a private buyer must never carry one, otherwise Stripe
    // hides the tax-ID field and can treat the sale as reverse charge.
    const isCompany = profile?.buyer_type === "company";
    const savedVatId = isCompany ? (profile?.vat_id ?? "").trim() : "";
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
    const name = isCompany
      ? profile?.company_name || profile?.full_name || email
      : profile?.full_name || email;

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

    // Keep the Customer's tax IDs in step with the profile: add the saved one,
    // remove anything that no longer matches (Stripe tax IDs are immutable).
    const norm = (v?: string | null) => (v ?? "").replace(/[\s-]/g, "").toUpperCase();
    const taxType = isCompany && savedVatId ? vatTaxType(profile?.country) : null;
    try {
      const taxIds = await stripe.customers.listTaxIds(customerId!, { limit: 20 });
      for (const t of taxIds.data) {
        if (!taxType || norm(t.value) !== norm(savedVatId)) {
          await stripe.customers.deleteTaxId(customerId!, t.id).catch(() => {});
        }
      }
      if (taxType && !taxIds.data.some((t) => norm(t.value) === norm(savedVatId))) {
        await stripe.customers.createTaxId(customerId!, {
          type: taxType as any,
          value: savedVatId,
        });
      }
    } catch (e) {
      console.error("Tax ID sync failed:", e);
    }

    return customerId;
  } catch (e) {
    console.error("Customer prefill failed:", e);
    return undefined;
  }
}
