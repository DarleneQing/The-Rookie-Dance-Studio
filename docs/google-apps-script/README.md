# Finance Closeout Auto-fill

The website recomputes a class from Supabase when an admin confirms the finance snapshot. The Apps Script endpoint writes only columns A:M in `Class Closeouts`.

## Safety contract

- `Settlement ID` is `CLASS-<course id>`, so repeated clicks target the same row.
- Before `Backup Confirmed?` (column V) is checked, repeated clicks refresh A:M from the latest check-ins.
- After column V is checked, the row is locked and the endpoint returns `locked` without changing it.
- Backup-entered amounts, account review fields, formulas, notes, and audit columns O:AK are never written by the website.
- Requests require both website admin authorization and a server-only shared secret.

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
