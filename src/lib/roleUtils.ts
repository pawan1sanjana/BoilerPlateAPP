import type { AppRole } from '@/store/useModulePermissionsStore'

// ── Role hierarchy checks ──────────────────────────────────────────────────────

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === 'admin'
}

export function isEstateManager(role: AppRole | null | undefined): boolean {
  return role === 'estate_manager'
}

export function isEstateRole(role: AppRole | null | undefined): boolean {
  return (
    role === 'estate_manager' ||
    role === 'estate_office' ||
    role === 'field_officer' ||
    role === 'user'
  )
}

// ── Capability checks ──────────────────────────────────────────────────────────

/** Admin or Estate Manager can manage users (archive, delete, invite) */
export function canManageUsers(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'estate_manager'
}

/** Admin or Estate Manager can create/edit estates */
export function canManageEstate(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'estate_manager'
}

/** Admin or Estate Manager can configure module permissions */
export function canConfigureModules(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'estate_manager'
}

/** Only admin can see global cross-estate data */
export function hasGlobalAccess(role: AppRole | null | undefined): boolean {
  return role === 'admin'
}

// ── Role dropdown options ──────────────────────────────────────────────────────

export interface RoleOption {
  value: AppRole
  label: string
}

const ALL_ROLE_OPTIONS: RoleOption[] = [
  { value: 'admin', label: 'System Administrator' },
  { value: 'estate_manager', label: 'Estate Manager' },
  { value: 'estate_office', label: 'Estate Office' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'user', label: 'User' },
]

const ESTATE_ROLE_OPTIONS: RoleOption[] = [
  { value: 'estate_manager', label: 'Estate Manager' },
  { value: 'estate_office', label: 'Estate Office' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'user', label: 'User' },
]

/**
 * Returns role options the current user is allowed to assign.
 * Admin can assign any role. Estate Manager cannot assign 'admin'.
 */
export function getRoleOptions(currentRole: AppRole | null | undefined): RoleOption[] {
  if (currentRole === 'admin') return ALL_ROLE_OPTIONS
  return ESTATE_ROLE_OPTIONS
}

// ── Scope checks ───────────────────────────────────────────────────────────────

/**
 * Returns true if the current user may access data for the given estateId.
 * Admin can access any estate. Estate roles can only access their own.
 */
export function canAccessEstate(
  role: AppRole | null | undefined,
  userEstateId: string | null | undefined,
  targetEstateId: string | null | undefined
): boolean {
  if (role === 'admin') return true
  if (!userEstateId || !targetEstateId) return false
  return userEstateId === targetEstateId
}
