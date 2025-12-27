import { parse } from 'csv-parse/browser/esm/sync';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { asset } from '$app/paths';

export interface ChapterInfo {
	volume: string;
	chapter: string;
	title: string;
	groupNames: string[];
	groupAltNames: Array<Array<{ [lang: string]: string }>>;
}

export interface ResolvedChapterInfo {
	groupTitles: Record<string, string | null>;
	ungroupedTitles: Array<string | null>;
}

export class ChapterTitleExportResolver {
	private data = $state<SvelteMap<string, SvelteMap<string, ChapterInfo>> | null>(null);
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

	private parseCSV(csvText: string): SvelteMap<string, SvelteMap<string, ChapterInfo>> {
		const records = parse(csvText, {
			columns: true,
			skip_empty_lines: true,
			trim: true
		}) as Array<{
			volume: string;
			chapter: string;
			title: string;
			weebdex_id: string;
			group_names: string | null;
			group_alt_names: string | null;
		}>;

		const dataMap = new SvelteMap<string, SvelteMap<string, ChapterInfo>>();

		for (const record of records) {
			const seriesId = record.weebdex_id;
			const volume = record.volume || '';
			const chapter = record.chapter || '';
			const key = `${volume}|${chapter}`;

			// Parse group_names JSON array
			let groupNames: string[] = [];
			if (
				record.group_names != null &&
				record.group_names.trim() !== '' &&
				record.group_names !== '[]'
			) {
				try {
					const parsed = JSON.parse(record.group_names);
					if (Array.isArray(parsed)) {
						groupNames = parsed.filter(
							(name): name is string => typeof name === 'string' && name.trim() !== ''
						);
					}
				} catch (error) {
					console.warn(`Failed to parse group_names for ${seriesId}:`, error);
				}
			}

			// Parse group_alt_names JSON array of arrays
			let groupAltNames: Array<Array<{ [lang: string]: string }>> = [];
			if (
				record.group_alt_names != null &&
				record.group_alt_names.trim() !== '' &&
				record.group_alt_names !== '[]'
			) {
				try {
					const parsed = JSON.parse(record.group_alt_names);
					if (Array.isArray(parsed)) {
						groupAltNames = parsed.map((altNameEntry) => {
							if (Array.isArray(altNameEntry)) {
								return altNameEntry;
							}
							// Handle case where it's a JSON string that needs parsing
							if (typeof altNameEntry === 'string') {
								try {
									const innerParsed = JSON.parse(altNameEntry);
									return Array.isArray(innerParsed) ? innerParsed : [];
								} catch {
									return [];
								}
							}
							return [];
						});
					}
				} catch (error) {
					console.warn(`Failed to parse group_alt_names for ${seriesId}:`, error);
				}
			}

			// Ensure groupAltNames has the same length as groupNames
			while (groupAltNames.length < groupNames.length) {
				groupAltNames.push([]);
			}
			// Trim if longer (shouldn't happen, but be safe)
			if (groupAltNames.length > groupNames.length) {
				groupAltNames = groupAltNames.slice(0, groupNames.length);
			}

			const chapterInfo: ChapterInfo = {
				volume,
				chapter,
				title: record.title || '',
				groupNames,
				groupAltNames
			};

			if (!dataMap.has(seriesId)) {
				dataMap.set(seriesId, new SvelteMap());
			}

			const seriesMap = dataMap.get(seriesId)!;
			// Since each row is now one chapter, we can directly set it
			// If there are duplicates (shouldn't happen), the last one wins
			seriesMap.set(key, chapterInfo);
		}

		return dataMap;
	}

	async getChapterInfo(
		seriesId: string,
		volume: string | null,
		chapter: string | null
	): Promise<ResolvedChapterInfo | null> {
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

		const chapterInfo = seriesMap.get(key);
		if (!chapterInfo) {
			return null;
		}

		// Build group to title mapping
		const groupTitles: Record<string, string | null> = {};
		const ungroupedTitles: Array<string | null> = [];

		if (chapterInfo.groupNames.length > 0) {
			// Chapter has groups - map each group to the title
			// All groups share the same title for this chapter
			const title = chapterInfo.title && chapterInfo.title.trim() !== '' ? chapterInfo.title : null;
			for (const groupName of chapterInfo.groupNames) {
				groupTitles[groupName] = title;
			}
		} else {
			// No groups - this is an ungrouped chapter
			if (chapterInfo.title && chapterInfo.title.trim() !== '') {
				ungroupedTitles.push(chapterInfo.title);
			} else {
				// Include null to indicate the chapter exists but has no title
				ungroupedTitles.push(null);
			}
		}

		return {
			groupTitles,
			ungroupedTitles
		};
	}

	async hasSeriesEntries(seriesId: string): Promise<boolean> {
		await this.ensureLoaded();

		if (this.data === null) {
			return false;
		}

		const seriesMap = this.data.get(seriesId);
		if (!seriesMap) {
			return false;
		}

		// Check if there are any entries at all (with or without groups)
		return seriesMap.size > 0;
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
		for (const chapterInfo of seriesMap.values()) {
			for (const groupName of chapterInfo.groupNames) {
				groupNamesSet.add(groupName);
			}
		}

		return Array.from(groupNamesSet);
	}

	async getUniqueVolumeChapterCombinations(
		seriesId: string
	): Promise<Array<{ volume: string; chapter: string; info: ResolvedChapterInfo }>> {
		await this.ensureLoaded();

		if (this.data === null) {
			return [];
		}

		const seriesMap = this.data.get(seriesId);
		if (!seriesMap) {
			return [];
		}

		// Convert each chapter to the resolved format
		const combinations: Array<{ volume: string; chapter: string; info: ResolvedChapterInfo }> = [];

		for (const [key, chapterInfo] of seriesMap.entries()) {
			const [volume, chapter] = key.split('|');

			// Build group to title mapping
			const groupTitles: Record<string, string | null> = {};
			const ungroupedTitles: Array<string | null> = [];

			if (chapterInfo.groupNames.length > 0) {
				// Chapter has groups - map each group to the title
				// All groups share the same title for this chapter
				const title =
					chapterInfo.title && chapterInfo.title.trim() !== '' ? chapterInfo.title : null;
				for (const groupName of chapterInfo.groupNames) {
					groupTitles[groupName] = title;
				}
			} else {
				// No groups - this is an ungrouped chapter
				if (chapterInfo.title && chapterInfo.title.trim() !== '') {
					ungroupedTitles.push(chapterInfo.title);
				} else {
					// Include null to indicate the chapter exists but has no title
					ungroupedTitles.push(null);
				}
			}

			const resolvedInfo: ResolvedChapterInfo = {
				groupTitles,
				ungroupedTitles
			};

			combinations.push({ volume, chapter, info: resolvedInfo });
		}

		// Sort: first by volume (numeric if possible), then by chapter (numeric if possible)
		combinations.sort((a, b) => {
			// Sort by volume first using localeCompare with numeric option
			const volumeCompare = a.volume.localeCompare(b.volume, undefined, {
				numeric: true,
				sensitivity: 'base'
			});

			if (volumeCompare !== 0) {
				return volumeCompare;
			}

			// If volumes are equal, sort by chapter
			return a.chapter.localeCompare(b.chapter, undefined, {
				numeric: true,
				sensitivity: 'base'
			});
		});

		return combinations;
	}
}

export const CHAPTER_TITLE_EXPORT_RESOLVER = new ChapterTitleExportResolver();
