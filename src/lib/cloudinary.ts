const CLOUDINARY_TRANSFORM_PREFIX = /^(?:a|b|c|dpr|e|f|fl|g|h|l|o|q|r|t|w|x|y|z|ar|br|co|cs|dl|dn|du|eo|ki|sp|so|u)_[^/]+$/i

/** Replace existing Cloudinary delivery transforms instead of stacking new ones. */
export function cloudinaryDeliveryUrl(source: string, transform: string): string {
  if (!source.includes('cloudinary.com')) return source

  const suffixAt = source.search(/[?#]/)
  const pathname = suffixAt < 0 ? source : source.slice(0, suffixAt)
  const suffix = suffixAt < 0 ? '' : source.slice(suffixAt)
  const marker = '/image/upload/'
  const uploadAt = pathname.indexOf(marker)
  if (uploadAt < 0) return source

  const parts = pathname.slice(uploadAt + marker.length).split('/')
  while (parts.length > 1 && (parts[0].includes(',') || CLOUDINARY_TRANSFORM_PREFIX.test(parts[0]))) {
    parts.shift()
  }

  return `${pathname.slice(0, uploadAt + marker.length)}${transform}/${parts.join('/')}${suffix}`
}
