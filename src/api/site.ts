import { del, get, post, put, upload } from './client'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
export const mediaUrl = (url?: string) => {
  if (!url) return ''
  return url.startsWith('/api/v1/') ? `${API_BASE}${url.slice('/api/v1'.length)}` : url
}

export interface SiteBranchPage {
  branch: PublicBranch
  page: Record<string, string>
  offers: Record<string, unknown>[]
  gallery: Record<string, unknown>[]
  accolades: Record<string, unknown>[]
  testimonials: Record<string, unknown>[]
  menus: Record<string, unknown>[]
  openingHours: { weekday: number; opens_at?: string; closes_at?: string; closed: boolean }[]
}

export const getPublicSite = () => get<Record<string, unknown>>('/public/site')
export const getPublicBranchPage = (slug: string) => get<SiteBranchPage>(`/public/branches/${slug}`)
export const getWebsiteCms = () => get<Record<string, any>>('/admin/website')
export const saveWebsiteSettings = (payload: Record<string, unknown>) => put('/admin/website/settings', payload)
export const saveBranchPage = (branchId: number, payload: Record<string, unknown>) => put(`/admin/website/branches/${branchId}`, payload)
export const createWebsiteItem = (resource: string, payload: Record<string, unknown>) => post<Record<string, any>>(`/admin/website/${resource}`, payload)
export const updateWebsiteItem = (resource: string, id: number, payload: Record<string, unknown>) => put(`/admin/website/${resource}/${id}`, payload)
export const deleteWebsiteItem = (resource: string, id: number) => del(`/admin/website/${resource}/${id}`)
export const reorderWebsiteItems = (resource: string, ids: number[]) => put(`/admin/website/${resource}/order`, ids)
export async function uploadWebsiteMedia(file: File, alt: string) {
  const form = new FormData(); form.append('file', file)
  const result = await post<{ url: string }>('/images/site', form)
  return { url: result.url, alt }
}

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
export interface HeroMedia { url: string; public_id: string; alt?: string }
export interface HeroConfig {
  type: HeroMediaType
  media: HeroMedia[]
  overlay_opacity: number
  brand_name?: string
  badge_enabled: boolean
  badge_line1: string
  badge_line2: string
  description: string
  cta_text: string
  cta_link: string
}
export const getHero = () => get<HeroConfig>('/site/hero')

// ── Story sections ────────────────────────────────────────────────────────
export interface SiteSection {
  id: number
  image_url: string
  public_id: string
  image_alt?: string
  title: string
  body: string
  link_text?: string
  link_url?: string
  image_side: 'left' | 'right'
  order: number
  visible: boolean
}
export const getSections = () => get<SiteSection[]>('/site/sections')

// ── Milestones ────────────────────────────────────────────────────────────
export interface SiteMilestone {
  id: number
  year: string
  title: string
  description: string
  order: number
}
export const getMilestones = () => get<SiteMilestone[]>('/site/milestones')

// ── Gallery ───────────────────────────────────────────────────────────────
export interface SiteGalleryItem {
  id: number
  image_url: string
  public_id: string
  caption?: string
  order: number
}
export const getGallery = () => get<SiteGalleryItem[]>('/site/gallery')

// ── Order modal (service-type cards) ─────────────────────────────────────
export interface SiteOrderCard {
  bg_url: string
  title: string
  description: string
}
export interface SiteOrderConfig {
  dine_in: SiteOrderCard
  takeaway: SiteOrderCard
}
export const getOrderConfig = () => get<SiteOrderConfig>('/site/order-config')

// ── Branches (nav dropdown + contact section) ─────────────────────────────
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
  acceptingTakeaway?: boolean
}
export const getBranches = () => get<PublicBranch[]>('/public/branches')

// ── Footer ────────────────────────────────────────────────────────────────
export interface SiteFooter {
  facebook_url?: string
  instagram_url?: string
  tiktok_url?: string
  copyright?: string
}
export const getFooterConfig = () => get<SiteFooter>('/site/footer')

// ── Menu (public) ─────────────────────────────────────────────────────────
export interface PublicDish {
  id: number
  name: string
  description?: string
  price: number
  imageUrl?: string
  categoryId: number
  featured: boolean
  available: boolean
}
export interface PublicCategory { id: number; name: string; order: number }
export interface PublicMenu {
  categories: PublicCategory[]
  dishes: PublicDish[]
  vatPercent?: number
}
export const getPublicMenu = (branchSlug?: string) =>
  get<PublicMenu>(`/public/menu${branchSlug ? `?branch=${branchSlug}` : ''}`)

// ── Site-wide config fetch (admin CMS bulk load) ──────────────────────────
export const getAllSiteConfig = () => get<Record<string, unknown>>('/site/all')

// ── CMS PUT (ADMIN only) ──────────────────────────────────────────────────
export const updateHero        = (body: HeroConfig)        => put<HeroConfig>('/site/hero', body)
export const updateSections    = (body: SiteSection[])     => put<SiteSection[]>('/site/sections', body)
export const updateMilestones  = (body: SiteMilestone[])   => put<SiteMilestone[]>('/site/milestones', body)
export const updateGallery     = (body: SiteGalleryItem[]) => put<SiteGalleryItem[]>('/site/gallery', body)
export const updateOrderConfig = (body: SiteOrderConfig)   => put<SiteOrderConfig>('/site/order-config', body)
export const updateFooter      = (body: SiteFooter)        => put<SiteFooter>('/site/footer', body)
export const updateNav         = (body: SiteNavItem[])     => put<SiteNavItem[]>('/site/nav', body)

// ── Image upload (admin, to Cloudinary via backend) ───────────────────────
export const uploadSiteImage = (file: File) =>
  upload<{ url: string }>('/images/site', file, 'POST')
