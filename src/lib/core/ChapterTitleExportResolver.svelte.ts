import { parse } from 'csv-parse/browser/esm/sync';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { asset } from '$app/paths';

export interface ChapterInfo {
	volume: string;
	chapter: string;
	title: string;
	groupName: string;
	altNames: Array<{ [lang: string]: string }>;
}

export class ChapterTitleExportResolver {
	private data = $state<SvelteMap<string, SvelteMap<string, ChapterInfo[]>> | null>(null);
	private isLoading = $state<boolean>(false);
	private loadError = $state<Error | null>(null);
	private loadPromise: Promise<void> | null = null;

	async load(): Promise<void> {
		if (this.data !== null) {
			return;
		}

		if (this.loadPromise) {
			return this.loadPromise;
		}

		this.isLoading = true;
		this.loadError = null;

		let resolvePromise: () => void;
		let rejectPromise: (error: Error) => void;
		this.loadPromise = new Promise<void>((resolve, reject) => {
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		try {
			const url = asset('/chapter_export.csv');
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
			}

			const csvText = await response.text();
			this.data = this.parseCSV(csvText);
			resolvePromise!();
		} catch (error) {
			this.loadError = error instanceof Error ? error : new Error('Unknown error loading CSV');
			rejectPromise!(this.loadError);
		} finally {
			this.isLoading = false;
		}

		return this.loadPromise;
	}

	private async ensureLoaded(): Promise<void> {
		if (this.data !== null) {
			return;
		}

		if (this.loadPromise) {
			await this.loadPromise;
			return;
		}

		await this.load();
	}

	private parseCSV(csvText: string): SvelteMap<string, SvelteMap<string, ChapterInfo[]>> {
		const records = parse(csvText, {
			columns: true,
			skip_empty_lines: true,
			trim: true
		}) as Array<{
			volume: string;
			chapter: string;
			title: string;
			weebdex_id: string;
			name: string;
			alt_names: string;
		}>;

		const dataMap = new SvelteMap<string, SvelteMap<string, ChapterInfo[]>>();

		for (const record of records) {
			const seriesId = record.weebdex_id;
			const volume = record.volume || '';
			const chapter = record.chapter || '';
			const key = `${volume}|${chapter}`;

			// Parse alt_names JSON string
			let altNames: Array<{ [lang: string]: string }> = [];
			if (record.alt_names && record.alt_names.trim() !== '' && record.alt_names !== '[]') {
				try {
					// The JSON is double-escaped, so we need to parse it
					const parsed = JSON.parse(record.alt_names);
					if (Array.isArray(parsed)) {
						altNames = parsed;
					}
				} catch (error) {
					// If parsing fails, leave altNames as empty array
					console.warn(`Failed to parse alt_names for ${seriesId}:`, error);
				}
			}

			const chapterInfo: ChapterInfo = {
				volume,
				chapter,
				title: record.title || '',
				groupName: record.name || '',
				altNames
			};

			if (!dataMap.has(seriesId)) {
				dataMap.set(seriesId, new SvelteMap());
			}

			const seriesMap = dataMap.get(seriesId)!;
			if (!seriesMap.has(key)) {
				seriesMap.set(key, []);
			}

			seriesMap.get(key)!.push(chapterInfo);
		}

		return dataMap;
	}

	async getChapterInfo(
		seriesId: string,
		volume: string | null,
		chapter: string | null
	): Promise<{ title: string | null; groupNames: string[] } | null> {
		await this.ensureLoaded();

		if (this.data === null) {
			return null;
		}

		const seriesMap = this.data.get(seriesId);
		if (!seriesMap) {
			return null;
		}

		const volumeStr = volume || '';
		const chapterStr = chapter || '';
		const key = `${volumeStr}|${chapterStr}`;

		const chapterInfos = seriesMap.get(key);
		if (!chapterInfos || chapterInfos.length === 0) {
			return null;
		}

		// Get title from first entry (all should have same title for same volume/chapter)
		const title = chapterInfos[0].title || null;
		// Get all unique group names
		const groupNamesSet = new SvelteSet<string>();
		for (const info of chapterInfos) {
			if (info.groupName) {
				groupNamesSet.add(info.groupName);
			}
		}
		const groupNames = Array.from(groupNamesSet);

		return { title, groupNames };
	}

	async getAllGroupNames(seriesId: string): Promise<string[]> {
		await this.ensureLoaded();

		if (this.data === null) {
			return [];
		}

		const seriesMap = this.data.get(seriesId);
		if (!seriesMap) {
			return [];
		}

		const groupNamesSet = new SvelteSet<string>();
		for (const chapterInfos of seriesMap.values()) {
			for (const info of chapterInfos) {
				if (info.groupName) {
					groupNamesSet.add(info.groupName);
				}
			}
		}

		return Array.from(groupNamesSet);
	}

	async getUniqueVolumeChapterCombinations(
		seriesId: string
	): Promise<Array<{ volume: string; chapter: string; title: string | null }>> {
		await this.ensureLoaded();

		if (this.data === null) {
			return [];
		}

		const seriesMap = this.data.get(seriesId);
		if (!seriesMap) {
			return [];
		}

		// Use a map to track unique combinations and their titles
		const combinationsMap = new SvelteMap<
			string,
			{ volume: string; chapter: string; title: string | null }
		>();

		for (const [key, chapterInfos] of seriesMap.entries()) {
			if (chapterInfos.length === 0) continue;

			const [volume, chapter] = key.split('|');
			// Get title from first entry (all should have same title for same volume/chapter)
			const title = chapterInfos[0].title || null;

			// Use the key as the unique identifier
			if (!combinationsMap.has(key)) {
				combinationsMap.set(key, { volume, chapter, title });
			}
		}

		// Convert to array and sort by volume then chapter (treating as numbers when possible)
		const combinations = Array.from(combinationsMap.values());

		// Sort: first by volume (numeric if possible), then by chapter (numeric if possible)
		combinations.sort((a, b) => {
			// Try to parse as numbers for proper numeric sorting
			const volA = a.volume === '' ? -1 : Number.parseFloat(a.volume) || Number.POSITIVE_INFINITY;
			const volB = b.volume === '' ? -1 : Number.parseFloat(b.volume) || Number.POSITIVE_INFINITY;

			if (volA !== volB) {
				return volA - volB;
			}

			// If volumes are equal, sort by chapter
			const chA = a.chapter === '' ? -1 : Number.parseFloat(a.chapter) || Number.POSITIVE_INFINITY;
			const chB = b.chapter === '' ? -1 : Number.parseFloat(b.chapter) || Number.POSITIVE_INFINITY;

			return chA - chB;
		});

		return combinations;
	}
}

export const CHAPTER_TITLE_EXPORT_RESOLVER = new ChapterTitleExportResolver();
