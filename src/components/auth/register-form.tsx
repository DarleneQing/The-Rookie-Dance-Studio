'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

// Inject styles to override dropdown colors
if (typeof document !== 'undefined') {
  const styleId = 'phone-input-dropdown-override'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .PhoneInputCountrySelectDropdown {
        background: #000000 !important;
        background-color: #000000 !important;
      }
      .PhoneInputCountrySelectDropdown * {
        color: #ffffff !important;
      }
      .PhoneInputCountrySelectDropdown .PhoneInputCountryOption {
        background: #000000 !important;
        color: #ffffff !important;
      }
      .PhoneInputCountrySelectDropdown .PhoneInputCountryOption:hover {
        background: rgba(187, 119, 161, 0.4) !important;
        color: #ffffff !important;
      }
    `
    document.head.appendChild(style)
  }
}

const initialState = {
  error: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creating account...' : 'Create an account'}
    </Button>
  )
}

export function RegisterForm() {
  const [state, formAction] = useFormState(signup, initialState)
  const [phoneNumber, setPhoneNumber] = useState<string>('')

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input id="full_name" name="full_name" placeholder="John Doe" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@example.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone_number">Phone Number (Optional)</Label>
        <div className="rounded-md border border-input bg-background">
          <PhoneInput
            international
            defaultCountry="CH"
            value={phoneNumber}
            onChange={(value) => setPhoneNumber(value || '')}
            className="phone-input-custom"
            numberInputProps={{
              id: 'phone_number',
              name: 'phone_number',
              className: 'flex h-10 w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            }}
          />
        </div>
        <input type="hidden" name="phone_number" value={phoneNumber || ''} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <SubmitButton />
      <Button variant="outline" className="w-full" type="button">
        Sign up with Google
      </Button>
    </form>
  )
}

