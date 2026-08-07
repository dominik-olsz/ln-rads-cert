# Confirm email delivery with a non-o2.pl mailbox

## Goal

Establish whether the missing reset emails are an o2.pl filtering problem or a general sending problem, using a mailbox on a different provider (Gmail, Outlook, or similar).

## What happens

1. You give me one test address on a different provider (or run the steps yourself if you prefer not to share it).
2. Create an account for that address through the normal sign-up form on `/auth`. This also tests the branded signup confirmation email.
3. Request a password reset for that same address from `/auth` -> "Forgot password?".
4. I check the send log for both emails and report the recorded status (queued, sent, failed, dead-lettered, or suppressed) with timestamps.
5. You check the inbox and the spam/junk folder, and confirm the sender shown is `noreply@mail.lnrads.com`.
6. Click the reset link and confirm it lands on `https://cert.lnrads.com/reset-password` and accepts a new password.

## How to read the outcome

- Arrives on Gmail/Outlook, missing on o2.pl -> sending and DNS are fine; o2.pl is filtering. Next step is a reputation/warm-up question for Lovable support with the three affected message IDs.
- Missing everywhere while the log says sent -> provider-side issue; escalate to support with the message IDs.
- Log shows failed or dead-lettered -> the error text names the cause and I fix it directly.

## Notes

- No code changes are needed for this test; it uses the existing sign-up and reset flows.
- If you would rather not create a second account, a reset request alone is enough — but note that a reset for an address with no account sends nothing at all, so the account must exist.
