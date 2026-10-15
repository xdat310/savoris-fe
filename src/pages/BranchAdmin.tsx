import { Navigate } from 'react-router-dom'
import { STAFF, useAuth } from '../auth'
import { Manager } from './Manager'

export function BranchAdmin() {
  const { role, branchId } = useAuth()
  if (role === 'ADMIN') return <Navigate to={`${STAFF}/chuoi`} replace />
  return <Manager key={branchId} />
}
