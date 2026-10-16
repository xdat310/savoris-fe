import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { ApiError, get, put } from '../api/client'
import type { StaffShiftResponse } from '../api/types'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip } from '../components/State'
import { useToast } from '../components/Toast'
import { EMPTY, date, isoDate, time } from '../lib/format'
import { Icon } from '../components/ui/Icon'
import { useData } from '../lib/useData'

export function MyShifts() {
  const toast = useToast()
  const [today] = useState(() => new Date())
  const from = isoDate(new Date(today.getTime() - 86400000))
  const to = isoDate(new Date(today.getTime() + 13 * 86400000))
  const shifts = useData(() => get<StaffShiftResponse[]>(`/shifts/me?from=${from}&to=${to}`), [])

  async function clock(a: StaffShiftResponse, step: 'check-in' | 'check-out') {
    try {
      await put(`/shift-assignments/${a.id}/${step}`)
      toast(step === 'check-in' ? 'Đã chấm công vào ca' : 'Đã chấm công ra ca')
      shifts.reload()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không chấm công được', true)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div>
          <h1>Ca của tôi</h1>
          <p>Chấm công từ 30 phút trước giờ vào ca đến hết ca.</p>
        </div>
      </div>
      {shifts.error && <ErrorNotice message={shifts.error} onRetry={shifts.reload} />}
      <div className="panel">
        {shifts.loading ? <Loading /> : (shifts.data?.length ?? 0) === 0 ? <Empty title="Chưa được xếp ca trong 2 tuần tới">Quản lý chi nhánh xếp ca cho bạn.</Empty> : (
          <table className="data">
            <thead><tr><th>Ngày</th><th>Ca</th><th>Vào</th><th>Ra</th><th className="actions"><span className="sr-only">Chấm công</span></th></tr></thead>
            <tbody>
              {shifts.data!.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong">{a.workDate === isoDate(today) ? 'Hôm nay' : date(`${a.workDate}T00:00`)}</td>
                  <td>{a.shiftName} <span className="cell-muted num" style={{ marginLeft: 'var(--space-2)' }}>{a.startTime?.slice(0, 5)}–{a.endTime?.slice(0, 5)}</span></td>
                  <td className={a.checkInAt ? 'num' : 'empty-val'}>{a.checkInAt ? time(a.checkInAt) : EMPTY}</td>
                  <td className={a.checkOutAt ? 'num' : 'empty-val'}>{a.checkOutAt ? time(a.checkOutAt) : EMPTY}</td>
                  <td className="actions">
                    {!a.checkInAt && <button className="btn btn-lg btn-primary" onClick={() => clock(a, 'check-in')}><Icon icon={LogIn} size={20} /> Vào ca</button>}
                    {a.checkInAt && !a.checkOutAt && <button className="btn btn-lg btn-primary" onClick={() => clock(a, 'check-out')}><Icon icon={LogOut} size={20} /> Ra ca</button>}
                    {a.checkOutAt && <Chip tone="ok">{a.workedMinutes} phút</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
