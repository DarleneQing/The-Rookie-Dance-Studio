export interface FinanceCloseoutPayload {
  settlementId: string
  classDate: string
  courseId: string
  classStyle: string
  startTime: string
  backupName: string
  adultCashCount: number
  studentCashCount: number
  adultTwintCount: number
  studentTwintCount: number
  aboCount: number
  systemCash: number
  systemTwint: number
}

export interface FinanceCloseoutWebhookResult {
  ok: boolean
  status?: 'created' | 'refreshed' | 'locked'
  row?: number
  message?: string
}

export interface AboSalePayload {
  saleId: string
  paymentDate: string
  relatedSettlementId: string
  memberReference: string
  product: 'Monthly' | '5-times' | '10-times'
  priceLabel: 'Old Price' | 'New Price' | 'Discount' | 'Special' | 'N/A'
  actualSaleAmount: number
  paymentChannel: 'Cash' | 'TWINT' | 'Bank' | 'Other'
  destination: 'Cash Box' | 'Personal TWINT' | 'Public Bank Account' | 'Other'
  subscriptionId: string
  enteredBy: string
}

export interface OtherTransactionPayload {
  transactionId: string
  transactionDate: string
  serviceDate: string
  transactionType:
    | 'Instructor Fee'
    | 'Rent'
    | 'Expense'
    | 'Donation'
    | 'Sponsorship'
    | 'Refund'
    | 'Other'
  category:
    | 'Instructor'
    | 'Venue'
    | 'Admin'
    | 'Donation'
    | 'Sponsorship'
    | 'Refund'
    | 'Other'
  description: string
  direction: 'income' | 'expense'
  amount: number
  paymentChannel: FinancePaymentChannel
  destination: FinanceDestination
  paidCollectedBy: string
  receiptLink: string
  custodyStatus: 'Not Needed' | 'Pending' | 'Reimbursed' | 'Holding Cash' | 'Transferred' | 'Other'
  confirmedBy: string
  notes: string
}

type FinancePaymentChannel = AboSalePayload['paymentChannel']
type FinanceDestination = AboSalePayload['destination']

async function sendFinanceWorkbookRequest(
  payload: Record<string, unknown>
): Promise<FinanceCloseoutWebhookResult> {
  const url = process.env.FINANCE_CLOSEOUT_WEBHOOK_URL
  const secret = process.env.FINANCE_CLOSEOUT_WEBHOOK_SECRET

  if (!url || !secret) {
    console.error('Finance workbook webhook is not configured')
    return {
      ok: false,
      message: 'Finance auto-fill is not configured yet. Open the workbook and enter this record manually.',
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...payload }),
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error('Finance workbook webhook HTTP error:', response.status)
      return { ok: false, message: 'Google Sheets could not be reached. Please try again.' }
    }

    const result = (await response.json()) as FinanceCloseoutWebhookResult
    if (!result.ok) {
      console.error('Finance workbook webhook rejected update:', result.message)
      return { ok: false, message: result.message || 'Google Sheets rejected the update.' }
    }

    return result
  } catch (error) {
    console.error('Finance workbook webhook error:', error)
    return { ok: false, message: 'Google Sheets could not be reached. Please try again.' }
  }
}

export async function upsertFinanceCloseout(
  payload: FinanceCloseoutPayload
): Promise<FinanceCloseoutWebhookResult> {
  return sendFinanceWorkbookRequest({ recordType: 'classCloseout', ...payload })
}

export async function upsertAboSale(
  payload: AboSalePayload
): Promise<FinanceCloseoutWebhookResult> {
  return sendFinanceWorkbookRequest({ recordType: 'aboSale', ...payload })
}

export async function upsertOtherTransaction(
  payload: OtherTransactionPayload
): Promise<FinanceCloseoutWebhookResult> {
  return sendFinanceWorkbookRequest({ recordType: 'otherTransaction', ...payload })
}
