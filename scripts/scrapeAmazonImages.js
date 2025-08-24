import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const AMAZON_BASE = 'https://www.amazon.co.za/dp/';

function parseFlags(argv) {
	const flags = { dryRun: false, force: false };
	for (const arg of argv.slice(2)) {
		if (arg === '--dry-run' || arg === '--dryrun') flags.dryRun = true;
		if (arg === '--force') flags.force = true;
	}
	return flags;
}

function isLikelyAmazonImage(url) {
	try {
		const u = new URL(url);
		const host = u.hostname;
		const allowedHosts = [
			'm.media-amazon.com',
			'images-na.ssl-images-amazon.com',
			'images-eu.ssl-images-amazon.com',
			'images-na.ssl-images-amazon.com',
			'images-cn.ssl-images-amazon.com',
			'fls-eu.amazon.com',
			'amazon.co.za',
		];
		const isAllowedHost = allowedHosts.some(h => host.endsWith(h) || host.includes('amazon'));
		const isImageExt = /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u.pathname + u.search);
		return isAllowedHost && isImageExt;
	} catch {
		return false;
	}
}

function pickLargestFromDynamicImageAttr(attrValue) {
	try {
		const map = JSON.parse(attrValue);
		const entries = Object.entries(map).map(([url, size]) => ({ url, size }));
		entries.sort((a, b) => (b.size?.[0] || 0) * (b.size?.[1] || 0) - (a.size?.[0] || 0) * (a.size?.[1] || 0));
		const best = entries.find(e => isLikelyAmazonImage(e.url));
		return best?.url || null;
	} catch {
		return null;
	}
}

async function fetchAmazonImageByAsin(asin) {
	const url = `${AMAZON_BASE}${asin}`;
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
			'Accept-Language': 'en-ZA,en;q=0.9',
		},
	});
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const html = await res.text();
	const $ = cheerio.load(html);

	// 1) Try Open Graph image
	const ogCandidates = [
		$('meta[property="og:image"]').attr('content'),
		$('meta[property="og:image:secure_url"]').attr('content'),
	];
	for (const c of ogCandidates) {
		if (c && isLikelyAmazonImage(c)) return c;
	}

	// 2) Landing image variants
	const landing = $('#landingImage');
	const landingOld = landing.attr('data-old-hires');
	if (landingOld && isLikelyAmazonImage(landingOld)) return landingOld;
	const landingSrc = landing.attr('src');
	if (landingSrc && isLikelyAmazonImage(landingSrc)) return landingSrc;
	const dynAttr = landing.attr('data-a-dynamic-image');
	const dynPicked = dynAttr && pickLargestFromDynamicImageAttr(dynAttr);
	if (dynPicked) return dynPicked;

	// 3) Any dynamic image
	const anyDynamic = $('img.a-dynamic-image').first();
	const anyDynJson = anyDynamic.attr('data-a-dynamic-image');
	const anyDynPicked = anyDynJson && pickLargestFromDynamicImageAttr(anyDynJson);
	if (anyDynPicked) return anyDynPicked;
	const anyDynSrc = anyDynamic.attr('src');
	if (anyDynSrc && isLikelyAmazonImage(anyDynSrc)) return anyDynSrc;

	// 4) Generic images that look like product images
	const generic = $('img').map((_, el) => $(el).attr('src')).get().filter(Boolean);
	const valid = generic.filter(src => isLikelyAmazonImage(src));
	if (valid.length > 0) return valid[0];

	return null;
}

async function updatePerfumeImage(perfume, flags) {
	if (!perfume.amazon_asin && !perfume.amazon_url) return { updated: false, reason: 'no amazon id/url' };
	const asinMatch = perfume.amazon_asin || (perfume.amazon_url?.match(/\/dp\/([A-Z0-9]{8,})/)?.[1]);
	if (!asinMatch) return { updated: false, reason: 'no asin resolved' };

	const imageUrl = await fetchAmazonImageByAsin(asinMatch);
	if (!imageUrl) return { updated: false, reason: 'no image' };

	if (flags.dryRun) {
		return { updated: false, reason: 'dry_run', imageUrl };
	}

	const { error } = await supabaseAdmin
		.from('perfumes')
		.update({ image_url: imageUrl, last_scraped_at: new Date().toISOString() })
		.eq('id', perfume.id);
	if (error) throw error;
	return { updated: true, imageUrl };
}

async function main() {
	const flags = parseFlags(process.argv);
	// Accept a standalone ASIN argument (not a flag) as the first non-flag arg
	const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
	const asinArg = args[0];

	if (asinArg) {
		const { data, error } = await supabaseAdmin
			.from('perfumes')
			.select('*')
			.or(`amazon_asin.eq.${asinArg},amazon_url.ilike.%/dp/${asinArg}%`)
			.limit(1)
			.single();
		if (error || !data) throw error || new Error('Perfume not found for ASIN');
		const result = await updatePerfumeImage(data, flags);
		console.log(flags.dryRun ? 'DRY RUN single perfume:' : 'Updated single perfume:', result);
		return;
	}

	let query = supabaseAdmin.from('perfumes').select('*');
	if (flags.force) {
		// Update all with amazon id/url
		query = query.not('amazon_url', 'is', null);
	} else {
		query = query.is('image_url', null);
	}
	const { data, error } = await query.limit(5000);
	if (error) throw error;

	let updated = 0; let skipped = 0; let dry = 0;
	for (const p of data) {
		try {
			const res = await updatePerfumeImage(p, flags);
			if (res.updated) {
				updated += 1;
				console.log(`Updated ${p.name} -> ${res.imageUrl}`);
			} else if (res.reason === 'dry_run') {
				dry += 1;
				console.log(`DRY RUN would update ${p.name} -> ${res.imageUrl}`);
			} else {
				skipped += 1;
				console.log(`Skipped ${p.name} (${res.reason})`);
			}
			await new Promise(r => setTimeout(r, 1200)); // throttle
		} catch (e) {
			console.error('Error updating', p.id, e.message);
		}
	}
	console.log(`Done. Updated ${updated}, skipped ${skipped}, dry-run ${dry}, total ${data.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});