'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect } from 'react'
import { toast } from 'sonner'

const initialState = {
  message: '',
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

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
    if (state?.message) {
      toast.success(state.message)
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

