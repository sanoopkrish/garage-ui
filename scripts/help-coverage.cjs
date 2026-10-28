#!/usr/bin/env node
/**
 * Help coverage check (Sprint 25).
 *
 * Lists every named UI route in src/router/index.ts and reports the ones no help page
 * claims in its `routes:` frontmatter, plus help pages that name a route that no longer
 * exists, and images referenced by pages that are missing from content/images.
 *
 *   npm run help:coverage          # exit code 1 when something is uncovered
 *
 * Run it when adding a module or screen so the help centre is updated in the same change.
 */
const fs = require('fs')
const path = require('path')

const ROUTER = path.resolve(__dirname, '../src/router/index.ts')
const CONTENT = path.resolve(__dirname, '../../garage-api/src/help/content')
// Routes that are not screens a user needs help for
// Owner-only platform screens (Companies) deliberately have no help page
const IGNORE = new Set(['help', 'tenant-access-denied', 'not-found', 'admin-companies', 'admin-company-create', 'admin-company-edit'])

const routerSrc = fs.readFileSync(ROUTER, 'utf8')
const routeNames = [...routerSrc.matchAll(/^\s*name:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]).filter((n) => !IGNORE.has(n))

const pages = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.md')) pages.push(p)
  }
})(path.join(CONTENT, 'pages'))

const covered = new Map() // route -> page file
const images = new Map() // image -> page file
for (const file of pages) {
  const src = fs.readFileSync(file, 'utf8')
  const fm = src.match(/^---\n([\s\S]*?)\n---/)
  const routes = fm ? (fm[1].match(/^routes:\s*\[([^\]]*)\]/m)?.[1] ?? '') : ''
  routes.split(',').map((s) => s.trim()).filter(Boolean).forEach((r) => covered.set(r, file))
  for (const m of src.matchAll(/!\[[^\]]*\]\(([a-z0-9-]+\.(?:png|jpg|jpeg|webp))\)/g)) images.set(m[1], file)
}

const rel = (f) => path.relative(CONTENT, f)
const uncovered = routeNames.filter((r) => !covered.has(r))
const stale = [...covered.keys()].filter((r) => !routeNames.includes(r) && !IGNORE.has(r))
const missingImages = [...images.entries()].filter(([img]) => !fs.existsSync(path.join(CONTENT, 'images', img)))

console.log(`${routeNames.length} UI routes, ${pages.length} help pages, ${covered.size} routes covered`)
if (uncovered.length) { console.log('\nRoutes with NO help page (add `routes: [...]` to a page or write one):'); uncovered.forEach((r) => console.log('  -', r)) }
if (stale.length) { console.log('\nHelp pages naming routes that no longer exist:'); stale.forEach((r) => console.log('  -', r, '→', rel(covered.get(r)))) }
if (missingImages.length) { console.log('\nImages referenced but missing (run npm run help:screenshots):'); missingImages.forEach(([img, f]) => console.log('  -', img, '←', rel(f))) }
if (!uncovered.length && !stale.length && !missingImages.length) console.log('Help centre covers every screen. ✔')
process.exit(uncovered.length || stale.length || missingImages.length ? 1 : 0)
