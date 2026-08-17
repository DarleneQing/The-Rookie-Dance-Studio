'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'

import { searchAdminUsers, type AdminUserRow } from '@/app/admin/actions'
import { UserDetailsDialog } from '@/components/admin/user-details-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface UsersTableProps {
  users: AdminUserRow[]
}

const PAGE_SIZE = 8

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right'

function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const visiblePages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount]))
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b)

  const items: PaginationItem[] = []
  visiblePages.forEach((page, index) => {
    const previousPage = visiblePages[index - 1]
    if (previousPage && page - previousPage > 1) {
      items.push(index === 1 ? 'ellipsis-left' : 'ellipsis-right')
    }
    items.push(page)
  })

  return items
}

function getUserSubtitle(user: AdminUserRow) {
  const role = user.role?.toLowerCase()
  if (role === 'admin') return 'Admin · Studio access'
  if (role === 'instructor') return 'Instructor'
  if (user.member_type === 'student') return 'Student member'
  if (user.member_type === 'adult') return 'Adult member'
  return 'Member'
}

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<AdminUserRow[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [memberFilter, setMemberFilter] = useState<'all' | 'student' | 'adult'>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'with-plan' | 'without-plan'>('all')

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setResults(null)
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)

    const timeout = window.setTimeout(async () => {
      try {
        const matches = await searchAdminUsers(query)
        if (!cancelled) setResults(matches)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [search])

  const visibleUsers = useMemo(() => {
    const source = results ?? users
    return source.filter((user) => {
      const matchesMemberType = memberFilter === 'all' || user.member_type === memberFilter
      const matchesPlan = planFilter === 'all'
        || (planFilter === 'with-plan' ? Boolean(user.subscription) : !user.subscription)
      return matchesMemberType && matchesPlan
    })
  }, [memberFilter, planFilter, results, users])
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginatedUsers = useMemo(
    () => visibleUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, visibleUsers],
  )
  const paginationItems = getPaginationItems(currentPage, pageCount)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45"
          aria-hidden="true"
        />
        <Input
          placeholder="Search members by name"
          aria-label="Search members by name"
          className="h-12 rounded-2xl border-border/60 bg-card pl-11 pr-11 text-foreground placeholder:text-foreground/40 focus:bg-card"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        {searching && (
          <RefreshCw
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-rookie-blue"
            aria-label="Searching"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2" aria-label="User filters">
        <label className="min-w-0">
          <span className="sr-only">Filter by member type</span>
          <select
            value={memberFilter}
            onChange={(event) => {
              setMemberFilter(event.target.value as 'all' | 'student' | 'adult')
              setPage(1)
            }}
            className="h-11 w-full rounded-xl border border-border/60 bg-card px-3 font-outfit text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All members</option>
            <option value="student">Students</option>
            <option value="adult">Adults</option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by subscription</span>
          <select
            value={planFilter}
            onChange={(event) => {
              setPlanFilter(event.target.value as 'all' | 'with-plan' | 'without-plan')
              setPage(1)
            }}
            className="h-11 w-full rounded-xl border border-border/60 bg-card px-3 font-outfit text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All plans</option>
            <option value="with-plan">Has subscription</option>
            <option value="without-plan">No subscription</option>
          </select>
        </label>
      </div>

      <section
        aria-label="Members"
        className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl"
      >
        {paginatedUsers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-syne text-base font-semibold text-card-foreground">No users found</p>
            <p className="mt-1 font-outfit text-sm text-card-foreground/50">
              Try another search or filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {paginatedUsers.map((user) => (
              <UserDetailsDialog key={user.id} user={user}>
                <button
                  type="button"
                  className="group flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                  aria-label={`View details for ${user.full_name || 'user'}`}
                >
                  <Avatar className="h-11 w-11 shrink-0 border border-border/60">
                    <AvatarImage src={user.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink font-syne text-sm font-semibold text-white">
                      {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-syne text-sm font-semibold text-card-foreground sm:text-base">
                      {user.full_name || 'Unnamed user'}
                    </span>
                    <span className="mt-0.5 block truncate font-outfit text-xs text-card-foreground/50 sm:text-sm">
                      {getUserSubtitle(user)}
                    </span>
                  </span>

                  {user.subscription && (
                    <span className="hidden rounded-full border border-success/25 bg-success/10 px-2.5 py-1 font-outfit text-[11px] font-medium text-success sm:inline-flex">
                      Active plan
                    </span>
                  )}
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-card-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-card-foreground/70"
                    aria-hidden="true"
                  />
                </button>
              </UserDetailsDialog>
            ))}
          </div>
        )}
      </section>

      {visibleUsers.length > PAGE_SIZE && (
        <nav className="flex items-center justify-center gap-1.5 pt-1" aria-label="User list pagination">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground/60 transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-2 font-outfit text-sm transition',
                  item === currentPage
                    ? 'bg-card text-foreground ring-1 ring-border'
                    : 'text-foreground/55 hover:bg-card hover:text-foreground',
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="inline-flex h-11 min-w-6 items-center justify-center text-foreground/40">
                …
              </span>
            ),
          )}

          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage === pageCount}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground/60 transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
