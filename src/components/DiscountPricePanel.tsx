import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X } from "lucide-react";
import DiscountCountdown from "@/components/DiscountCountdown";
import { formatEuro, formatEuroCents } from "@/lib/pricing";
import {
  CommercialFxRate,
  eurCentsToPlnCents,
  formatPlnCents,
} from "@/lib/fxPricing";

export type PricingQuote = {
  baseCents: number;
  saleCents: number;
  saleActive: boolean;
  saleValidUntil: string | null;
  userPercent: number;
  codePercent: number;
  code: string | null;
  finalCents: number;
  isFree: boolean;
};

export type CheckoutCurrency = "eur" | "pln";

interface Props {
  /** Regular list price in euros (fallback before the server quote arrives) */
  basePrice: number;
  saleActive: boolean;
  salePrice: number;
  saleValidUntil: string | null;
  quote: PricingQuote | null;
  onApplyCode: (code: string) => Promise<boolean>;
  onClearCode: () => void;
  appliedCode: string | null;
  subtitle?: string;
  /** Buyer-chosen payment currency; PLN prices come from the admin FX rate. */
  currency?: CheckoutCurrency;
  onCurrencyChange?: (currency: CheckoutCurrency) => void;
  fx?: CommercialFxRate | null;
}

const DiscountPricePanel = ({
  basePrice,
  saleActive,
  salePrice,
  saleValidUntil,
  quote,
  onApplyCode,
  onClearCode,
  appliedCode,
  subtitle = "One-time payment · Lifetime access",
  currency = "eur",
  onCurrencyChange,
  fx = null,
}: Props) => {
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);

  const finalPrice = quote ? quote.finalCents / 100 : saleActive ? salePrice : basePrice;
  const showStrikethrough = finalPrice < basePrice;
  const countdownUntil = quote?.saleValidUntil ?? (saleActive ? saleValidUntil : null);

  const usePln = currency === "pln" && !!fx;
  const toPln = (eurCents: number) =>
    fx ? eurCentsToPlnCents(eurCents, fx.rate, fx.roundingMode) : eurCents;
  const money = (eurCents: number) =>
    usePln ? formatPlnCents(toPln(eurCents)) : formatEuroCents(eurCents);
  const moneyEuros = (euros: number) => money(Math.round(euros * 100));


  const handleApply = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setApplying(true);
    const ok = await onApplyCode(code);
    setApplying(false);
    if (ok) setCodeInput("");
  };

  return (
    <div className="space-y-4">
      {fx && onCurrencyChange && (
        <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Payment currency">
          {(["eur", "pln"] as CheckoutCurrency[]).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={currency === c ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => onCurrencyChange(c)}
            >
              {c === "eur" ? "EUR €" : "PLN zł"}
            </Button>
          ))}
        </div>
      )}
      <div>
        <div className="flex items-end gap-3 mb-1 flex-wrap">
          <span className="text-4xl font-bold text-primary">
            {quote?.isFree ? "Free" : usePln ? moneyEuros(finalPrice) : formatEuro(finalPrice)}
          </span>
          {showStrikethrough && (
            <span className="text-xl text-muted-foreground line-through">
              {usePln ? moneyEuros(basePrice) : formatEuro(basePrice)}
            </span>
          )}
          {!quote?.isFree && (
            <span className="text-sm text-muted-foreground pb-1">excl. VAT</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        {!quote?.isFree && (
          <p className="mt-1 text-xs text-muted-foreground">
            VAT is calculated at checkout based on your billing country.
            {usePln && " You will be charged in PLN."}
          </p>
        )}


        {countdownUntil && (
          <p className="mt-2 text-sm font-medium text-accent">
            Offer ends in <DiscountCountdown until={countdownUntil} className="font-semibold" />
          </p>
        )}

        {(quote?.userPercent ?? 0) > 0 && (
          <Badge variant="secondary" className="mt-2 mr-2">
            Your account discount −{quote?.userPercent}%
          </Badge>
        )}
        {appliedCode && (quote?.codePercent ?? 0) > 0 && (
          <Badge variant="secondary" className="mt-2">
            Code {appliedCode} −{quote?.codePercent}%
          </Badge>
        )}
      </div>

      {quote && (showStrikethrough || (quote.userPercent ?? 0) > 0 || (quote.codePercent ?? 0) > 0) && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Regular price</span>
            <span>{formatEuroCents(quote.baseCents)}</span>
          </div>
          {quote.saleActive && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale price</span>
              <span>{formatEuroCents(quote.saleCents)}</span>
            </div>
          )}
          {quote.userPercent > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account discount</span>
              <span>−{quote.userPercent}%</span>
            </div>
          )}
          {quote.codePercent > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount code</span>
              <span>−{quote.codePercent}%</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t">
            <span>Total (excl. VAT)</span>
            <span>{quote.isFree ? "Free" : formatEuroCents(quote.finalCents)}</span>
          </div>
        </div>
      )}

      {appliedCode ? (
        <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Code <span className="font-semibold">{appliedCode}</span> applied
          </span>
          <Button variant="ghost" size="sm" onClick={onClearCode} aria-label="Remove discount code">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Discount code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          <Button variant="outline" onClick={handleApply} disabled={applying || !codeInput.trim()}>
            {applying ? "Checking..." : "Apply"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DiscountPricePanel;
