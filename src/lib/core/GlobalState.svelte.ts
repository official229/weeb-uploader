import { createContext } from 'svelte';
import type { ChapterState } from './UploadingState.svelte';

export class GlobalState {
	public apiToken = $state<string | null>(null);
	public seriesId = $state<string | null>(null);
	public chapterStates = $state<ChapterState[]>([]);
}

export const globalStateContext = createContext<GlobalState>();
