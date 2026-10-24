import { Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import type { PublicBranch } from '../../api/site'

interface Props { branches?: PublicBranch[] }

export function SiteContact({ branches }: Props) {
  const seen = new Set<string>()
  const data = (branches ?? []).filter((branch) => {
    const key = String(branch.code || branch.slug || branch.id).trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const [activeId, setActiveId] = useState(data[0]?.id)
  const branch = data.find((b) => b.id === activeId) ?? data[0]
  if (data.length === 0) return null
  const mapQuery = branch
    ? branch.lat != null && branch.lng != null
      ? `${branch.lat},${branch.lng}`
      : [branch.address, branch.city].filter(Boolean).join(', ')
    : ''
  const mapSrc = branch?.google_maps_embed?.trim() || (mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : '')

  return (
    <section className="ctt-wrap" id="lien-he" aria-label="Liên hệ & Chi nhánh">
      <h2 className="ctt-title">Liên hệ</h2>

      {/* Branch tabs */}
      <div className="ctt-tabs" role="tablist">
        {data.map((b) => (
          <button
            key={b.id}
            role="tab"
            className={`ctt-tab${b.id === activeId ? ' ctt-tab--on' : ''}`}
            aria-selected={b.id === activeId}
            onClick={() => setActiveId(b.id)}
          >
            {b.code ? `${b.code} · ` : ''}{b.name}
          </button>
        ))}
      </div>

      {branch && (
        <div className="ctt-body">
          {/* Map */}
          <div className="ctt-map">
            {mapSrc ? (
              <iframe
                title={`Bản đồ ${branch.name}`}
                src={mapSrc}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="ctt-map-ph" aria-hidden="true">
                <MapPin size={32} />
                <span>Chưa có địa chỉ bản đồ</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="ctt-info">
            <h3 className="ctt-branch-name">{branch.name}</h3>
            {branch.address && (
              <p className="ctt-address">
                <span className="ctt-gold">{branch.address}</span>
                {branch.city ? `, ${branch.city}` : ''}
              </p>
            )}

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

            {branch.hours && branch.hours.length > 0 && (
              <div className="ctt-hours">
                <p className="ctt-group-label">Giờ mở cửa</p>
                {branch.hours.map((h, i) => (
                  <div key={i} className="ctt-hour-row">
                    <span>{h.days}</span>
                    <span className="ctt-gold">{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
