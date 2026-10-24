import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { readMigratedStorage } from './lib/storage'
import { get, getSession, onSessionChange, post, saveSession, type Session } from './api/client'
import type { BranchResponse, StaffResponse } from './api/types'

interface AuthState {
  session: Session | null
  authLoading: boolean
  role?: string
  // The branch this screen works on: the staff member's own, or the one the owner picked
  branchId?: number
  branches: BranchResponse[]
  setBranchId: (id: number | null) => void
  // After a branch is added, renamed or closed
  reloadBranches: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const BRANCH_KEY = 'savoris.branch'
const LEGACY_BRANCH_KEY = 'dinechain.branch'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(getSession())
  const [authLoading, setAuthLoading] = useState(() => !getSession())
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [pickedBranch, setPickedBranch] = useState<number | null | undefined>(() => {
    try {
      const v = readMigratedStorage(localStorage, BRANCH_KEY, LEGACY_BRANCH_KEY)
      if (v === '') return null   // explicitly cleared to Toàn chuỗi
      return v ? Number(v) : undefined
    } catch {
      return undefined
    }
  })

  useEffect(() => onSessionChange(setSession), [])

  useEffect(() => {
    if (getSession()) return
    get<StaffResponse>('/auth/me')
      .then((staff) => saveSession({ staff }))
      .catch(() => undefined)
      .finally(() => setAuthLoading(false))
  }, [])

  const loadBranches = () => get<BranchResponse[]>('/branches').then(setBranches).catch(() => setBranches([]))
  useEffect(() => {
    if (!session) return
    loadBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const role = session?.staff?.role
  const ownBranch = session?.staff?.branchId
  // null = ADMIN explicitly chose "Toàn chuỗi"; undefined = never picked, fall back to first branch
  const branchId = ownBranch ?? (pickedBranch === null ? undefined : (pickedBranch ?? branches[0]?.id))

  const value: AuthState = {
    session,
    authLoading,
    role,
    branchId,
    branches,
    reloadBranches: loadBranches,
    setBranchId: (id) => {
      setPickedBranch(id)
      try {
        localStorage.setItem(BRANCH_KEY, id === null ? '' : String(id))
      } catch {
        // remembered for this tab only
      }
    },
    login: async (username, password) => {
      const staff = await post<StaffResponse>('/auth/login', { username, password })
      saveSession({ staff })
    },
    logout: async () => {
      try {
        await post('/auth/logout')
      } catch {
        // signing out locally is what matters
      }
      saveSession(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

export const can = {
  // Functional permissions (used throughout the app for feature access)
  pos: (role?: string) => ['ADMIN', 'MANAGER', 'STAFF'].includes(role ?? ''),
  kitchen: (role?: string) => ['ADMIN', 'MANAGER', 'CHEF'].includes(role ?? ''),
  cash: (role?: string) => ['ADMIN', 'MANAGER', 'STAFF'].includes(role ?? ''),
  cancelCooking: (role?: string) => ['ADMIN', 'MANAGER'].includes(role ?? ''),
  shifts: (role?: string) => role !== 'ADMIN',
  manage: (role?: string) => ['ADMIN', 'MANAGER'].includes(role ?? ''),
  stock: (role?: string) => ['ADMIN', 'MANAGER'].includes(role ?? ''),
  owner: (role?: string) => role === 'ADMIN',
  // Sidebar nav visibility per RBAC spec
  siteAdmin: (role?: string) => role === 'ADMIN',          // full website CMS
  menuCms: (role?: string) => ['ADMIN', 'MANAGER'].includes(role ?? ''), // thực đơn website
  branchAdmin: (role?: string) => role === 'ADMIN', // branch changes are ADMIN-only
  isStaff: (role?: string) => ['CHEF', 'STAFF'].includes(role ?? ''),
}

// Everything for the restaurant's own people (owner, managers, staff) lives under this prefix; guests use the root
export const STAFF = '/nha-hang'

export function homeFor(role?: string) {
  if (role === 'ADMIN') return '/admin/overview'
  if (role === 'MANAGER') return '/admin/branch'
  if (role === 'CHEF') return '/admin/kitchen'
  return '/admin/floor'
}
