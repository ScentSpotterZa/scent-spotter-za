import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const AMAZON_BASE = 'https://www.amazon.co.za/dp/';

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

	// Try multiple selectors Amazon may use
	const candidates = [
		$('#landingImage').attr('src'),
		$('img#imgBlkFront').attr('src'),
		$('img.a-dynamic-image').attr('src'),
		$('div.imgTagWrapper img').attr('src'),
	];
	const imageUrl = candidates.find(Boolean);
	return imageUrl || null;
}

async function updatePerfumeImage(perfume) {
	if (!perfume.amazon_asin && !perfume.amazon_url) return { updated: false, reason: 'no amazon id/url' };
	const asinMatch = perfume.amazon_asin || (perfume.amazon_url?.match(/\/dp\/([A-Z0-9]{8,})/)?.[1]);
	if (!asinMatch) return { updated: false, reason: 'no asin resolved' };

	const imageUrl = await fetchAmazonImageByAsin(asinMatch);
	if (!imageUrl) return { updated: false, reason: 'no image' };

	const { error } = await supabaseAdmin
		.from('perfumes')
		.update({ image_url: imageUrl, last_scraped_at: new Date().toISOString() })
		.eq('id', perfume.id);
	if (error) throw error;
	return { updated: true, imageUrl };
}

async function main() {
	const asinArg = process.argv[2];
	if (asinArg) {
		const { data, error } = await supabaseAdmin
			.from('perfumes')
			.select('*')
			.or(`amazon_asin.eq.${asinArg},amazon_url.ilike.%/dp/${asinArg}%`)
			.limit(1)
			.single();
		if (error || !data) throw error || new Error('Perfume not found for ASIN');
		const result = await updatePerfumeImage(data);
		console.log('Updated single perfume:', result);
		return;
	}

	const { data, error } = await supabaseAdmin
		.from('perfumes')
		.select('*')
		.is('image_url', null)
		.limit(2000);
	if (error) throw error;

	let updated = 0;
	for (const p of data) {
		try {
			const res = await updatePerfumeImage(p);
			if (res.updated) {
				updated += 1;
				console.log(`Updated ${p.name} -> ${res.imageUrl}`);
			} else {
				console.log(`Skipped ${p.name} (${res.reason})`);
			}
			await new Promise(r => setTimeout(r, 1500)); // throttle
		} catch (e) {
			console.error('Error updating', p.id, e.message);
		}
	}
	console.log(`Done. Updated ${updated}/${data.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});