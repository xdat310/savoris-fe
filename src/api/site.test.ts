import { describe, expect, it, vi } from 'vitest'
import { branchLabel, getPublicBranchPage, isCloudinaryImageUrl } from './site'

describe('isCloudinaryImageUrl', () => {
  it('accepts secure Cloudinary image delivery URLs only', () => {
    expect(isCloudinaryImageUrl('https://res.cloudinary.com/savoris/image/upload/v123/photo.webp')).toBe(true)
    expect(isCloudinaryImageUrl('http://res.cloudinary.com/savoris/image/upload/photo.png')).toBe(false)
    expect(isCloudinaryImageUrl('https://example.com/photo.png')).toBe(false)
    expect(isCloudinaryImageUrl('')).toBe(false)
  })
})

describe('branchLabel', () => {
  it('combines the branch code with its clean district name', () => {
    expect(branchLabel({ code: 'CN01', name: 'Hoàn Kiếm' })).toBe('CN01 · Hoàn Kiếm')
  })
})

describe('getPublicBranchPage', () => {
  it('defaults optional public lists omitted by the API to empty arrays', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      branch: { id: 1, code: 'CN01', name: 'Hoàn Kiếm', slug: 'hoan-kiem' },
      page: { introduction: 'Ẩm thực Việt đương đại' },
      gallery: [],
      openingHours: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    const result = await getPublicBranchPage('hoan-kiem')

    expect(result.gallery).toEqual([])
    expect(result.openingHours).toEqual([])
  })
})
