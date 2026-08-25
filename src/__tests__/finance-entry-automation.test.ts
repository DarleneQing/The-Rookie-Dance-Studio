import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('finance entry automation', () => {
  it('keeps subscription assignment usable with or without a new payment', () => {
    const dialog = readWorkspaceFile('src/components/admin/assign-subscription-dialog.tsx')
    const actions = readWorkspaceFile('src/app/admin/actions.ts')

    expect(dialog).toContain('Received')
    expect(dialog).toContain('No new payment')
    expect(dialog).toContain('Assign & Record')
    expect(dialog).toContain('Retry finance record')
    expect(actions).toContain("saleId: `ABO-${params.subscriptionId}`")
    expect(actions).toContain("message: 'Subscription assigned successfully.'")
    expect(actions).toContain('ABO_PRICE_LABELS.includes(payment.priceLabel)')
    expect(actions).toContain('memberReference: `${memberName} | ${params.userId}`')
  })

  it('writes only A:N for confirmed Abo sales and locks on column M', () => {
    const webhook = readWorkspaceFile('docs/google-apps-script/finance-closeout-webhook.gs')

    expect(webhook).toContain('ABO_ENTRY_CONFIRMED_COLUMN = 13')
    expect(webhook).toContain('getRange(row, 1, 1, 14).setValues([[')
    expect(webhook).toContain("recordType === 'aboSale'")
  })

  it('provides one simple income and expense form with a manual fallback', () => {
    const financeCard = readWorkspaceFile('src/components/admin/checkins-finance-card.tsx')
    const dialog = readWorkspaceFile('src/components/admin/quick-transaction-dialog.tsx')
    const actions = readWorkspaceFile('src/app/admin/actions.ts')

    expect(financeCard).toContain('Record Transaction')
    expect(financeCard).toContain('finance") === "transaction')
    expect(dialog).toContain("['Donation', 'Sponsorship', 'Other']")
    expect(dialog).toContain("['Instructor', 'Venue', 'Admin', 'Refund', 'Other']")
    expect(dialog).toContain('Open Other Transactions manually')
    expect(actions).toContain('FINANCE_CUSTODY_STATUSES.includes(input.custodyStatus)')
    expect(actions).toContain("date.getUTCFullYear() === year")
    expect(actions).toContain("[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}")
  })

  it('writes Other Transactions inputs separately from review and formula columns', () => {
    const webhook = readWorkspaceFile('docs/google-apps-script/finance-closeout-webhook.gs')

    expect(webhook).toContain('OTHER_ENTRY_CONFIRMED_COLUMN = 14')
    expect(webhook).toContain('getRange(row, 1, 1, 16).setValues([[')
    expect(webhook).toContain('getRange(row, 26).setValue')
    expect(webhook.indexOf('getRange(row, 26).setValue')).toBeLessThan(
      webhook.indexOf('getRange(row, 1, 1, 16).setValues([[')
    )
    expect(webhook).toContain("recordType === 'otherTransaction'")
  })

  it('links the website to the role-based Finance Home tab', () => {
    const workbook = readWorkspaceFile('src/lib/finance-workbook.ts')

    expect(workbook).toContain('FINANCE_HOME_GID = "2026082501"')
    expect(workbook).toContain('home: `${FINANCE_WORKBOOK_URL}#gid=${FINANCE_HOME_GID}`')
  })
})
