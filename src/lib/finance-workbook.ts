export const FINANCE_WORKBOOK_URL =
  "https://docs.google.com/spreadsheets/d/1Q7BeQdWQEUSUQv6Tc02DiOTZ_v7aPgs7FguVQRYTu30/edit"

const CLASS_CLOSEOUTS_GID = "626127442"

export const financeWorkbookLinks = {
  backupCloseout: `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=L4:V40`,
  accountReview: `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=R4:AC40`,
  auditSummary: `${FINANCE_WORKBOOK_URL}#gid=1789882604&range=A1:I45`,
} as const

export function getFinanceCloseoutRowLink(row: number) {
  return `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=A${row}:AK${row}`
}
