import type { ChapterState, ScanGroup } from '$lib/core/UploadingState.svelte';
import { createContext } from 'svelte';

export class TargetingState {
	public seriesId = $state<string | null>(null);
	public chapterStates = $state<ChapterState[]>([]);
	public availableScanGroups = $state<ScanGroup[]>([]);
}

export const targetingStateContext = createContext<TargetingState>();
