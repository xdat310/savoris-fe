import { describe, expect, it } from 'vitest'
import type { SiteGalleryItem } from '../../api/site'
import { uniqueGalleryItems } from './SiteGallery'

const item = (id: number, image_url: string, order: number): SiteGalleryItem => ({
  id,
  image_url,
  public_id: image_url,
  caption: String(id),
  order,
})

describe('uniqueGalleryItems', () => {
  it('keeps one earliest item per non-empty image URL and sorts by order', () => {
    expect(uniqueGalleryItems([
      item(2, '/b.jpg', 2),
      item(3, '/a.jpg', 3),
      item(1, '/b.jpg', 1),
      item(4, '', 4),
    ])).toEqual([item(1, '/b.jpg', 1), item(3, '/a.jpg', 3)])
  })

  it('deduplicates Cloudinary transformations and excludes images already used above', () => {
    const transformed = (url: string) => item(5, url, 1)
    expect(uniqueGalleryItems([
      transformed('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/menu.jpg'),
      transformed('https://res.cloudinary.com/demo/image/upload/w_800/v123/menu.jpg'),
      item(6, 'https://res.cloudinary.com/demo/image/upload/v123/story.jpg', 2),
    ], ['https://res.cloudinary.com/demo/image/upload/w_1200/v123/story.jpg'])).toEqual([
      transformed('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/menu.jpg'),
    ])
  })

  it('returns no invented images when the CMS has no gallery content', () => {
    expect(uniqueGalleryItems(undefined)).toEqual([])
    expect(uniqueGalleryItems([])).toEqual([])
  })
})
