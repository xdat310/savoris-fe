import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StorySections } from './StorySections'

describe('StorySections', () => {
  it('renders only visible content and alternates the editorial rows', () => {
    const { container } = render(<StorySections items={[
      { id: 1, kicker: 'Câu chuyện', title: 'Một hành trình', body: 'Ẩm thực đương đại', imageUrl: '/one.jpg' },
      { id: 2, title: 'Khám phá', body: 'Hương vị mới', imageUrl: '/two.jpg' },
      { id: 3, title: 'Ẩn', visible: false, imageUrl: '/hidden.jpg' },
    ]}/> )
    expect(screen.getByRole('heading', { name: 'Một hành trình' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Khám phá' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ẩn' })).toBeNull()
    expect(container.querySelectorAll('.story-editorial')).toHaveLength(2)
    expect(container.querySelector('.story-editorial--reverse')).toBeInTheDocument()
  })

  it('renders no empty story section when API content is missing', () => {
    const { container } = render(<StorySections items={undefined}/> )
    expect(container.firstChild).toBeNull()
  })
})
