'use client'

import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { toast } from 'sonner'
import { checkInUser } from '@/app/admin/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, RefreshCcw } from 'lucide-react'

export function QRScannerComponent() {
  const [scanning, setScanning] = useState(true)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message: string
    remaining?: number
  } | null>(null)

  const handleDecode = async (result: string) => {
    if (!result || !scanning) return

    setScanning(false)
    try {
      // Parse JSON if possible, otherwise treat as ID string
      let userId = result
      try {
        const json = JSON.parse(result)
        if (json.userId) userId = json.userId
      } catch {
        // Not JSON, assume direct ID
      }

      toast.loading('Processing check-in...')
      const response = await checkInUser(userId)
      toast.dismiss()

      if (response.success) {
        toast.success(response.message)
        setLastResult({ 
          success: true, 
          message: response.message, 
          remaining: response.remaining 
        })
      } else {
        toast.error(response.message)
        setLastResult({ success: false, message: response.message })
      }
    } catch {
      toast.error('Invalid QR Code')
      setLastResult({ success: false, message: 'Invalid QR Code' })
    }
  }

  const resetScanner = () => {
    setLastResult(null)
    setScanning(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scanner</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {scanning ? (
            <div className="w-full max-w-sm aspect-square overflow-hidden rounded-lg border-2 border-primary relative">
              <Scanner
                onScan={(results) => {
                  if (results && results.length > 0) {
                    handleDecode(results[0].rawValue || '')
                  }
                }}
                onError={(error) => console.log('Scanner error:', error)}
                constraints={{ facingMode: 'environment' }}
              />
              <div className="absolute inset-0 border-2 border-white/50 m-12 rounded-lg pointer-events-none animate-pulse" />
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-square flex flex-col items-center justify-center bg-muted rounded-lg space-y-4 p-6 text-center">
              {lastResult?.success ? (
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              ) : (
                <XCircle className="h-20 w-20 text-red-500" />
              )}
              <div>
                <h3 className="text-xl font-bold">
                  {lastResult?.success ? 'Check-in Successful' : 'Check-in Failed'}
                </h3>
                <p className="text-muted-foreground">{lastResult?.message}</p>
                {lastResult?.remaining !== undefined && (
                  <p className="font-semibold mt-2">
                    Remaining: {lastResult.remaining}
                  </p>
                )}
              </div>
              <Button onClick={resetScanner} size="lg">
                <RefreshCcw className="mr-2 h-4 w-4" /> Scan Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

