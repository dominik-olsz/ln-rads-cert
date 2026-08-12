# Partial refunds with correct FakturaXL corrections

Today the refund dialog only takes an amount with no context, and the correction sent to FakturaXL builds its "before" block from the original invoice, so a second partial refund would state the wrong starting amount. This reworks the whole path: dialog, Stripe refund, correction document, deduplication, PDF.

## Refund dialog (/admin/sales)

Clicking **Refund** opens a dialog that states the facts before anything is entered:

- invoice number (e.g. `FV EDU/3/08/2026`)
- original gross (e.g. €60.00)
- already refunded (e.g. €0.00)
- remaining refundable (e.g. €60.00)

Then:
- **Amount to refund** input (no more silent "0 = full refund").
- Live line under the input: `Refund €20.00 → corrected invoice total €40.00`.
- **Reason** field (required) — goes to FakturaXL as `przyczyna_korekty` and onto the correction PDF.
- **Issue refund** stays disabled while the amount is 0, negative, above the remaining balance, or the reason is empty.

## What happens on confirm

1. Stripe issues a **partial** refund for exactly that amount against the original payment intent.
2. The refunded amount is added to a cumulative total on the invoice row, so an invoice can be corrected repeatedly.
3. A correction invoice `FK EDU/...` is created in FakturaXL with the before/after amounts, its PDF is downloaded and stored, and it appears in `/admin/sales` and in the buyer's **My Payments** next to the original.
4. A full refund (remaining balance reaches 0) revokes access as it does today; a partial one keeps access.

If FakturaXL rejects or times out **after** Stripe already refunded, the money stays refunded — the row is flagged so only the correction step retries (the existing Sync button / sync-all pass picks it up). The refund is never re-issued.

## Correction XML for the €60 → €40 case

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dokument>
  <api_token>…</api_token>
  <typ_faktury>4</typ_faktury>
  <id_dzialy_firmy>261055</id_dzialy_firmy>
  <jezyk>2</jezyk>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
  <numer_faktury><![CDATA[FK EDU/1/08/2026]]></numer_faktury>
  <waluta>EUR</waluta>
  <rodzaj_przeliczania_waluty>1</rodzaj_przeliczania_waluty>
  <data_wystawienia>2026-08-12</data_wystawienia>
  <data_sprzedazy>2026-08-12</data_sprzedazy>
  <termin_platnosci_data>2026-08-12</termin_platnosci_data>
  <rodzaj_platnosci><![CDATA[Karta płatnicza]]></rodzaj_platnosci>
  <kwota_oplacona>-20.00</kwota_oplacona>
  <status>2</status>
  <data_oplacenia>2026-08-12</data_oplacenia>
  <wyslij_dokument_do_klienta_emailem>0</wyslij_dokument_do_klienta_emailem>
  <korekta>
    <id_faktury_korygowanej>123456</id_faktury_korygowanej>
    <przyczyna_korekty><![CDATA[Częściowy zwrot płatności / Partial refund]]></przyczyna_korekty>
  </korekta>
  <faktura_pozycje_bylo>
    <nazwa><![CDATA[Kurs: Lung Nodules — certification course]]></nazwa>
    <ilosc>1</ilosc>
    <vat>23</vat>
    <wartosc_brutto>60.00</wartosc_brutto>
  </faktura_pozycje_bylo>
  <faktura_pozycje_powinno_byc>
    <nazwa><![CDATA[Kurs: Lung Nodules — certification course]]></nazwa>
    <ilosc>1</ilosc>
    <vat>23</vat>
    <wartosc_brutto>40.00</wartosc_brutto>
  </faktura_pozycje_powinno_byc>
  <nabywca>
    <firma_lub_osoba_prywatna>1</firma_lub_osoba_prywatna>
    <imie><![CDATA[Dominik]]></imie>
    <nazwisko><![CDATA[Olszewski]]></nazwisko>
    <kraj>PL</kraj>
    <email>dominik_olszewski@o2.pl</email>
  </nabywca>
</dokument>
```

Notes on this XML:
- `faktura_pozycje_bylo` / `faktura_pozycje_powinno_byc` are document-level siblings of `<korekta>`, matched pair-by-pair in document order.
- `powinno_byc` carries what should remain (40.00), not the credited 20.00.
- Currency, `vat`, `obliczaj_wartosc_faktury_od` and `jezyk` are copied from the original — a differing currency returns `kod=41`.
- A second €10 refund on the same invoice would send `bylo 40.00` / `powinno_byc 30.00`, with `id_faktury_korygowanej` still pointing at the original FV document.

## Technical details

**Schema (migration)**
- `invoices.refunded_amount integer not null default 0` — cumulative refunded cents, maintained on the FV row.
- `invoices.stripe_refund_id text` — set on each FK row; unique partial index so the same Stripe refund can never yield two corrections.

**`refund-payment` edge function** (admin-only, unchanged auth)
- Validate: amount is a positive integer of cents, ≤ `gross_amount − already corrected`; reason non-empty.
- `stripe.refunds.create({ payment_intent, amount, reason, metadata })` — the entered amount only.
- Compute correction figures from the **current** state: `bylo = gross − alreadyCredited`, `powinno_byc = bylo − amount`. Net/VAT are recomputed from the corrected gross with the original's `vat_rate` (0% reverse-charge preserved), so net + VAT equals gross exactly rather than subtracting rounded values.
- Create the FK row via `createInvoice` with `stripeRefundId`, `refundReason`, `originalInvoiceId`, and both line-item sets, then the existing FakturaXL-first pipeline pushes it, stores the `pdf_p.php` PDF and emails the buyer.
- Increment `invoices.refunded_amount` and the purchase row's `refunded_amount` / `refunded_at`; revoke access only when the remaining balance hits 0.
- Errors are separated: a Stripe failure returns before anything is written; a FakturaXL failure leaves the FK row with `fxl_status = 'pending'` and reports "refund issued, correction pending".

**`_shared/invoice.ts`**
- `createInvoice` accepts `stripeRefundId`, explicit `correctedFromGross` / `correctedToGross`, and the pre-computed net/VAT for corrections, storing them on the row for the XML builder.

**`_shared/fakturaxl.ts`**
- The correction branch reads the before/after grosses from the FK row instead of deriving them from the original, so repeat corrections are right; the full-credit case (powinno_byc 0 / positions inferred) is kept.

**`stripe-webhook` (`charge.refunded`)**
- Look up `invoices.stripe_refund_id` for every refund on the charge and skip the ones already corrected, so an admin-initiated refund never produces a second FK. Refunds made directly in Stripe still generate one, keyed on their refund id.

**Frontend**
- `src/pages/admin/Sales.tsx`: rebuilt refund dialog (context lines, live preview, reason, validation), sends `amountCents` + `reason`.
- `/payments` already lists FK documents, so corrections appear there once stored.

## Verify

In Stripe test mode: refund €20 of a €60 invoice, confirm the FK PDF shows bylo 60.00 / powinno_byc 40.00 with net + VAT matching, then refund €10 more and confirm the second FK reads 40.00 → 30.00 and that the webhook adds no duplicate.
