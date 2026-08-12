// Delivery-guard state machine for the two buyer-facing channels. Kept in its
// own module so it can be unit-tested without pulling in the FakturaXL client.

/**
 * States that mean "this channel is finished with this document".
 * Everything else — including `skipped_gate` (the email never left the
 * building) and a transient `failed` — is still owed a send. `skipped_gate`
 * deliberately does NOT block: otherwise every document created while
 * BUYER_EMAILS_ENABLED was off would be silently skipped forever once we
 * turn the gate on.
 */
const NOTIFY_DONE = new Set(["queued", "sent", "bounced", "complained", "no_email"]);
const FXL_EMAIL_DONE = new Set(["sent", "no_buyer_email", "cap_reached"]);

export function notifyAlreadySettled(status: unknown): boolean {
  return NOTIFY_DONE.has(String(status ?? ""));
}

export function fxlEmailAlreadySettled(status: unknown): boolean {
  return FXL_EMAIL_DONE.has(String(status ?? ""));
}
