# Move all email sending to Resend

Everything (signup/reset/verify auth emails, invoice emails, admin delivery alerts, certificate emails) sends through Resend from `cert@lnrads.com`. The existing branded templates, queue, retries, send log and suppression list stay exactly as they are — only the final delivery step changes provider.

## What changes

- **One send point swap.** Every email in the app already funnels into one queue worker, which is the only place that talks to the current provider. That call is replaced with a Resend API call. Auth emails and app emails switch over together, and retries, rate-limit backoff, dead-lettering and the send log keep working unchanged.
- **Sender identity.** From address becomes `LN-RADS Certification <cert@lnrads.com>`, replies go to the same address. The old `notify.mail.lnrads.com` sender is removed from the code.
- **Certificate email** currently sends from `onboarding@resend.dev` (which only ever delivers to your own Resend account) — it moves to the same `cert@lnrads.com` sender.
- **Suppression/bounce handling stays.** The existing bounce endpoint is re-pointed at Resend's webhook format (`email.bounced`, `email.complained`), so bounced addresses still get suppressed and you still get the admin alert.
- **Lovable's own email domain gets switched off** so nothing sends through it any more, and the delegation records are no longer needed.

## What you need to do (DNS + Resend)

1. **In Resend:** add and verify the domain `lnrads.com` (Domains → Add domain). Resend will give you DKIM records and a return-path record to add at your DNS provider.
2. **Fix SPF — this is the thing that caused the o2.pl/wp.pl bounces.** `lnrads.com` currently publishes:
   `v=spf1 +a +mx +a:plesk-1627315-100621.domain.tld -all`
   With `-all` and no Resend entry, Polish providers will hard-fail Resend mail exactly like before. It must become:
   `v=spf1 +a +mx +a:plesk-1627315-100621.domain.tld include:_spf.resend.com -all`
3. **DMARC** is `p=none` today. Once Resend's DKIM is verified and passing, tighten to `p=quarantine` with alignment reporting — it materially helps with Polish free-mail providers.
4. **Remove the old delegation:** delete the `notify.mail.lnrads.com` NS records at your registrar. They are not removed automatically and can take up to 72h to disappear from DNS.
5. Confirm `cert@lnrads.com` still receives mail — adding SPF/DKIM for sending does not affect your existing MX (`mail.lnrads.com`), so inbound is unaffected.

Note: sending from your main mailbox domain means a Resend bounce or spam complaint affects the reputation of the domain you also use for regular correspondence. A dedicated subdomain (e.g. `cert.lnrads.com` or `send.lnrads.com`) isolates that risk. Say the word if you'd rather do that instead — the plan is otherwise identical.

## Verification after switchover

- Send test invoice emails to o2.pl, wp.pl, interia.pl and gmail.com addresses you can check, and report delivered / deferred / bounced per domain from Resend's delivery events.
- Trigger a password reset and a signup confirmation to confirm auth emails arrive from `cert@lnrads.com` and links still point at `cert.lnrads.com`.
- Clear the existing suppression entry for `dominik_olszewski@o2.pl` before retesting.

## Technical detail

- `supabase/functions/process-email-queue/index.ts`: drop `sendLovableEmail` from `@lovable.dev/email-js`; POST to `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}` and `{ from, to, subject, html, text, reply_to, headers: { 'List-Unsubscribe', 'List-Unsubscribe-Post' } }`. Map Resend's HTTP status onto the existing retry logic: 429 → record `Retry-After` and back off; 5xx → leave invisible for redelivery; 4xx other than 429 → permanent failure, log `error_message`. Store Resend's returned `id` alongside `message_id` in `email_send_log`.
- `supabase/functions/send-transactional-email/index.ts` and `supabase/functions/auth-email-hook/index.ts`: replace the `SENDER_DOMAIN` / `FROM_DOMAIN` / `ROOT_DOMAIN` constants with a single `FROM = 'LN-RADS Certification <cert@lnrads.com>'`; drop `sender_domain` from the enqueued payload. Template rendering, token handling, `APP_ORIGIN` links and `ACTION_ROUTES` are untouched.
- `supabase/functions/send-certificate/index.ts`: change the `from` to the same address.
- `supabase/functions/handle-email-suppression/index.ts`: accept Resend's webhook body (`type` = `email.bounced` / `email.complained`, `data.to`), keep the existing insert into `suppressed_emails` and the admin alert. Endpoint URL to register in Resend → Webhooks is reported after deploy.
- `RESEND_API_KEY` is already stored; no new secret needed. Confirm it is a full-access key (the certificate mailer used it, so it should be).
- Disable Lovable Emails for the project after the Resend path is deployed and tested, so auth emails never fall back to the queue's old provider.
- Deploy: `process-email-queue`, `send-transactional-email`, `auth-email-hook`, `send-certificate`, `handle-email-suppression`.
- Unchanged: pgmq queues, `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`, the unsubscribe page and all React Email templates.

## Out of scope

Still open from earlier and not touched here: the Poland tax registration test session, the 0% VAT invoice audit follow-up, and the FakturaXL retry for FV EDU/7/08/2026.
