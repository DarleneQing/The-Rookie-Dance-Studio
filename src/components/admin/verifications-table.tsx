'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VerificationDetailDialog } from './verification-detail-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

interface Verification {
  id: string
  full_name: string | null
  avatar_url: string | null
  student_card_url: string | null
  created_at: string
  dob: string | null
}

interface VerificationsTableProps {
  verifications: Verification[]
}

export function VerificationsTable({ verifications }: VerificationsTableProps) {
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleViewDetails = (verification: Verification) => {
    setSelectedVerification(verification)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedVerification(null)
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'UR'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/90 font-syne font-semibold">User</TableHead>
                <TableHead className="text-white/90 font-syne font-semibold">Submitted</TableHead>
                <TableHead className="text-white/90 font-syne font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((verification) => (
                <TableRow key={verification.id} className="border-white/10">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={verification.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                          {getInitials(verification.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-outfit font-medium text-white/90">
                          {verification.full_name || 'Unknown User'}
                        </div>
                        {verification.dob && (
                          <div className="font-outfit text-xs text-white/60">
                            DOB: {new Date(verification.dob).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-outfit text-white/70 text-sm">
                      {formatDate(verification.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => handleViewDetails(verification)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedVerification && (
        <VerificationDetailDialog
          verification={selectedVerification}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onClose={handleDialogClose}
        />
      )}
    </>
  )
}

