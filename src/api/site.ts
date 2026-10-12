import { get } from './client'

// ── Nav ──────────────────────────────────────────────────────────────────
export interface SiteNavItem {
  id: number
  label: string
  link: string
  order: number
  visible: boolean
}
export const getNav = () => get<SiteNavItem[]>('/site/nav')

// ── Hero ─────────────────────────────────────────────────────────────────
export type HeroMediaType = 'image' | 'slideshow' | 'video'

export interface HeroMedia {
  url: string
  public_id: string
  alt?: string
}

export interface HeroConfig {
  type: HeroMediaType
  media: HeroMedia[]
  overlay_opacity: number       // 0–1, default 0.45
  brand_name?: string           // optional override; fallback: wordmark
  badge_enabled: boolean
  badge_line1: string
  badge_line2: string
  description: string
  cta_text: string
  cta_link: string
}
export const getHero = () => get<HeroConfig>('/site/hero')

// ── Branches (used by nav dropdown + contact section) ───────────────────
export interface PublicBranch {
  id: number
  code: string
  name: string
  slug: string
  address?: string
  city?: string
  phone?: string
  email?: string
  lat?: number
  lng?: number
  google_maps_embed?: string
  hours?: { days: string; time: string }[]
}
export const getBranches = () => get<PublicBranch[]>('/public/branches')
