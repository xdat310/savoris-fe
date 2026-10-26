import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { HeroConfig, PublicBranch } from '../api/site'
import { getBranches, getMilestones, getPublicBranchPage, getPublicSite, type SiteMilestone } from '../api/site'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteAssistant } from '../components/site/SiteAssistant'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteContact } from '../components/site/SiteContact'
import { SiteHero } from '../components/site/SiteHero'
import { SiteTimeline } from '../components/site/SiteTimeline'
import { StorySections, type StorySectionItem } from '../components/site/StorySections'
import { applySeo } from '../lib/seo'

type CmsContent = {
  settings?: Record<string, unknown>
  branches?: Record<string, unknown>[]
  gallery?: Record<string, unknown>[]
  storySections?: StorySectionItem[]
}

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const [publicSite, setPublicSite] = useState<CmsContent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [directory, setDirectory] = useState<(PublicBranch & { imageUrl?: string; openNow?: boolean; estimatedWaitMinutes?: number })[]>([])
  const [milestones, setMilestones] = useState<SiteMilestone[]>([])

  useEffect(() => {
    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; setLoadError(true) }
    }, 90000)
    getPublicSite()
      .then((site) => setPublicSite(site as CmsContent))
      .catch(() => setLoadError(true))
      .finally(() => { settled = true; clearTimeout(timeout) })
  }, [])

  useEffect(() => { getMilestones().then(setMilestones).catch(() => setMilestones([])) }, [])

  useEffect(() => {
    const state = location.state as { homeScrollTarget?: string } | null
    const target = state?.homeScrollTarget ?? location.hash.slice(1)
    if (!target) return
    if (target === 'top') {
      window.scrollTo({ top: 0, left: 0 })
      navigate('/', { replace: true, state: null })
      return
    }
    const element = document.getElementById(target)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    navigate('/', { replace: true, state: null })
  }, [location.hash, location.key, location.state, navigate, directory.length])

  useEffect(() => {
    if (!publicSite) return
    const listed = Array.isArray(publicSite.branches) ? publicSite.branches : []
    setDirectory(listed.map(branch => ({
      ...branch,
      slug: String(branch.slug ?? ''),
      name: String(branch.name ?? ''),
    })).filter(branch => branch.slug) as (PublicBranch & { imageUrl?: string; openNow?: boolean; estimatedWaitMinutes?: number })[])
    Promise.all([getBranches().catch(() => []), ...listed.map(branch => branch.slug ? getPublicBranchPage(String(branch.slug)).catch(() => null) : Promise.resolve(null))]).then(([statuses, ...pages]) => {
      const statusRows = Array.isArray(statuses) ? statuses as PublicBranch[] : []
      setDirectory(listed.map((branch, index) => {
        const status = statusRows.find(row => Number(row.id) === Number(branch.id))
        const page = pages[index] as Awaited<ReturnType<typeof getPublicBranchPage>> | null
        return { ...branch, ...status, slug: String(branch.slug ?? ''), name: String(branch.name ?? ''), imageUrl: page?.page?.heroImage }
      }).filter(branch => branch.slug) as (PublicBranch & { imageUrl?: string; openNow?: boolean; estimatedWaitMinutes?: number })[])
    })
  }, [publicSite])

  useEffect(() => {
    const settings = publicSite?.settings ?? {}
    const branchSchemas = (publicSite?.branches ?? []).map((branch) => ({
      '@type': 'Restaurant',
      name: `Savoris · ${String(branch.name ?? '')}`,
      servesCuisine: 'Vietnamese',
      url: branch.slug ? `${window.location.origin}/chi-nhanh/${String(branch.slug)}` : window.location.origin,
      address: { '@type': 'PostalAddress', streetAddress: branch.address, addressLocality: branch.city, addressCountry: 'VN' },
      telephone: branch.phone,
    }))
    applySeo({ title: String(settings.seoTitle ?? ''), description: String(settings.seoDescription ?? ''),
      image: String(settings.heroImage ?? ''), url: window.location.href,
      jsonLd: branchSchemas.length ? { '@context': 'https://schema.org', '@graph': branchSchemas } : undefined })
  }, [publicSite])

  const branches = directory as PublicBranch[]
  const settings = publicSite?.settings ?? {}
  const cmsHero: HeroConfig = { type:'image', media: settings.heroImage ? [{ url: String(settings.heroImage), public_id: 'website-cms', alt: String(settings.heroAlt ?? '') }] : [], overlay_opacity:Number(settings.heroOverlayOpacity ?? .58),
    brand_name: String(settings.heroTitle ?? settings.siteName ?? 'SAVORIS'), description: String(settings.heroDescription ?? ''),
    badge_enabled: Boolean(settings.heroEyebrow ?? settings.brandLine), badge_line1: String(settings.heroEyebrow ?? settings.brandLine ?? ''), badge_line2:'', cta_text:'ĐẶT BÀN', cta_link:'/dat-ban',
  }
  const stories = Array.isArray(settings.storySections) ? (settings.storySections as StorySectionItem[]).slice(0,4) : null

  return (
    <div className="dc-site">
      <SiteHeader branches={branches} logoUrl={settings.logo ? String(settings.logo) : undefined} />
      <SiteHero config={cmsHero} />
      {loadError && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ marginBottom: '1rem' }}>Không tải được nội dung. Máy chủ có thể đang khởi động, vui lòng thử lại sau 1–2 phút.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}>Thử lại</button>
        </div>
      )}
      <div id="ve-chung-toi" className="home-about">
        <StorySections items={stories ?? []} id="cau-chuyen-savoris" />
        <SiteTimeline milestones={milestones} />
      </div>
      {branches.length > 0 && <section className="home-branches" id="chi-nhanh"><header><p>GẶP GỠ SAVORIS</p><h2>Các chi nhánh</h2><span>Những điểm hẹn ẩm thực trong lòng Hà Nội.</span></header><div className="home-branches__grid">{branches.slice(0,4).map(branch=><a className="home-branch-card" href={`/chi-nhanh/${branch.slug}`} key={branch.id}><div>{'imageUrl' in branch && branch.imageUrl && <img src={branch.imageUrl} alt={branch.name} loading="lazy"/>}<span className="home-branch-card__status">{branch.openNow === true ? 'Đang mở' : branch.openNow === false ? 'Đã đóng cửa' : 'Thông tin giờ mở cửa'}</span></div><h3>{branch.code} · {branch.name}</h3><p>{branch.city ?? branch.address}</p><span className="home-branch-card__link">Xem chi nhánh →</span></a>)}</div></section>}
      <SiteContact branches={branches} />
      <SiteFooter
        config={{
          facebook_url: String(settings.facebookUrl || 'https://www.facebook.com/savoris.vn'),
          instagram_url: String(settings.instagramUrl || 'https://www.instagram.com/savoris.vn/'),
          tiktok_url: String(settings.tiktokUrl || 'https://www.tiktok.com/@savoris.vn'),
        }}
      />
      <SiteAssistant />
    </div>
  )
}
