import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import fs from 'node:fs/promises';

async function main() {
	const path = new URL('./imageOverrides.json', import.meta.url);
	const content = await fs.readFile(path, 'utf-8');
	const overrides = JSON.parse(content);
	let updated = 0, missing = 0;
	for (const o of overrides) {
		const { data, error } = await supabaseAdmin
			.from('perfumes')
			.select('id, name, brand')
			.eq('brand', o.brand)
			.eq('name', o.name)
			.limit(1)
			.single();
		if (error || !data) {
			console.log(`No match found for ${o.brand} ${o.name}`);
			missing += 1;
			continue;
		}
		const { error: upErr } = await supabaseAdmin
			.from('perfumes')
			.update({ image_url: o.image_url, last_scraped_at: new Date().toISOString() })
			.eq('id', data.id);
		if (upErr) {
			console.error(`Failed to update ${o.brand} ${o.name}:`, upErr.message);
			continue;
		}
		console.log(`Updated ${o.brand} ${o.name}`);
		updated += 1;
	}
	console.log(`Done. Updated ${updated}, not found ${missing}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });