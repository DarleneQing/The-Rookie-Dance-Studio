import { cache } from 'react'
import { createClient } from './server'

export const getCachedUser = cache(async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCachedProfile = cache(async (userId: string) => {
  const supabase = createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return profile
})
