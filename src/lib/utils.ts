import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for course dance style (e.g. Commercial → Choreography). */
export function getDisplayDanceStyle(style: string): string {
  return style === 'Commercial' ? 'Choreography' : style
}

