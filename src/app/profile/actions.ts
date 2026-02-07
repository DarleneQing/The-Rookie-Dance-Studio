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
        message: 'No image was received. Please try uploading again.',
      }
    }

    // Convert base64 to Buffer
    let imageBuffer: Buffer
    try {
      imageBuffer = Buffer.from(base64Image, 'base64')
      if (imageBuffer.length === 0) {
        return {
          success: false,
          message: 'The image data is invalid. Please try a different image.',
        }
      }
    } catch {
      return {
        success: false,
        message: 'Unable to process the image. Please try a different photo.',
      }
    }
    
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return {
        success: false,
        message: 'The image is still too large after compression. Please use a smaller image (under 10MB).',
      }
    }

    const validMimeType = mimeType || 'image/jpeg'
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(validMimeType)) {
      return {
        success: false,
        message: 'This image format is not supported. Please use JPG, PNG, or WEBP.',
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
      // Check for specific error types
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('storage')) {
        return {
          success: false,
          message: 'Storage limit reached. Please contact support.',
        }
      }
      return {
        success: false,
        message: 'Unable to upload image. Please try again later.',
      }
    }

    if (!uploadData) {
      return {
        success: false,
        message: 'Image upload succeeded but couldn\'t be confirmed. Please refresh the page.',
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
        message: 'Failed to save profile picture. Please try again.',
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
      message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
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
        message: 'Unable to load your profile. Please try again.',
      }
    }

    if (profile?.verification_status === 'pending') {
      return {
        success: false,
        message: 'You already have a verification request pending. Please wait for admin review.',
      }
    }

    if (profile?.verification_status === 'approved') {
      return {
        success: false,
        message: 'Your student status is already verified.',
      }
    }

    // Allow upload for 'none', 'rejected', and 'reupload_required' statuses

    // Basic server-side validation
    if (!base64Image || base64Image.length === 0) {
      return {
        success: false,
        message: 'No image was received. Please try uploading again.',
      }
    }

    // Convert base64 to Buffer
    let imageBuffer: Buffer
    try {
      imageBuffer = Buffer.from(base64Image, 'base64')
      if (imageBuffer.length === 0) {
        return {
          success: false,
          message: 'The image data is invalid. Please try a different image.',
        }
      }
    } catch {
      return {
        success: false,
        message: 'Unable to process the image. Please try a different photo.',
      }
    }

    // Validate file size (5MB max)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return {
        success: false,
        message: 'The image is still too large after compression. Please use a smaller image (under 5MB).',
      }
    }

    const validMimeType = mimeType || 'image/jpeg'
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(validMimeType)) {
      return {
        success: false,
        message: 'This image format is not supported. Please use JPG, PNG, or WEBP.',
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
      // Check for specific error types
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('storage')) {
        return {
          success: false,
          message: 'Storage limit reached. Please contact support.',
        }
      }
      return {
        success: false,
        message: 'Unable to upload student card. Please try again later.',
      }
    }

    if (!uploadData) {
      return {
        success: false,
        message: 'Upload succeeded but couldn\'t be confirmed. Please refresh the page.',
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
        message: 'Failed to submit verification request. Please try again.',
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
      message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
    }
  }
}

export async function updateProfileInfo(data: {
  full_name?: string
  dob?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient()
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        success: false,
        message: 'You must be logged in to update your profile.',
      }
    }
    
    // Validate inputs
    if (data.full_name !== undefined && data.full_name.trim().length === 0) {
      return {
        success: false,
        message: 'Full name cannot be empty.',
      }
    }
    
    // Build update object
    const updateData: any = {}
    if (data.full_name !== undefined) {
      updateData.full_name = data.full_name.trim()
    }
    if (data.dob !== undefined) {
      updateData.dob = data.dob
    }
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
    
    if (updateError) {
      return {
        success: false,
        message: 'Failed to update profile. Please try again.',
      }
    }
    
    revalidatePath('/settings')
    
    return {
      success: true,
      message: 'Profile updated successfully.',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}

