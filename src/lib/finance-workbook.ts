const FINANCE_WORKBOOK_URL =
  "https://docs.google.com/spreadsheets/d/1Q7BeQdWQEUSUQv6Tc02DiOTZ_v7aPgs7FguVQRYTu30/edit"

export const financeWorkbookLinks = {
  backupCloseout: `${FINANCE_WORKBOOK_URL}#gid=626127442&range=L4:V40`,
  accountReview: `${FINANCE_WORKBOOK_URL}#gid=626127442&range=R4:AC40`,
  auditSummary: `${FINANCE_WORKBOOK_URL}#gid=1789882604&range=A1:I45`,
} as const
