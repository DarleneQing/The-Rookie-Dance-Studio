'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

import { uploadStudentCard } from '@/app/profile/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface StudentVerificationDialogProps {
  children: React.ReactNode
  currentStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'reupload_required'
  rejectionReason?: string | null
}

export function StudentVerificationDialog({
  children,
  currentStatus,
  rejectionReason,
}: StudentVerificationDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image under 5MB.')
      return
    }

    // Validate specific image types
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Unsupported image format. Please use JPG, PNG, or WEBP.')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first.')
      return
    }

    try {
      setLoading(true)

      // Convert file to base64
      const reader = new FileReader()
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64 = reader.result as string
            if (!base64) {
              reject(new Error('FileReader returned empty result'))
              return
            }
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64Data = base64.split(',')[1]
            if (!base64Data) {
              reject(new Error('Failed to extract base64 data'))
              return
            }
            resolve(base64Data)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => {
          reject(new Error('Failed to read file as data URL'))
        }
        reader.readAsDataURL(selectedFile)
      })

      const result = await uploadStudentCard(base64String, selectedFile.type)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to upload student card: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Don't show dialog if already approved
  if (currentStatus === 'approved') {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Verify as Student
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your student ID card. The image must be clear and under 5MB.
          </DialogDescription>
          {currentStatus === 'rejected' && rejectionReason && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400 font-medium">Previous rejection reason:</p>
              <p className="text-sm text-red-300 mt-1">{rejectionReason}</p>
            </div>
          )}
          {currentStatus === 'reupload_required' && rejectionReason && (
            <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-400 font-medium">Re-verification required:</p>
              <p className="text-sm text-orange-300 mt-1">{rejectionReason}</p>
            </div>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-10 border-2 border-dashed hover:border-solid transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>Choose Student Card Image</span>
            </Button>
          </div>
          {previewUrl && (
            <div className="relative w-full rounded-lg overflow-hidden border border-gray-200">
              <img
                src={previewUrl}
                alt="Student card preview"
                className="w-full h-auto max-h-[400px] object-contain"
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="w-full sm:w-auto"
          >
            {loading ? 'Uploading...' : 'Upload & Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

