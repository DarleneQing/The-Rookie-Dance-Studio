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

export async function upsertFinanceCloseout(
  payload: FinanceCloseoutPayload
): Promise<FinanceCloseoutWebhookResult> {
  const url = process.env.FINANCE_CLOSEOUT_WEBHOOK_URL
  const secret = process.env.FINANCE_CLOSEOUT_WEBHOOK_SECRET

  if (!url || !secret) {
    console.error('Finance closeout webhook is not configured')
    return {
      ok: false,
      message: 'Finance auto-fill is not configured yet. Open the workbook and enter this class manually.',
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
      console.error('Finance closeout webhook HTTP error:', response.status)
      return { ok: false, message: 'Google Sheets could not be reached. Please try again.' }
    }

    const result = (await response.json()) as FinanceCloseoutWebhookResult
    if (!result.ok) {
      console.error('Finance closeout webhook rejected update:', result.message)
      return { ok: false, message: result.message || 'Google Sheets rejected the update.' }
    }

    return result
  } catch (error) {
    console.error('Finance closeout webhook error:', error)
    return { ok: false, message: 'Google Sheets could not be reached. Please try again.' }
  }
}
