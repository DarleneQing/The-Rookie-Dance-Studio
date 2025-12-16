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
      return {
        success: false,
        message: 'You must be logged in to update your profile picture.',
      }
    }

    // Basic server-side validation
    if (!base64Image || base64Image.length === 0) {
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
    } catch {
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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageBuffer, {
        contentType: validMimeType,
        upsert: true,
      })

    if (uploadError) {
      const errorMessage = uploadError.message || 'Unknown error'
      return {
        success: false,
        message: `Failed to upload image: ${errorMessage}. Please check that the 'avatars' bucket exists and is configured correctly.`,
      }
    }

    if (!uploadData) {
      return {
        success: false,
        message: 'Upload completed but no data returned. Please try again.',
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
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
    return {
      success: false,
      message: error instanceof Error ? `Error: ${error.message}` : 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function uploadStudentCard(
  base64Image: string,
  mimeType: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        message: 'You must be logged in to upload your student card.',
      }
    }

    // Check current verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return {
        success: false,
        message: 'Failed to fetch profile information.',
      }
    }

    if (profile?.verification_status === 'pending') {
      return {
        success: false,
        message: 'You already have a pending verification request. Please wait for admin approval.',
      }
    }

    if (profile?.verification_status === 'approved') {
      return {
        success: false,
        message: 'Your student status has already been approved.',
      }
    }

    // Allow upload for 'none', 'rejected', and 'reupload_required' statuses

    // Basic server-side validation
    if (!base64Image || base64Image.length === 0) {
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
    } catch {
      return {
        success: false,
        message: 'Failed to process image data. Please try again.',
      }
    }

    // Validate file size (5MB max)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return {
        success: false,
        message: 'Image is too large. Please upload an image under 5MB.',
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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-cards')
      .upload(filePath, imageBuffer, {
        contentType: validMimeType,
        upsert: true,
      })

    if (uploadError) {
      const errorMessage = uploadError.message || 'Unknown error'
      return {
        success: false,
        message: `Failed to upload image: ${errorMessage}. Please check that the 'student-cards' bucket exists and is configured correctly.`,
      }
    }

    if (!uploadData) {
      return {
        success: false,
        message: 'Upload completed but no data returned. Please try again.',
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('student-cards').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        student_card_url: publicUrl,
        verification_status: 'pending',
        rejection_reason: null,
      })
      .eq('id', user.id)

    if (updateError) {
      return {
        success: false,
        message: `Failed to update profile: ${updateError.message || 'Please try again.'}`,
      }
    }

    revalidatePath('/profile')

    return {
      success: true,
      message: 'Student card uploaded successfully. Your verification request is now pending admin approval.',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? `Error: ${error.message}` : 'An unexpected error occurred. Please try again.',
    }
  }
}

