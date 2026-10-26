import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader branch chooser', () => {
  it('opens a full-screen accessible branch chooser and closes with Escape', () => {
    render(<MemoryRouter><SiteHeader branches={[
      { id: 1, code: 'CN01', name: 'Hoàn Kiếm', slug: 'hoan-kiem', openNow: true },
      { id: 2, code: 'CN02', name: 'Tây Hồ', slug: 'tay-ho', openNow: false },
    ]}/></MemoryRouter>)
    fireEvent.click(screen.getAllByRole('button', { name: /chi nhánh/i })[0])
    expect(screen.getByRole('dialog', { name: 'Chọn chi nhánh' })).toBeInTheDocument()
    expect(screen.getByText('CN01 · Hoàn Kiếm')).toBeInTheDocument()
    expect(screen.getByText('Đang mở')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Chọn chi nhánh' })).toBeNull()
  })
})
