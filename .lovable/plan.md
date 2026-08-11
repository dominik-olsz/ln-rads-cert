# Store the FakturaXL API token

Save your FakturaXL API token as a backend secret so it is available later, with no code changes yet.

## What happens
- A secure form opens in chat where you paste the token; the value is stored encrypted and never appears in the codebase or chat.
- Secret name: `FAKTURAXL_API_TOKEN`.
- It becomes available as an environment variable to backend functions (Lovable Cloud) immediately.

## Not included (for later)
- No FakturaXL API calls yet.
- The current built-in PDF invoicing (sales invoices and refund corrections) stays exactly as it is.

## Where to get the token
In your FakturaXL account: Settings / Ustawienia → API, and copy the API token (used together with your account email).
