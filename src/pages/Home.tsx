import { useEffect, useState } from 'react'
import type {
  HeroConfig, PublicBranch, SiteFooter as FooterData,
  SiteGalleryItem, SiteMilestone,
  SiteNavItem, SiteSection,
} from '../api/site'
import {
  getBranches, getFooterConfig,
  getGallery, getHero, getMilestones, getNav, getSections,
} from '../api/site'
import { SiteContact } from '../components/site/SiteContact'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteGallery } from '../components/site/SiteGallery'
import { SiteHero } from '../components/site/SiteHero'
import { SiteOrderModal } from '../components/site/SiteOrderModal'
import { SiteBookingModal } from '../components/site/SiteBookingModal'
import { SiteStory } from '../components/site/SiteStory'
import { SiteTimeline } from '../components/site/SiteTimeline'

export function Home() {
  const [nav, setNav] = useState<SiteNavItem[]>([])
  const [hero, setHero] = useState<HeroConfig | null>(null)
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [sections, setSections] = useState<SiteSection[]>([])
  const [gallery, setGallery] = useState<SiteGalleryItem[]>([])
  const [milestones, setMilestones] = useState<SiteMilestone[]>([])
  const [footer, setFooter] = useState<FooterData | null>(null)
  const [orderOpen, setOrderOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  useEffect(() => {
    getNav().then(setNav).catch(() => {})
    getHero().then(setHero).catch(() => {})
    getBranches().then(setBranches).catch(() => {})
    getSections().then(setSections).catch(() => {})
    getGallery().then(setGallery).catch(() => {})
    getMilestones().then(setMilestones).catch(() => {})
    getFooterConfig().then(setFooter).catch(() => {})
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="dc-site">
      <SiteHeader
        nav={nav}
        branches={branches}
        onOrderClick={() => setOrderOpen(true)}
        onBookClick={() => setBookingOpen(true)}
      />
      <SiteHero
        config={hero}
        onCtaClick={() => setOrderOpen(true)}
        onBookClick={() => setBookingOpen(true)}
      />
      <SiteStory sections={sections} />
      <SiteGallery items={gallery} />
      <SiteTimeline milestones={milestones} />
      <SiteContact branches={branches} />
      <SiteFooter
        config={footer}
        onReserveClick={() => setBookingOpen(true)}
        onScrollTo={scrollTo}
      />
      <SiteOrderModal open={orderOpen} onClose={() => setOrderOpen(false)} onBookClick={() => { setOrderOpen(false); setBookingOpen(true) }} />
      <SiteBookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} branches={branches} />
    </div>
  )
}
