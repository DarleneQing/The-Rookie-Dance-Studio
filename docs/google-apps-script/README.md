# Finance Workbook Auto-fill

One Apps Script endpoint accepts three explicit website record types while preserving the workbook's human review boundaries:

- `classCloseout`: recomputes a class from Supabase and writes A:M in `Class Closeouts`.
- `aboSale`: records a confirmed payment alongside subscription assignment and writes A:N in `Abo Sales`.
- `otherTransaction`: records a confirmed income or expense and writes A:P plus Notes in column Z of `Other Transactions`.

## Safety contract

- Class `Settlement ID` is `CLASS-<course id>`. Repeated clicks refresh the same row until `Backup Confirmed?` in column V is checked; after that the row is locked.
- Abo `Sale ID` is `ABO-<subscription id>`. The website assigns the subscription only once, then retries only the finance record if Google is unavailable. `Entry Confirmed?` in column M locks the row.
- Other transaction IDs are generated once when the form opens and reused on retry. `Entry Confirmed?` in column N locks the row.
- The website never writes account-holder review fields, formula columns, Ledger outputs, audit fields, or exception decisions.
- Requests require both website admin authorization and a server-only shared secret.
- If Google is unavailable, the website preserves the successful operational action and shows the exact manual source tab as a fallback.

## Responsibility flow

1. Backup confirms a class snapshot in the website, then enters actual class Cash/TWINT and any note or exception in the generated `Class Closeouts` row.
2. An admin assigning an Abo chooses whether a new payment was received. When yes, the actual amount and payment route are written to `Abo Sales`; no-payment assignments remain available for legacy or corrected cards.
3. An admin uses `Record Transaction` for simple non-class income and expenses. Uncommon accounting cases remain available through the source sheet instead of expanding the routine form.
4. The bank/TWINT account holder enters the actual received amount and completes the account-review columns.
5. Monthly and fiscal-year review starts from `Finance Home` and `Audit Summary`, then drills into source tabs only when needed.

## One-time Google setup

1. Open `Finance FY2026-2027`, then choose **Extensions > Apps Script**.
2. Replace the editor contents with `finance-closeout-webhook.gs`.
3. In **Project Settings > Script Properties**, add `FINANCE_CLOSEOUT_WEBHOOK_SECRET` with a long random value.
4. Choose **Deploy > New deployment > Web app**. Execute as the workbook owner and allow access to **Anyone**.
5. Copy the deployment `/exec` URL.

## One-time Vercel setup

Add these server-only environment variables to Preview and Production, then redeploy:

```text
FINANCE_CLOSEOUT_WEBHOOK_URL=<Apps Script /exec URL>
FINANCE_CLOSEOUT_WEBHOOK_SECRET=<same random value>
```

Never prefix either variable with `NEXT_PUBLIC_`.

The Google deployment and both Vercel variables are required before any of the three website auto-fill paths can write to the workbook. All three continue to expose manual workbook links when configuration is missing.
