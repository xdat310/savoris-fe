import { useEffect, useState } from 'react'
import type { HeroConfig, PublicBranch, SiteNavItem } from '../api/site'
import { getBranches, getHero, getNav } from '../api/site'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteHero } from '../components/site/SiteHero'

export function Home() {
  const [nav, setNav] = useState<SiteNavItem[]>([])
  const [hero, setHero] = useState<HeroConfig | null>(null)
  const [branches, setBranches] = useState<PublicBranch[]>([])

  useEffect(() => {
    getNav().then(setNav).catch(() => {})
    getHero().then(setHero).catch(() => {})
    getBranches().then(setBranches).catch(() => {})
  }, [])

  return (
    <div className="dc-site">
      <SiteHeader nav={nav} branches={branches} />
      <SiteHero config={hero} />

      {/* Sections will be added below — story, timeline, gallery, founder, contact, footer */}
      <div style={{ minHeight: '100vh', background: 'var(--dc-bg-alt)' }} />
    </div>
  )
}
