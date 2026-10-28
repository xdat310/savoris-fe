import { AlertTriangle, Clock3, LoaderCircle, RefreshCw, Upload, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ApiError, apiUrl, get, post } from '../api/client'
import type { KitchenForecastResponse } from '../api/types'
import './kitchen-forecast.css'

export function KitchenForecast({ branchId }: { branchId: number }) {
  const [data, setData] = useState<KitchenForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileLoading, setFileLoading] = useState(false)

  async function importWorkbook(file?: File) {
    if (!file) return
    setFileLoading(true)
    setError('')
    try {
      const readXlsxFile = (await import('read-excel-file/browser')).default
      const sheets = await readXlsxFile(file) as { sheet: string; data: unknown[][] }[]
      const scenarioRows = sheets.find(sheet => sheet.sheet === 'Scenario')?.data
      const historyRows = sheets.find(sheet => sheet.sheet === 'History')?.data
      if (!scenarioRows || !historyRows) throw new Error('File cần có hai sheet tên Scenario và History.')
      const values = new Map(scenarioRows.slice(1).filter(row => row.length >= 2).map(row => [String(row[0]), row[1]]))
      const number = (key: string) => {
        const value = values.get(key)
        const parsed = typeof value === 'number' ? value : Number(value)
        if (value === undefined || value === null || value === '' || !Number.isFinite(parsed) || parsed < 0) throw new Error(`Giá trị “${key}” phải là số không âm.`)
        return parsed
      }
      const header = historyRows[0]?.map(value => String(value).trim())
      if (header?.join(',') !== 'hour,averageOrders,averagePortions' || historyRows.length !== 25) throw new Error('Sheet History cần đủ 24 dòng giờ (0–23) và đúng các cột hour, averageOrders, averagePortions.')
      const history = historyRows.slice(1).map(row => ({ hour: Number(row[0]), averageOrders: Number(row[1]), averagePortions: Number(row[2]) }))
      if (history.some((row, index) => row.hour !== index || !Number.isFinite(row.averageOrders) || row.averageOrders < 0 || !Number.isFinite(row.averagePortions) || row.averagePortions < 0)) throw new Error('Dữ liệu History phải có giờ 0–23 theo thứ tự và số liệu không âm.')
      setData(await post<KitchenForecastResponse>(`/dashboard/branch/${branchId}/kitchen-forecast/demo`, {
        kitchenCapacity: number('kitchenCapacity'), pendingPortions: number('pendingPortions'), cookingPortions: number('cookingPortions'),
        currentLoadPercent: number('currentLoadPercent'), activeChefAccounts: number('activeChefAccounts'), history,
      }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được file Excel.') }
    finally { setFileLoading(false) }
  }
  async function analyze(sampleData = false) {
    setLoading(true)
    setError('')
    try {
      const sampleQuery = sampleData ? '?sampleData=true' : ''
      setData(await get<KitchenForecastResponse>(`/dashboard/branch/${branchId}/kitchen-forecast${sampleQuery}`))
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 503) setError('AI chưa được cấu hình trên máy chủ. Báo quản trị viên thêm AI_API_KEY và AI_MODEL rồi thử lại.')
      else setError(cause instanceof Error ? cause.message : 'Không lấy được dự báo. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel kitchen-forecast" aria-labelledby="kitchen-forecast-title">
      <div className="panel-head kitchen-forecast__head">
        <div><h2 id="kitchen-forecast-title">Dự báo giờ cao điểm</h2><p>AI phân tích tải bếp hiện tại và lịch sử cùng thứ trong bốn tuần để dự báo hai giờ tới.</p></div>
        <div className="kitchen-forecast__buttons">
          <button type="button" className="btn btn-primary" onClick={() => void analyze()} disabled={loading}>
            {loading ? <><LoaderCircle aria-hidden="true" className="kitchen-forecast__spin" /> Đang phân tích</> : <><RefreshCw aria-hidden="true" /> Phân tích tải bếp</>}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void analyze(true)} disabled={loading}>
            Thử AI với dữ liệu mẫu
          </button>
          <label className="btn btn-ghost kitchen-forecast__upload" aria-busy={fileLoading}>
            {fileLoading ? <LoaderCircle aria-hidden="true" className="kitchen-forecast__spin" /> : <Upload aria-hidden="true" />}
            {fileLoading ? 'Đang đọc Excel' : 'Tải Excel demo'}
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { void importWorkbook(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} disabled={fileLoading || loading} />
          </label>
        </div>
      </div>
      <nav className="kitchen-forecast__templates" aria-label="Tải file Excel mẫu">
        <span>File mẫu:</span>{[['tai-thap.xlsx', 'Tải thấp'], ['cao-diem.xlsx', 'Cao điểm'], ['qua-tai.xlsx', 'Quá tải']].map(([file, label]) => <a key={file} href={apiUrl(`/demo/kitchen-forecast/${file}`)}>{label}</a>)}
      </nav>
      {error && <p className="kitchen-forecast__error" role="alert">{error}</p>}
      {!data && !error && <p className="kitchen-forecast__empty">Nhấn “Phân tích tải bếp” để xem dự báo mới nhất.</p>}
      {data && (
        <>
          <div className="kitchen-forecast__current" aria-label="Tình trạng bếp hiện tại">
            <div><span>Đang chờ</span><strong>{data.pendingPortions} <small>món</small></strong></div>
            <div><span>Đang nấu</span><strong>{data.cookingPortions} <small>món</small></strong></div>
            <div><span>Tải hiện tại</span><strong>{data.currentLoadPercent}%</strong></div>
            <div><span>Sức chứa</span><strong>{data.kitchenCapacity} <small>món/giờ</small></strong></div>
            <div className="kitchen-forecast__chefs"><UsersRound aria-hidden="true" /><span>{data.activeChefAccounts} tài khoản đầu bếp ACTIVE</span></div>
          </div>
          <div className="kitchen-forecast__alert"><AlertTriangle aria-hidden="true" /><p>{data.alert}</p></div>
          <div className="kitchen-forecast__forecasts">
            {data.forecast.map((hour, index) => (
              <div className="kitchen-forecast__hour" key={`${hour.hour}-${index}`}>
                <span className="kitchen-forecast__time"><Clock3 aria-hidden="true" /> {hour.hour}</span>
                <strong>{hour.predictedLoad}%</strong>
                <span className={`kitchen-forecast__risk kitchen-forecast__risk--${hour.risk}`}>{hour.risk === 'OVERLOADED' ? 'Quá tải' : hour.risk === 'HIGH' ? 'Nguy cơ cao' : hour.risk === 'MEDIUM' ? 'Cần theo dõi' : hour.risk === 'LOW' ? 'Thấp' : 'Bình thường'}</span>
              </div>
            ))}
          </div>
          <div className="kitchen-forecast__actions">
            <h3>Đề xuất cho quản lý</h3>
            <ul>{data.actions.map((action, index) => <li key={`${index}-${action}`}>{action}</li>)}</ul>
            {data.suggestedPauseAt && <p><strong>Thời điểm cân nhắc tạm ngưng nhận đơn:</strong> {data.suggestedPauseAt}</p>}
          </div>
          {data.history.length > 0 && (
            <details className="kitchen-forecast__history">
              <summary>Lịch sử trung bình theo giờ ({data.history.length} giờ)</summary>
              <div className="kitchen-forecast__table-wrap"><table className="data"><thead><tr><th>Giờ</th><th className="right">Đơn trung bình</th><th className="right">Món trung bình</th><th className="right">Tải trung bình</th></tr></thead>
                <tbody>{data.history.map(row => <tr key={row.hour}><td>{row.hour}</td><td className="right num">{row.averageOrders}</td><td className="right num">{row.averagePortions}</td><td className="right num">{row.averageLoadPercent}%</td></tr>)}</tbody></table></div>
            </details>
          )}
          <p className="kitchen-forecast__note">{data.dataNote}</p>
        </>
      )}
    </section>
  )
}
