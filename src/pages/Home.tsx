import { useEffect, useState } from 'react'
import type {
  HeroConfig, PublicBranch, SiteFooter as FooterData,
  SiteGalleryItem, SiteMilestone,
  SiteNavItem, SiteSection,
} from '../api/site'
import { getPublicSite } from '../api/site'
import {
  getBranches, getFooterConfig,
  getGallery, getHero, getMilestones, getNav, getSections,
} from '../api/site'
import { SiteContact } from '../components/site/SiteContact'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteGallery } from '../components/site/SiteGallery'
import { SiteHero } from '../components/site/SiteHero'
import { SiteStory } from '../components/site/SiteStory'
import { SiteTimeline } from '../components/site/SiteTimeline'
import { SiteCmsHighlights } from '../components/site/SiteCmsHighlights'
import { applySeo } from '../lib/seo'

type CmsContent = { settings?: Record<string, unknown>; branches?: Record<string, unknown>[]; offers?: Record<string, unknown>[]; accolades?: Record<string, unknown>[]; testimonials?: Record<string, unknown>[]; menus?: Record<string, unknown>[] }

export function Home() {
  const [nav, setNav] = useState<SiteNavItem[]>([])
  const [hero, setHero] = useState<HeroConfig | null>(null)
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [sections, setSections] = useState<SiteSection[]>([])
  const [gallery, setGallery] = useState<SiteGalleryItem[]>([])
  const [milestones, setMilestones] = useState<SiteMilestone[]>([])
  const [footer, setFooter] = useState<FooterData | null>(null)
  const [publicSite, setPublicSite] = useState<CmsContent | null>(null)

  useEffect(() => {
    getNav().then((items) => setNav(items ?? [])).catch(() => {})
    getHero().then(setHero).catch(() => {})
    getBranches().then((items) => setBranches(items ?? [])).catch(() => {})
    getSections().then((items) => setSections(items ?? [])).catch(() => {})
    getGallery().then((items) => setGallery(items ?? [])).catch(() => {})
    getMilestones().then((items) => setMilestones(items ?? [])).catch(() => {})
    getFooterConfig().then(setFooter).catch(() => {})
    getPublicSite().then((site) => setPublicSite(site as CmsContent)).catch(() => {})
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

  const menuHref = branches[0]?.slug ? `/chi-nhanh/${branches[0].slug}/thuc-don` : '#thuc-don'

  return (
    <div className="dc-site">
      <SiteHeader
        nav={nav}
        branches={branches}
      />
      <SiteHero
        config={hero}
        menuHref={menuHref}
      />
      <SiteStory sections={sections} />
      <SiteCmsHighlights offers={publicSite?.offers ?? []} accolades={publicSite?.accolades ?? []}
        testimonials={publicSite?.testimonials ?? []} menus={publicSite?.menus ?? []}
        branches={(publicSite?.branches ?? []) as { id?: number; name?: string; slug?: string }[]} />
      <SiteGallery items={gallery} excludedUrls={[
        ...(hero?.media ?? []).map((media) => media.url),
        ...sections.map((section) => section.image_url),
      ]} />
      <SiteTimeline milestones={milestones} />
      <SiteContact branches={branches} />
      <SiteFooter
        config={{ ...footer,
          facebook_url: publicSite ? String(publicSite.settings?.facebookUrl ?? '') : footer?.facebook_url,
          instagram_url: publicSite ? String(publicSite.settings?.instagramUrl ?? '') : footer?.instagram_url,
          tiktok_url: publicSite ? String(publicSite.settings?.tiktokUrl ?? '') : footer?.tiktok_url,
        }}
        menuHref={menuHref}
      />
    </div>
  )
}
