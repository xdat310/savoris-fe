import { describe, expect, it } from 'vitest'
import { can, homeFor } from './auth'

describe('role routes and capabilities', () => {
  it('routes each role to its own landing page', () => {
    expect(homeFor('ADMIN')).toBe('/admin/overview')
    expect(homeFor('MANAGER')).toBe('/admin/branch')
    expect(homeFor('STAFF')).toBe('/admin/floor')
    expect(homeFor('CHEF')).toBe('/admin/kitchen')
  })

  it('only ADMIN edits branch data and only management sees staff administration', () => {
    expect(can.branchAdmin('ADMIN')).toBe(true)
    expect(can.branchAdmin('MANAGER')).toBe(false)
    expect(can.manage('MANAGER')).toBe(true)
    expect(can.manage('CHEF')).toBe(false)
  })
})
