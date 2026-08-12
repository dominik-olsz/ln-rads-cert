// Delivery-guard behaviour: a document skipped while the buyer-email gate was
// closed must still send once the gate opens. Everything genuinely finished
// (sent, bounced, cap reached, permanent failures) must never send twice.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fxlEmailAlreadySettled, notifyAlreadySettled } from "./invoice-delivery.ts";

Deno.test("skipped_gate does not block a later send", () => {
  assertEquals(notifyAlreadySettled("skipped_gate"), false);
  assertEquals(fxlEmailAlreadySettled("skipped_gate"), false);
});

Deno.test("a fresh row is not settled", () => {
  assertEquals(notifyAlreadySettled(null), false);
  assertEquals(notifyAlreadySettled(undefined), false);
  assertEquals(fxlEmailAlreadySettled(null), false);
});

Deno.test("finished notification states block a resend", () => {
  for (const s of ["queued", "sent", "bounced", "complained", "no_email"]) {
    assertEquals(notifyAlreadySettled(s), true, s);
  }
});

Deno.test("finished FakturaXL email states block a resend", () => {
  for (const s of ["sent", "no_buyer_email", "cap_reached"]) {
    assertEquals(fxlEmailAlreadySettled(s), true, s);
  }
});

Deno.test("transient failures stay retryable", () => {
  assertEquals(notifyAlreadySettled("failed"), false);
  assertEquals(fxlEmailAlreadySettled("failed"), false);
  // A plan/config problem is fixable in the FakturaXL panel, so retry after.
  assertEquals(fxlEmailAlreadySettled("plan_required"), false);
});
