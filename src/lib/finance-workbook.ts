export const FINANCE_WORKBOOK_URL =
  "https://docs.google.com/spreadsheets/d/1Q7BeQdWQEUSUQv6Tc02DiOTZ_v7aPgs7FguVQRYTu30/edit"

const CLASS_CLOSEOUTS_GID = "626127442"
const ABO_SALES_GID = "92276271"
const OTHER_TRANSACTIONS_GID = "278086114"
const FINANCE_HOME_GID = "2026082501"

export const financeWorkbookLinks = {
  home: `${FINANCE_WORKBOOK_URL}#gid=${FINANCE_HOME_GID}`,
  backupCloseout: `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=L4:V40`,
  accountReview: `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=R4:AC40`,
  auditSummary: `${FINANCE_WORKBOOK_URL}#gid=1789882604&range=A1:I45`,
  aboSales: `${FINANCE_WORKBOOK_URL}#gid=${ABO_SALES_GID}&range=A4:Z40`,
  otherTransactions: `${FINANCE_WORKBOOK_URL}#gid=${OTHER_TRANSACTIONS_GID}&range=A4:Z40`,
} as const

export function getFinanceCloseoutRowLink(row: number) {
  return `${FINANCE_WORKBOOK_URL}#gid=${CLASS_CLOSEOUTS_GID}&range=A${row}:AK${row}`
}

export function getAboSaleRowLink(row: number) {
  return `${FINANCE_WORKBOOK_URL}#gid=${ABO_SALES_GID}&range=A${row}:Z${row}`
}

export function getOtherTransactionRowLink(row: number) {
  return `${FINANCE_WORKBOOK_URL}#gid=${OTHER_TRANSACTIONS_GID}&range=A${row}:Z${row}`
}
