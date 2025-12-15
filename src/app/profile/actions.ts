'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

interface UpdateAvatarResult {
  success: boolean
  message: string
}

export async function updateProfileAvatar(base64Image: string, mimeType: string): Promise<UpdateAvatarResult> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return {
        success: false,
        message: 'You must be logged in to update your profile picture.',
      }
    }

    // Basic server-side validation
    if (!base64Image || base64Image.length === 0) {
      console.error('No base64 image data received')
      return {
        success: false,
        message: 'No image data received.',
      }
    }

    // Convert base64 to Buffer
    let imageBuffer: Buffer
    try {
      imageBuffer = Buffer.from(base64Image, 'base64')
      if (imageBuffer.length === 0) {
        return {
          success: false,
          message: 'Invalid image data. Please try again.',
        }
      }
    } catch (bufferError) {
      console.error('Buffer conversion error:', bufferError)
      return {
        success: false,
        message: 'Failed to process image data. Please try again.',
      }
    }
    
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return {
        success: false,
        message: 'Image is too large. Please upload an image under 10MB.',
      }
    }

    const validMimeType = mimeType || 'image/jpeg'
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(validMimeType)) {
      return {
        success: false,
        message: 'Unsupported image format. Please use JPG, PNG, or WEBP.',
      }
    }

    const fileExt = validMimeType === 'image/png' ? 'png' : validMimeType === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    console.log('Uploading to Supabase storage:', filePath, 'size:', imageBuffer.length)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageBuffer, {
        contentType: validMimeType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase upload error:', JSON.stringify(uploadError, null, 2))
      const errorMessage = uploadError.message || uploadError.error || 'Unknown error'
      const errorDetails = uploadError.statusCode ? ` (Status: ${uploadError.statusCode})` : ''
      return {
        success: false,
        message: `Failed to upload image: ${errorMessage}${errorDetails}. Please check that the 'avatars' bucket exists and is configured correctly.`,
      }
    }

    if (!uploadData) {
      console.error('Upload returned no data and no error')
      return {
        success: false,
        message: 'Upload completed but no data returned. Please try again.',
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    console.log('Got public URL:', publicUrl)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return {
        success: false,
        message: `Failed to update profile: ${updateError.message || 'Please try again.'}`,
      }
    }

    revalidatePath('/profile')

    return {
      success: true,
      message: 'Profile picture updated successfully.',
    }
  } catch (error) {
    console.error('Unexpected error in updateProfileAvatar:', error)
    return {
      success: false,
      message: error instanceof Error ? `Error: ${error.message}` : 'An unexpected error occurred. Please try again.',
    }
  }
}

