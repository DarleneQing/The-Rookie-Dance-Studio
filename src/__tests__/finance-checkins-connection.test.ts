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

  it('uses a compact, scroll-safe table at every screen size', () => {
    const financeCard = readWorkspaceFile('src/components/admin/checkins-finance-card.tsx')

    expect(financeCard).toContain('overflow-auto')
    expect(financeCard).toContain('min-w-[600px]')
    expect(financeCard).toContain('sticky left-0')
    expect(financeCard).toContain('group h-11')
  })
})
