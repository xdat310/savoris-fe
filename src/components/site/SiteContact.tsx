import { Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import type { PublicBranch } from '../../api/site'

const SEED: PublicBranch[] = [
  {
    id: 1, code: 'HK', name: 'Savoris Hoàn Kiếm', slug: 'hoan-kiem',
    address: 'Tầng 5, 76 Đinh Tiên Hoàng, Hoàn Kiếm', city: 'Hà Nội',
    phone: '024 3825 7600', email: 'hoankiem@savoris.vn',
    google_maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.0966938066247!2d105.84896731490147!3d21.02784768599617!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab9bd9861ca1%3A0xe7887f7b72ca17a9!2zTMO9IFThu6duZyBU4buVLCBIb8OgbiBLaeG6v20sIEjDoCBO4buZaSwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1621234567890!5m2!1svi!2s',
    hours: [
      { days: 'Thứ 2 – Thứ 6', time: '11:00 – 22:00' },
      { days: 'Thứ 7 – Chủ nhật', time: '10:00 – 22:30' },
    ],
  },
  {
    id: 2, code: 'TH', name: 'Savoris Tây Hồ', slug: 'tay-ho',
    address: '38 Đặng Thai Mai, Quảng An, Tây Hồ', city: 'Hà Nội',
    phone: '024 3718 4400', email: 'tayho@savoris.vn',
    hours: [
      { days: 'Thứ 2 – Thứ 6', time: '11:00 – 22:00' },
      { days: 'Thứ 7 – Chủ nhật', time: '09:30 – 23:00' },
    ],
  },
  {
    id: 3, code: 'Q1', name: 'Savoris Quận 1', slug: 'quan-1',
    address: 'Tầng 3, 29 Lê Duẩn, Bến Nghé, Quận 1', city: 'TP. Hồ Chí Minh',
    phone: '028 3822 9900', email: 'quan1@savoris.vn',
    hours: [
      { days: 'Hàng ngày', time: '10:30 – 23:00' },
    ],
  },
  {
    id: 4, code: 'DN', name: 'Savoris Sơn Trà', slug: 'son-tra',
    address: '112 Võ Nguyên Giáp, Mân Thái, Sơn Trà', city: 'Đà Nẵng',
    phone: '0236 3655 800', email: 'sontra@savoris.vn',
    hours: [
      { days: 'Thứ 2 – Thứ 6', time: '11:00 – 22:30' },
      { days: 'Thứ 7 – Chủ nhật', time: '10:00 – 23:00' },
    ],
  },
]

interface Props { branches?: PublicBranch[] }

export function SiteContact({ branches }: Props) {
  const data = branches && branches.length > 0 ? branches : SEED
  const [activeId, setActiveId] = useState(data[0]?.id)
  const branch = data.find((b) => b.id === activeId) ?? data[0]

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
            {b.name}
          </button>
        ))}
      </div>

      {branch && (
        <div className="ctt-body">
          {/* Map */}
          <div className="ctt-map">
            {branch.google_maps_embed ? (
              <iframe
                title={`Bản đồ ${branch.name}`}
                src={branch.google_maps_embed}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="ctt-map-ph" aria-hidden="true">
                <MapPin size={32} />
                <span>Bản đồ đang cập nhật</span>
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
