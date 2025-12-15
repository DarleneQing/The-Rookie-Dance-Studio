'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

import { updateProfileAvatar } from '@/app/profile/actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AvatarUploadDialogProps {
  children: React.ReactNode
}

type Area = {
  x: number
  y: number
  width: number
  height: number
}

function getCroppedImg(imageSrc: string, crop: { x: number; y: number }, zoom: number, pixelCrop: { width: number; height: number; x: number; y: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.9
      )
    }
    image.onerror = (error) => reject(error)
  })
}

export function AvatarUploadDialog({ children }: AvatarUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()

  const onCropComplete = useCallback((_: Area, croppedAreaPixelsValue: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsValue)
  }, [])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image under 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error('Please select and crop an image first.')
      return
    }

    try {
      setLoading(true)
      console.log('Starting image crop...')
      const croppedBlob = await getCroppedImg(imageSrc, crop, zoom, croppedAreaPixels)
      console.log('Image cropped, blob size:', croppedBlob.size, 'type:', croppedBlob.type)
      
      // Convert Blob to base64 string for Server Action
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
            console.log('Base64 conversion successful, length:', base64Data.length)
            resolve(base64Data)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = (error) => {
          console.error('FileReader error:', error)
          reject(new Error('Failed to read blob as data URL'))
        }
        reader.readAsDataURL(croppedBlob)
      })

      console.log('Calling updateProfileAvatar...')
      const result = await updateProfileAvatar(base64String, croppedBlob.type)
      console.log('Server action result:', result)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setImageSrc(null)
        router.refresh()
      } else {
        console.error('Server action failed:', result.message)
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error in handleSave:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to update profile picture: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setImageSrc(null)
      setCroppedAreaPixels(null)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[380px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] flex flex-col px-4 md:px-6">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-lg md:text-xl">Update Profile Picture</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Upload and crop a new profile picture. For best results, use a clear square image.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 py-2 md:py-3">
          <div className="grid gap-2 md:gap-3">
            <div className="grid gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-10 md:h-11 text-sm border-2 border-dashed hover:border-solid transition-all"
              >
                <Upload className="h-4 w-4" />
                <span>Choose Image</span>
              </Button>
            </div>
            {imageSrc && (
              <div className="relative w-full h-[250px] md:h-[300px] lg:h-[320px] bg-black/40 rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            )}
            {imageSrc && (
              <div className="flex items-center gap-2 md:gap-3 px-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground font-medium min-w-[45px]">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto text-sm px-4 py-2 h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !imageSrc}
            className="w-full sm:w-auto text-sm px-4 py-2 h-9"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

