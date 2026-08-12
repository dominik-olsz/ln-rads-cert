# Row-level Sync should find every correction in the chain

Today the per-row Sync button only looks at the relations of the sale document itself. `FK EDU/3/08/2026` corrects `FK EDU/2/08/2026`, not the original `FV EDU/...`, so its document id never appears in the invoice's relation list — which is why only "Sync all from FakturaXL" picked it up.

## What changes

Row-level Sync becomes a full walk of the document family instead of a one-level look:

1. Start from the sale: if Sync is clicked on a correction row, first climb to the root `FV` so the same result is produced from any row of the family.
2. Refresh the sale and every correction already stored for it (values, amounts, corrected total, refundable amount, FakturaXL's PDF) — unchanged behaviour, still never deleting rows and never writing to FakturaXL.
3. Then walk relations breadth-first: read the sale's relations, and for every correction found — whether already stored or newly imported — read its relations too, repeating until nothing new appears. A correction of a correction is therefore discovered on the same click.
4. Each newly discovered correction is imported exactly as the full pass imports it: linked through its corrected document up to the root sale, numbered by FakturaXL, refundable amount and corrected total taken from the document, PDF stored, marked awaiting settlement.
5. The result toast reports refreshed rows and newly imported corrections, as it does now.

Chain safety: documents already visited are skipped, so a relation pointing back at the parent can't loop, and the walk is depth-capped.

## Technical details

In `supabase/functions/invoice-actions/index.ts`, `action === "sync_fxl"`:

- Resolve the root sale: while the target row is `doc_type='FK'`, follow `original_invoice_id` (capped, e.g. 5 hops) to the `FV`. Use that row and all rows with `original_invoice_id = root.id` as the refresh set.
- Replace the single-level `related_document_ids` loop with a queue seeded by the root's FakturaXL document id plus every stored correction's `fxl_document_id`. For each dequeued id: `readFakturaXLDocument`, then for each `related_document_ids` entry not yet visited — look it up by `fxl_document_id`; if missing call `importCorrection` (which already resolves the parent chain to the root `FV`), and either way enqueue it so its own relations are inspected.
- Keep FakturaXL rate-limit spacing intact (reads and PDF fetches go through the existing throttled helpers) and cap total documents visited per click.
- No schema change, no UI change; `src/pages/admin/Sales.tsx` already renders `results` and `imported` from the response.

## Verify

Click Sync on the `FV` with two corrections and confirm `FK EDU/2` and `FK EDU/3` both appear with correct refundable amounts (€33.80, then €10.00) without touching "Sync all"; click Sync again and confirm nothing is duplicated; click Sync from the `FK EDU/2` row and confirm the same family is refreshed.
