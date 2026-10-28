#!/usr/bin/env node
/**
 * Help centre screenshots (Sprint 25).
 *
 * Captures every screenshot referenced by garage-api/src/help/content/pages and writes
 * them to garage-api/src/help/content/images. Run it against a CLEAN demo tenant before
 * a release so the pictures match the screens.
 *
 *   HELP_BASE_URL=https://localhost:5174 \
 *   HELP_ADMIN_EMAIL=admin@demo.com HELP_ADMIN_PASSWORD=... \
 *   HELP_FIELD_EMAIL=raj.patel@demo.com HELP_FIELD_PASSWORD=... \
 *   npm run help:screenshots
 *
 * Optional: HELP_ONLY=jobs-list,schedule  (comma list of image names to refresh)
 *           HELP_OUT=/path/to/images
 *
 * Uses puppeteer from garage-api/node_modules (the UI has no puppeteer dependency).
 * Record IDs below are the demo tenant's; change them if the seed changes.
 */
const path = require('path')
const fs = require('fs')

const BASE = process.env.HELP_BASE_URL || 'https://localhost:5174'
const OUT = process.env.HELP_OUT || path.resolve(__dirname, '../../garage-api/src/help/content/images')
const ADMIN = { email: process.env.HELP_ADMIN_EMAIL || 'admin@demo.com', password: process.env.HELP_ADMIN_PASSWORD || 'Admin@12345' }
const FIELD = { email: process.env.HELP_FIELD_EMAIL || 'raj.patel@demo.com', password: process.env.HELP_FIELD_PASSWORD || 'Staff@12345' }
const STAFF = { email: process.env.HELP_STAFF_EMAIL || 'christian.hughes@demo.com', password: process.env.HELP_STAFF_PASSWORD || 'Staff@12345' }
const ONLY = process.env.HELP_ONLY ? new Set(process.env.HELP_ONLY.split(',').map((s) => s.trim())) : null

// Demo record ids used for detail pages
const IDS = {
  jobInRepair: '4208c5a4-6fde-42cf-910f-f29db8d21579',
  jobComplete: '4e800db6-0058-4043-a0b6-80f4ad4255ba',
  customer: '165dec48-1f49-4a02-a8ea-8c34e148edff',
  vehicle: '20d2e035-d47a-4be8-8e8b-8efe39d590d4',
  technician: '1b12ba07-69ff-4b55-ad82-8c5774ee3c5c',
  invoice: '46810daf-59fb-41a9-a3ac-ae406d25e67c',
  timesheet: 'ac928f06-27f9-4894-b561-cd6c9bf5a31c',
  user: '3fdcc027-a106-4ed8-abdd-70a86efcd6d4',
}
// Demo data lives in these weeks; list screens are stepped back to them
const DEMO_WEEKS_BACK = { schedule: 14, attendance: ['2026-09-24', '2026-09-25'], timesheets: 2, myWeek: 3 }

function loadPuppeteer() {
  for (const p of [path.resolve(__dirname, '../../garage-api/node_modules/puppeteer'), 'puppeteer']) {
    try { return require(p) } catch { /* next */ }
  }
  throw new Error('puppeteer not found — install it in garage-api or garage-ui')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

async function go(page, p, wait = 2200) {
  await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => log('goto warn', p, e.message))
  await sleep(wait)
}
async function login(page, who, p = '/auth/login') {
  await go(page, p, 800)
  await page.waitForSelector('input[type=email]', { timeout: 20000 })
  await page.type('input[type=email]', who.email)
  await page.type('input[type=password]', who.password)
  await page.click('button[type=submit]')
  await sleep(2500)
}
async function shot(page, name) {
  if (ONLY && !ONLY.has(name)) return
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  log('shot', name)
}
/** Office pages scroll inside <main>; grow the viewport to capture the whole page */
async function tall(page, name, max = 3500) {
  if (ONLY && !ONLY.has(name)) return
  await page.setViewport({ width: 1440, height: 900 })
  await sleep(300)
  const h = await page.evaluate(() => (document.querySelector('main')?.scrollHeight || 900) + 64)
  await page.setViewport({ width: 1440, height: Math.max(900, Math.min(max, h)) })
  await sleep(900)
  await shot(page, name)
  await page.setViewport({ width: 1440, height: 900 })
}
async function clickText(page, text, selector = 'main button') {
  const ok = await page.evaluate((text, selector) => {
    const n = (e) => e.textContent.replace(/\s+/g, ' ').trim()
    const els = Array.from(document.querySelectorAll(selector))
    const el = els.find((e) => n(e) === text) || els.find((e) => n(e).includes(text))
    if (!el) return false
    el.click()
    return true
  }, text, selector)
  if (!ok) log('clickText MISS:', text)
  await sleep(1400)
  return ok
}
async function prevWeek(page, n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('main button')).find((b) => b.querySelector('svg.lucide-chevron-left')); b && b.click() })
    await sleep(300)
  }
  await sleep(2200)
}
async function setDate(page, idx, val) {
  await page.evaluate((idx, val) => {
    const el = document.querySelectorAll('main input[type=date]')[idx]
    if (!el) return
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, idx, val)
  await sleep(600)
}
async function removeToasts(page) {
  await page.evaluate(() => document.querySelectorAll('[role=alert], [class*="toast"]').forEach((e) => e.remove()))
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const puppeteer = loadPuppeteer()
  const browser = await puppeteer.launch({ headless: true, acceptInsecureCerts: true, args: ['--ignore-certificate-errors', '--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // ---- Office app as admin (sees every menu)
  await go(page, '/auth/login', 1200); await shot(page, 'login')
  await login(page, ADMIN)
  await go(page, '/dashboard', 3500); await shot(page, 'dashboard')
  if (await clickText(page, 'Customise')) {
    await shot(page, 'dashboard-customise')
    if (await clickText(page, 'Add widget')) await shot(page, 'dashboard-add-widget')
    await page.keyboard.press('Escape'); await sleep(400); await clickText(page, 'Done')
  }
  await go(page, '/jobs'); await shot(page, 'jobs-list')
  await go(page, `/jobs/${IDS.jobInRepair}`, 2800); await tall(page, 'job-detail')
  await go(page, `/jobs/${IDS.jobComplete}`, 2800); await tall(page, 'job-detail-complete')
  await go(page, '/schedule', 2500); await prevWeek(page, DEMO_WEEKS_BACK.schedule); await tall(page, 'schedule', 3000)
  await go(page, '/inventory'); await shot(page, 'job-parts')
  await go(page, '/customers'); await shot(page, 'customers-list')
  await go(page, `/customers/${IDS.customer}`, 2500); await tall(page, 'customer-detail')
  await go(page, '/vehicles'); await shot(page, 'vehicles-list')
  await go(page, `/vehicles/${IDS.vehicle}`, 2500); await tall(page, 'vehicle-detail')
  await go(page, '/technicians'); await shot(page, 'technicians-list')
  await go(page, `/technicians/${IDS.technician}`, 2500); await tall(page, 'technician-detail')
  await go(page, '/invoices'); await shot(page, 'invoices-list')
  await go(page, `/invoices/${IDS.invoice}`, 2500); await tall(page, 'invoice-detail')
  await go(page, '/invoices?tab=credit-notes', 2500); await shot(page, 'credit-notes')
  await go(page, '/invoices'); if (await clickText(page, 'Statements')) await shot(page, 'statements')
  await go(page, '/invoices'); if (await clickText(page, 'Supplier invoices')) await shot(page, 'supplier-invoices-tab')
  await go(page, '/procurement/orders'); await shot(page, 'purchase-orders')
  await go(page, '/procurement/orders/new', 2500); await tall(page, 'purchase-order-new')
  await go(page, '/procurement/bills'); await shot(page, 'supplier-bills')
  await go(page, '/procurement/stock'); await shot(page, 'stock')
  await go(page, '/procurement/suppliers'); await shot(page, 'suppliers')
  await go(page, '/procurement/reports', 3000); await tall(page, 'purchasing-reports')
  await go(page, '/assets'); await shot(page, 'assets')
  await go(page, '/hr/timesheets'); await prevWeek(page, DEMO_WEEKS_BACK.timesheets); await shot(page, 'timesheets')
  await go(page, `/hr/timesheets/${IDS.timesheet}`, 2500); await tall(page, 'timesheet-detail')
  await go(page, '/notifications'); await shot(page, 'notifications')
  await go(page, '/profile', 2500); await tall(page, 'profile')
  await go(page, '/admin/users'); await shot(page, 'admin-users')
  await go(page, `/admin/users/${IDS.user}/edit`, 2500); await tall(page, 'admin-user-edit')
  await go(page, '/admin/roles', 2500); await tall(page, 'admin-roles')
  await go(page, '/admin/notification-templates'); await shot(page, 'email-templates')
  await go(page, '/admin/numbering'); await shot(page, 'numbering')
  await go(page, '/admin/master-data'); await shot(page, 'master-data')
  await go(page, '/admin/audit-logs'); await shot(page, 'audit-logs')
  await go(page, '/admin/settings', 2500); await tall(page, 'settings-business')
  const tabs = [
    ['Billing / VAT', 'settings-billing'], ['Working time', 'settings-working-time'], ['Purchasing', 'settings-purchasing'],
    ['Dashboard', 'settings-dashboard'], ['Notifications', 'settings-notifications'], ['Security & Data', 'settings-security'],
  ]
  for (const [label, name] of tabs) {
    if (await clickText(page, label, 'main nav button')) { await sleep(800); await removeToasts(page); await tall(page, name) }
  }
  // Integrations tab deliberately not captured: it shows credential fragments.
  await go(page, '/help', 3000); await tall(page, 'help-centre', 2200)

  // ---- Create / edit forms (modals) — one image per "Add" button
  const MODALS = [
    ['/jobs', 'New Job', 'form-new-job'],
    ['/customers', 'New Customer', 'form-new-customer'],
    ['/vehicles', 'Add Vehicle', 'form-new-vehicle'],
    ['/invoices?tab=credit-notes', 'New credit note', 'form-new-credit-note'],
    ['/procurement/suppliers', 'New supplier', 'form-new-supplier'],
    ['/procurement/stock', 'New stock item', 'form-new-stock-item'],
    ['/procurement/bills', 'Add supplier invoice', 'form-new-supplier-invoice'],
    ['/assets', 'Add item', 'form-new-asset'],
    ['/assets', 'Workshop areas', 'form-workshop-areas'],
    ['/admin/users', 'Add User', 'form-new-user'],
    ['/admin/roles', 'Add Role', 'form-new-role'],
    ['/admin/roles', 'Permissions', 'form-role-permissions'],
    ['/admin/master-data', 'Add', 'form-master-data-add'],
    ['/hr/attendance', 'Kiosk PINs', 'form-kiosk-pins'],
    [`/jobs/${IDS.jobInRepair}`, 'New Quote', 'form-new-quote'],
    [`/jobs/${IDS.jobInRepair}`, 'Assign', 'form-assign-technician'],
    [`/jobs/${IDS.jobInRepair}`, 'Log time', 'form-log-time'],
    [`/jobs/${IDS.jobInRepair}`, 'Record Payment', 'form-record-payment'],
    [`/jobs/${IDS.jobInRepair}`, 'Edit', 'form-job-notes'],
    ['/admin/notification-templates', 'Edit', 'form-email-template-edit'],
  ]
  await page.setViewport({ width: 1440, height: 1060 })
  for (const [p, label, name] of MODALS) {
    if (ONLY && !ONLY.has(name)) continue
    await go(page, p, 2500)
    if (await clickText(page, label, 'main button, main a')) {
      if (name === 'form-role-permissions') await tall(page, name, 2200)
      else await shot(page, name)
    }
    await page.keyboard.press('Escape'); await sleep(400)
  }
  // Trade customer variant of the New Customer form
  if (!ONLY || ONLY.has('form-new-customer-b2b')) {
    await go(page, '/customers', 2500)
    if (await clickText(page, 'New Customer')) {
      await page.evaluate(() => {
        const sel = Array.from(document.querySelectorAll('.fixed select, [role=dialog] select')).find((s) => Array.from(s.options).some((o) => /Private/i.test(o.text)))
        if (!sel) return
        sel.value = Array.from(sel.options).find((o) => /Business|B2B/i.test(o.text)).value
        sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await sleep(1200); await shot(page, 'form-new-customer-b2b')
    }
    await page.keyboard.press('Escape'); await sleep(400)
  }
  await page.setViewport({ width: 1440, height: 900 })

  // ---- My Week / Attendance as a staff member who is on the timesheet run
  await login(page, STAFF)
  await go(page, '/hr/my-week', 2500); await prevWeek(page, DEMO_WEEKS_BACK.myWeek); await tall(page, 'my-week')
  await go(page, '/hr/attendance', 2000)
  await setDate(page, 0, DEMO_WEEKS_BACK.attendance[0]); await setDate(page, 1, DEMO_WEEKS_BACK.attendance[1]); await sleep(2500)
  await tall(page, 'attendance')

  // ---- Kiosk (public page)
  await go(page, '/kiosk', 2500); await shot(page, 'kiosk')

  // ---- Field app on a phone
  const ctx = await browser.createBrowserContext()
  const m = await ctx.newPage()
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const mshot = async (name) => { if (ONLY && !ONLY.has(name)) return; await m.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }); log('shot', name) }
  await go(m, '/field/login', 1200); await mshot('field-login')
  await login(m, FIELD, '/field/login')
  await go(m, '/field', 3000); await mshot('field-jobs')
  await m.evaluate(() => {
    const el = Array.from(document.querySelectorAll('main *')).find((e) => /JOB-\d+/.test(e.textContent) && e.children.length === 0)
    let n = el
    while (n && n !== document.body) { if (n.classList.contains('cursor-pointer') || n.getAttribute('role') === 'button') break; n = n.parentElement }
    ;(n && n !== document.body ? n : el)?.click()
  })
  await sleep(3000)
  if (m.url().includes('/field/jobs/')) await mshot('field-job-detail'); else log('no field job to open for', FIELD.email)
  await go(m, '/field/timesheet', 2500); await prevWeek(m, DEMO_WEEKS_BACK.myWeek); await mshot('field-my-week')
  await go(m, '/field/kit', 2500); await mshot('field-find-kit')

  await browser.close()
  log('done ->', OUT)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
