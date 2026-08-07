# Improve deliverability to o2.pl / wp.pl

## Diagnosis (from the send log)

All three recent reset emails to the o2.pl address were accepted by the mail provider and recorded as `sent`, with no bounce and no entry in the suppression list. The same email to `dominik@teamsharq.com` arrived normally. So sending, DNS delegation and the templates are working — o2.pl is accepting the message and then dropping or quarantining it.

Cause: `mail.lnrads.com` is a brand-new sending domain with no reputation, and the Wirtualna Polska group (o2.pl, wp.pl) filters new domains aggressively. A missing DMARC policy on the parent domain makes this markedly worse.

## Steps

1. **Add a DMARC record** at your DNS provider for `lnrads.com` (this is a TXT record on the parent domain, not on the delegated sending subdomain, so it does not touch the Lovable-managed zone or `cert.lnrads.com`):
   - Name: `_dmarc`
   - Type: TXT
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@lnrads.com; adkim=r; aspf=r`
   Start at `p=none` (monitor only, cannot block legitimate mail); tighten to `quarantine` later once reports look clean.
2. **Verify SPF and DKIM alignment** — I re-check the email domain status and confirm the delegated subdomain is fully verified with both records live.
3. **Confirm the visible sender is stable** — check that the From address, the envelope domain and the DKIM signing domain all sit under `mail.lnrads.com` so DMARC alignment passes.
4. **Add a plain-text part and a valid List-Unsubscribe** where missing — auth emails already render a text version; I verify the recovery email carries both a text body and a correct `Reply-To`, since text-less HTML-only mail is a strong spam signal for WP/o2.
5. **Warm up gently** — avoid repeated reset requests to the same o2.pl address for a day or two; repeated identical near-duplicate messages from a cold domain reinforce the filter.
6. **Ask the recipient to allowlist** `noreply@mail.lnrads.com` in their o2.pl account and check the spam folder, then send one fresh reset and I confirm the log entry.

## If it still fails after DNS propagates

Escalate to Lovable support with these message IDs so they can pull the provider-side SMTP responses and check whether the shared sending IPs are on a blocklist that WP/o2 consults:

- `81568c16-ca16-47c8-b39f-77fdfa2ae9b4` (Aug 6 14:44 UTC)
- `ca6b9235-0f9a-4d59-acdf-e0916894ce5b` (Aug 6 14:46 UTC)
- `5f951458-51eb-4b3e-947f-69b36c8c5a61` (Aug 7 12:22 UTC)

## Notes

- Step 1 is the only action that needs you; it is a DNS change at your registrar.
- No application code changes are required for steps 1-3 and 6. Steps 4 may involve a small edit to the auth email hook if a text part or `Reply-To` turns out to be missing.
- Deliverability to a hostile provider is never guaranteed by configuration alone; reputation builds over days of successful sending.
