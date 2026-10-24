import { describe, expect, it } from 'vitest'
import { isCloudinaryImageUrl } from './site'

describe('isCloudinaryImageUrl', () => {
  it('accepts secure Cloudinary image delivery URLs only', () => {
    expect(isCloudinaryImageUrl('https://res.cloudinary.com/savoris/image/upload/v123/photo.webp')).toBe(true)
    expect(isCloudinaryImageUrl('http://res.cloudinary.com/savoris/image/upload/photo.png')).toBe(false)
    expect(isCloudinaryImageUrl('https://example.com/photo.png')).toBe(false)
    expect(isCloudinaryImageUrl('')).toBe(false)
  })
})
