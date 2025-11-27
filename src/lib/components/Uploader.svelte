<script lang="ts">
	import type { SelectedFolder } from '$lib/core/GroupedFolders';
	import ApiAuthSetup from './ApiAuthSetup.svelte';
	import ChapterList from './ChapterList.svelte';
	import SeriesSetter from './SeriesSetter.svelte';
	import { GlobalState, globalStateContext } from '$lib/core/GlobalState.svelte';
	import { 
		ChapterState, 
		ChapterPageState, 
		ChapterUploadingSeries, 
		ChapterUploadingGroup,
		ChapterPageStatus,
		ChapterStatus
	} from '$lib/core/UploadingState.svelte';
	import { getContext } from 'svelte';
	import { getFolderPath } from '$lib/core/GroupedFolders';

	const globalState = getContext(globalStateContext) as GlobalState;

	interface GroupedData {
		name: string;
		nameFolder: SelectedFolder;
		files: Array<{ file: SelectedFolder['files'][0]; folder: SelectedFolder }>;
	}

	interface Props {
		groups: GroupedData[];
		rootFolder?: SelectedFolder;
	}

	let { groups: initialGroups, rootFolder }: Props = $props();

	// Shared series and group instances
	const sharedSeries = new ChapterUploadingSeries();
	const sharedGroup = new ChapterUploadingGroup();

	// Convert GroupedData to ChapterState
	function convertGroupsToChapters(groups: GroupedData[]): ChapterState[] {
		return groups.map((group, index) => {
			// Get folder name - use the name from the group or try to get path
			const folderName = rootFolder 
				? (getFolderPath(rootFolder, group.nameFolder) ?? group.name)
				: group.name;

			// Sort files by name for consistent ordering
			const sortedFiles = [...group.files].sort((a, b) => 
				a.file.file.name.localeCompare(b.file.file.name, undefined, { numeric: true, sensitivity: 'base' })
			);

			// Create pages from files
			const pages = sortedFiles.map((fileItem, pageIndex) => {
				return new ChapterPageState(
					fileItem.file.file.name,
					pageIndex,
					fileItem.file.file,
					ChapterPageStatus.NOT_STARTED,
					0,
					null
				);
			});

			// Create chapter with default values
			return new ChapterState(
				folderName, // originalFolderName
				folderName, // chapterTitle (defaults to folder name)
				null, // chapterVolume (defaults to null)
				index + 1, // chapterNumber (sequential index, 1-based)
				sharedSeries,
				sharedGroup,
				pages,
				ChapterStatus.NOT_STARTED,
				0
			);
		});
	}

	// Initialize chapters from groups
	let chapters = $state<ChapterState[]>(convertGroupsToChapters(initialGroups));
	let previousGroupsRef = $state<GroupedData[] | null>(null);

	// Sync chapters when initialGroups changes (only when the reference actually changes)
	$effect(() => {
		// Only recreate if initialGroups is a different reference (new selection from parent)
		if (previousGroupsRef !== initialGroups) {
			chapters = convertGroupsToChapters(initialGroups);
			globalState.chapterStates = chapters;
			previousGroupsRef = initialGroups;
		}
	});

	// Sync series ID with shared series instance
	$effect(() => {
		if (globalState.seriesId) {
			sharedSeries.seriesId = globalState.seriesId;
		}
	});

	// Update global state when chapters change
	function handleChaptersChange(updatedChapters: ChapterState[]) {
		chapters = updatedChapters;
		globalState.chapterStates = chapters;
	}

	function removeChapter(chapterIndex: number, event: Event) {
		event.stopPropagation();
		const newChapters = chapters.filter((_, i) => i !== chapterIndex);
		chapters = newChapters;
		globalState.chapterStates = chapters;
	}

	function removePage(chapterIndex: number, pageIndex: number, event: Event) {
		event.stopPropagation();
		const chapter = chapters[chapterIndex];
		if (!chapter) return;
		
		const newPages = chapter.pages.filter((_, i) => i !== pageIndex);
		chapter.pages = newPages;
		chapter.checkProgress();
		
		// Remove chapter if no pages remain
		if (newPages.length === 0) {
			removeChapter(chapterIndex, event);
		} else {
			globalState.chapterStates = chapters;
		}
	}
</script>

<div class="space-y-6">
	<ApiAuthSetup />

	{#if globalState.apiToken}
		<SeriesSetter />
	{/if}

	<ChapterList 
		{chapters} 
		{rootFolder}
		onRemoveChapter={removeChapter} 
		onRemovePage={removePage}
		onChaptersChange={handleChaptersChange}
	/>
</div>
