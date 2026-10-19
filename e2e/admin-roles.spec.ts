import { mkdir } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

const accounts = [
  { username: 'admin', page: 'Tổng quan', screenshot: 'admin' },
  { username: 'manager.cn01', page: 'Chi nhánh của tôi', screenshot: 'manager' },
  { username: 'staff1.cn01', page: 'Sơ đồ bàn', screenshot: 'staff' },
  { username: 'chef.cn01', page: 'Màn hình bếp', screenshot: 'chef' },
]

async function signIn(page: import('@playwright/test').Page, username: string, password = 'savoris123') {
  await page.goto('/admin/login')
  await page.getByLabel('Tên đăng nhập').fill(username)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
}

async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
}

test('each role lands on the right page, sees only its menu, and chef direct URL is forbidden', async ({ page }) => {
  await mkdir('test-results/screenshots', { recursive: true })
  await page.context().clearCookies()
  for (const account of accounts) {
    await signIn(page, account.username)
    await expect(page.getByRole('heading', { name: account.page })).toBeVisible()
    await page.screenshot({ path: `test-results/screenshots/${account.screenshot}.png`, fullPage: true })
    if (account.username === 'admin') {
      await expect(page.getByRole('link', { name: 'Chi nhánh' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Nhân viên' })).toBeVisible()
    } else if (account.username === 'manager.cn01') {
      await expect(page.getByRole('link', { name: 'Nhân viên' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Tổng quan' })).toHaveCount(0)
    } else {
      await expect(page.getByRole('link', { name: 'Nhân viên' })).toHaveCount(0)
    }
    if (account.username === 'chef.cn01') {
      await page.goto('/admin/staff')
      await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible()
    }
    await signOut(page)
  }
})

test('manager CN3 creates a staff account that can sign in; invalid credentials are localized', async ({ page }) => {
  await signIn(page, 'manager.cn03')
  await page.getByRole('link', { name: 'Nhân viên' }).click()
  await expect(page.getByRole('heading', { name: 'Nhân viên' })).toBeVisible()
  await page.getByRole('button', { name: 'Thêm nhân viên' }).click()
  const username = `e2e.staff.${Date.now()}`
  await page.getByLabel('Họ và tên').fill('Nhân viên kiểm thử CN3')
  await page.getByLabel('Tên đăng nhập').fill(username)
  await page.getByLabel('Email').fill(`${username}@savoris.test`)
  await page.getByLabel('Số điện thoại').fill('0901234567')
  await page.getByLabel('Mật khẩu khởi tạo').fill('E2ePass@123')
  await page.getByLabel('Lương theo giờ').fill('30000')
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page.getByRole('cell', { name: username, exact: true })).toBeVisible()
  await signOut(page)
  await signIn(page, username, 'E2ePass@123')
  await expect(page.getByRole('heading', { name: 'Sơ đồ bàn' })).toBeVisible()

  await signOut(page)
  await page.goto('/admin/login')
  await page.getByLabel('Tên đăng nhập').fill(username)
  await page.getByLabel('Mật khẩu').fill('wrong-password')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByText('Sai tên đăng nhập hoặc mật khẩu')).toBeVisible()
})

test('homepage loads all four public branches from the API', async ({ page }) => {
  await mkdir('test-results/screenshots', { recursive: true })
  await page.goto('/')
  const branchTabs = page.locator('#lien-he [role="tab"]')
  await expect(branchTabs).toHaveCount(4)
  for (const name of ['CN1 Hoàn Kiếm', 'CN2 Cầu Giấy', 'CN3 Tây Hồ', 'CN4 Long Biên']) {
    await expect(branchTabs.filter({ hasText: name })).toHaveCount(1)
  }
  await page.locator('#lien-he').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/screenshots/home-branches.png', fullPage: true })
})
