import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('admin user management design contract', () => {
  it('loads the member and plan details used by the detail panel', () => {
    const page = readSource('src/app/admin/users/page.tsx')
    const actions = readSource('src/app/admin/actions.ts')

    expect(page).toContain('verification_status, dob')
    expect(page).toContain('start_date, end_date, total_credits, remaining_credits')
    expect(actions).toContain('verification_status, dob')
    expect(actions).toContain('start_date, end_date, total_credits, remaining_credits')
  })

  it('keeps plan assignment inside the selected user detail flow', () => {
    const list = readSource('src/components/admin/users-table.tsx')
    const details = readSource('src/components/admin/user-details-dialog.tsx')

    expect(list).toContain('UserDetailsDialog')
    expect(list).not.toContain('AssignSubscriptionDialog')
    expect(details).toContain('AssignSubscriptionDialog')
    expect(details).toContain('Date of birth')
    expect(details).toContain('Member type')
    expect(details).toContain('Sessions remaining')
  })

  it('filters members by type and subscription state', () => {
    const list = readSource('src/components/admin/users-table.tsx')

    expect(list).toContain('value="student"')
    expect(list).toContain('value="adult"')
    expect(list).toContain('value="with-plan"')
    expect(list).toContain('value="without-plan"')
    expect(list).toContain("Boolean(user.subscription)")
  })

  it('places the check-in scanner before user management', () => {
    const dashboard = readSource('src/components/admin/admin-dashboard.tsx')
    const scannerIndex = dashboard.indexOf('label="Check-in Scanner"')
    const usersIndex = dashboard.indexOf('label="User Management"')

    expect(scannerIndex).toBeGreaterThan(-1)
    expect(usersIndex).toBeGreaterThan(-1)
    expect(scannerIndex).toBeLessThan(usersIndex)
  })

  it('wires course selection into the protected scanner flow', () => {
    const scanner = readSource('src/components/admin/scanner/course-qr-scanner.tsx')
    const actions = readSource('src/app/admin/scanner/actions.ts')

    expect(scanner).toContain('CourseSelector')
    expect(scanner).toContain('onSelectCourse={handleCourseSelect}')
    expect(scanner).toContain('getCheckinContext(userId, selectedCourseId)')
    expect(scanner).toContain('performCourseCheckin(pendingUserId, selectedCourseId')
    expect(actions).toContain('const admin = await requireAdmin()')
    expect(actions).toContain("supabase.rpc('perform_course_checkin'")
  })

  it('keeps metrics on one row and constrains the dashboard artwork', () => {
    const dashboard = readSource('src/components/admin/admin-dashboard.tsx')

    expect(dashboard).toContain('grid grid-cols-4')
    expect(dashboard).toContain('max-w-[340px]')
    expect(dashboard).toContain('object-contain')
    expect(dashboard).not.toContain('scale-[1.7]')
  })

  it('supports drilling from plan counts into subscription members', () => {
    const dialog = readSource('src/components/admin/active-subscriptions-dialog.tsx')
    const actions = readSource('src/app/admin/actions.ts')

    expect(dialog).toContain('getAdminSubscriptionMembers')
    expect(dialog).toContain('View members and status')
    expect(dialog).toContain('selectedMembers.map')
    expect(actions).toContain('getAdminSubscriptionMembers')
    expect(actions).toContain('profiles!subscriptions_user_id_fkey')
  })
})
