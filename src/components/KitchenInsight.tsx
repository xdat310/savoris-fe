import { RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, get } from '../api/client'
import type { KitchenForecastResponse } from '../api/types'
import { Icon } from './ui/Icon'

const INSIGHT_TIMEOUT_MS = 10_000

export function KitchenInsight({ branchId }: { branchId: number }) {
  const [data, setData] = useState<KitchenForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setUnavailable(false)
    let timeoutId: number | undefined
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Kitchen insight timed out')), INSIGHT_TIMEOUT_MS)
      })
      setData(await Promise.race([
        get<KitchenForecastResponse>(`/kitchen/branches/${branchId}/insight`),
        timeout,
      ]))
    } catch (cause) {
      setUnavailable(true)
      if (cause instanceof ApiError) setData(null)
    } finally {
      if (timeoutId != null) window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => { void refresh() }, [refresh])

  if (unavailable) return null

  return (
    <aside className="kds-insight" aria-live="polite" aria-label="AI Kitchen Insight">
      <div className="kds-insight__head">
        <span><Icon icon={Sparkles} size={16} /> AI Kitchen Insight</span>
        <button className="kds-insight__refresh" type="button" onClick={() => void refresh()} disabled={loading} aria-label="Phân tích lại tình trạng bếp">
          <Icon icon={RefreshCw} size={15} />
        </button>
      </div>
      {loading && !data ? <p className="kds-insight__copy">Đang phân tích tình trạng bếp…</p>
        : data ? <>
          <p className="kds-insight__copy">{data.alert}</p>
          {data.actions[0] && <p className="kds-insight__action"><strong>Ưu tiên</strong>{data.actions[0]}</p>}
        </> : null}
    </aside>
  )
}
