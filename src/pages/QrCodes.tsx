import { useAuth } from '../auth'
import { TabList } from '../components/ui/TabList'
import { TableQr } from './TableQr'

// Every table of every branch has its own QR: scanning it tells the order which branch and which table it is for
export function QrCodes() {
  const { session, branches, branchId, setBranchId } = useAuth()
  const ownBranch = session!.staff.branchId
  const branch = branches.find((b) => b.id === branchId)
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mã QR bàn {branch ? `· ${branch.name}` : ''}</h1>
          <p>Mỗi bàn một mã riêng. Khách quét là đơn tự biết đang ở chi nhánh nào, bàn số mấy.</p>
        </div>
      </div>
      {!ownBranch && (
        <TabList className="no-print" label="Chi nhánh">
          {branches.map((b) => (
            <button key={b.id} role="tab" className="tab" aria-selected={b.id === branchId} onClick={() => setBranchId(b.id!)}>
              {b.code}
            </button>
          ))}
        </TabList>
      )}
      {branchId && <TableQr key={branchId} branchId={branchId} />}
    </div>
  )
}
