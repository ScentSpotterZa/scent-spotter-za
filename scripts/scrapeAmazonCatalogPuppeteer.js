import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const BASE = 'https://www.amazon.co.za';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseArgs(argv) {
	const args = { query: null, pages: 1, brands: [], dryRun: false, headless: 'new', delayMs: 1500 };
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--query' && argv[i+1]) { args.query = argv[++i]; continue; }
		if (a === '--brands' && argv[i+1]) { args.brands = argv[++i].split(',').map(s => s.trim()).filter(Boolean); continue; }
		if (a === '--pages' && argv[i+1]) { args.pages = Math.max(1, parseInt(argv[++i], 10) || 1); continue; }
		if (a === '--dry-run') { args.dryRun = true; continue; }
		if (a === '--delay' && argv[i+1]) { args.delayMs = Math.max(250, parseInt(argv[++i], 10) || 1500); continue; }
		if (a === '--show') { args.headless = false; continue; }
	}
	if (!args.query && args.brands.length === 0) {
		args.brands = [
			'Dior perfume', 'Chanel perfume', 'YSL perfume', 'Tom Ford perfume', 'Creed perfume',
			'Armani perfume', 'Versace perfume', 'Gucci perfume', 'Paco Rabanne perfume', 'Montblanc perfume'
		];
	}
	return args;
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

async function acceptCookies(page) {
	const selectors = [
		'#sp-cc-accept',
		'input#sp-cc-accept',
		'button[name="accept"]',
		'input[name="accept"]',
		'input[type="submit"][aria-label*="Accept"]',
		'input[type="submit"][value*="Accept"]',
		'button:has-text("Accept Cookies")'
	];
	for (const sel of selectors) {
		try {
			const el = await page.$(sel);
			if (el) {
				await el.click({ delay: 50 });
				await sleep(500);
				break;
			}
		} catch {}
	}
}

async function autoScroll(page, steps = 8, stepDelay = 300) {
	for (let i = 0; i < steps; i++) {
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await sleep(stepDelay);
	}
}

async function parsePage(page) {
	await page.waitForSelector('div.s-main-slot', { timeout: 15000 });
	const items = await page.$$eval('div.s-main-slot div.s-result-item[data-asin]', nodes => {
		const results = [];
		nodes.forEach(node => {
			const asin = node.getAttribute('data-asin')?.trim();
			if (!asin) return;
			const titleEl = node.querySelector('h2 a.a-link-normal span');
			const title = titleEl ? titleEl.textContent.trim() : '';
			if (!title) return;
			const hrefEl = node.querySelector('h2 a.a-link-normal');
			const href = hrefEl ? hrefEl.getAttribute('href') : null;
			const url = href ? new URL(href, 'https://www.amazon.co.za').toString() : null;
			const imgEl = node.querySelector('img.s-image');
			const img = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null;
			const wholeEl = node.querySelector('span.a-price span.a-price-whole');
			const fracEl = node.querySelector('span.a-price span.a-price-fraction');
			const whole = wholeEl ? wholeEl.textContent.replace(/[^0-9]/g, '') : '';
			const frac = fracEl ? fracEl.textContent.replace(/[^0-9]/g, '') : '';
			let price = null;
			if (whole) {
				const p = parseFloat(`${whole}.${frac || '00'}`);
				if (!Number.isNaN(p)) price = p;
			}
			results.push({ asin, title, url, img, price });
		});
		return results;
	});
	return items;
}

async function setAmazonCookies(page) {
	const cookies = [];
	if (process.env.AMZ_COOKIE_SESSION_ID) cookies.push({ name: 'session-id', value: process.env.AMZ_COOKIE_SESSION_ID, domain: 'www.amazon.co.za', path: '/', httpOnly: false });
	if (process.env.AMZ_COOKIE_SESSION_ID_TIME) cookies.push({ name: 'session-id-time', value: process.env.AMZ_COOKIE_SESSION_ID_TIME, domain: 'www.amazon.co.za', path: '/', httpOnly: false });
	if (process.env.AMZ_COOKIE_SESSION_TOKEN) cookies.push({ name: 'session-token', value: process.env.AMZ_COOKIE_SESSION_TOKEN, domain: 'www.amazon.co.za', path: '/', httpOnly: true });
	if (process.env.AMZ_COOKIE_UBID_ACZA) cookies.push({ name: 'ubid-acza', value: process.env.AMZ_COOKIE_UBID_ACZA, domain: 'www.amazon.co.za', path: '/', httpOnly: false });
	if (cookies.length > 0) {
		await page.setCookie(...cookies);
	}
}

async function scrapeQuery(browser, query, pages, dryRun, delayMs) {
	const page = await browser.newPage();
	await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
	await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Mobile/15E148 Safari/604.1');
	await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await setAmazonCookies(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	let totalFound = 0, totalInserted = 0, totalUpdated = 0;
	for (let p = 1; p <= pages; p++) {
		const url = `${BASE}/s?k=${encodeURIComponent(query)}&page=${p}`;
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
		await acceptCookies(page);
		await page.waitForSelector('div.s-main-slot', { timeout: 15000 }).catch(() => {});
		await autoScroll(page, 10, 250);
		const batch = await parsePage(page).catch(() => []);
		totalFound += batch.length;
		for (const it of batch) {
			if (dryRun) {
				console.log(`[DRY] ${it.asin} :: ${it.title}`);
				continue;
			}
			try {
				const res = await upsertPerfume({ ...it, brand: query.replace(/\s*perfume\s*$/i, '') });
				if (res.action === 'insert') totalInserted++; else totalUpdated++;
			} catch (e) {
				console.error('Upsert error:', e.message);
			}
			await sleep(200);
		}
		await sleep(delayMs);
	}
	await page.close();
	return { totalFound, totalInserted, totalUpdated };
}

async function main() {
	const { query, pages, brands, dryRun, headless, delayMs } = parseArgs(process.argv);
	const queries = query ? [query] : brands;
	const browser = await puppeteer.launch({ headless, args: ['--no-sandbox','--disable-setuid-sandbox'] });
	let grandFound = 0, grandInserted = 0, grandUpdated = 0;
	for (const q of queries) {
		console.log(`Scraping (Puppeteer): ${q} (pages=${pages}, dry=${dryRun})`);
		const res = await scrapeQuery(browser, q, pages, dryRun, delayMs);
		console.log(`Result for ${q}:`, res);
		grandFound += res.totalFound; grandInserted += res.totalInserted; grandUpdated += res.totalUpdated;
	}
	await browser.close();
	console.log(`Done (Puppeteer). Found=${grandFound}, inserted=${grandInserted}, updated=${grandUpdated}`);
}

main().catch((e) => { console.error(e); process.exit(1); });