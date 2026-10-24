import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotFound } from './NotFound'

describe('NotFound', () => {
  it('shows the requested invalid path with a home link', () => {
    render(<MemoryRouter initialEntries={['/abc']}><NotFound /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Trang này không tồn tại/i })).toBeInTheDocument()
    expect(screen.getByText('/abc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
})
