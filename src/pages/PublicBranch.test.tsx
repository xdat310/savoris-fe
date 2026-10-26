import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../api/client'
import { getBranches, getPublicBranchPage, getPublicSite } from '../api/site'
import { PublicBranch } from './PublicBranch'

vi.mock('../api/client', async () => ({ ...(await vi.importActual<typeof import('../api/client')>('../api/client')), get: vi.fn() }))
vi.mock('../api/site', async () => ({ ...(await vi.importActual<typeof import('../api/site')>('../api/site')), getBranches: vi.fn(), getPublicBranchPage: vi.fn(), getPublicSite: vi.fn() }))

describe('PublicBranch optional CMS lists', () => {
  beforeEach(() => {
    vi.mocked(get).mockResolvedValue({ categories: undefined, menu: undefined } as never)
    vi.mocked(getPublicSite).mockResolvedValue({ settings: {}, branches: [], gallery: [] })
    vi.mocked(getBranches).mockResolvedValue([])
    vi.mocked(getPublicBranchPage).mockResolvedValue({
      branch: { id: 1, code: 'CN01', name: 'Hoàn Kiếm', slug: 'hoan-kiem' },
      page: { introduction: 'Một trải nghiệm ẩm thực Việt đương đại.' },
    } as never)
  })

  it('renders a public branch if gallery, hours, menu, and removed lists are absent', async () => {
    render(<MemoryRouter initialEntries={['/chi-nhanh/hoan-kiem']}><Routes><Route path="/chi-nhanh/:slug" element={<PublicBranch/>}/></Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'CN01 · Hoàn Kiếm' }).length).toBeGreaterThan(0))
    expect(screen.getByText('Một trải nghiệm ẩm thực Việt đương đại.')).toBeInTheDocument()
    expect(screen.queryByText('Giải thưởng')).toBeNull()
  })
})
