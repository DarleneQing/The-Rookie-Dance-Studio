'use client'

import { useState } from 'react'
import { AssignSubscriptionDialog } from './assign-subscription-dialog'
import { RequestReVerificationDialog } from './request-reverification-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Search, CreditCard, GraduationCap, RefreshCw } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  avatar_url: string
  role: string
  member_type?: string
  verification_status?: string
  subscription?: {
    type: string
    status: string
    remaining_credits?: number
    end_date?: string
  }
}

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState('')

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 w-full max-w-sm md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          <Input
            placeholder="Search users..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile Card Layout (visible on mobile, hidden on md+) */}
      <div className="space-y-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/20">
            <p className="text-white/70 font-outfit">No users found.</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                    {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-syne font-bold text-white text-lg truncate">
                    {user.full_name}
                  </div>
                  <div className="text-sm text-white/60 font-outfit truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="mb-4 pb-4 border-b border-white/10">
                {user.subscription ? (
                  <div className="flex flex-col gap-1">
                    <span className="capitalize font-syne font-semibold text-white">
                      {user.subscription.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-white/60 font-outfit">
                      {user.subscription.type === 'monthly'
                        ? `Ends: ${new Date(user.subscription.end_date!).toLocaleDateString()}`
                        : `${user.subscription.remaining_credits} credits left`}
                    </span>
                  </div>
                ) : (
                  <span className="text-white/60 text-sm font-outfit">No active plan</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <AssignSubscriptionDialog userId={user.id} userName={user.full_name}>
                  <Button
                    variant="outline"
                    className="w-full h-11 bg-white/10 hover:bg-white/20 border-white/20 text-white font-outfit"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Assign Plan
                  </Button>
                </AssignSubscriptionDialog>
                {user.member_type === 'student' && user.verification_status === 'approved' && (
                  <RequestReVerificationDialog userId={user.id} userName={user.full_name || 'User'}>
                    <Button
                      variant="outline"
                      className="w-full h-11 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-300 font-outfit"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Request Re-verification
                    </Button>
                  </RequestReVerificationDialog>
                )}
                {user.verification_status === 'reupload_required' && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                    <GraduationCap className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-orange-300 font-outfit font-medium">Re-upload Required</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table Layout (hidden on mobile, visible on md+) */}
      <div className="hidden md:block rounded-lg border border-white/20 overflow-hidden bg-white/5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10 bg-white/5">
                <TableHead className="w-[100px] text-white/90 font-syne font-bold px-6 py-4">Avatar</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Name</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Status</TableHead>
                <TableHead className="text-right text-white/90 font-syne font-bold px-6 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow className="border-white/20">
                  <TableCell colSpan={4} className="h-24 text-center px-6 py-8">
                    <p className="text-white/70 font-outfit">No users found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/20 hover:bg-white/10 transition-colors">
                    <TableCell className="px-6 py-4">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                          {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="font-syne font-semibold text-white mb-1">{user.full_name}</div>
                      <div className="text-sm text-white/60 font-outfit">
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {user.subscription ? (
                        <div className="flex flex-col gap-1">
                          <span className="capitalize font-syne font-semibold text-white">
                            {user.subscription.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-white/60 font-outfit">
                            {user.subscription.type === 'monthly'
                              ? `Ends: ${new Date(user.subscription.end_date!).toLocaleDateString()}`
                              : `${user.subscription.remaining_credits} credits left`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/60 text-sm font-outfit">No active plan</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.verification_status === 'reupload_required' && (
                          <span className="text-xs text-orange-300 font-outfit bg-orange-500/20 px-2 py-1 rounded-full border border-orange-500/30">
                            Re-upload Required
                          </span>
                        )}
                        {user.member_type === 'student' && user.verification_status === 'approved' && (
                          <RequestReVerificationDialog userId={user.id} userName={user.full_name || 'User'}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-300 hover:bg-orange-500/20 font-outfit"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Re-verify
                            </Button>
                          </RequestReVerificationDialog>
                        )}
                        <AssignSubscriptionDialog userId={user.id} userName={user.full_name}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 font-outfit"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Assign Plan
                          </Button>
                        </AssignSubscriptionDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

