'use client'

import { useEffect } from 'react'

const PHONE_INPUT_STYLE_ID = 'phone-input-dropdown-override'

const PHONE_DROPDOWN_STYLES = `
  .PhoneInputCountrySelectDropdown { background: #000000 !important; background-color: #000000 !important; }
  .PhoneInputCountrySelectDropdown * { color: #ffffff !important; }
  .PhoneInputCountrySelectDropdown .PhoneInputCountryOption { background: #000000 !important; color: #ffffff !important; }
  .PhoneInputCountrySelectDropdown .PhoneInputCountryOption:hover { background: rgba(187, 119, 161, 0.4) !important; color: #ffffff !important; }
`

/**
 * Injects dark-theme styles for react-phone-number-input dropdown once per app.
 * Use in any component that renders PhoneInput so the country selector matches the app theme.
 */
export function usePhoneInputStyles(): void {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(PHONE_INPUT_STYLE_ID)) return

    const style = document.createElement('style')
    style.id = PHONE_INPUT_STYLE_ID
    style.textContent = PHONE_DROPDOWN_STYLES
    document.head.appendChild(style)
  }, [])
}
