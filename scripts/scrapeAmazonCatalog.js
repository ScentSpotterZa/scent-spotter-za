import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const BASE = 'https://www.amazon.co.za';
const SCRAPE_API = 'https://scrape.abstractapi.com/v1/';
const SCRAPE_KEY = process.env.SCRAPE_API_KEY;

function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

function parseArgs(argv) {
	const args = { query: null, pages: 1, brands: [], dryRun: false, delayMs: 1500 };
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--query' && argv[i+1]) { args.query = argv[++i]; continue; }
		if (a === '--brands' && argv[i+1]) { args.brands = argv[++i].split(',').map(s => s.trim()).filter(Boolean); continue; }
		if (a === '--pages' && argv[i+1]) { args.pages = Math.max(1, parseInt(argv[++i], 10) || 1); continue; }
		if (a === '--dry-run') { args.dryRun = true; continue; }
		if (a === '--delay' && argv[i+1]) { args.delayMs = Math.max(250, parseInt(argv[++i], 10) || 1500); continue; }
	}
	if (!args.query && args.brands.length === 0) {
		args.brands = [
			'Dior perfume', 'Chanel perfume', 'YSL perfume', 'Tom Ford perfume', 'Creed perfume',
			'Armani perfume', 'Versace perfume', 'Gucci perfume', 'Paco Rabanne perfume', 'Montblanc perfume'
		];
	}
	return args;
}

function toAbsoluteUrl(pathOrUrl) {
	if (!pathOrUrl) return null;
	try {
		const u = new URL(pathOrUrl, BASE);
		return u.toString();
	} catch {
		return null;
	}
}

async function fetchViaScrapeApi(targetUrl) {
	const url = `${SCRAPE_API}?api_key=${SCRAPE_KEY}&url=${encodeURIComponent(targetUrl)}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Scrape API failed ${res.status}`);
	return await res.text();
}

async function fetchSearchPage(query, page = 1) {
	const target = `${BASE}/s?k=${encodeURIComponent(query)}&page=${page}`;
	if (SCRAPE_KEY) {
		return await fetchViaScrapeApi(target);
	}
	const res = await fetch(target, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
			'Accept-Language': 'en-ZA,en;q=0.9',
		},
	});
	if (!res.ok) throw new Error(`Failed search ${res.status} for ${target}`);
	return await res.text();
}

function parseResults(html, fallbackBrandFromQuery) {
	const $ = cheerio.load(html);
	const items = [];
	$('div.s-main-slot div.s-result-item[data-asin]').each((_, el) => {
		const asin = $(el).attr('data-asin')?.trim();
		if (!asin) return;
		const title = $(el).find('h2 a.a-link-normal span').first().text().trim();
		if (!title) return;
		const href = $(el).find('h2 a.a-link-normal').attr('href');
		const url = toAbsoluteUrl(href);
		const img = $(el).find('img.s-image').attr('src') || $(el).find('img.s-image').attr('data-src') || null;
		const whole = $(el).find('span.a-price span.a-price-whole').first().text().replace(/[^0-9]/g, '');
		const frac = $(el).find('span.a-price span.a-price-fraction').first().text().replace(/[^0-9]/g, '');
		let price = null;
		if (whole) {
			const p = parseFloat(`${whole}.${frac || '00'}`);
			if (!Number.isNaN(p)) price = p;
		}
		let brand = null;
		if (fallbackBrandFromQuery) {
			brand = fallbackBrandFromQuery.replace(/\s*perfume\s*$/i, '');
		}
		items.push({ asin, title, url, img, price, brand });
	});
	return items;
}

async function upsertPerfume(item) {
	const { data: existing, error: findErr } = await supabaseAdmin
		.from('perfumes')
		.select('id, name, brand, amazon_asin')
		.eq('amazon_asin', item.asin)
		.limit(1)
		.maybeSingle();
	if (findErr) throw findErr;
	const payload = {
		name: item.title,
		brand: item.brand || item.title.split(' ')[0],
		amazon_url: item.url,
		amazon_asin: item.asin,
		image_url: item.img || null,
		price: item.price,
		currency: 'ZAR',
		is_available: true,
		last_scraped_at: new Date().toISOString(),
	};
	if (!existing) {
		const { error } = await supabaseAdmin.from('perfumes').insert(payload);
		if (error) throw error;
		return { action: 'insert' };
	} else {
		const { error } = await supabaseAdmin.from('perfumes').update(payload).eq('id', existing.id);
		if (error) throw error;
		return { action: 'update', id: existing.id };
	}
}

async function scrapeQuery(query, pages, dryRun, delayMs) {
	let totalFound = 0, totalInserted = 0, totalUpdated = 0;
	for (let p = 1; p <= pages; p++) {
		try {
			const html = await fetchSearchPage(query, p);
			const batch = parseResults(html, query);
			totalFound += batch.length;
			for (const it of batch) {
				if (dryRun) {
					console.log(`[DRY] ${it.asin} :: ${it.title}`);
					continue;
				}
				try {
					const res = await upsertPerfume(it);
					if (res.action === 'insert') totalInserted++; else totalUpdated++;
				} catch (e) {
					console.error('Upsert error:', e.message);
				}
				await sleep(200);
			}
			await sleep(delayMs);
		} catch (e) {
			console.error(`Search error on page ${p}:`, e.message);
		}
	}
	return { totalFound, totalInserted, totalUpdated };
}

async function main() {
	const { query, pages, brands, dryRun, delayMs } = parseArgs(process.argv);
	const queries = query ? [query] : brands;
	let grandFound = 0, grandInserted = 0, grandUpdated = 0;
	for (const q of queries) {
		console.log(`Scraping: ${q} (pages=${pages}, dry=${dryRun}, via=${SCRAPE_KEY ? 'ScrapeAPI' : 'direct'})`);
		const res = await scrapeQuery(q, pages, dryRun, delayMs);
		console.log(`Result for ${q}:`, res);
		grandFound += res.totalFound; grandInserted += res.totalInserted; grandUpdated += res.totalUpdated;
		await sleep(delayMs);
	}
	console.log(`Done. Found=${grandFound}, inserted=${grandInserted}, updated=${grandUpdated}`);
}

main().catch((e) => { console.error(e); process.exit(1); });