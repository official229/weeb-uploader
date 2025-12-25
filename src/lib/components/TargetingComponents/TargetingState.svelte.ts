import { RATE_LIMITER_GLOBAL } from '$lib/core/ApiWithRateLimit.svelte';
import type { ChapterState, ScanGroup } from '$lib/core/UploadingState.svelte';
import axios from 'axios';
import { createContext } from 'svelte';

export class TargetingState {
	public seriesId = $state<string | null>(null);
	public chapterStates = $state<ChapterState[]>([]);
	public availableScanGroups = $state<ScanGroup[]>([]);

	public reset() {
		this.seriesId = null;
		this.chapterStates = [];
		this.availableScanGroups = [];
	}
}

export const targetingStateContext = createContext<TargetingState>();

export interface ComicInfoExtra {
	OriginalSeries?: string;
	Tags?: {
		Tag?: string | string[];
	};
	Groups?: {
		Group?: string | string[];
	};
	Timestamp?: string | number;
}

export interface ChapterComicInfoDefinitionFile {
	ComicInfo: {
		Series?: string;
		Title?: string;
		Number?: string | number;
		Volume?: string | number;
		ScanInformation?: string;
		Year?: string | number;
		Month?: string | number;
		Day?: string | number;
		Extra?: ComicInfoExtra;
	};
}

export interface MangaData {
	id: string;
	title: string;
	description: string;
	relationships: {
		cover?: {
			id: string;
			ext: string;
			dimensions: number[];
		};
	};
}

export interface GroupData {
	id: string;
	name: string;
	description?: string;
	contact_email?: string;
	discord?: string;
	twitter?: string;
	website?: string;
	mangadex?: string;
	mangaupdates?: string;
	inactive?: boolean;
	locked?: boolean;
	created_at?: string;
	updated_at?: string;
	version?: number;
	relationships?: {
		members?: Array<{
			id: string;
			name: string;
			avatar_url?: string;
			description?: string;
			discord?: string;
			twitter?: string;
			website?: string;
			is_leader?: boolean;
			is_officer?: boolean;
			roles?: string[];
			version?: number;
		}>;
	};
}

export interface GroupsResponse {
	data?: GroupData[];
	limit: number;
	page: number;
	total: number;
}

export interface MangaResponse {
	data: MangaData[];
	limit: number;
	page: number;
	total: number;
}

export async function searchGroups(query: string) {
	return await RATE_LIMITER_GLOBAL.makeRequest(async () => {
		const response = await axios.get(`https://api.weebdex.org/group`, {
			params: {
				name: query
			}
		});

		if (response.status !== 200) {
			throw new Error(`Failed to search groups: ${response.status} ${response.statusText}`);
		}

		return response.data as GroupsResponse;
	});
}

export async function searchManga(query: string) {
	return await RATE_LIMITER_GLOBAL.makeRequest(async () => {
		const response = await axios.get(`https://api.weebdex.org/manga`, {
			params: {
				title: query,
				limit: 20,
				sort: 'relevance',
				page: 1
			}
		});

		if (response.status !== 200) {
			throw new Error(`Failed to search manga: ${response.status} ${response.statusText}`);
		}

		return response.data as MangaResponse;
	});
}
