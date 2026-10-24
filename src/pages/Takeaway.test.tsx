import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useData } from '../lib/useData'
import { Takeaway } from './Takeaway'

vi.mock('../api/client', () => ({ ApiError: class extends Error {}, get: vi.fn(), post: vi.fn() }))
vi.mock('../lib/useData', () => ({ useData: vi.fn() }))
vi.mock('../lib/geo', () => ({
  byDistance: (items: unknown[]) => items.map((item) => ({ item, km: null })),
  formatKm: () => '',
  useMyLocation: () => ({ state: { status: 'idle' }, ask: vi.fn() }),
}))

const branches = [{ id: 1, code: 'CN01', name: 'Hoàn Kiếm', address: 'Số 1 phố Mẫu', acceptingTakeaway: true }]

describe('Takeaway branch URL', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useData).mockImplementation(((_load: unknown, deps: unknown[]) => deps.length === 0
      ? { data: branches, loading: false, error: null, reload: vi.fn() }
      : { data: { categories: [], menu: [] }, loading: false, error: null, reload: vi.fn() }) as never)
  })

  it('opens the selected branch directly from /mang-ve/cn01', async () => {
    render(<MemoryRouter initialEntries={['/mang-ve/cn01']}><Routes><Route path="/mang-ve/:branchSlug" element={<Takeaway />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('CN01 · Hoàn Kiếm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi chi nhánh' })).toBeInTheDocument()
  })
})
