export const appendAmazonTag = (url: string) => {
	try {
		const target = new URL(url);
		const tag = (import.meta as any).env?.VITE_AMAZON_TAG as string | undefined;
		if (!tag) return url;
		// Replace or set tag param
		target.searchParams.set('tag', tag);
		return target.toString();
	} catch {
		return url;
	}
};