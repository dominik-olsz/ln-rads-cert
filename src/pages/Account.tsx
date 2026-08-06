import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { Loader2, Lock, Mail, ReceiptText } from "lucide-react";

export interface BillingProfile {
  buyer_type: "private" | "company";
  full_name: string;
  company_name: string;
  vat_id: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
}

export const emptyBilling: BillingProfile = {
  buyer_type: "private",
  full_name: "",
  company_name: "",
  vat_id: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "",
};

export const billingSchema = z
  .object({
    buyer_type: z.enum(["private", "company"]),
    full_name: z.string().trim().min(2, "Please enter your full name").max(120),
    company_name: z.string().trim().max(160).optional().or(z.literal("")),
    vat_id: z.string().trim().max(40).optional().or(z.literal("")),
    address_line1: z.string().trim().min(3, "Please enter your address").max(160),
    address_line2: z.string().trim().max(160).optional().or(z.literal("")),
    postal_code: z.string().trim().min(2, "Please enter your postal code").max(20),
    city: z.string().trim().min(2, "Please enter your city").max(80),
    country: z.string().trim().length(2, "Please choose your country"),
  })
  .refine((v) => v.buyer_type !== "company" || !!v.company_name?.trim(), {
    message: "Company name is required",
    path: ["company_name"],
  })
  .refine((v) => v.buyer_type !== "company" || !!v.vat_id?.trim(), {
    message: "VAT number is required for companies",
    path: ["vat_id"],
  })
  .refine(
    (v) => v.buyer_type !== "company" || /^[A-Za-z0-9\-. ]{6,20}$/.test((v.vat_id ?? "").trim()),
    { message: "This VAT number does not look valid", path: ["vat_id"] },
  );

export function BillingFields({
  value,
  onChange,
  errors,
}: {
  value: BillingProfile;
  onChange: (patch: Partial<BillingProfile>) => void;
  errors: Record<string, string>;
}) {
  const err = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Buyer type</Label>
        <RadioGroup
          value={value.buyer_type}
          onValueChange={(v) => onChange({ buyer_type: v as BillingProfile["buyer_type"] })}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="private" id="bt-private" />
            <Label htmlFor="bt-private" className="font-normal cursor-pointer">
              Private person
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="company" id="bt-company" />
            <Label htmlFor="bt-company" className="font-normal cursor-pointer">
              Company
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={value.full_name}
            onChange={(e) => onChange({ full_name: e.target.value })}
            maxLength={120}
          />
          {err("full_name")}
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Select value={value.country} onValueChange={(v) => onChange({ country: v })}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Choose country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("country")}
        </div>
      </div>

      {value.buyer_type === "company" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              value={value.company_name}
              onChange={(e) => onChange({ company_name: e.target.value })}
              maxLength={160}
            />
            {err("company_name")}
          </div>
          <div>
            <Label htmlFor="vat_id">VAT number</Label>
            <Input
              id="vat_id"
              value={value.vat_id}
              onChange={(e) => onChange({ vat_id: e.target.value.toUpperCase() })}
              placeholder="e.g. PL8291244164"
              maxLength={40}
            />
            {err("vat_id")}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="address_line1">Address</Label>
          <Input
            id="address_line1"
            value={value.address_line1}
            onChange={(e) => onChange({ address_line1: e.target.value })}
            maxLength={160}
          />
          {err("address_line1")}
        </div>
        <div>
          <Label htmlFor="address_line2">Address line 2 (optional)</Label>
          <Input
            id="address_line2"
            value={value.address_line2}
            onChange={(e) => onChange({ address_line2: e.target.value })}
            maxLength={160}
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Postal code</Label>
          <Input
            id="postal_code"
            value={value.postal_code}
            onChange={(e) => onChange({ postal_code: e.target.value })}
            maxLength={20}
          />
          {err("postal_code")}
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            maxLength={80}
          />
          {err("city")}
        </div>
      </div>
    </div>
  );
}

export function validateBilling(value: BillingProfile) {
  const parsed = billingSchema.safeParse(value);
  if (parsed.success) return { ok: true as const, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false as const, errors };
}

export default function Account() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingProfile>(emptyBilling);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingBilling, setSavingBilling] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "buyer_type, full_name, company_name, vat_id, address_line1, address_line2, postal_code, city, country",
        )
        .eq("id", user.id)
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
  }, [user]);

  const patch = (p: Partial<BillingProfile>) => setBilling((b) => ({ ...b, ...p }));

  const saveBilling = async () => {
    const { ok, errors: e } = validateBilling(billing);
    setErrors(e);
    if (!ok) return;

    setSavingBilling(true);
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
      .eq("id", user!.id);
    setSavingBilling(false);

    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Invoice details saved",
      description: "They will be used automatically for your next purchase.",
    });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== repeatPassword) {
      toast({
        title: "Passwords do not match",
        description: "The new password fields must be identical.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      toast({
        title: "Current password is incorrect",
        description: "Please check it and try again.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Could not change password", description: error.message, variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    toast({ title: "Password updated", description: "Your new password is now active." });
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid address.", variant: "destructive" });
      return;
    }
    if (email !== confirmEmail.trim().toLowerCase()) {
      toast({ title: "Emails do not match", description: "Both fields must match.", variant: "destructive" });
      return;
    }
    if (email === (user?.email ?? "").toLowerCase()) {
      toast({ title: "Same address", description: "This is already your email.", variant: "destructive" });
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/account` },
    );
    setSavingEmail(false);
    if (error) {
      toast({ title: "Could not change email", description: error.message, variant: "destructive" });
      return;
    }
    setNewEmail("");
    setConfirmEmail("");
    toast({
      title: "Confirmation email sent",
      description: `Open the link we sent to ${email} to finish the change. Until then your current email stays active.`,
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Account settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your sign-in details and the data used on your invoices.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ReceiptText className="h-5 w-5 text-primary" /> Invoice details
            </CardTitle>
            <CardDescription>
              Saved here once, then filled in automatically every time you buy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BillingFields value={billing} onChange={patch} errors={errors} />
            <Button onClick={saveBilling} disabled={savingBilling}>
              {savingBilling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save invoice details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" /> Change password
            </CardTitle>
            <CardDescription>Confirm your current password, then set a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="repeat_password">Repeat new password</Label>
                  <Input
                    id="repeat_password"
                    type="password"
                    autoComplete="new-password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Mail className="h-5 w-5 text-primary" /> Change email
            </CardTitle>
            <CardDescription>
              Current address: <span className="font-medium text-foreground">{user?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changeEmail} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new_email">New email</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_email">Repeat new email</Label>
                  <Input
                    id="confirm_email"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                We send a confirmation link to the new address. The change only takes effect after
                you click it.
              </p>
              <Button type="submit" disabled={savingEmail}>
                {savingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send confirmation
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
