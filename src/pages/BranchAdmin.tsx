import { useAuth } from '../auth'
import { Manager } from './Manager'
import { Owner } from './Owner'

/**
 * /chi-nhanh — same URL, different view based on role.
 * ADMIN → Owner chain view (branch list, manager accounts)
 * BRANCH_MANAGER → Manager branch view (floor plan, staff)
 */
export function BranchAdmin() {
  const { role, branchId } = useAuth()
  if (role === 'ADMIN') return <Owner />
  return <Manager key={branchId} />
}
