# Fix invoice emails being rejected as spam by o2.pl / wp.pl

## What the diagnosis shows

Your two invoice emails were accepted by the mail provider and then **rejected by o2.pl's spam filter**. The password reset email sent from the same address one minute earlier was **delivered normally**. So authentication (SPF/DKIM/DMARC) and the sender domain are fine — this is a content and reputation problem specific to the invoice email.

The exact rejection from o2.pl (WP group):

```text
554 (#5.3.0) Nie przyjmiemy tej wiadomosci poniewaz jest to spam
```

It is classified as a *transient* bounce, meaning the same recipient can receive mail again once the content stops tripping the filter.

Why the invoice mail looks more "commercial" to WP's filter than the reset mail: a large coloured call-to-action button, a tracked-looking link with a query string, currency amounts in the body, an emphasis tag, and a long block of invisible padding characters that email builders insert for inbox preview text. WP is known to score exactly this combination harshly on a young sending subdomain.

## What I will change

1. **Rewrite the invoice email to a plain, document-style message**
   - Remove the coloured CTA button; use a normal inline text link.
   - Remove the invisible preview-padding block and the emphasis markup.
   - Put the invoice number, item and total in simple lines of text rather than a shaded box.
   - Keep the plain-text alternative in sync with the HTML.

2. **Make the download link less filter-provoking**
   - Link to `https://cert.lnrads.com/payments` without the query string, and state the invoice number in the text so the user knows which one to open. The payments page keeps working as before.

3. **Add standard transactional headers**
   - Send invoice mail with `List-Unsubscribe` omitted (it is not a mailing) but add `Auto-Submitted: auto-generated` and a stable `References`-free clean header set, which WP treats as system mail rather than bulk mail.

4. **Retry the two bounced invoices**
   - Re-send invoices `FV EDU/6/08/2026` and `FV EDU/9/08/2026` to your address with the new template, then read the provider's delivery event and report whether o2.pl accepted them.

5. **Surface bounces instead of losing them**
   - The bounce for these two sends was never written back into the send log, so nothing in the admin UI showed a problem. I will record provider bounce events against the invoice rows and show a "delivery failed" marker with the reason in Admin → Sales, so a silently rejected invoice is visible.

6. **Fallback so the buyer is never left without the invoice**
   - On the purchase success screen, always show a direct "Download invoice" action for the invoice just issued, independent of email delivery.

## Not part of this change

The `€60.00` total on invoice `FV EDU/9` is a separate issue from the VAT/Stripe Tax work — I am not touching pricing here.

## Technical notes

- `supabase/functions/_shared/transactional-email-templates/invoice-issued.tsx` — simplified markup, no `Button`, no `Preview` padding block, link without query param.
- `supabase/functions/process-email-queue/index.ts` — pass through an optional `headers` map from the payload so transactional sends can set `Auto-Submitted`.
- `supabase/functions/_shared/invoice.ts` — `sendInvoiceEmail` drops the `?invoice=` deep link from `downloadUrl`.
- `supabase/functions/handle-email-suppression/index.ts` — write `bounced` rows to `email_send_log` with the provider diagnostic code for transient bounces too, not only permanent ones.
- `src/pages/admin/Sales.tsx` — delivery-status badge per invoice, sourced from the latest `email_send_log` row for that invoice's message id.
- Deploy `process-email-queue`, `send-transactional-email`, `handle-email-suppression`, `invoice-actions` after the edits, then re-send and verify against the provider's event API.
