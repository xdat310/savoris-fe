import { MapPin, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { branchLabel, formatBranchAddress, formatBranchPhone, type PublicBranch } from '../../api/site'

interface Props { branches?: PublicBranch[] }

function locationKey(branch: PublicBranch) {
  return [branch.name, branch.address, branch.city]
    .map((part) => part?.trim().toLocaleLowerCase('vi'))
    .join('|')
}

function mapQuery(branch: PublicBranch) {
  const latitude = branch.latitude ?? branch.lat
  const longitude = branch.longitude ?? branch.lng
  return latitude != null && longitude != null
    ? `${latitude},${longitude}`
    : [branch.address, branch.city].filter(Boolean).join(', ')
}

const weekdayOrder: Record<string, number> = {
  'Thứ Hai': 1, 'Thứ Ba': 2, 'Thứ Tư': 3, 'Thứ Năm': 4,
  'Thứ Sáu': 5, 'Thứ Bảy': 6, 'Chủ Nhật': 7,
}

function shortDay(day: number) {
  return day === 7 ? 'CN' : `T${day + 1}`
}

function shortTime(time: string) {
  return time.replace(/\b(\d{1,2}):00\s*[–-]\s*(\d{1,2}):00\b/, '$1–$2h')
}

function compactHours(hours: NonNullable<PublicBranch['hours']>) {
  const sorted = hours.map((item, index) => ({ ...item, index, day: weekdayOrder[item.days] }))
    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || a.index - b.index)

  return sorted.reduce<{ days: string; time: string; startDay?: number; endDay?: number }[]>((ranges, item) => {
    const previous = ranges[ranges.length - 1]
    if (item.day && previous?.endDay === item.day - 1 && previous.time === item.time) {
      previous.endDay = item.day
      previous.days = `${shortDay(previous.startDay!)}–${shortDay(item.day)}`
    } else {
      ranges.push({
        days: item.day ? shortDay(item.day) : item.days,
        time: item.time,
        startDay: item.day,
        endDay: item.day,
      })
    }
    return ranges
  }, []).map(range => ({ ...range, time: shortTime(range.time) }))
}

export function SiteContact({ branches }: Props) {
  const seen = new Set<string>()
  const data = (branches ?? []).filter((branch) => {
    const key = locationKey(branch)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const [activeId, setActiveId] = useState<number | undefined>(data[0]?.id)
  useEffect(() => { setActiveId((prev) => prev ?? data[0]?.id) }, [data[0]?.id])
  const branch = data.find((item) => item.id === activeId) ?? data[0]
  if (data.length === 0 || !branch) return null

  const query = mapQuery(branch)
  const hasCoordinates = (branch.latitude ?? branch.lat) != null && (branch.longitude ?? branch.lng) != null
  const mapSrc = (!hasCoordinates ? branch.google_maps_embed?.trim() : '') ||
    (query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed` : '')

  return (
    <section className="ctt-wrap" id="lien-he" aria-label="Liên hệ và địa chỉ nhà hàng">
      <h2 className="ctt-title">Ghé thăm Savoris</h2>

      <div className="ctt-body">
        <div className="ctt-map">
          {mapSrc ? (
            <iframe
              title={`Bản đồ ${branchLabel(branch)}`}
              src={mapSrc}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="ctt-map-ph" aria-hidden="true">
              <MapPin size={32} />
              <span>Chưa có địa chỉ bản đồ</span>
            </div>
          )}
        </div>

        <div className="ctt-info">
          <p className="ctt-group-label">Các địa chỉ</p>
          <div className="ctt-location-list" aria-label="Danh sách địa chỉ chi nhánh">
            {data.map((item) => (
              <div className="ctt-location-card" key={item.id}>
                <button
                  type="button"
                  className={`ctt-location${item.id === branch.id ? ' ctt-location--active' : ''}`}
                  aria-pressed={item.id === branch.id}
                  onClick={() => setActiveId(item.id)}
                >
                  <span className="ctt-location-name">{branchLabel(item)}</span>
                  <span className="ctt-location-address">{formatBranchAddress(item.address, item.city)}</span>
                  {item.hours && compactHours(item.hours).map((hours, index) => <span className="ctt-location-hours" key={index}>{hours.days}: {hours.time}</span>)}
                </button>
                {item.phone && <a className="ctt-location-call" href={`tel:${item.phone.replace(/\D/g, '')}`}><Phone size={13} aria-hidden="true"/> Gọi {formatBranchPhone(item.phone)}</a>}
                {item.slug && <Link className="ctt-location-call" to={`/chi-nhanh/${item.slug}`}>Xem chi nhánh</Link>}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
