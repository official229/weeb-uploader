import { createContext } from 'svelte';
import type { ChapterState, ScanGroup } from './UploadingState.svelte';

export class ApiAuthContext {
	public apiToken = $state<string | null>(null);
}

export const apiAuthContext = createContext<ApiAuthContext>();

export class GlobalState {
	public apiToken = $state<string | null>(null);
	public seriesId = $state<string | null>(null);
	public chapterStates = $state<ChapterState[]>([]);
	public availableScanGroups = $state<ScanGroup[]>([]);
}

export const globalStateContext = createContext<GlobalState>();
