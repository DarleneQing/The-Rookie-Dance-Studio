import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('finance check-in connection', () => {
  it('loads finance check-ins through the protected server action', () => {
    const financeCard = readWorkspaceFile('src/components/admin/checkins-finance-card.tsx')

    expect(financeCard).toContain('getFinanceCheckins')
    expect(financeCard).toContain('await getFinanceCheckins(selectedDate)')
    expect(financeCard).not.toContain('@/lib/supabase/client')
  })

  it('keeps the latest role-based workbook destinations', () => {
    const financeCard = readWorkspaceFile('src/components/admin/checkins-finance-card.tsx')
    const workbookLinks = readWorkspaceFile('src/lib/finance-workbook.ts')

    expect(financeCard).toContain('financeWorkbookLinks.accountReview')
    expect(financeCard).toContain('financeWorkbookLinks.auditSummary')
    expect(workbookLinks).toContain('backupCloseout')
  })

  it('shows the saved mobile number in a scroll-safe table at every screen size', () => {
    const financeCard = readWorkspaceFile('src/components/admin/checkins-finance-card.tsx')
    const dashboard = readWorkspaceFile('src/components/admin/admin-dashboard.tsx')

    expect(financeCard).toContain('<table className="w-full min-w-[540px] table-fixed')
    expect(financeCard).toContain('overflow-y-auto overflow-x-auto')
    expect(financeCard).toContain('>Phone</th>')
    expect(financeCard).toContain('checkin.phone_number')
    expect(financeCard).not.toContain('hidden sm:table-cell')
    expect(financeCard).toContain('className="h-11')
    expect(financeCard).not.toContain('min-w-[600px]')
    expect(dashboard).toContain('group/details min-w-0 w-full max-w-full')
  })
})
