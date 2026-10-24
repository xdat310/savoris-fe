type SeoInput = { title?: string; description?: string; image?: string; url?: string; jsonLd?: unknown }

function meta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, key); document.head.append(tag) }
  tag.content = content
}

export function applySeo(input: SeoInput) {
  const title = input.title?.trim() || 'Savoris · Nhà hàng tại Hà Nội'
  const description = input.description?.trim() || 'Khám phá không gian, thực đơn và các chi nhánh Savoris tại Hà Nội.'
  document.title = title
  meta('meta[name="description"]', 'name', 'description', description)
  meta('meta[property="og:title"]', 'property', 'og:title', title)
  meta('meta[property="og:description"]', 'property', 'og:description', description)
  if (input.image) meta('meta[property="og:image"]', 'property', 'og:image', input.image)
  if (input.url) meta('meta[property="og:url"]', 'property', 'og:url', input.url)
  const old = document.getElementById('savoris-jsonld')
  old?.remove()
  if (input.jsonLd) {
    const script = document.createElement('script')
    script.id = 'savoris-jsonld'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(input.jsonLd)
    document.head.append(script)
  }
}
