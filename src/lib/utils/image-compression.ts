/**
 * Image compression utility for optimizing uploaded images
 * Compresses images to reduce file size while maintaining acceptable quality
 */

interface CompressionResult {
  success: boolean
  blob?: Blob
  error?: string
}

/**
 * Compresses an image file or blob to reduce file size
 * @param file - The image file or blob to compress
 * @param quality - Compression quality (0-1), default 0.7 (70%)
 * @param maxWidth - Optional maximum width in pixels
 * @param maxHeight - Optional maximum height in pixels
 * @returns Promise with compression result
 */
export async function compressImage(
  file: File | Blob,
  quality: number = 0.7,
  maxWidth?: number,
  maxHeight?: number
): Promise<CompressionResult> {
  try {
    // Validate quality parameter
    if (quality < 0 || quality > 1) {
      return {
        success: false,
        error: 'Invalid compression quality specified.',
      }
    }

    // Create object URL for the file
    const imageUrl = URL.createObjectURL(file)

    try {
      // Load image
      const image = await loadImage(imageUrl)

      // Calculate dimensions
      let { width, height } = image
      
      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return {
          success: false,
          error: 'Unable to process this image. Please try a different photo.',
        }
      }

      // For PNG images with transparency, fill with white background
      if (file.type === 'image/png') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }

      // Draw image to canvas
      ctx.drawImage(image, 0, 0, width, height)

      // Convert canvas to blob with compression
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => {
            resolve(result)
          },
          'image/jpeg',
          quality
        )
      })

      // Clean up
      URL.revokeObjectURL(imageUrl)

      if (!blob) {
        return {
          success: false,
          error: 'Unable to process this image. Please try a different photo.',
        }
      }

      return {
        success: true,
        blob,
      }
    } catch (error) {
      // Clean up on error
      URL.revokeObjectURL(imageUrl)
      throw error
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('memory')) {
        return {
          success: false,
          error: 'The image is too large to process. Please try a smaller image.',
        }
      }
      
      if (error.message.includes('format') || error.message.includes('decode')) {
        return {
          success: false,
          error: 'This image format is not supported. Please use JPG, PNG, or WEBP.',
        }
      }
    }

    return {
      success: false,
      error: 'Unable to process this image. Please try a different photo.',
    }
  }
}

/**
 * Loads an image from a URL
 * @param url - Image URL to load
 * @returns Promise that resolves with the loaded image
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    
    image.onload = () => {
      resolve(image)
    }
    
    image.onerror = () => {
      reject(new Error('Failed to load image. The file may be corrupted or in an unsupported format.'))
    }
    
    image.src = url
  })
}

/**
 * Formats file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

