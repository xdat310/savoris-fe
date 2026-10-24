import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { branchLabel, type PublicBranch } from '../../api/site'

interface Props { branches?: PublicBranch[] }

function locationKey(branch: PublicBranch) {
  return [branch.name, branch.address, branch.city]
    .map((part) => part?.trim().toLocaleLowerCase('vi'))
    .join('|')
}

function mapQuery(branch: PublicBranch) {
  return branch.lat != null && branch.lng != null
    ? `${branch.lat},${branch.lng}`
    : [branch.address, branch.city].filter(Boolean).join(', ')
}

export function SiteContact({ branches }: Props) {
  const seen = new Set<string>()
  const data = (branches ?? []).filter((branch) => {
    const key = locationKey(branch)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const [activeId, setActiveId] = useState(data[0]?.id)
  const branch = data.find((item) => item.id === activeId) ?? data[0]
  if (data.length === 0 || !branch) return null

  const query = mapQuery(branch)
  const mapSrc = branch.google_maps_embed?.trim() ||
    (query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : '')
  const mapLink = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : ''

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
                  <span className="ctt-location-address">{[item.address, item.city].filter(Boolean).join(', ')}</span>
                  {item.hours?.map((hours, index) => <span className="ctt-location-hours" key={index}>{hours.days}: {hours.time}</span>)}
                </button>
                {item.phone && <a className="ctt-location-call" href={`tel:${item.phone.replace(/\s/g, '')}`}><Phone size={13} aria-hidden="true"/> Gọi {item.phone}</a>}
              </div>
            ))}
          </div>

          {mapLink && (
            <a className="ctt-link ctt-map-link" href={mapLink} target="_blank" rel="noreferrer">
              <MapPin size={14} aria-hidden="true" /> Xem trên Google Maps
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}

          {(branch.phone || branch.email) && (
            <div className="ctt-contact-links">
              <p className="ctt-group-label">Liên hệ</p>
              {branch.phone && (
                <a className="ctt-link" href={`tel:${branch.phone.replace(/\s/g, '')}`}>
                  <Phone size={14} aria-hidden="true" /> {branch.phone}
                </a>
              )}
              {branch.email && (
                <a className="ctt-link" href={`mailto:${branch.email}`}>
                  <Mail size={14} aria-hidden="true" /> {branch.email}
                </a>
              )}
            </div>
          )}

          {branch.hours && branch.hours.length > 0 && (
            <div className="ctt-hours">
              <p className="ctt-group-label">Giờ mở cửa</p>
              {branch.hours.map((hours, index) => (
                <div key={index} className="ctt-hour-row">
                  <span>{hours.days}</span><span className="ctt-gold">{hours.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
