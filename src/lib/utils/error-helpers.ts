/**
 * Error handling utilities
 * Standardized error message extraction and response creation
 */

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return defaultMessage
}

/**
 * Create a standardized error response for server actions
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): { success: false; message: string } {
  return {
    success: false,
    message: getErrorMessage(error, defaultMessage),
  }
}

/**
 * Create a success response for server actions
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): { success: true; data: T; message?: string } {
  return {
    success: true,
    data,
    ...(message && { message }),
  }
}
