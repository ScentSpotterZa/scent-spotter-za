# FragranceFinder.co.za

A modern, mobile‑first perfume discovery web app for South Africa. Browse fragrances, view stats (longevity, sillage, projection), and buy via Amazon ZA affiliate links.

## Features

- Search: Name, brand, notes (Supabase + React Query)
- Product pages: Title, brand, description, images, price, performance stats, Fragrantica link
- Affiliate links:
  - Appends your `VITE_AMAZON_TAG` to Buy links automatically
  - Fallback: opens a tagged Amazon ZA search when `amazon_url` is missing
  - Clicks and views tracked in `analytics`
- Wishlist: Heart toggle (auth‑gated via Supabase Auth)
- Reviews: One review per user per perfume (rating + optional text)
- Trending: Based on `view_count`
- Admin plumbing: Search event logging in `analytics`
- Images:
  - Primary from `perfumes.image_url`
  - Daily Amazon image scraper (optional)
  - Curated overrides via `scripts/imageOverrides.json`
  - Safe UI fallback if an image fails to load

## Tech Stack

- Frontend: Vite + React + TypeScript + Tailwind + shadcn‑ui
- Data/Auth: Supabase (RLS enabled)
- State/Data fetching: React Query
- Routing: React Router
- Tooling: ESLint, Prettier

## Database

Supabase schema includes:
- `perfumes`: core catalog (name, brand, price, image_url, amazon_url, amazon_asin, notes, longevity/sillage/projection, counters)
- `reviews`: user reviews (one per user per perfume)
- `wishlists`: user wishlists
- `analytics`: events (view, search, affiliate_click)

Migrations live under `supabase/migrations/`. Apply them to your Supabase project before running the app.

## Getting Started

```bash
# 1) Install deps
npm i

# 2) Create .env (see variables below)
cp .env .env.local  # or create manually

# 3) Start dev server
npm run dev

# 4) Production build & preview
npm run build
npm run preview -- --port 5176 --open
```

## Environment Variables

Frontend/runtime:
- `VITE_AMAZON_TAG` (optional for now): Your Amazon Associates tag (ZA)

Scripts/server (required for scrapers and upserts):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Publishable anon key (frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Service key (server scripts only)

Optional scraping helpers:
- `SCRAPE_API_KEY`: Abstract Scrape API key (HTML proxy)
- `OXYLABS_USERNAME` / `OXYLABS_PASSWORD`: Oxylabs Realtime API
- Amazon session helpers (if needed for Puppeteer):
  - `AMZ_COOKIE_SESSION_ID`, `AMZ_COOKIE_SESSION_ID_TIME`, `AMZ_COOKIE_SESSION_TOKEN`, `AMZ_COOKIE_UBID_ACZA`
  - `AMZ_POSTAL_CODE` (e.g., 0046) to set delivery location

## Scripts

General:
- `dev`: Start Vite dev server
- `build`: Production build
- `preview`: Serve the production build locally

Scraping & utilities (server‑side; require service role key):
- `scrape:catalog`: Amazon ZA catalog via HTTP + optional `SCRAPE_API_KEY`
  - Examples:
    - Dry run: `npm run scrape:catalog -- --query "Creed perfume" --pages 1 --dry-run`
    - Bulk defaults: `npm run scrape:catalog -- --pages 2`
- `scrape:catalog:puppeteer`: Puppeteer fallback with stealth + optional cookies/postcode
  - Example: `AMZ_POSTAL_CODE=0046 npm run scrape:catalog:puppeteer -- --query "Creed perfume" --pages 1 --dry-run`
- `scrape:images`: Product‑page image scraper (Amazon ZA)
  - Fill missing: `npm run scrape:images`
  - Force refresh all with links: `npm run scrape:images -- --force`
  - Dry run: `npm run scrape:images -- --dry-run`
- `images:apply-overrides`: Apply curated `imageOverrides.json` to `perfumes.image_url`

Curated image overrides:
- Edit `scripts/imageOverrides.json` to pin exact images (e.g., Unsplash/Pexels/Pixabay).
- Apply: `npm run images:apply-overrides`

## Affiliate Behavior

- All Buy URLs are wrapped by a helper to append/replace the `tag` query param with `VITE_AMAZON_TAG`.
- If a product lacks `amazon_url`, the Buy button opens a tagged Amazon ZA search for `brand + name` to preserve monetization.

## Deploy

- Frontend: Vercel or Netlify (static build from `dist/`)
- Scripts/cron: Railway or Render (Node scripts on schedule)
- CDN: Cloudflare (optional)

## Roadmap

- Integrate Amazon PA‑API (after Associates approval + 3 qualifying sales)
- Admin analytics dashboard (top searches/pages/clicks)
- Optional AI blog automation via n8n

## Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; use it only for server‑side scripts.
- Scraping Amazon directly can be blocked; use provider APIs or cookies/postcode when necessary.
