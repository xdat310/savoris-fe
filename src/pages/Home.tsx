import { useEffect, useState } from 'react'
import type {
  HeroConfig, PublicBranch, SiteGalleryItem,
  SiteMilestone, SiteNavItem, SiteSection,
} from '../api/site'
import { getHero, getMilestones, getNav, getPublicSite, getSections } from '../api/site'
import { get } from '../api/client'
import type { GuestMenuCategory, BranchMenuItemResponse } from '../api/types'
import { SiteContact } from '../components/site/SiteContact'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteGallery } from '../components/site/SiteGallery'
import { SiteHero } from '../components/site/SiteHero'
import { SiteStory } from '../components/site/SiteStory'
import { SiteTimeline } from '../components/site/SiteTimeline'
import { SiteCmsHighlights, type FeaturedDish } from '../components/site/SiteCmsHighlights'
import { applySeo } from '../lib/seo'

type CmsContent = {
  settings?: Record<string, unknown>
  branches?: Record<string, unknown>[]
  gallery?: Record<string, unknown>[]
  offers?: Record<string, unknown>[]
  accolades?: Record<string, unknown>[]
  testimonials?: Record<string, unknown>[]
  menus?: Record<string, unknown>[]
}

export function Home() {
  const [nav, setNav] = useState<SiteNavItem[]>([])
  const [hero, setHero] = useState<HeroConfig | null>(null)
  const [sections, setSections] = useState<SiteSection[]>([])
  const [milestones, setMilestones] = useState<SiteMilestone[]>([])
  const [publicSite, setPublicSite] = useState<CmsContent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [featuredDishes, setFeaturedDishes] = useState<FeaturedDish[]>([])

  useEffect(() => {
    getNav().then((items) => setNav(items ?? [])).catch(() => {})
    getHero().then(setHero).catch(() => {})
    getSections().then((items) => setSections(items ?? [])).catch(() => {})
    getMilestones().then((items) => setMilestones(items ?? [])).catch(() => {})
    get<{ categories?: GuestMenuCategory[]; dishes?: BranchMenuItemResponse[] }>('/public/menu')
      .then((data) => setFeaturedDishes(data.dishes?.filter((d) => d.imageUrl) ?? []))
      .catch(() => {})

    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; setLoadError(true) }
    }, 90000)
    getPublicSite()
      .then((site) => setPublicSite(site as CmsContent))
      .catch(() => setLoadError(true))
      .finally(() => { settled = true; clearTimeout(timeout) })
  }, [])

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
      image: String(settings.heroImage ?? hero?.media?.[0]?.url ?? ''), url: window.location.href,
      jsonLd: branchSchemas.length ? { '@context': 'https://schema.org', '@graph': branchSchemas } : undefined })
  }, [publicSite, hero])

  const branches = (publicSite?.branches ?? []) as unknown as PublicBranch[]
  const gallery: SiteGalleryItem[] = (publicSite?.gallery ?? []).map((item) => ({
    id: Number(item.id),
    image_url: String(item.image_url ?? ''),
    public_id: '',
    caption: String(item.alt ?? ''),
    order: Number(item.sort_order ?? 0),
  }))
  const menuHref = branches[0]?.slug ? `/chi-nhanh/${branches[0].slug}/thuc-don` : '#thuc-don'

  return (
    <div className="dc-site">
      <SiteHeader nav={nav} branches={branches} />
      <SiteHero config={hero} menuHref={menuHref} />
      {loadError && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ marginBottom: '1rem' }}>Không tải được nội dung. Máy chủ có thể đang khởi động, vui lòng thử lại sau 1–2 phút.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}>Thử lại</button>
        </div>
      )}
      <SiteStory sections={sections} />
      <SiteCmsHighlights
        offers={publicSite?.offers ?? []}
        accolades={publicSite?.accolades ?? []}
        testimonials={publicSite?.testimonials ?? []}
        menus={publicSite?.menus ?? []}
        branches={(publicSite?.branches ?? []) as { id?: number; name?: string; slug?: string }[]}
        featuredDishes={featuredDishes}
      />
      <SiteGallery items={gallery} excludedUrls={[
        ...(hero?.media ?? []).map((media) => media.url),
        ...sections.map((section) => section.image_url),
      ]} />
      <SiteTimeline milestones={milestones} />
      <SiteContact branches={branches} />
      <SiteFooter
        config={{
          facebook_url: String(publicSite?.settings?.facebookUrl ?? ''),
          instagram_url: String(publicSite?.settings?.instagramUrl ?? ''),
          tiktok_url: String(publicSite?.settings?.tiktokUrl ?? ''),
        }}
        menuHref={menuHref}
      />
    </div>
  )
}
