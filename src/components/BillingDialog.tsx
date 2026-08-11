import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BillingFields, BillingProfile, emptyBilling, validateBilling } from "@/pages/Account";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Pre-checkout billing step. The buyer explicitly chooses private person or
 * company here (Stripe Checkout hides its own tax-ID field once a VAT number is
 * attached to the customer), and the details are saved to the profile and pushed
 * to Stripe before the Checkout Session is created.
 */
export default function BillingDialog({
  open,
  onOpenChange,
  userId,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onConfirmed: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState<BillingProfile>(emptyBilling);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "buyer_type, full_name, company_name, vat_id, address_line1, address_line2, postal_code, city, country",
        )
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setBilling({
          buyer_type: (data.buyer_type as BillingProfile["buyer_type"]) ?? "private",
          full_name: data.full_name ?? "",
          company_name: data.company_name ?? "",
          vat_id: data.vat_id ?? "",
          address_line1: data.address_line1 ?? "",
          address_line2: data.address_line2 ?? "",
          postal_code: data.postal_code ?? "",
          city: data.city ?? "",
          country: data.country ?? "",
        });
      }
      setLoading(false);
    })();
  }, [open, userId]);

  const patch = (p: Partial<BillingProfile>) => setBilling((b) => ({ ...b, ...p }));

  const handleContinue = async () => {
    const { ok, errors: e } = validateBilling(billing);
    setErrors(e);
    if (!ok) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        buyer_type: billing.buyer_type,
        full_name: billing.full_name.trim(),
        company_name: billing.buyer_type === "company" ? billing.company_name.trim() : null,
        vat_id: billing.buyer_type === "company" ? billing.vat_id.trim() : null,
        address_line1: billing.address_line1.trim(),
        address_line2: billing.address_line2.trim() || null,
        postal_code: billing.postal_code.trim(),
        city: billing.city.trim(),
        country: billing.country,
      })
      .eq("id", userId);

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    // Push the same details to Stripe so the tax calculation and the invoice
    // both use them.
    await supabase.functions.invoke("sync-billing");
    setSaving(false);
    onOpenChange(false);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice details</DialogTitle>
          <DialogDescription>
            Choose whether you are buying as a private person or as a company. VAT is added at
            checkout according to your country.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <BillingFields value={billing} onChange={patch} errors={errors} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={loading || saving}>
            {saving ? "Saving..." : "Continue to payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
