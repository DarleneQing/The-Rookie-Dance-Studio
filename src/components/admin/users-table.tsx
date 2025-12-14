'use client'

import { useState } from 'react'
import { AssignSubscriptionDialog } from './assign-subscription-dialog'
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
} from '@/components/ui/table' // Need to create Table
import { Search, MoreHorizontal, CreditCard } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  avatar_url: string
  role: string
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.subscription ? (
                      <div className="flex flex-col gap-1">
                        <span className="capitalize font-medium">
                          {user.subscription.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.subscription.type === 'monthly'
                            ? `Ends: ${new Date(user.subscription.end_date!).toLocaleDateString()}`
                            : `${user.subscription.remaining_credits} credits left`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No active plan</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <AssignSubscriptionDialog userId={user.id} userName={user.full_name}>
                      <Button variant="ghost" size="sm">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Assign Plan
                      </Button>
                    </AssignSubscriptionDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

