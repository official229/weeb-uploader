import type { ChapterState, ScanGroup } from '$lib/core/UploadingState.svelte';
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
